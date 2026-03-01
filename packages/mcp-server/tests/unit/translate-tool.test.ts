import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTranslateDocumentTool } from "../../src/tools/translate.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

  describe("bidirectional glossary mapping", () => {
    const glossaryFixturePath = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/test-glossary.yaml");

    beforeAll(() => {
      const dir = dirname(glossaryFixturePath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(glossaryFixturePath, [
        "terms:",
        "  - ja: ユーザー認証",
        "    en: User Authentication",
        "    vi: Xác thực người dùng",
        "    context: Login module",
        "  - ja: 要件定義",
        "    en: Requirements Definition",
        "    context: Phase name",
        "  - ja: テスト計画",
        "    en: Test Plan",
        "    vi: Kế hoạch kiểm thử",
      ].join("\n"), "utf-8");
    });

    afterAll(() => {
      rmSync(glossaryFixturePath, { force: true });
    });

    it("maps ja→vi glossary terms correctly", async () => {
      const result = await callTool(server, "translate_document", {
        content: "テスト",
        source_lang: "ja",
        target_lang: "vi",
        glossary_path: glossaryFixturePath,
      });
      const text = result.content[0].text;
      expect(text).toContain("ユーザー認証 → Xác thực người dùng");
      expect(text).toContain("テスト計画 → Kế hoạch kiểm thử");
      // Term without vi field should be filtered out
      expect(text).not.toContain("要件定義 →");
    });

    it("maps en→ja glossary terms correctly (reverse)", async () => {
      const result = await callTool(server, "translate_document", {
        content: "test",
        source_lang: "en",
        target_lang: "ja",
        glossary_path: glossaryFixturePath,
      });
      const text = result.content[0].text;
      expect(text).toContain("User Authentication → ユーザー認証");
      expect(text).toContain("Requirements Definition → 要件定義");
    });

    it("skips glossary for unsupported target lang (zh)", async () => {
      const result = await callTool(server, "translate_document", {
        content: "テスト",
        source_lang: "ja",
        target_lang: "zh",
        glossary_path: glossaryFixturePath,
      });
      const text = result.content[0].text;
      expect(text).not.toContain("Glossary");
    });

    it("filters out terms with missing target field", async () => {
      const result = await callTool(server, "translate_document", {
        content: "テスト",
        source_lang: "ja",
        target_lang: "vi",
        glossary_path: glossaryFixturePath,
      });
      const text = result.content[0].text;
      // "要件定義" has no vi field — should not appear
      expect(text).not.toContain("要件定義");
    });

    it("maintains backwards compatibility for ja→en", async () => {
      const result = await callTool(server, "translate_document", {
        content: "テスト",
        source_lang: "ja",
        target_lang: "en",
        glossary_path: glossaryFixturePath,
      });
      const text = result.content[0].text;
      expect(text).toContain("ユーザー認証 → User Authentication");
      expect(text).toContain("要件定義 → Requirements Definition");
      expect(text).toContain("テスト計画 → Test Plan");
    });
  });
});
