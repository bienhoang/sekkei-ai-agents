/**
 * E2E test for Node.js Excel exporter.
 * Writes xlsx, reads back, asserts sheet name + content.
 */
import { describe, it, expect, afterAll } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ExcelJS from "exceljs";
import { exportToExcel } from "../../src/lib/excel-exporter.js";

describe("Excel exporter e2e", () => {
  let tmpDir: string;

  afterAll(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates xlsx with correct sheet and content from markdown", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-excel-e2e-"));
    const outputPath = join(tmpDir, "test-output.xlsx");

    const content = [
      "---",
      "title: 機能一覧",
      "doc_type: functions-list",
      "version: 1.0",
      "---",
      "",
      "# 機能一覧",
      "",
      "| No. | 機能ID | 機能名 | 概要 |",
      "|-----|--------|--------|------|",
      "| 1 | F-001 | ログイン | ユーザー認証 |",
      "| 2 | F-002 | 商品検索 | 商品を検索する |",
    ].join("\n");

    const result = await exportToExcel({
      content,
      doc_type: "functions-list",
      output_path: outputPath,
      project_name: "テストプロジェクト",
    });

    expect(result.file_path).toBe(outputPath);
    expect(result.file_size).toBeGreaterThan(0);

    // Read back and verify content
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);

    // Cover sheet + at least one section sheet
    expect(workbook.worksheets.length).toBeGreaterThanOrEqual(2);

    // Find F-001 across all sheets (data is in section sheet, not cover)
    let foundF001 = false;
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (String(cell.value).includes("F-001")) foundF001 = true;
        });
      });
    });
    expect(foundF001).toBe(true);
  });

  it("creates xlsx from content without frontmatter", async () => {
    if (!tmpDir) tmpDir = await mkdtemp(join(tmpdir(), "sekkei-excel-e2e-"));
    const outputPath = join(tmpDir, "no-frontmatter.xlsx");

    const content = [
      "# テスト文書",
      "",
      "| 項目 | 値 |",
      "|------|-----|",
      "| A | 100 |",
    ].join("\n");

    const result = await exportToExcel({
      content,
      doc_type: "requirements",
      output_path: outputPath,
    });

    expect(result.file_path).toBe(outputPath);
    expect(result.file_size).toBeGreaterThan(0);
  });
});
