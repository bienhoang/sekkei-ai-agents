import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTranslateDocumentTool } from "../../src/tools/translate.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("translate_document tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerTranslateDocumentTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["translate_document"]).toBeDefined();
  });

  it("returns translation context with source and target language", async () => {
    const result = await callTool(server, "translate_document", {
      content: "# 要件定義書\n## 目的\nシステムの要件を定義する。",
      source_lang: "ja",
      target_lang: "en",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("**Source:** ja");
    expect(text).toContain("**Target:** en");
    expect(text).toContain("要件定義書");
    expect(text).toContain("Translation Instructions");
  });

  it("includes content in output without glossary", async () => {
    const result = await callTool(server, "translate_document", {
      content: "REQ-001: ユーザー認証",
      source_lang: "ja",
      target_lang: "vi",
    });

    const text = result.content[0].text;
    expect(text).toContain("REQ-001");
    expect(text).toContain("Preserve all Markdown formatting");
    expect(text).not.toContain("Glossary");
  });

  it("handles missing glossary path gracefully", async () => {
    const result = await callTool(server, "translate_document", {
      content: "F-001: ログイン",
      source_lang: "ja",
      target_lang: "en",
      glossary_path: "/nonexistent/glossary.yaml",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("F-001");
  });
});
