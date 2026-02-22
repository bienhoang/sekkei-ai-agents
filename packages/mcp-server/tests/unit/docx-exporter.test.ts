/**
 * Unit tests for docx-exporter: parseMarkdownToBlocks, buildDocxDocument, exportToDocx.
 */
import { describe, it, expect, afterAll } from "@jest/globals";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Packer } from "docx";
import {
  parseMarkdownToBlocks,
  buildDocxDocument,
  exportToDocx,
} from "../../src/lib/docx-exporter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let tmpDir: string;

afterAll(async () => {
  if (tmpDir) {
    try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  }
});

// ─── parseMarkdownToBlocks ───────────────────────────────────────────────────

describe("parseMarkdownToBlocks", () => {
  it("parses H1–H4 headings", () => {
    const md = "# H1\n## H2\n### H3\n#### H4\n";
    const blocks = parseMarkdownToBlocks(md);
    const headings = blocks.filter((b) => b.kind === "heading");
    expect(headings).toHaveLength(4);
    expect(headings[0]).toMatchObject({ kind: "heading", level: 1, text: "H1" });
    expect(headings[1]).toMatchObject({ kind: "heading", level: 2, text: "H2" });
    expect(headings[2]).toMatchObject({ kind: "heading", level: 3, text: "H3" });
    expect(headings[3]).toMatchObject({ kind: "heading", level: 4, text: "H4" });
  });

  it("clamps deep headings to level 4", () => {
    const blocks = parseMarkdownToBlocks("##### H5\n###### H6\n");
    const headings = blocks.filter((b) => b.kind === "heading");
    headings.forEach((h) => {
      if (h.kind === "heading") expect(h.level).toBeLessThanOrEqual(4);
    });
  });

  it("parses markdown table", () => {
    const md = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |\n";
    const blocks = parseMarkdownToBlocks(md);
    const tables = blocks.filter((b) => b.kind === "table");
    expect(tables).toHaveLength(1);
    const tbl = tables[0];
    if (tbl.kind !== "table") throw new Error("not table");
    expect(tbl.headers).toEqual(["Name", "Age"]);
    expect(tbl.rows).toHaveLength(2);
    expect(tbl.rows[0]).toEqual(["Alice", "30"]);
    expect(tbl.rows[1]).toEqual(["Bob", "25"]);
  });

  it("parses unordered list items", () => {
    const md = "- item one\n- item two\n- item three\n";
    const blocks = parseMarkdownToBlocks(md);
    const lists = blocks.filter((b) => b.kind === "list");
    expect(lists).toHaveLength(1);
    const lst = lists[0];
    if (lst.kind !== "list") throw new Error("not list");
    expect(lst.ordered).toBe(false);
    expect(lst.items).toHaveLength(3);
  });

  it("parses ordered list", () => {
    const md = "1. first\n2. second\n";
    const blocks = parseMarkdownToBlocks(md);
    const lists = blocks.filter((b) => b.kind === "list");
    expect(lists).toHaveLength(1);
    const lst = lists[0];
    if (lst.kind !== "list") throw new Error("not list");
    expect(lst.ordered).toBe(true);
  });

  it("parses fenced code block", () => {
    const md = "```typescript\nconst x = 1;\n```\n";
    const blocks = parseMarkdownToBlocks(md);
    const codes = blocks.filter((b) => b.kind === "code");
    expect(codes).toHaveLength(1);
    const code = codes[0];
    if (code.kind !== "code") throw new Error("not code");
    expect(code.text).toContain("const x = 1");
  });

  it("parses paragraph with bold and italic inline", () => {
    const md = "This is **bold** and _italic_ text.\n";
    const blocks = parseMarkdownToBlocks(md);
    const paras = blocks.filter((b) => b.kind === "paragraph");
    expect(paras.length).toBeGreaterThan(0);
    const para = paras[0];
    if (para.kind !== "paragraph") throw new Error("not paragraph");
    const boldRun = para.runs.find((r) => r.bold);
    const italicRun = para.runs.find((r) => r.italic);
    expect(boldRun?.text).toBe("bold");
    expect(italicRun?.text).toBe("italic");
  });

  it("returns empty array for empty input", () => {
    expect(parseMarkdownToBlocks("")).toHaveLength(0);
  });
});

// ─── buildDocxDocument ───────────────────────────────────────────────────────

describe("buildDocxDocument", () => {
  it("produces a Document with section children", () => {
    const blocks = parseMarkdownToBlocks("# Title\n\nSome paragraph.\n");
    const doc = buildDocxDocument(blocks);
    expect(doc).toBeDefined();
    // Document must serialize to a non-empty buffer
  });

  it("serializes to a valid non-empty buffer", async () => {
    const blocks = parseMarkdownToBlocks("# Heading\n\nParagraph.\n");
    const doc = buildDocxDocument(blocks);
    const buf = await Packer.toBuffer(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("produces docx buffer with table content", async () => {
    const md = "| Col1 | Col2 |\n|------|------|\n| A | B |\n";
    const blocks = parseMarkdownToBlocks(md);
    const doc = buildDocxDocument(blocks);
    const buf = await Packer.toBuffer(doc);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles empty block list gracefully", async () => {
    const doc = buildDocxDocument([]);
    const buf = await Packer.toBuffer(doc);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ─── exportToDocx ────────────────────────────────────────────────────────────

describe("exportToDocx", () => {
  const SAMPLE_MD = `---
title: Test Document
version: 1.0
---
# Introduction

This is a **test** document for the Sekkei MCP server.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| R-001 | Export to docx | High |
| R-002 | Japanese fonts | Medium |

## Details

- Item one
- Item two

\`\`\`typescript
const x: number = 42;
\`\`\`
`;

  it("writes .docx file and returns correct metadata", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-docx-"));
    const outPath = join(tmpDir, "test-output.docx");

    const result = await exportToDocx({
      content: SAMPLE_MD,
      doc_type: "basic-design",
      output_path: outPath,
      project_name: "Test Project",
    });

    expect(result.file_path).toBe(outPath);
    expect(result.file_size).toBeGreaterThan(0);

    const { size } = await stat(outPath);
    expect(size).toBe(result.file_size);
    expect(size).toBeGreaterThan(0);
  });

  it("output buffer starts with PK magic bytes (valid zip/docx)", async () => {
    if (!tmpDir) tmpDir = await mkdtemp(join(tmpdir(), "sekkei-docx-"));
    const outPath = join(tmpDir, "magic-test.docx");
    await exportToDocx({
      content: "# Hello\n\nWorld",
      doc_type: "requirements",
      output_path: outPath,
    });

    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(outPath);
    // .docx is a ZIP — first bytes should be PK (0x50 0x4B)
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("rejects output_path with path traversal", async () => {
    await expect(
      exportToDocx({
        content: "# Test",
        doc_type: "requirements",
        output_path: "/tmp/../etc/malicious.docx",
      })
    ).rejects.toThrow("path traversal");
  });

  it("throws GENERATION_FAILED on write error (bad directory)", async () => {
    await expect(
      exportToDocx({
        content: "# Test",
        doc_type: "requirements",
        output_path: "/nonexistent-dir/out.docx",
      })
    ).rejects.toMatchObject({ code: "GENERATION_FAILED" });
  });
});
