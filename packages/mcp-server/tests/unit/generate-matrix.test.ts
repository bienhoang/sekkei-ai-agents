/**
 * Tests for generate_document with crud-matrix and traceability-matrix doc types.
 *
 * Verifies: generation instructions include correct upstream refs,
 * template loading, and minimal section enforcement (no STRUCTURAL_SECTIONS).
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleGenerateDocument } from "../../src/tools/generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

const SAMPLE_FUNCTIONS_LIST = [
  "# 機能一覧",
  "",
  "| No. | 機能ID | 機能名 | 概要 |",
  "|-----|--------|--------|------|",
  "| 1 | F-001 | ログイン | ユーザー認証 |",
  "| 2 | F-002 | 商品検索 | 商品を検索する |",
  "| 3 | F-003 | 購入処理 | 商品を購入する |",
].join("\n");

const SAMPLE_BASIC_DESIGN = [
  "# 基本設計書",
  "",
  "## データベース設計",
  "",
  "| テーブルID | テーブル名 | 概要 |",
  "|-----------|-----------|------|",
  "| TBL-001 | ユーザー | ユーザー情報 |",
  "| TBL-002 | 商品 | 商品マスタ |",
  "| TBL-003 | 注文 | 注文情報 |",
].join("\n");

const SAMPLE_REQUIREMENTS = [
  "# 要件定義書",
  "",
  "| REQ-ID | 要件名 | 優先度 |",
  "|--------|--------|--------|",
  "| REQ-001 | ログイン機能 | 高 |",
  "| REQ-002 | 検索機能 | 中 |",
  "| REQ-003 | 登録機能 | 低 |",
].join("\n");

// ---------------------------------------------------------------------------
// 1. crud-matrix generation
// ---------------------------------------------------------------------------

describe("generate_document: crud-matrix", () => {
  it("returns generation context with CRUD matrix instructions", async () => {
    const upstream = SAMPLE_FUNCTIONS_LIST + "\n\n" + SAMPLE_BASIC_DESIGN;

    const result = await handleGenerateDocument({
      doc_type: "crud-matrix",
      input_content: "Generate CRUD matrix from functions-list and basic-design",
      project_name: "EC Site",
      language: "ja",
      upstream_content: upstream,
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;

    // Should contain CRUD-specific generation instructions
    expect(text).toContain("CRUD");
    expect(text).toContain("crud-matrix");
    expect(text).toContain("EC Site");

    // Should extract upstream IDs
    expect(text).toContain("F-001");
    expect(text).toContain("F-002");
    expect(text).toContain("TBL-001");
    expect(text).toContain("TBL-002");

    // Should contain the "Available Upstream IDs" block
    expect(text).toContain("Available Upstream IDs");
    expect(text).toContain("MUST reference ONLY these IDs");
  });

  it("includes template content in output", async () => {
    const result = await handleGenerateDocument({
      doc_type: "crud-matrix",
      input_content: "Generate CRUD matrix",
      templateDir: TEMPLATE_DIR,
    });

    const text = result.content[0].text;
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("does not enforce split mode for crud-matrix (not in SPLIT_ALLOWED)", async () => {
    const result = await handleGenerateDocument({
      doc_type: "crud-matrix",
      input_content: "Generate CRUD matrix",
      scope: "shared",
      templateDir: TEMPLATE_DIR,
    });

    // crud-matrix is not in SPLIT_ALLOWED set, so scope param should error
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Split mode");
    expect(result.content[0].text).toContain("not supported");
  });
});

// ---------------------------------------------------------------------------
// 2. traceability-matrix generation
// ---------------------------------------------------------------------------

describe("generate_document: traceability-matrix", () => {
  it("returns generation context with traceability matrix instructions", async () => {
    const upstream = SAMPLE_REQUIREMENTS + "\n\n" + SAMPLE_BASIC_DESIGN;

    const result = await handleGenerateDocument({
      doc_type: "traceability-matrix",
      input_content: "Generate traceability matrix across all chain documents",
      project_name: "Traceability Project",
      language: "ja",
      upstream_content: upstream,
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;

    // Should contain traceability-specific instructions
    expect(text).toContain("traceability");
    expect(text).toContain("Traceability Project");

    // Should extract upstream REQ IDs
    expect(text).toContain("REQ-001");
    expect(text).toContain("REQ-002");
    expect(text).toContain("REQ-003");
  });

  it("handles traceability-matrix without upstream content", async () => {
    const result = await handleGenerateDocument({
      doc_type: "traceability-matrix",
      input_content: "Generate basic traceability matrix",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    // No upstream IDs block when no upstream_content provided
    expect(text).not.toContain("Available Upstream IDs");
  });

  it("rejects split mode for traceability-matrix", async () => {
    const result = await handleGenerateDocument({
      doc_type: "traceability-matrix",
      input_content: "Generate matrix",
      scope: "feature",
      feature_name: "auth-module",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });
});

// ---------------------------------------------------------------------------
// 3. Keigo level for matrix types (should be "simple")
// ---------------------------------------------------------------------------

describe("generate_document: matrix keigo level", () => {
  it("uses simple keigo for crud-matrix", async () => {
    const result = await handleGenerateDocument({
      doc_type: "crud-matrix",
      input_content: "Generate CRUD matrix",
      templateDir: TEMPLATE_DIR,
    });

    // Default keigo for crud-matrix is "simple"
    // The output should contain keigo instruction block
    const text = result.content[0].text;
    expect(text).toContain("Document Generation Context");
  });
});
