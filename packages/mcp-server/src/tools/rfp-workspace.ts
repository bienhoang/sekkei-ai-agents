/** MCP tool handler for RFP workspace management. */
import { z } from "zod";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RFP_PHASES, RFP_FILES } from "../types/documents.js";
import {
  createWorkspace, readStatus, writeStatus, writeWorkspaceFile,
  readWorkspaceFile, getFileInventory, recoverPhase, validateTransition,
  isBackwardTransition, appendDecision, getPhaseHistory, getPreviousPhase,
  generateConfigFromWorkspace, PHASE_NEXT_ACTION, validatePhaseContent,
} from "../lib/rfp-state-machine.js";
import { DEFAULT_WORKSPACE_DIR } from "../lib/constants.js";
import { logger } from "../lib/logger.js";

/** Resolve the RFP workspace path from a project root directory. */
function resolveRfpPath(basePath: string): string {
  return join(basePath, DEFAULT_WORKSPACE_DIR, "01-rfp");
}

const RFP_ACTIONS = ["create", "status", "transition", "write", "read", "history", "back", "generate-config"] as const;

const inputSchema = {
  action: z.enum(RFP_ACTIONS)
    .describe("Workspace action: create | status | transition | write | read | history | back | generate-config"),
  workspace_path: z.string().max(500)
    .refine((p) => !p.includes(".."), { message: "workspace_path must not contain .." })
    .describe("Path to project root directory"),
  project_name: z.string().max(100).optional()
    .describe("Project name for create action (kebab-case)"),
  phase: z.enum(RFP_PHASES).optional()
    .describe("Target phase for transition action"),
  filename: z.enum(RFP_FILES).optional()
    .describe("File to read/write (e.g. 02_analysis.md)"),
  content: z.string().max(500_000).optional()
    .describe("Content for write action"),
  reason: z.string().max(500).optional()
    .describe("Reason for transition (logged to 07_decisions.md)"),
  force: z.boolean().optional()
    .describe("Required true for backward transitions"),
  deadline: z.string().max(10).optional()
    .describe("Client submission deadline (YYYY-MM-DD)"),
  response_due: z.string().max(10).optional()
    .describe("Expected Q&A response date (YYYY-MM-DD)"),
};

interface RfpWorkspaceArgs {
  action: (typeof RFP_ACTIONS)[number];
  workspace_path: string;
  project_name?: string;
  phase?: (typeof RFP_PHASES)[number];
  filename?: (typeof RFP_FILES)[number];
  content?: string;
  reason?: string;
  force?: boolean;
  deadline?: string;
  response_due?: string;
}

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export async function handleRfpWorkspace(args: RfpWorkspaceArgs): Promise<ToolResult> {
  try {
    switch (args.action) {
      case "create": {
        if (!args.project_name) {
          return err("project_name required for create action");
        }
        const wsPath = await createWorkspace(args.workspace_path, args.project_name);
        return ok(JSON.stringify({ success: true, workspace: wsPath, phase: "RFP_RECEIVED" }));
      }

      case "status": {
        const rfpPath = resolveRfpPath(args.workspace_path);
        const status = await readStatus(rfpPath);
        const inventory = await getFileInventory(rfpPath);
        const recovered = await recoverPhase(rfpPath);
        return ok(JSON.stringify({ ...status, recovered_phase: recovered, ...inventory }));
      }

      case "transition": {
        if (!args.phase) {
          return err("phase required for transition action");
        }
        const rfpPath = resolveRfpPath(args.workspace_path);
        const current = await readStatus(rfpPath);
        if (!validateTransition(current.phase, args.phase)) {
          return err(`Invalid transition: ${current.phase} → ${args.phase}`);
        }
        // Backward transitions require force flag
        if (isBackwardTransition(current.phase, args.phase) && !args.force) {
          return err(`Backward transition ${current.phase} → ${args.phase} requires force: true`);
        }
        // Content validation for forward transitions only
        if (!isBackwardTransition(current.phase, args.phase)) {
          const contentErr = await validatePhaseContent(rfpPath, args.phase);
          if (contentErr) return err(contentErr);
        }
        const now = new Date().toISOString().slice(0, 10);
        // Increment qna_round when entering QNA_GENERATION
        const qnaRound = args.phase === "QNA_GENERATION"
          ? current.qna_round + 1 : current.qna_round;
        const historyEntry = { phase: args.phase, entered: now, ...(args.reason ? { reason: args.reason } : {}) };
        await writeStatus(rfpPath, {
          ...current,
          phase: args.phase,
          last_update: now,
          next_action: PHASE_NEXT_ACTION.get(args.phase) ?? current.next_action,
          qna_round: qnaRound,
          phase_history: [...current.phase_history, historyEntry],
          ...(args.deadline ? { deadline: args.deadline } : {}),
          ...(args.response_due ? { response_due: args.response_due } : {}),
        });
        // Auto-log decision
        await appendDecision(rfpPath, current.phase, args.phase, args.reason);
        return ok(JSON.stringify({
          success: true, from: current.phase, to: args.phase,
          backward: isBackwardTransition(current.phase, args.phase),
          qna_round: qnaRound,
        }));
      }

      case "history": {
        const history = await getPhaseHistory(resolveRfpPath(args.workspace_path));
        return ok(JSON.stringify({ phase_history: history }));
      }

      case "back": {
        const rfpPath = resolveRfpPath(args.workspace_path);
        // prev = last visited phase from history (not topological predecessor)
        const prev = await getPreviousPhase(rfpPath);
        if (!prev) {
          return err("No previous phase to go back to");
        }
        const cur = await readStatus(rfpPath);
        if (!validateTransition(cur.phase, prev)) {
          return err(`Cannot go back: ${cur.phase} → ${prev} is not a valid transition`);
        }
        if (isBackwardTransition(cur.phase, prev) && !args.force) {
          return err(`Backward navigation ${cur.phase} → ${prev} requires force: true`);
        }
        const now = new Date().toISOString().slice(0, 10);
        const qnaRound = prev === "QNA_GENERATION" ? cur.qna_round + 1 : cur.qna_round;
        const reason = args.reason ?? "Back navigation";
        const historyEntry = { phase: prev, entered: now, reason };
        await writeStatus(rfpPath, {
          ...cur,
          phase: prev,
          last_update: now,
          next_action: PHASE_NEXT_ACTION.get(prev) ?? cur.next_action,
          qna_round: qnaRound,
          phase_history: [...cur.phase_history, historyEntry],
        });
        await appendDecision(rfpPath, cur.phase, prev, reason);
        return ok(JSON.stringify({ success: true, from: cur.phase, to: prev, backward: true }));
      }

      case "write": {
        if (!args.filename || !args.content) {
          return err("filename and content required for write action");
        }
        await writeWorkspaceFile(resolveRfpPath(args.workspace_path), args.filename, args.content);
        return ok(JSON.stringify({ success: true, filename: args.filename }));
      }

      case "read": {
        if (!args.filename) {
          return err("filename required for read action");
        }
        const text = await readWorkspaceFile(resolveRfpPath(args.workspace_path), args.filename);
        return ok(text);
      }

      case "generate-config": {
        const rfpPath = resolveRfpPath(args.workspace_path);
        const st = await readStatus(rfpPath);
        if (st.phase !== "SCOPE_FREEZE" && st.phase !== "PROPOSAL_UPDATE") {
          return err("generate-config requires SCOPE_FREEZE or PROPOSAL_UPDATE phase");
        }
        const configYaml = await generateConfigFromWorkspace(rfpPath);
        return ok(JSON.stringify({ success: true, config: configYaml }));
      }

      default:
        return err(`Unknown action: ${args.action}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "RFP workspace operation failed";
    logger.error({ err: e, action: args.action }, "manage_rfp_workspace failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function registerRfpWorkspaceTool(server: McpServer): void {
  server.tool(
    "manage_rfp_workspace",
    "Manage RFP presales workspace (create, status, transition, write, read, history, back, generate-config)",
    inputSchema,
    async ({ action, workspace_path, project_name, phase, filename, content, reason, force, deadline, response_due }) => {
      return handleRfpWorkspace({
        action: action as RfpWorkspaceArgs["action"],
        workspace_path,
        project_name,
        phase: phase as RfpWorkspaceArgs["phase"],
        filename: filename as RfpWorkspaceArgs["filename"],
        content,
        reason: reason as string | undefined,
        force: force as boolean | undefined,
        deadline: deadline as string | undefined,
        response_due: response_due as string | undefined,
      });
    },
  );
}
