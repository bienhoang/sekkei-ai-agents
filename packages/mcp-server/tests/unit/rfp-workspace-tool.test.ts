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
  // basePath = project root (passed to all non-create actions)
  let basePath: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-rfp-tool-test-"));
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerRfpWorkspaceTool(server);
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // Helper: unique base path per test group
  const makeBase = (label: string) => join(tmpDir, label);

  it("registers on the server", () => {
    expect((server as any)._registeredTools["manage_rfp_workspace"]).toBeDefined();
  });

  it("create: creates workspace and returns path", async () => {
    basePath = makeBase("tool-test");
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "create", workspace_path: basePath, project_name: "tool-test",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.phase).toBe("RFP_RECEIVED");
    // data.workspace is the actual rfp dir — subsequent actions use basePath (project root)
  });

  it("status: returns current phase and file inventory", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "status", workspace_path: basePath,
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.phase).toBe("RFP_RECEIVED");
    expect(data.files).toBeDefined();
    expect(data.files["00_status.md"].exists).toBe(true);
  });

  it("write: saves content to workspace file", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "write", workspace_path: basePath,
      filename: "02_analysis.md", content: "# Analysis\nTest content",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
  });

  it("read: returns file content", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "read", workspace_path: basePath, filename: "02_analysis.md",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Analysis");
  });

  it("transition: advances phase with valid transition", async () => {
    await callTool(server, "manage_rfp_workspace", {
      action: "write", workspace_path: basePath,
      filename: "01_raw_rfp.md", content: "# RFP\nTest RFP content",
    });
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "transition", workspace_path: basePath, phase: "ANALYZING",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.from).toBe("RFP_RECEIVED");
    expect(data.to).toBe("ANALYZING");
  });

  it("transition: rejects invalid transition", async () => {
    const result = await callTool(server, "manage_rfp_workspace", {
      action: "transition", workspace_path: basePath, phase: "SCOPE_FREEZE",
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
      action: "read", workspace_path: basePath,
    });
    expect(result.isError).toBe(true);
  });

  // --- History Action ---
  describe("history action", () => {
    it("returns phase history after transitions", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "history", workspace_path: basePath,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.phase_history.length).toBeGreaterThan(0);
    });
  });

  // --- Back Action ---
  describe("back action", () => {
    it("returns error on first phase (no previous)", async () => {
      const backBase = makeBase("back-test");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: backBase, project_name: "back-test",
      });
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "back", workspace_path: backBase,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No previous phase");
    });
  });

  // --- Backward Transition Force ---
  describe("backward transitions", () => {
    let bwBase: string;

    it("setup: create workspace and advance to CLIENT_ANSWERED", async () => {
      bwBase = makeBase("backward-test");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: bwBase, project_name: "backward-test",
      });
      await callTool(server, "manage_rfp_workspace", { action: "write", workspace_path: bwBase, filename: "01_raw_rfp.md", content: "# RFP" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwBase, phase: "ANALYZING" });
      await callTool(server, "manage_rfp_workspace", { action: "write", workspace_path: bwBase, filename: "02_analysis.md", content: "# Analysis" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwBase, phase: "QNA_GENERATION" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwBase, phase: "WAITING_CLIENT" });
      await callTool(server, "manage_rfp_workspace", { action: "write", workspace_path: bwBase, filename: "04_client_answers.md", content: "# Answers" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: bwBase, phase: "CLIENT_ANSWERED" });
    });

    it("rejects backward without force", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: bwBase, phase: "ANALYZING",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires force: true");
    });

    it("allows backward with force", async () => {
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "transition", workspace_path: bwBase, phase: "ANALYZING", force: true,
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
      const qnaBase = makeBase("qna-round-test");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: qnaBase, project_name: "qna-round-test",
      });
      await callTool(server, "manage_rfp_workspace", { action: "write", workspace_path: qnaBase, filename: "01_raw_rfp.md", content: "# RFP" });
      await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: qnaBase, phase: "ANALYZING" });
      await callTool(server, "manage_rfp_workspace", { action: "write", workspace_path: qnaBase, filename: "02_analysis.md", content: "# Analysis" });
      const qnaResult = await callTool(server, "manage_rfp_workspace", { action: "transition", workspace_path: qnaBase, phase: "QNA_GENERATION" });
      const data = JSON.parse(qnaResult.content[0].text);
      expect(data.qna_round).toBe(1);
    });
  });

  // --- Generate Config ---
  describe("generate-config action", () => {
    it("rejects when not at SCOPE_FREEZE/PROPOSAL_UPDATE", async () => {
      const gcBase = makeBase("genconfig-test");
      await callTool(server, "manage_rfp_workspace", {
        action: "create", workspace_path: gcBase, project_name: "genconfig-test",
      });
      const result = await callTool(server, "manage_rfp_workspace", {
        action: "generate-config", workspace_path: gcBase,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires SCOPE_FREEZE");
    });
  });
});
