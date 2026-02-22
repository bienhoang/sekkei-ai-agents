/**
 * Node.js Word (.docx) exporter using the `docx` npm package.
 * Converts Markdown to .docx without Python.
 */
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { marked, type Token } from "marked";
import { writeFile, stat } from "node:fs/promises";
import { SekkeiError } from "./errors.js";

// marked v17 exposes Token as a tagged union — define minimal shapes locally
type MHeading   = Token & { depth: number; text: string };
type MParagraph = Token & { text: string; tokens?: Token[] };
type MTableCell = { text: string };
type MTable     = Token & { header: MTableCell[]; rows: MTableCell[][] };
type MList      = Token & { ordered: boolean; items: Array<{ text: string }> };
type MCode      = Token & { text: string };

export interface DocxExportInput {
  content: string;
  doc_type: string;
  output_path: string;
  project_name?: string;
}

export interface DocxExportResult {
  file_path: string;
  file_size: number;
}

// ─── Internal block types ────────────────────────────────────────────────────

type HeadingBlock  = { kind: "heading"; level: 1 | 2 | 3 | 4; text: string };
type ParagraphBlock = { kind: "paragraph"; runs: InlineRun[] };
type TableBlock    = { kind: "table"; headers: string[]; rows: string[][] };
type ListBlock     = { kind: "list"; ordered: boolean; items: string[] };
type CodeBlock     = { kind: "code"; text: string };

type DocxBlock = HeadingBlock | ParagraphBlock | TableBlock | ListBlock | CodeBlock;
type InlineRun = { text: string; bold?: boolean; italic?: boolean };

// ─── Inline token parsing ────────────────────────────────────────────────────

function parseInlineTokens(tokens: Token[]): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const t of tokens) {
    if (t.type === "text") {
      runs.push({ text: (t as unknown as { text: string }).text });
    } else if (t.type === "strong") {
      const inner = (t as unknown as { tokens?: Token[] }).tokens ?? [];
      for (const r of parseInlineTokens(inner)) runs.push({ ...r, bold: true });
    } else if (t.type === "em") {
      const inner = (t as unknown as { tokens?: Token[] }).tokens ?? [];
      for (const r of parseInlineTokens(inner)) runs.push({ ...r, italic: true });
    } else if (t.type === "codespan") {
      runs.push({ text: (t as unknown as { text: string }).text });
    } else if ("raw" in t) {
      runs.push({ text: (t as { raw: string }).raw });
    }
  }
  return runs.length > 0 ? runs : [{ text: "" }];
}

// ─── Markdown → block list ───────────────────────────────────────────────────

export function parseMarkdownToBlocks(content: string): DocxBlock[] {
  const tokens = marked.lexer(content);
  const blocks: DocxBlock[] = [];

  for (const t of tokens) {
    if (t.type === "heading") {
      const h = t as unknown as MHeading;
      const lvl = Math.min(Math.max(h.depth, 1), 4) as 1 | 2 | 3 | 4;
      blocks.push({ kind: "heading", level: lvl, text: h.text });
    } else if (t.type === "paragraph") {
      const p = t as unknown as MParagraph;
      const fallback: Token[] = [{ type: "text", raw: p.text, text: p.text } as Token];
      blocks.push({ kind: "paragraph", runs: parseInlineTokens(p.tokens ?? fallback) });
    } else if (t.type === "table") {
      const tbl = t as unknown as MTable;
      blocks.push({
        kind: "table",
        headers: tbl.header.map((h) => h.text),
        rows: tbl.rows.map((r) => r.map((c) => c.text)),
      });
    } else if (t.type === "list") {
      const lst = t as unknown as MList;
      blocks.push({
        kind: "list",
        ordered: lst.ordered,
        items: lst.items.map((i) => i.text),
      });
    } else if (t.type === "code") {
      blocks.push({ kind: "code", text: (t as unknown as MCode).text });
    }
    // space / hr / blockquote — skip for MVP
  }
  return blocks;
}

// ─── Block → docx element ────────────────────────────────────────────────────

const HEADING_MAP: Record<1 | 2 | 3 | 4, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "999999" };

function runsToTextRuns(runs: InlineRun[]): TextRun[] {
  return runs.map((r) => new TextRun({ text: r.text, bold: r.bold ?? false, italics: r.italic ?? false }));
}

function blockToElements(block: DocxBlock): Array<Paragraph | Table> {
  switch (block.kind) {
    case "heading":
      return [new Paragraph({ text: block.text, heading: HEADING_MAP[block.level] })];

    case "paragraph":
      return [new Paragraph({ children: runsToTextRuns(block.runs) })];

    case "list":
      return block.items.map((item, idx) =>
        new Paragraph({ text: `${block.ordered ? `${idx + 1}.` : "•"} ${item}` })
      );

    case "code":
      return [new Paragraph({
        children: [new TextRun({ text: block.text, font: "Courier New", size: 18 })],
        shading: { fill: "F5F5F5" },
      })];

    case "table": {
      const borders = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
      const headerRow = new TableRow({
        tableHeader: true,
        children: block.headers.map((h) =>
          new TableCell({
            borders,
            shading: { fill: "DDEEFF" },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
          })
        ),
      });
      const dataRows = block.rows.map((row) =>
        new TableRow({
          children: row.map((cell) =>
            new TableCell({ borders, children: [new Paragraph({ text: cell })] })
          ),
        })
      );
      return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] })];
    }
  }
}

// ─── Document builder ────────────────────────────────────────────────────────

export function buildDocxDocument(blocks: DocxBlock[]): Document {
  const children: Array<Paragraph | Table> = blocks.flatMap(blockToElements);
  return new Document({
    styles: { default: { document: { run: { font: "Noto Sans JP", size: 20 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 in twips
          margin: { top: 720, bottom: 720, left: 900, right: 720 },
        },
      },
      children,
    }],
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function exportToDocx(input: DocxExportInput): Promise<DocxExportResult> {
  const { content, output_path } = input;

  if (output_path.includes("..")) {
    throw new SekkeiError("VALIDATION_FAILED", "output_path must not contain path traversal");
  }

  try {
    const blocks = parseMarkdownToBlocks(content);
    const doc = buildDocxDocument(blocks);
    const buffer = await Packer.toBuffer(doc);
    await writeFile(output_path, buffer);
    const { size } = await stat(output_path);
    return { file_path: output_path, file_size: size };
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new SekkeiError("GENERATION_FAILED", `docx export failed: ${msg}`);
  }
}
