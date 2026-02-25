import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRfpWorkspaceTool } from "../../src/tools/rfp-workspace.js";
import { PHASE_NEXT_ACTION, isBackwardTransition } from "../../src/lib/rfp-state-machine.js";

async function callTool(
  server: McpServer, name: string, args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

/** Helper: create workspace and advance to target phase with required content.
 *  Uses a unique sub-directory of tmpDir as workspace_path to avoid collisions.
 *  Returns basePath (project root) — all subsequent actions use project root. */
async function advanceTo(
  server: McpServer, tmpDir: string, label: string, targetPhase: string,
): Promise<string> {
  const basePath = join(tmpDir, label);
  await callTool(server, "manage_rfp_workspace", {
    action: "create", workspace_path: basePath, project_name: label,
  });
  const steps: Array<{ write?: [string, string]; phase: string }> = [
    { write: ["01_raw_rfp.md", "# RFP content"], phase: "ANALYZING" },
    { write: ["02_analysis.md", "# Analysis"], phase: "QNA_GENERATION" },
    { phase: "WAITING_CLIENT" },
    { write: ["04_client_answers.md", "# Answers"], phase: "CLIENT_ANSWERED" },
    { write: ["02_analysis.md", "# Updated analysis"], phase: "PROPOSAL_UPDATE" },
    { write: ["05_proposal.md", "# Proposal"], phase: "SCOPE_FREEZE" },
  ];
  for (const step of steps) {
    if (step.write) {
      await callTool(server, "manage_rfp_workspace", {
        action: "write", workspace_path: basePath, filename: step.write[0], content: step.write[1],
      });
    }
    await callTool(server, "manage_rfp_workspace", {
      action: "transition", workspace_path: basePath, phase: step.phase,
    });
    if (step.phase === targetPhase) return basePath;
  }
  return basePath;
}

describe("RFP flow fixes", () => {
  let server: McpServer;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-rfp-flow-"));
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerRfpWorkspaceTool(server);
  });
  afterAll(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  // --- B1: Back action with new backward edges ---
  describe("B1: backward transitions", () => {
    it("WAITING_CLIENT → QNA_GENERATION with force", async () => {
      const ws = await advanceTo(server, tmpDir, "b1-wc", "WAITING_CLIENT");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "QNA_GENERATION", force: true,
      });
      expect(r.isError).toBeUndefined();
      expect(JSON.parse(r.content[0].text).backward).toBe(true);
    });

    it("QNA_GENERATION → ANALYZING with force", async () => {
      const ws = await advanceTo(server, tmpDir, "b1-qa", "QNA_GENERATION");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "ANALYZING", force: true,
      });
      expect(r.isError).toBeUndefined();
    });

    it("DRAFTING → WAITING_CLIENT with force", async () => {
      const ws = await advanceTo(server, tmpDir, "b1-dr", "QNA_GENERATION");
      await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "DRAFTING",
      });
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "WAITING_CLIENT", force: true,
      });
      expect(r.isError).toBeUndefined();
    });
  });

  // --- B2: QNA_GENERATION → DRAFTING skip ---
  describe("B2: QNA skip to DRAFTING", () => {
    it("QNA_GENERATION → DRAFTING succeeds (forward)", async () => {
      const ws = await advanceTo(server, tmpDir, "b2-skip", "QNA_GENERATION");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "DRAFTING",
      });
      expect(r.isError).toBeUndefined();
      expect(JSON.parse(r.content[0].text).backward).toBe(false);
    });

    it("QNA_GENERATION → DRAFTING is not a backward transition", () => {
      expect(isBackwardTransition("QNA_GENERATION", "DRAFTING")).toBe(false);
    });
  });

  // --- B3: SCOPE_FREEZE escape ---
  describe("B3: SCOPE_FREEZE → PROPOSAL_UPDATE", () => {
    it("succeeds with force", async () => {
      const ws = await advanceTo(server, tmpDir, "b3-sf", "SCOPE_FREEZE");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "PROPOSAL_UPDATE", force: true,
      });
      expect(r.isError).toBeUndefined();
      expect(JSON.parse(r.content[0].text).backward).toBe(true);
    });

    it("fails without force", async () => {
      const ws = await advanceTo(server, tmpDir, "b3-nf", "SCOPE_FREEZE");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "PROPOSAL_UPDATE",
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("requires force: true");
    });
  });

  // --- M1: next_action auto-set ---
  describe("M1: next_action auto-set", () => {
    it("updates next_action on forward transition", async () => {
      const ws = await advanceTo(server, tmpDir, "m1-fwd", "ANALYZING");
      const s = await callTool(server, "manage_rfp_workspace", { action: "status", workspace_path: ws });
      const data = JSON.parse(s.content[0].text);
      expect(data.next_action).toBe(PHASE_NEXT_ACTION.get("ANALYZING"));
    });

    it("updates next_action on back navigation", async () => {
      const ws = await advanceTo(server, tmpDir, "m1-bk", "QNA_GENERATION");
      await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: ws, phase: "ANALYZING", force: true,
      });
      const s = await callTool(server, "manage_rfp_workspace", { action: "status", workspace_path: ws });
      expect(JSON.parse(s.content[0].text).next_action).toBe(PHASE_NEXT_ACTION.get("ANALYZING"));
    });
  });

  // --- M2: Content validation ---
  describe("M2: content validation", () => {
    it("blocks forward when required file empty", async () => {
      const emptyBase = join(tmpDir, "m2-empty");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: emptyBase, project_name: "m2-empty",
      });
      const t = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: emptyBase, phase: "ANALYZING",
      });
      expect(t.isError).toBe(true);
      expect(t.content[0].text).toContain("01_raw_rfp.md is empty");
    });

    it("allows backward without content check", async () => {
      const bwBase = await advanceTo(server, tmpDir, "m2-bw", "QNA_GENERATION");
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: bwBase, phase: "ANALYZING", force: true,
      });
      expect(r.isError).toBeUndefined();
    });

    it("allows forward after writing content", async () => {
      const okBase = join(tmpDir, "m2-ok");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: okBase, project_name: "m2-ok",
      });
      await callTool(server, "manage_rfp_workspace", {
        action: "write", workspace_path: okBase, filename: "01_raw_rfp.md", content: "# RFP",
      });
      const t = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: okBase, phase: "ANALYZING",
      });
      expect(t.isError).toBeUndefined();
    });
  });
});
