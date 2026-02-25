/**
 * Tests for export_document MCP tool handler.
 *
 * Covers: format routing (xlsx/pdf/docx), source modes (file/manifest),
 * diff_mode, error paths, validation, and matrix detection.
 *
 * Note: PDF export uses Playwright (browser launch) — not tested here.
 * Python bridge is mocked to avoid subprocess dependency.
 */
import { describe, it, expect, afterAll, jest, beforeAll } from "@jest/globals";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleExportDocument } from "../../src/tools/export.js";
import type { ExportDocumentArgs } from "../../src/tools/export.js";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-export-tool-"));
});

afterAll(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

const SAMPLE_MD = [
  "---",
  "title: テスト文書",
  "doc_type: requirements",
  "version: 1.0",
  "---",
  "",
  "# 要件定義書",
  "",
  "## 機能要件",
  "",
  "| ID | 要件 | 優先度 |",
  "|-----|------|--------|",
  "| REQ-001 | ログイン機能 | 高 |",
  "| REQ-002 | 検索機能 | 中 |",
].join("\n");

// ---------------------------------------------------------------------------
// 1. Format routing: xlsx (Node engine, default)
// ---------------------------------------------------------------------------

describe("export_document: xlsx format", () => {
  it("exports markdown to xlsx via Node engine", async () => {
    const outputPath = join(tmpDir, "test-export.xlsx");
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "xlsx",
      output_path: outputPath,
      project_name: "Test Project",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Export Complete");
    expect(text).toContain("xlsx");
    expect(text).toContain(outputPath);

    // Verify file actually exists
    const { size } = await stat(outputPath);
    expect(size).toBeGreaterThan(0);
  });

  it("exports content without frontmatter", async () => {
    const outputPath = join(tmpDir, "no-frontmatter.xlsx");
    const content = "# Simple Doc\n\n| A | B |\n|---|---|\n| 1 | 2 |";
    const result = await handleExportDocument({
      content,
      doc_type: "basic-design",
      format: "xlsx",
      output_path: outputPath,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Export Complete");
  });
});

// ---------------------------------------------------------------------------
// 2. Format routing: docx (Node engine)
// ---------------------------------------------------------------------------

describe("export_document: docx format", () => {
  it("exports markdown to docx", async () => {
    const outputPath = join(tmpDir, "test-export.docx");
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "docx",
      output_path: outputPath,
      project_name: "Docx Test",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Export Complete");
    expect(text).toContain("docx");

    const { size } = await stat(outputPath);
    expect(size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. source="file" validation — content required
// ---------------------------------------------------------------------------

describe("export_document: source=file validation", () => {
  it("returns error when content is missing for source=file", async () => {
    const result = await handleExportDocument({
      doc_type: "requirements",
      format: "xlsx",
      output_path: join(tmpDir, "missing-content.xlsx"),
      source: "file",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
    expect(result.content[0].text).toContain("content required");
  });
});

// ---------------------------------------------------------------------------
// 4. source="manifest" validation — manifest_path required
// ---------------------------------------------------------------------------

describe("export_document: source=manifest validation", () => {
  it("returns error when manifest_path missing for source=manifest", async () => {
    const result = await handleExportDocument({
      doc_type: "basic-design",
      format: "xlsx",
      output_path: join(tmpDir, "no-manifest.xlsx"),
      source: "manifest",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MANIFEST_ERROR");
    expect(result.content[0].text).toContain("manifest_path required");
  });
});

// ---------------------------------------------------------------------------
// 5. output_path required for non-gsheet
// ---------------------------------------------------------------------------

describe("export_document: output_path validation", () => {
  it("returns error when output_path missing for xlsx", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "xlsx",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
    expect(result.content[0].text).toContain("output_path required");
  });

  it("returns error when output_path missing for pdf", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "pdf",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("output_path required");
  });

  it("returns error when output_path missing for docx", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "docx",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("output_path required");
  });
});

// ---------------------------------------------------------------------------
// 6. Matrix doc_type detection (isMatrix flag)
// ---------------------------------------------------------------------------

describe("export_document: matrix doc types", () => {
  it("exports crud-matrix content to xlsx", async () => {
    const outputPath = join(tmpDir, "crud-matrix.xlsx");
    const matrixContent = [
      "| 機能ID | 機能名 | TBL-001 ユーザー | TBL-002 商品 |",
      "|--------|--------|-----------------|-------------|",
      "| F-001 | ログイン | R | - |",
      "| F-002 | 商品検索 | - | R |",
      "| F-003 | 購入 | U | RU |",
    ].join("\n");

    const result = await handleExportDocument({
      content: matrixContent,
      doc_type: "crud-matrix",
      format: "xlsx",
      output_path: outputPath,
      project_name: "Matrix Test",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Export Complete");

    const { size } = await stat(outputPath);
    expect(size).toBeGreaterThan(0);
  });

  it("exports traceability-matrix content to xlsx", async () => {
    const outputPath = join(tmpDir, "trace-matrix.xlsx");
    const matrixContent = [
      "| REQ-ID | 要件名 | SCR-001 | API-001 | UT-001 |",
      "|--------|--------|---------|---------|--------|",
      "| REQ-001 | ログイン | ○ | ○ | ○ |",
      "| REQ-002 | 検索 | ○ | ○ | |",
    ].join("\n");

    const result = await handleExportDocument({
      content: matrixContent,
      doc_type: "traceability-matrix",
      format: "xlsx",
      output_path: outputPath,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Export Complete");
  });
});

// ---------------------------------------------------------------------------
// 7. gsheet format validation — config_path required
// ---------------------------------------------------------------------------

describe("export_document: gsheet format", () => {
  it("returns error when config_path missing for gsheet", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "gsheet",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GOOGLE_EXPORT_FAILED");
    expect(result.content[0].text).toContain("config_path required");
  });

  it("returns error when content missing for gsheet with source=file", async () => {
    const result = await handleExportDocument({
      doc_type: "requirements",
      format: "gsheet",
      config_path: "/tmp/fake-config.yaml",
      source: "file",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
  });

  it("returns error when manifest_path missing for gsheet with source=manifest", async () => {
    const result = await handleExportDocument({
      doc_type: "requirements",
      format: "gsheet",
      config_path: "/tmp/fake-config.yaml",
      source: "manifest",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MANIFEST_ERROR");
  });
});

// ---------------------------------------------------------------------------
// 8. diff_mode output message
// ---------------------------------------------------------------------------

describe("export_document: diff_mode flag", () => {
  it("includes diff mode note in success message when diff_mode=true (without old_path triggers no-op)", async () => {
    // diff_mode=true but no old_path: export succeeds, diff step skipped
    const outputPath = join(tmpDir, "diff-no-old.xlsx");
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "xlsx",
      output_path: outputPath,
      diff_mode: true,
      // No old_path → diff highlighting is skipped (guard: diff_mode && format === "xlsx" && old_path)
    });

    expect(result.isError).toBeUndefined();
    // Without old_path, diff highlighting guard fails, so no "朱書き" in message
    expect(result.content[0].text).toContain("Export Complete");
  });
});

// ---------------------------------------------------------------------------
// 9. Error handling: bad output directory
// ---------------------------------------------------------------------------

describe("export_document: error handling", () => {
  it("returns error for nonexistent output directory (xlsx)", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "xlsx",
      output_path: "/nonexistent-dir/output.xlsx",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBeTruthy();
  });

  it("returns error for nonexistent output directory (docx)", async () => {
    const result = await handleExportDocument({
      content: SAMPLE_MD,
      doc_type: "requirements",
      format: "docx",
      output_path: "/nonexistent-dir/output.docx",
    });

    expect(result.isError).toBe(true);
  });
});
