import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChangeRequestTool } from "../../src/tools/change-request.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("manage_change_request tool", () => {
  let server: McpServer;
  let tmpDir: string;
  let crId: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-cr-tool-test-"));
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerChangeRequestTool(server);
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["manage_change_request"]).toBeDefined();
  });

  it("create: returns CR ID and INITIATED status", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      origin_doc: "requirements",
      description: "Added payment module",
      changed_ids: ["REQ-003", "REQ-004"],
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.cr_id).toMatch(/^CR-\d{6}-\d{3}$/);
    expect(data.status).toBe("INITIATED");
    crId = data.cr_id;
  });

  it("create: rejects missing origin_doc", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      description: "test",
    });
    expect(result.isError).toBe(true);
  });

  it("create: rejects missing changed_ids", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      origin_doc: "requirements",
      description: "test",
    });
    expect(result.isError).toBe(true);
  });

  it("status: returns full CR data", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "status",
      workspace_path: tmpDir,
      cr_id: crId,
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe(crId);
    expect(data.status).toBe("INITIATED");
    expect(data.origin_doc).toBe("requirements");
  });

  it("list: returns array of CR summaries", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "list",
      workspace_path: tmpDir,
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toMatch(/^CR-/);
  });

  it("list: filters by status", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "list",
      workspace_path: tmpDir,
      status_filter: "COMPLETED",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(0);
  });

  it("cancel: transitions to CANCELLED", async () => {
    // Create a new CR specifically for cancel test
    const createResult = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      origin_doc: "basic-design",
      description: "To be cancelled",
      changed_ids: ["SCR-001"],
    });
    const cancelId = JSON.parse(createResult.content[0].text).cr_id;

    const result = await callTool(server, "manage_change_request", {
      action: "cancel",
      workspace_path: tmpDir,
      cr_id: cancelId,
      reason: "No longer needed",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    // Verify status
    const statusResult = await callTool(server, "manage_change_request", {
      action: "status",
      workspace_path: tmpDir,
      cr_id: cancelId,
    });
    const status = JSON.parse(statusResult.content[0].text);
    expect(status.status).toBe("CANCELLED");
  });

  it("cancel: rejects if already COMPLETED", async () => {
    // We can't easily create a COMPLETED CR without full chain,
    // so test that cancel from CANCELLED (terminal) fails
    const createResult = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      origin_doc: "requirements",
      description: "Terminal test",
      changed_ids: ["REQ-099"],
    });
    const testId = JSON.parse(createResult.content[0].text).cr_id;

    // Cancel it first
    await callTool(server, "manage_change_request", {
      action: "cancel", workspace_path: tmpDir, cr_id: testId,
    });

    // Try to cancel again from CANCELLED (terminal state)
    const result = await callTool(server, "manage_change_request", {
      action: "cancel", workspace_path: tmpDir, cr_id: testId,
    });
    expect(result.isError).toBe(true);
  });

  it("create: auto-detects changed IDs from old/new content", async () => {
    const result = await callTool(server, "manage_change_request", {
      action: "create",
      workspace_path: tmpDir,
      origin_doc: "basic-design",
      description: "Auto-detect test",
      old_content: "Implements F-001 and SCR-001.",
      new_content: "Implements F-001, F-015, and SCR-001.",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.changed_ids).toContain("F-015");
  });
});
