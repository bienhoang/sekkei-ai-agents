/**
 * Node.js Excel exporter using ExcelJS. Converts Markdown to .xlsx without Python.
 * If template_path is provided, delegates to excel-template-filler instead.
 */
import ExcelJS from "exceljs";
import { parse as parseYaml } from "yaml";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fillTemplate } from "./excel-template-filler.js";

export interface ExcelExportInput {
  content: string;
  doc_type: string;
  output_path: string;
  project_name?: string;
  template_path?: string;
  isMatrix?: boolean;
}

export interface ExcelExportResult {
  file_path: string;
  file_size: number;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return { meta: {}, body: content };
  try {
    const meta = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
    return { meta, body: m[2] };
  } catch {
    return { meta: {}, body: m[2] };
  }
}

function truncateSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet";
}

interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

function parseMarkdownTable(lines: string[]): MarkdownTable | null {
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 3) return null;
  const sep = tableLines[1];
  if (!/^\|[\s\-:|]+\|/.test(sep)) return null;

  const parseRow = (line: string): string[] =>
    line.split("|").slice(1, -1).map((c) => c.trim());

  return {
    headers: parseRow(tableLines[0]),
    rows: tableLines.slice(2).map(parseRow),
  };
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
}

function applyH2Style(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD0E4F7" } };
}

function applyCodeStyle(row: ExcelJS.Row): void {
  row.font = { name: "Courier New", size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8DC" } };
}

/** Apply conditional formatting to status columns */
function applyStatusFormatting(sheet: ExcelJS.Worksheet): void {
  const STATUS_COLORS: Record<string, string> = {
    draft: "FFFFFF00",
    review: "FFD0E4F7",
    approved: "FF92D050",
    revised: "FFFFA500",
    obsolete: "FFCCCCCC",
  };

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const val = String(cell.value ?? "").trim().toLowerCase();
      const color = STATUS_COLORS[val];
      if (color) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        cell.font = { bold: true };
      }
    });
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  if (!sheet.columns) return;
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });
}

function addCoverSheet(wb: ExcelJS.Workbook, meta: Record<string, unknown>, projectName: string): void {
  const sheet = wb.addWorksheet("Cover");
  const title = String(meta["title"] ?? meta["doc_type"] ?? "Document");
  const version = String(meta["version"] ?? "1.0");
  const date = String(meta["date"] ?? new Date().toISOString().slice(0, 10));

  const rows = [
    ["Title", title],
    ["Project", projectName],
    ["Version", version],
    ["Date", date],
  ];

  rows.forEach(([label, value]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  });

  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 50;
}

function renderBodyToSheet(sheet: ExcelJS.Worksheet, body: string): void {
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // H2 heading
    if (line.startsWith("## ")) {
      const row = sheet.addRow([line.slice(3)]);
      applyH2Style(row);
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      if (codeLines.length > 0) {
        const row = sheet.addRow([codeLines.join("\n")]);
        applyCodeStyle(row);
        row.getCell(1).alignment = { wrapText: true };
      }
      continue;
    }

    // Markdown table block
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        const headerRow = sheet.addRow(table.headers);
        applyHeaderStyle(headerRow);
        table.rows.forEach((r) => sheet.addRow(r));
      }
      continue;
    }

    // Plain paragraph (skip blank lines silently)
    if (line.trim()) {
      sheet.addRow([line]);
    }
    i++;
  }
}

function addSectionSheets(wb: ExcelJS.Workbook, body: string): void {
  // Split on H1 headings
  const sections = body.split(/(?=^# )/m);
  for (const section of sections) {
    const firstLine = section.split("\n")[0];
    if (!firstLine.trim()) continue;
    const heading = firstLine.startsWith("# ") ? firstLine.slice(2).trim() : firstLine.trim();
    const sheetName = truncateSheetName(heading) || "Section";
    const sheet = wb.addWorksheet(sheetName);
    renderBodyToSheet(sheet, section);
    autoFitColumns(sheet);
  }
}

function addMatrixSheet(wb: ExcelJS.Workbook, content: string): void {
  const sheet = wb.addWorksheet("Matrix");
  const lines = content.split("\n").filter((l) => l.trim().startsWith("|"));
  const table = parseMarkdownTable(lines);
  if (table) {
    const headerRow = sheet.addRow(table.headers);
    applyHeaderStyle(headerRow);
    table.rows.forEach((r) => sheet.addRow(r));
  } else {
    // fallback: dump raw lines
    content.split("\n").forEach((l) => { if (l.trim()) sheet.addRow([l]); });
  }
  autoFitColumns(sheet);
}

export async function exportToExcel(input: ExcelExportInput): Promise<ExcelExportResult> {
  const { content, output_path, project_name, template_path, isMatrix } = input;
  // Prevent path traversal
  if (resolve(output_path) !== output_path && output_path.includes("..")) {
    throw new Error("output_path must not contain path traversal");
  }

  // Branch: fill existing template if provided
  if (template_path) {
    const { meta } = parseFrontmatter(content);
    const data: Record<string, string> = {
      PROJECT_NAME: project_name ?? String(meta["project"] ?? ""),
      DOC_TYPE: input.doc_type,
      DATE: String(meta["date"] ?? new Date().toISOString().slice(0, 10)),
      VERSION: String(meta["version"] ?? "1.0"),
      CONTENT: content,
    };
    return fillTemplate({ template_path, output_path, data });
  }

  const { meta, body } = parseFrontmatter(content);
  const pName = project_name ?? String(meta["project"] ?? "");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sekkei MCP Server";
  wb.created = new Date();

  if (isMatrix) {
    addMatrixSheet(wb, content);
  } else {
    addCoverSheet(wb, meta, pName);
    addSectionSheets(wb, body);
  }

  // Apply status formatting to all sheets
  wb.eachSheet((sheet) => applyStatusFormatting(sheet));

  await wb.xlsx.writeFile(output_path);
  const { size } = await stat(output_path);
  return { file_path: output_path, file_size: size };
}

/**
 * Apply 朱書き (redline) diff highlighting to an existing Excel file.
 * Additions → green fill; deletions → red fill + strikethrough font.
 * Operates on all sheets that contain diff-annotated rows.
 *
 * @param excelPath - Path to the .xlsx file to modify in-place
 * @param diff - Diff result from diff_analyzer.py (PythonResult shape)
 */
export async function applyDiffHighlighting(
  excelPath: string,
  diff: Record<string, unknown>
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);

  // diff_analyzer.py returns { changes: Array<{ type: "add"|"delete"|"equal", lines: string[] }> }
  const changes = Array.isArray(diff["changes"]) ? diff["changes"] as Array<{ type: string; lines?: string[] }> : [];
  if (changes.length === 0) {
    return; // No diff info — leave file unchanged
  }

  // Build a line-level lookup: line content → diff type
  const lineTypes = new Map<string, "add" | "delete">();
  for (const change of changes) {
    if (change.type === "add" || change.type === "delete") {
      const lines = Array.isArray(change.lines) ? change.lines : [];
      for (const line of lines) {
        lineTypes.set(String(line).trim(), change.type);
      }
    }
  }

  wb.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const cellValue = String(row.getCell(1).value ?? "").trim();
      const diffType = lineTypes.get(cellValue);
      if (diffType === "add") {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
        });
      } else if (diffType === "delete") {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
          cell.font = { ...((cell.font as ExcelJS.Font | undefined) ?? {}), strike: true };
        });
      }
    });
  });

  await wb.xlsx.writeFile(excelPath);
}
