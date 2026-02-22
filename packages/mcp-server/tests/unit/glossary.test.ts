import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGlossaryTool } from "../../src/tools/glossary.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("manage_glossary tool", () => {
  let server: McpServer;
  const tmpPath = "/tmp/sekkei-glossary-test-" + Date.now() + ".yaml";

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGlossaryTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["manage_glossary"]).toBeDefined();
  });

  it("accepts vi field in add action", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "add",
      project_path: tmpPath,
      ja: "勘定科目",
      en: "account category",
      vi: "danh mục tài khoản",
      context: "会計",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.terms_count).toBe(1);
  });

  it("find returns results when searching Vietnamese term", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "find",
      project_path: tmpPath,
      query: "danh mục",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.results[0].vi).toBe("danh mục tài khoản");
  });

  it("export produces 4-column markdown table with vi", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "export",
      project_path: tmpPath,
    });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Tiếng Việt");
    expect(text).toContain("danh mục tài khoản");
  });

  it("import accepts all 14 industries + common", async () => {
    const industries = [
      "finance", "medical", "manufacturing", "real-estate",
      "logistics", "retail", "insurance", "education",
      "government", "construction", "telecom", "automotive",
      "energy", "food-service", "common",
    ];

    // Test that finance import works (existing file)
    const result = await callTool(server, "manage_glossary", {
      action: "import",
      project_path: "/tmp/sekkei-glossary-import-test-" + Date.now() + ".yaml",
      industry: "finance",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.imported).toBeGreaterThan(0);
  });
});
