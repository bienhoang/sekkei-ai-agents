/**
 * Tests for upstream-extractor: extractUpstreamItems + formatUpstreamContext
 */
import { describe, it, expect } from "@jest/globals";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractUpstreamItems, formatUpstreamContext } from "../../src/lib/upstream-extractor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REQUIREMENTS_TABLE = `
# 要件定義書

## 機能要件

| 要件ID | 要件名称 | 説明 | 優先度 |
|--------|---------|------|--------|
| REQ-001 | ユーザー認証 | ログイン・ログアウト機能 | 高 |
| REQ-002 | 商品検索 | キーワード検索、カテゴリ検索 | 高 |

## 非機能要件

| 要件ID | 要件名称 | 内容 |
|--------|---------|------|
| NFR-001 | 応答時間 | 3秒以内 |
`;

const FUNCTIONS_LIST_TABLE = `
# 機能一覧

| No | 機能ID | 機能名称 | 概要 | 優先度 |
|----|--------|---------|------|--------|
| 1 | F-001 | ログイン | ユーザー認証画面 | 高 |
| 2 | F-002 | 商品一覧 | 商品リスト表示 | 中 |
`;

const SCOPED_IDS_TABLE = `
# 機能一覧（営業管理）

| 機能ID | 機能名称 | 概要 |
|--------|---------|------|
| F-SAL-001 | 受注登録 | 受注情報の登録 |
| F-SAL-002 | 受注確認 | 受注内容の確認・承認 |
`;

const DUPLICATE_IDS_TABLE = `
# 機能一覧

| 機能ID | 機能名称 |
|--------|---------|
| F-001 | ログイン |
| F-001 | ログイン（重複） |
| F-002 | 商品一覧 |
`;

// ---------------------------------------------------------------------------
// extractUpstreamItems
// ---------------------------------------------------------------------------

describe("extractUpstreamItems", () => {
  it("extracts REQ and NFR IDs from requirements table", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "requirements.md");
    const ids = items.map(i => i.id);
    expect(ids).toContain("REQ-001");
    expect(ids).toContain("REQ-002");
    expect(ids).toContain("NFR-001");
  });

  it("assigns correct source_doc to all items", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "requirements.md");
    expect(items.every(i => i.source_doc === "requirements.md")).toBe(true);
  });

  it("extracts label from 名称 column", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ"], "requirements.md");
    const req001 = items.find(i => i.id === "REQ-001");
    expect(req001).toBeDefined();
    expect(req001!.label).toBe("ユーザー認証");
  });

  it("extracts F-001, F-002 with label from 概要 column (3rd column)", () => {
    const items = extractUpstreamItems(FUNCTIONS_LIST_TABLE, ["F"], "functions-list.md");
    const ids = items.map(i => i.id);
    expect(ids).toContain("F-001");
    expect(ids).toContain("F-002");
    const f001 = items.find(i => i.id === "F-001");
    expect(f001!.label).toBeTruthy();
  });

  it("extracts feature-scoped IDs like F-SAL-001", () => {
    const items = extractUpstreamItems(SCOPED_IDS_TABLE, ["F"], "functions-list.md");
    const ids = items.map(i => i.id);
    expect(ids).toContain("F-SAL-001");
    expect(ids).toContain("F-SAL-002");
  });

  it("skips separator rows", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "requirements.md");
    // No item should have separator characters as ID
    expect(items.every(i => !/^[-:|\s]+$/.test(i.id))).toBe(true);
  });

  it("deduplicates items with the same ID", () => {
    const items = extractUpstreamItems(DUPLICATE_IDS_TABLE, ["F"], "functions-list.md");
    const ids = items.map(i => i.id);
    const f001Count = ids.filter(id => id === "F-001").length;
    expect(f001Count).toBe(1);
  });

  it("returns empty array for content with no matching IDs", () => {
    const items = extractUpstreamItems("# 空ドキュメント\n\nコンテンツなし", ["REQ"], "empty.md");
    expect(items).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const items = extractUpstreamItems("", ["REQ", "NFR", "F"], "empty.md");
    expect(items).toHaveLength(0);
  });

  it("returns items sorted by ID numerically", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "requirements.md");
    const ids = items.map(i => i.id);
    // NFR-001 should sort before REQ-001/REQ-002 alphabetically but numeric sort is tested
    expect(ids.indexOf("REQ-001")).toBeLessThan(ids.indexOf("REQ-002"));
  });

  it("strips AI comment placeholders from labels", () => {
    const content = `
| 要件ID | 要件名称 |
|--------|---------|
| REQ-001 | <!-- AI: fill this --> |
`;
    const items = extractUpstreamItems(content, ["REQ"], "req.md");
    const req = items.find(i => i.id === "REQ-001");
    expect(req).toBeDefined();
    expect(req!.label).not.toContain("<!-- AI");
  });

  it("populates prefix field correctly", () => {
    const items = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "req.md");
    const req = items.find(i => i.id === "REQ-001");
    const nfr = items.find(i => i.id === "NFR-001");
    expect(req!.prefix).toBe("REQ");
    expect(nfr!.prefix).toBe("NFR");
  });
});

// ---------------------------------------------------------------------------
// formatUpstreamContext
// ---------------------------------------------------------------------------

describe("formatUpstreamContext", () => {
  it("returns empty string for empty items array", () => {
    expect(formatUpstreamContext([])).toBe("");
  });

  it("groups items by source_doc", () => {
    const items = [
      { id: "REQ-001", prefix: "REQ", label: "ユーザー認証", row_text: "", source_doc: "requirements.md" },
      { id: "F-001", prefix: "F", label: "ログイン", row_text: "", source_doc: "functions-list.md" },
    ];
    const output = formatUpstreamContext(items);
    expect(output).toContain("### Upstream: requirements.md");
    expect(output).toContain("### Upstream: functions-list.md");
  });

  it("formats each item as ID: label", () => {
    const items = [
      { id: "REQ-001", prefix: "REQ", label: "ユーザー認証", row_text: "", source_doc: "requirements.md" },
    ];
    const output = formatUpstreamContext(items);
    expect(output).toContain("REQ-001: ユーザー認証");
  });

  it("includes all items from same source_doc under one header", () => {
    const items = [
      { id: "REQ-001", prefix: "REQ", label: "ユーザー認証", row_text: "", source_doc: "req.md" },
      { id: "REQ-002", prefix: "REQ", label: "商品検索", row_text: "", source_doc: "req.md" },
    ];
    const output = formatUpstreamContext(items);
    const headerCount = (output.match(/### Upstream:/g) ?? []).length;
    expect(headerCount).toBe(1);
    expect(output).toContain("REQ-001: ユーザー認証");
    expect(output).toContain("REQ-002: 商品検索");
  });

  it("handles multiple source docs with correct grouping", () => {
    const reqItems = extractUpstreamItems(REQUIREMENTS_TABLE, ["REQ", "NFR"], "requirements.md");
    const fnItems = extractUpstreamItems(FUNCTIONS_LIST_TABLE, ["F"], "functions-list.md");
    const all = [...reqItems, ...fnItems];
    const output = formatUpstreamContext(all);
    expect(output).toContain("### Upstream: requirements.md");
    expect(output).toContain("### Upstream: functions-list.md");
    expect(output).toContain("REQ-001");
    expect(output).toContain("F-001");
  });
});
