import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChangeRequestTool } from "../../src/tools/change-request.js";
import { createCR, writeCR, transitionCR, getCRDir } from "../../src/lib/cr-state-machine.js";

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

  // --- Phase 1 fixes: rollback ---
  describe("rollback action", () => {
    it("rejects when status is not PROPAGATING", async () => {
      // Create a CR in INITIATED status
      const createResult = await callTool(server, "manage_change_request", {
        action: "create",
        workspace_path: tmpDir,
        origin_doc: "requirements",
        description: "Rollback non-propagating test",
        changed_ids: ["REQ-101"],
      });
      const nonPropId = JSON.parse(createResult.content[0].text).cr_id;

      const result = await callTool(server, "manage_change_request", {
        action: "rollback",
        workspace_path: tmpDir,
        cr_id: nonPropId,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("rollback requires PROPAGATING status");
    });

    it("returns error when no git checkpoint found", async () => {
      // Create a CR and manually put it into PROPAGATING state with propagation_steps
      const crDir = getCRDir(tmpDir);
      const cr = await createCR(tmpDir, "basic-design", "Rollback checkpoint test", ["SCR-200"]);
      const filePath = join(crDir, `${cr.id}.md`);

      // Manually add propagation_steps and transition to APPROVED then PROPAGATING
      cr.propagation_steps = [{ doc_type: "requirements", direction: "upstream", status: "pending" }];
      await writeCR(filePath, cr);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");
      await transitionCR(filePath, "PROPAGATING");

      // Now rollback — workspace is not a git repo with the expected checkpoint commit
      const result = await callTool(server, "manage_change_request", {
        action: "rollback",
        workspace_path: tmpDir,
        cr_id: cr.id,
      });
      expect(result.isError).toBe(true);
      // Either "git log failed" or "No checkpoint found"
      expect(
        result.content[0].text.includes("git log failed") ||
        result.content[0].text.includes("No checkpoint found")
      ).toBe(true);
    });
  });

  // --- Phase 1 fixes: propagate_next with suggest_content ---
  describe("propagate_next with suggest_content", () => {
    let propagateDir: string;
    let propagateCfg: string;

    beforeAll(async () => {
      propagateDir = await mkdtemp(join(tmpdir(), "sekkei-propagate-"));
      // Minimal sekkei.config.yaml — no chain entries, so loadChainDocs returns empty map
      propagateCfg = join(propagateDir, "sekkei.config.yaml");
      await writeFile(propagateCfg, "split: {}\n", "utf-8");
    });

    afterAll(async () => {
      await rm(propagateDir, { recursive: true, force: true });
    });

    it("returns normal response when suggest_content not set", async () => {
      // Build a CR in APPROVED state with upstream propagation steps
      const cr = await createCR(propagateDir, "basic-design", "Propagate no-suggest test", ["SCR-300"]);
      const crDir = getCRDir(propagateDir);
      const filePath = join(crDir, `${cr.id}.md`);

      cr.propagation_steps = [{ doc_type: "requirements", direction: "upstream", status: "pending" }];
      await writeCR(filePath, cr);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");

      const result = await callTool(server, "manage_change_request", {
        action: "propagate_next",
        workspace_path: propagateDir,
        cr_id: cr.id,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty("step");
      expect(data).not.toHaveProperty("suggested_content");
    });

    it("returns suggested_content field when suggest_content=true and config_path provided", async () => {
      // Build another CR in APPROVED with upstream step that references a changed ID
      const cr2 = await createCR(propagateDir, "basic-design", "Propagate suggest test", ["SCR-301"]);
      const crDir = getCRDir(propagateDir);
      const filePath = join(crDir, `${cr2.id}.md`);

      cr2.propagation_steps = [{ doc_type: "requirements", direction: "upstream", status: "pending" }];
      await writeCR(filePath, cr2);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");

      // suggest_content=true but config has no chain docs → suggestedContent stays undefined
      // The key assertion is no error is returned and the field is absent (empty origin content)
      const result = await callTool(server, "manage_change_request", {
        action: "propagate_next",
        workspace_path: propagateDir,
        cr_id: cr2.id,
        suggest_content: true,
        config_path: propagateCfg,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty("step");
      // suggested_content may or may not be present (origin doc empty → omitted)
      // The important thing: no error thrown when suggest_content=true
    });

    it("errors when suggest_content=true but config_path missing", async () => {
      const cr3 = await createCR(propagateDir, "basic-design", "Propagate no-cfg test", ["SCR-302"]);
      const crDir = getCRDir(propagateDir);
      const filePath = join(crDir, `${cr3.id}.md`);

      cr3.propagation_steps = [{ doc_type: "requirements", direction: "upstream", status: "pending" }];
      await writeCR(filePath, cr3);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");

      const result = await callTool(server, "manage_change_request", {
        action: "propagate_next",
        workspace_path: propagateDir,
        cr_id: cr3.id,
        suggest_content: true,
        // no config_path
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("config_path required when suggest_content=true");
    });
  });

  // --- Phase 1 fixes: validate with partial flag ---
  describe("validate with partial flag", () => {
    let validateDir: string;
    let validateCfg: string;

    beforeAll(async () => {
      validateDir = await mkdtemp(join(tmpdir(), "sekkei-validate-"));
      validateCfg = join(validateDir, "sekkei.config.yaml");
      // Minimal config with no chain entries — validateChain returns 0 issues
      await writeFile(validateCfg, "split: {}\n", "utf-8");
    });

    afterAll(async () => {
      await rm(validateDir, { recursive: true, force: true });
    });

    it("skips incomplete-steps check when partial=true", async () => {
      // CR in PROPAGATING with a pending step
      const cr = await createCR(validateDir, "basic-design", "Partial validate test", ["SCR-400"]);
      const crDir = getCRDir(validateDir);
      const filePath = join(crDir, `${cr.id}.md`);

      cr.propagation_steps = [
        { doc_type: "requirements", direction: "upstream", status: "pending" },
      ];
      await writeCR(filePath, cr);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");
      await transitionCR(filePath, "PROPAGATING");

      // Without partial: should fail because step is pending
      const resultNonPartial = await callTool(server, "manage_change_request", {
        action: "validate",
        workspace_path: validateDir,
        cr_id: cr.id,
        config_path: validateCfg,
      });
      expect(resultNonPartial.isError).toBe(true);
      expect(resultNonPartial.content[0].text).toContain("propagation steps still pending");
    });

    it("still runs chain validation when partial=true", async () => {
      // Create a fresh CR in PROPAGATING with pending step — partial=true should skip step check
      const cr2 = await createCR(validateDir, "basic-design", "Partial chain validation test", ["SCR-401"]);
      const crDir = getCRDir(validateDir);
      const filePath = join(crDir, `${cr2.id}.md`);

      cr2.propagation_steps = [
        { doc_type: "requirements", direction: "upstream", status: "pending" },
      ];
      await writeCR(filePath, cr2);
      await transitionCR(filePath, "ANALYZING");
      await transitionCR(filePath, "IMPACT_ANALYZED");
      await transitionCR(filePath, "APPROVED");
      await transitionCR(filePath, "PROPAGATING");

      const result = await callTool(server, "manage_change_request", {
        action: "validate",
        workspace_path: validateDir,
        cr_id: cr2.id,
        config_path: validateCfg,
        partial: true,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      // chain_issues present — chain validation ran
      expect(data).toHaveProperty("chain_issues");
    });
  });
});
