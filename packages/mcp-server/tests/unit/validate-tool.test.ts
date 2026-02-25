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
      "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID | 処理分類 | 優先度 |",
      "| 1 | 商品 | 登録 | F-001 | 商品登録 | 登録する | REQ-001 | 入力 | 高 |",
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

  it("returns error when content and doc_type are both missing", async () => {
    const result = await callTool(server, "validate_document", {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
    expect(result.content[0].text).toContain("content and doc_type required");
  });

  it("returns error when only content is provided without doc_type", async () => {
    const result = await callTool(server, "validate_document", {
      content: "# Some doc\n## Section",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
  });

  it("validates test-plan required sections", async () => {
    const content = [
      "# テスト計画書",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "## テスト方針",
      "## テスト戦略",
      "## テスト環境",
      "## 完了基準",
      "| TP-ID | Level |",
      "| TP-001 | UT |",
    ].join("\n");

    const result = await callTool(server, "validate_document", {
      content,
      doc_type: "test-plan",
    });

    expect(result.content[0].text).toContain("Valid:** Yes");
  });

  it("detects missing table columns", async () => {
    const content = [
      "# 機能一覧",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "## 機能一覧",
      "| No. | 大分類 | 機能名 |",
      "| 1 | 商品 | 商品登録 |",
    ].join("\n");

    const result = await callTool(server, "validate_document", {
      content,
      doc_type: "functions-list",
    });

    // Missing columns: 中分類, 機能ID, 関連要件ID, 処理分類, 優先度
    expect(result.content[0].text).toContain("missing_column");
  });

  it("validates manifest_path requires doc_type", async () => {
    const result = await callTool(server, "validate_document", {
      manifest_path: "/some/path/_index.yaml",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("doc_type required for manifest validation");
  });

  it("handles multiple validation issues", async () => {
    const content = "# Empty doc";

    const result = await callTool(server, "validate_document", {
      content,
      doc_type: "basic-design",
    });

    expect(result.content[0].text).toContain("Valid:** No");
    // Should have multiple missing sections
    const issueMatches = result.content[0].text.match(/missing_section/g);
    expect(issueMatches!.length).toBeGreaterThan(3);
  });
});
