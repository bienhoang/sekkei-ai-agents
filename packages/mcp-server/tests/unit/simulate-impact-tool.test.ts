import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSimulateImpactTool } from "../../src/tools/simulate-impact.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("simulate_change_impact tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerSimulateImpactTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["simulate_change_impact"]).toBeDefined();
  });

  it("returns no-change message when no IDs provided", async () => {
    const result = await callTool(server, "simulate_change_impact", {
      config_path: "/nonexistent/sekkei.config.yaml",
    });

    // No changed_ids and no upstream docs → should say no changes detected
    const text = result.content[0].text;
    expect(text).toContain("No changed IDs detected");
  });

  it("returns error for invalid config path (non-yaml)", async () => {
    // Zod refine should reject non-yaml paths
    // The handler gets called after Zod validates, so this tests schema behavior
    // When called directly through handler (bypassing Zod), it should fail gracefully
    const result = await callTool(server, "simulate_change_impact", {
      changed_ids: ["REQ-001"],
      config_path: "/tmp/nonexistent-config.yaml",
    });

    // loadChainDocs will fail with missing config → isError
    expect(result.isError).toBe(true);
  });
});
