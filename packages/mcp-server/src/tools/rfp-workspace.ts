/**
 * MCP tool handler for RFP workspace management.
 * Actions: create, status, transition, write, read.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RFP_PHASES, RFP_FILES } from "../types/documents.js";
import {
  createWorkspace, readStatus, writeStatus, writeWorkspaceFile,
  readWorkspaceFile, getFileInventory, recoverPhase, validateTransition,
} from "../lib/rfp-state-machine.js";
import { logger } from "../lib/logger.js";

const RFP_ACTIONS = ["create", "status", "transition", "write", "read"] as const;

const inputSchema = {
  action: z.enum(RFP_ACTIONS)
    .describe("Workspace action: create | status | transition | write | read"),
  workspace_path: z.string().max(500)
    .refine((p) => !p.includes(".."), { message: "workspace_path must not contain .." })
    .describe("Path to project root (workspace created under sekkei-docs/01-rfp/<project>)"),
  project_name: z.string().max(100).optional()
    .describe("Project name for create action (kebab-case)"),
  phase: z.enum(RFP_PHASES).optional()
    .describe("Target phase for transition action"),
  filename: z.enum(RFP_FILES).optional()
    .describe("File to read/write (e.g. 02_analysis.md)"),
  content: z.string().max(500_000).optional()
    .describe("Content for write action"),
};

interface RfpWorkspaceArgs {
  action: (typeof RFP_ACTIONS)[number];
  workspace_path: string;
  project_name?: string;
  phase?: (typeof RFP_PHASES)[number];
  filename?: (typeof RFP_FILES)[number];
  content?: string;
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
        const status = await readStatus(args.workspace_path);
        const inventory = await getFileInventory(args.workspace_path);
        const recovered = await recoverPhase(args.workspace_path);
        return ok(JSON.stringify({ ...status, recovered_phase: recovered, ...inventory }));
      }

      case "transition": {
        if (!args.phase) {
          return err("phase required for transition action");
        }
        const current = await readStatus(args.workspace_path);
        if (!validateTransition(current.phase, args.phase)) {
          return err(`Invalid transition: ${current.phase} → ${args.phase}`);
        }
        const now = new Date().toISOString().slice(0, 10);
        await writeStatus(args.workspace_path, { ...current, phase: args.phase, last_update: now });
        return ok(JSON.stringify({ success: true, from: current.phase, to: args.phase }));
      }

      case "write": {
        if (!args.filename || !args.content) {
          return err("filename and content required for write action");
        }
        await writeWorkspaceFile(args.workspace_path, args.filename, args.content);
        return ok(JSON.stringify({ success: true, filename: args.filename }));
      }

      case "read": {
        if (!args.filename) {
          return err("filename required for read action");
        }
        const text = await readWorkspaceFile(args.workspace_path, args.filename);
        return ok(text);
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
    "Manage RFP presales workspace (create, status, transition, write, read)",
    inputSchema,
    async ({ action, workspace_path, project_name, phase, filename, content }) => {
      return handleRfpWorkspace({
        action: action as RfpWorkspaceArgs["action"],
        workspace_path,
        project_name,
        phase: phase as RfpWorkspaceArgs["phase"],
        filename: filename as RfpWorkspaceArgs["filename"],
        content,
      });
    },
  );
}
