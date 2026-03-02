/**
 * Integration tests for manage_version tool registration
 */
import { describe, it, expect } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerVersionTool } from "../../src/tools/version.js";
import { handleVersion } from "../../src/tools/version.js";
import type { VersionArgs } from "../../src/tools/version.js";

describe("manage_version tool registration", () => {
  it("is registered on server", () => {
    const server = new McpServer({ name: "test", version: "1.0" });
    registerVersionTool(server);

    expect((server as any)._registeredTools["manage_version"]).toBeDefined();
  });

  it("handler returns error for unknown action", async () => {
    const args: VersionArgs = {
      action: "invalid" as any,
      workspace_path: "/tmp/test",
    };

    const result = await handleVersion(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown action");
  });

  it("handler catches errors and returns error result", async () => {
    const args: VersionArgs = {
      action: "bump",
      workspace_path: "/nonexistent/path/that/does/not/exist",
      doc_type: "requirements",
      bump_type: "patch",
      reason: "test",
    };

    const result = await handleVersion(args);

    expect(result.isError).toBe(true);
  });
});
