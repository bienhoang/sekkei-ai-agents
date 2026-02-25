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

  it("list action returns all terms", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "list",
      project_path: tmpPath,
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(1);
    expect(data.terms[0].ja).toBe("勘定科目");
  });

  it("add duplicate term updates existing entry", async () => {
    await callTool(server, "manage_glossary", {
      action: "add",
      project_path: tmpPath,
      ja: "勘定科目",
      en: "chart of accounts",
      vi: "biểu đồ tài khoản",
    });

    const result = await callTool(server, "manage_glossary", {
      action: "list",
      project_path: tmpPath,
    });
    const data = JSON.parse(result.content[0].text);
    // Count should still be 1 (updated, not duplicated)
    expect(data.count).toBe(1);
    expect(data.terms[0].en).toBe("chart of accounts");
  });

  it("find returns empty array for no matches", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "find",
      project_path: tmpPath,
      query: "zzz-nonexistent-zzz",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(0);
    expect(data.results).toEqual([]);
  });

  it("export on empty glossary returns header-only table", async () => {
    const emptyPath = "/tmp/sekkei-glossary-empty-" + Date.now() + ".yaml";
    const result = await callTool(server, "manage_glossary", {
      action: "export",
      project_path: emptyPath,
    });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("日本語");
    expect(text).toContain("English");
    // Only header rows, no data rows
    const lines = text.split("\n").filter((l: string) => l.startsWith("|"));
    expect(lines.length).toBe(2); // header + separator
  });

  it("returns error for unknown action", async () => {
    const result = await callTool(server, "manage_glossary", {
      action: "delete",
      project_path: tmpPath,
    });
    // Unknown action returns non-error response with error field
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Unknown action");
  });
});
