/**
 * Tests for Excel exporter matrix-specific paths and diff highlighting.
 *
 * Covers: addMatrixSheet (via exportToExcel with isMatrix=true),
 * applyDiffHighlighting, cover sheet omission for matrix, and edge cases.
 */
import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ExcelJS from "exceljs";
import { exportToExcel, applyDiffHighlighting } from "../../src/lib/excel-exporter.js";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-matrix-test-"));
});

afterAll(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Matrix export: isMatrix=true uses single "Matrix" sheet (no cover)
// ---------------------------------------------------------------------------

describe("exportToExcel: matrix mode", () => {
  it("creates xlsx with Matrix sheet for crud-matrix content", async () => {
    const outputPath = join(tmpDir, "crud-matrix.xlsx");
    const content = [
      "| 機能ID | 機能名 | TBL-001 ユーザー | TBL-002 商品 |",
      "|--------|--------|-----------------|-------------|",
      "| F-001 | ログイン | CR | - |",
      "| F-002 | 商品検索 | R | R |",
      "| F-003 | 購入 | U | RU |",
    ].join("\n");

    const result = await exportToExcel({
      content,
      doc_type: "crud-matrix",
      output_path: outputPath,
      isMatrix: true,
    });

    expect(result.file_path).toBe(outputPath);
    expect(result.file_size).toBeGreaterThan(0);

    // Read back and verify structure
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(outputPath);

    // Matrix mode: should have exactly 1 sheet named "Matrix" (no Cover)
    expect(wb.worksheets.length).toBe(1);
    expect(wb.worksheets[0].name).toBe("Matrix");

    // Verify header row exists with expected columns
    const sheet = wb.getWorksheet("Matrix")!;
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => {
      headers.push(String(cell.value ?? ""));
    });
    expect(headers).toContain("機能ID");
    expect(headers).toContain("機能名");
  });

  it("creates xlsx with Matrix sheet for traceability-matrix", async () => {
    const outputPath = join(tmpDir, "trace-matrix.xlsx");
    const content = [
      "| REQ-ID | 要件名 | SCR-001 | API-001 | UT-001 | IT-001 |",
      "|--------|--------|---------|---------|--------|--------|",
      "| REQ-001 | ログイン | ○ | ○ | ○ | ○ |",
      "| REQ-002 | 検索 | ○ | ○ | | |",
      "| REQ-003 | 登録 | | ○ | ○ | |",
    ].join("\n");

    const result = await exportToExcel({
      content,
      doc_type: "traceability-matrix",
      output_path: outputPath,
      isMatrix: true,
    });

    expect(result.file_size).toBeGreaterThan(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(outputPath);
    expect(wb.worksheets.length).toBe(1);
    expect(wb.worksheets[0].name).toBe("Matrix");

    // Verify data row count (header + 3 data rows)
    const sheet = wb.getWorksheet("Matrix")!;
    expect(sheet.rowCount).toBe(4); // 1 header + 3 data
  });

  it("handles matrix content without valid table (fallback to raw lines)", async () => {
    const outputPath = join(tmpDir, "bad-matrix.xlsx");
    // Content without proper markdown table separators
    const content = "No table here\nJust plain text\nLine three";

    const result = await exportToExcel({
      content,
      doc_type: "crud-matrix",
      output_path: outputPath,
      isMatrix: true,
    });

    expect(result.file_size).toBeGreaterThan(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(outputPath);
    const sheet = wb.getWorksheet("Matrix")!;
    // Fallback: each non-empty line becomes a row
    expect(sheet.rowCount).toBe(3);
  });

  it("handles empty matrix content", async () => {
    const outputPath = join(tmpDir, "empty-matrix.xlsx");
    const result = await exportToExcel({
      content: "",
      doc_type: "crud-matrix",
      output_path: outputPath,
      isMatrix: true,
    });

    expect(result.file_size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Normal (non-matrix) export: Cover sheet + section sheets
// ---------------------------------------------------------------------------

describe("exportToExcel: normal mode (non-matrix)", () => {
  it("creates Cover sheet + section sheets", async () => {
    const outputPath = join(tmpDir, "normal-doc.xlsx");
    const content = [
      "---",
      "title: テスト文書",
      "version: 2.0",
      "---",
      "",
      "# セクション1",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "# セクション2",
      "",
      "Some paragraph text.",
    ].join("\n");

    const result = await exportToExcel({
      content,
      doc_type: "requirements",
      output_path: outputPath,
      project_name: "テストプロジェクト",
    });

    expect(result.file_size).toBeGreaterThan(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(outputPath);

    // Should have Cover + 2 section sheets
    expect(wb.worksheets.length).toBe(3);
    expect(wb.worksheets[0].name).toBe("Cover");

    // Cover sheet has project name
    const coverSheet = wb.getWorksheet("Cover")!;
    let foundProject = false;
    coverSheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (String(cell.value).includes("テストプロジェクト")) foundProject = true;
      });
    });
    expect(foundProject).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. applyDiffHighlighting
// ---------------------------------------------------------------------------

describe("applyDiffHighlighting", () => {
  it("applies green fill to added lines and red+strikethrough to deleted lines", async () => {
    // Create a base xlsx file
    const filePath = join(tmpDir, "diff-test.xlsx");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.addRow(["Added line"]);
    sheet.addRow(["Unchanged line"]);
    sheet.addRow(["Deleted line"]);
    await wb.xlsx.writeFile(filePath);

    // Apply diff highlighting
    const diffResult = {
      changes: [
        { type: "add", lines: ["Added line"] },
        { type: "equal", lines: ["Unchanged line"] },
        { type: "delete", lines: ["Deleted line"] },
      ],
    };

    await applyDiffHighlighting(filePath, diffResult);

    // Read back and verify styling
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);
    const sheet2 = wb2.getWorksheet("Data")!;

    // Row 1 (added): green fill
    const addedCell = sheet2.getRow(1).getCell(1);
    const addedFill = addedCell.fill as ExcelJS.FillPattern;
    expect(addedFill?.fgColor?.argb).toBe("FF92D050");

    // Row 3 (deleted): red fill + strikethrough
    const deletedCell = sheet2.getRow(3).getCell(1);
    const deletedFill = deletedCell.fill as ExcelJS.FillPattern;
    expect(deletedFill?.fgColor?.argb).toBe("FFFF0000");
    expect(deletedCell.font?.strike).toBe(true);

    // Row 2 (unchanged): no special fill applied by diff
    // (may have fill from status formatting, but not from diff)
    const unchangedCell = sheet2.getRow(2).getCell(1);
    const unchangedFill = unchangedCell.fill as ExcelJS.FillPattern | undefined;
    // Unchanged rows should not have diff-specific colors
    if (unchangedFill?.fgColor?.argb) {
      expect(unchangedFill.fgColor.argb).not.toBe("FF92D050");
      expect(unchangedFill.fgColor.argb).not.toBe("FFFF0000");
    }
  });

  it("is a no-op when diff has no changes", async () => {
    const filePath = join(tmpDir, "diff-noop.xlsx");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.addRow(["Some content"]);
    await wb.xlsx.writeFile(filePath);

    const { size: sizeBefore } = await stat(filePath);

    await applyDiffHighlighting(filePath, { changes: [] });

    // File should still be valid (no crash)
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);
    expect(wb2.worksheets.length).toBe(1);
  });

  it("is a no-op when diff has no changes key", async () => {
    const filePath = join(tmpDir, "diff-no-key.xlsx");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.addRow(["Content"]);
    await wb.xlsx.writeFile(filePath);

    // No "changes" key in diff result
    await applyDiffHighlighting(filePath, {});

    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);
    expect(wb2.worksheets.length).toBe(1);
  });

  it("handles diff with lines that do not match any cell", async () => {
    const filePath = join(tmpDir, "diff-no-match.xlsx");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.addRow(["Cell A"]);
    sheet.addRow(["Cell B"]);
    await wb.xlsx.writeFile(filePath);

    const diffResult = {
      changes: [
        { type: "add", lines: ["Nonexistent line"] },
        { type: "delete", lines: ["Also nonexistent"] },
      ],
    };

    await applyDiffHighlighting(filePath, diffResult);

    // Should not crash, cells remain unstyled
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);
    expect(wb2.worksheets.length).toBe(1);
  });

  it("applies highlighting across multiple sheets", async () => {
    const filePath = join(tmpDir, "diff-multi-sheet.xlsx");
    const wb = new ExcelJS.Workbook();
    const sheet1 = wb.addWorksheet("Sheet1");
    sheet1.addRow(["Added in sheet1"]);
    const sheet2 = wb.addWorksheet("Sheet2");
    sheet2.addRow(["Added in sheet2"]);
    await wb.xlsx.writeFile(filePath);

    const diffResult = {
      changes: [
        { type: "add", lines: ["Added in sheet1", "Added in sheet2"] },
      ],
    };

    await applyDiffHighlighting(filePath, diffResult);

    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);

    // Both sheets should have green fill on row 1
    const s1Cell = wb2.getWorksheet("Sheet1")!.getRow(1).getCell(1);
    const s2Cell = wb2.getWorksheet("Sheet2")!.getRow(1).getCell(1);
    expect((s1Cell.fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe("FF92D050");
    expect((s2Cell.fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe("FF92D050");
  });
});

// ---------------------------------------------------------------------------
// 4. Path traversal prevention
// ---------------------------------------------------------------------------

describe("exportToExcel: security", () => {
  it("rejects output_path with path traversal", async () => {
    await expect(
      exportToExcel({
        content: "# Test",
        doc_type: "requirements",
        output_path: "/tmp/../etc/evil.xlsx",
      })
    ).rejects.toThrow("path traversal");
  });
});
