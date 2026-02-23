import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRfpWorkspaceTool } from "../../src/tools/rfp-workspace.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("manage_rfp_workspace tool", () => {
  let server: McpServer;
  let tmpDir: string;
  let wsPath: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-rfp-tool-test-"));
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerRfpWorkspaceTool(server);
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["manage_rfp_workspace"]).toBeDefined();
  });

  it("create: creates workspace and returns path", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "create", workspace_path: tmpDir, project_name: "tool-test",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.phase).toBe("RFP_RECEIVED");
    wsPath = data.workspace;
  });

  it("status: returns current phase and file inventory", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "status", workspace_path: wsPath,
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.phase).toBe("RFP_RECEIVED");
    expect(data.files).toBeDefined();
    expect(data.files["00_status.md"].exists).toBe(true);
  });

  it("write: saves content to workspace file", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "write", workspace_path: wsPath,
      filename: "02_analysis.md", content: "# Analysis\nTest content",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
  });

  it("read: returns file content", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "read", workspace_path: wsPath, filename: "02_analysis.md",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Analysis");
  });

  it("transition: advances phase with valid transition", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "transition", workspace_path: wsPath, phase: "ANALYZING",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.from).toBe("RFP_RECEIVED");
    expect(data.to).toBe("ANALYZING");
  });

  it("transition: rejects invalid transition", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "transition", workspace_path: wsPath, phase: "SCOPE_FREEZE",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid transition");
  });

  it("create: rejects missing project_name", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "create", workspace_path: tmpDir,
    });
    expect(result.isError).toBe(true);
  });

  it("read: rejects missing filename", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "read", workspace_path: wsPath,
    });
    expect(result.isError).toBe(true);
  });

  // --- History Action ---
  describe("history action", () => {
    it("returns phase history after transitions", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "history", workspace_path: wsPath,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.phase_history.length).toBeGreaterThan(0);
    });
  });

  // --- Back Action ---
  describe("back action", () => {
    it("returns error on first phase (no previous)", async () => {
      // Create a fresh workspace to test back from RFP_RECEIVED
      const freshResult = await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: tmpDir, project_name: "back-test",
      });
      const freshWs = JSON.parse(freshResult.content[0].text).workspace;
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "back", workspace_path: freshWs,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No previous phase");
    });
  });

  // --- Backward Transition Force ---
  describe("backward transitions", () => {
    let bwWsPath: string;

    it("setup: create workspace and advance to CLIENT_ANSWERED", async () => {
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: tmpDir, project_name: "backward-test",
      });
      bwWsPath = JSON.parse(r.content[0].text).workspace;
      // Advance: RFP_RECEIVED -> ANALYZING -> QNA -> WAITING -> CLIENT_ANSWERED
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwWsPath, phase: "ANALYZING" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwWsPath, phase: "QNA_GENERATION" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwWsPath, phase: "WAITING_CLIENT" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwWsPath, phase: "CLIENT_ANSWERED" });
    });

    it("rejects backward without force", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: bwWsPath, phase: "ANALYZING",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires force: true");
    });

    it("allows backward with force", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: bwWsPath, phase: "ANALYZING", force: true,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.backward).toBe(true);
      expect(data.from).toBe("CLIENT_ANSWERED");
      expect(data.to).toBe("ANALYZING");
    });
  });

  // --- QNA Round ---
  describe("qna_round increment", () => {
    it("increments on QNA_GENERATION transition", async () => {
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: tmpDir, project_name: "qna-round-test",
      });
      const qnaWs = JSON.parse(r.content[0].text).workspace;
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: qnaWs, phase: "ANALYZING" });
      const qnaResult = await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: qnaWs, phase: "QNA_GENERATION" });
      const data = JSON.parse(qnaResult.content[0].text);
      expect(data.qna_round).toBe(1);
    });
  });

  // --- Generate Config ---
  describe("generate-config action", () => {
    it("rejects when not at SCOPE_FREEZE/PROPOSAL_UPDATE", async () => {
      const r = await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: tmpDir, project_name: "genconfig-test",
      });
      const gcWs = JSON.parse(r.content[0].text).workspace;
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "generate-config", workspace_path: gcWs,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires SCOPE_FREEZE");
    });
  });
});
