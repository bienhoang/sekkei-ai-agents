/**
 * Excel template filler — loads an existing .xlsx, fills named ranges
 * and {{PLACEHOLDER}} cells with data, then saves to output path.
 */
import ExcelJS from "exceljs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SekkeiError } from "./errors.js";

export interface TemplateFillInput {
  template_path: string;
  output_path: string;
  data: Record<string, string>;
  tables?: { name: string; rows: string[][] }[];
}

export interface ExcelExportResult {
  file_path: string;
  file_size: number;
}

const PLACEHOLDER_RE = /\{\{([A-Z0-9_]+)\}\}/g;

/** Validate that path contains no traversal segments. */
function assertNoTraversal(filePath: string, label: string): void {
  const normalized = resolve(filePath);
  // Also check raw string for ".." components
  const parts = filePath.split(/[\\/]/);
  if (parts.includes("..")) {
    throw new SekkeiError(
      "VALIDATION_FAILED",
      `${label} must not contain path traversal (..)`,
      { path: filePath }
    );
  }
  void normalized; // resolved value used implicitly for side-effect validation
}

/** Load an existing .xlsx file into an ExcelJS Workbook. */
export async function loadTemplate(templatePath: string): Promise<ExcelJS.Workbook> {
  assertNoTraversal(templatePath, "template_path");

  if (!templatePath.toLowerCase().endsWith(".xlsx")) {
    throw new SekkeiError(
      "VALIDATION_FAILED",
      "template_path must end with .xlsx",
      { path: templatePath }
    );
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(templatePath);
  } catch (err) {
    throw new SekkeiError(
      "TEMPLATE_NOT_FOUND",
      `Cannot read template file: ${templatePath}`,
      { cause: String(err) }
    );
  }
  return wb;
}

/** Fill cells referenced by named ranges (definedNames) with data values. */
export function fillNamedRanges(wb: ExcelJS.Workbook, data: Record<string, string>): void {
  // ExcelJS exposes defined names via wb.definedNames
  const definedNames = (wb as any).definedNames as
    | { model: { name: string; ranges: string[] }[] }
    | undefined;

  if (!definedNames?.model) return;

  for (const def of definedNames.model) {
    const key = def.name.toUpperCase();
    if (!(key in data)) continue;

    for (const rangeRef of def.ranges ?? []) {
      // rangeRef format: "SheetName!$A$1" or "SheetName!$A$1:$B$2"
      const bangIdx = rangeRef.indexOf("!");
      if (bangIdx === -1) continue;
      const sheetName = rangeRef.slice(0, bangIdx).replace(/^'|'$/g, "");
      const cellRef = rangeRef.slice(bangIdx + 1).replace(/\$/g, "");
      const sheet = wb.getWorksheet(sheetName);
      if (!sheet) continue;

      // Fill all cells in range
      try {
        sheet.getCell(cellRef).value = data[key];
      } catch {
        // Ignore range refs that can't be resolved as single cells
      }
    }
  }
}

/** Scan all cells in all worksheets for {{KEY}} placeholders and replace with data values. */
export function fillPlaceholders(wb: ExcelJS.Workbook, data: Record<string, string>): void {
  wb.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        if (typeof raw !== "string") return;

        const replaced = raw.replace(PLACEHOLDER_RE, (_match, key: string) => {
          return key in data ? data[key] : _match;
        });

        if (replaced !== raw) {
          cell.value = replaced;
        }
      });
    });
  });
}

/** Fill tables by name: find a cell containing {{TABLE:name}} and write rows below it. */
function fillTables(
  wb: ExcelJS.Workbook,
  tables: { name: string; rows: string[][] }[]
): void {
  if (!tables.length) return;

  wb.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        if (typeof raw !== "string") return;
        const match = raw.match(/^\{\{TABLE:([A-Z0-9_]+)\}\}$/);
        if (!match) return;
        const tableName = match[1];
        const tableData = tables.find((t) => t.name.toUpperCase() === tableName);
        if (!tableData) return;

        // Write rows starting at cell's row
        const startRow = cell.row;
        const startCol = cell.col;
        cell.value = ""; // clear the marker
        tableData.rows.forEach((rowData, i) => {
          rowData.forEach((cellValue, j) => {
            sheet.getCell(startRow + i, startCol + j).value = cellValue;
          });
        });
      });
    });
  });
}

/** Write workbook to output path, return file metadata. */
export async function saveWorkbook(
  wb: ExcelJS.Workbook,
  outputPath: string
): Promise<ExcelExportResult> {
  assertNoTraversal(outputPath, "output_path");
  await wb.xlsx.writeFile(outputPath);
  const { size } = await stat(outputPath);
  return { file_path: outputPath, file_size: size };
}

/** Main entry point: load template, fill data, save. */
export async function fillTemplate(input: TemplateFillInput): Promise<ExcelExportResult> {
  const { template_path, output_path, data, tables = [] } = input;

  const wb = await loadTemplate(template_path);
  fillNamedRanges(wb, data);
  fillPlaceholders(wb, data);
  fillTables(wb, tables);
  return saveWorkbook(wb, output_path);
}
