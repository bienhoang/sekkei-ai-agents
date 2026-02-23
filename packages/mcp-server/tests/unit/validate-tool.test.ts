import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerValidateDocumentTool } from "../../src/tools/validate.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("validate_document tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerValidateDocumentTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["validate_document"]).toBeDefined();
  });

  it("validates a complete functions-list as valid", async () => {
    const content = [
      "# 機能一覧",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID |",
      "| 1 | 商品 | 登録 | F-001 | 商品登録 | 登録する | REQ-001 |",
    ].join("\n");

    const result = await callTool(server, "validate_document", {
      content,
      doc_type: "functions-list",
    });

    expect(result.content[0].text).toContain("Valid:** Yes");
  });

  it("detects missing sections", async () => {
    const content = "# 要件定義書\n## 概要\nSome text.";

    const result = await callTool(server, "validate_document", {
      content,
      doc_type: "requirements",
    });

    expect(result.content[0].text).toContain("Valid:** No");
    expect(result.content[0].text).toContain("missing_section");
  });

  it("includes cross-reference report when upstream provided", async () => {
    const current = "# NFR\n## 概要\n## 非機能要件\nRef REQ-001.";
    const upstream = "REQ-001, REQ-002";

    const result = await callTool(server, "validate_document", {
      content: current,
      doc_type: "nfr",
      upstream_content: upstream,
    });

    expect(result.content[0].text).toContain("Cross-Reference Report");
    expect(result.content[0].text).toContain("Missing: 1");
  });
});
