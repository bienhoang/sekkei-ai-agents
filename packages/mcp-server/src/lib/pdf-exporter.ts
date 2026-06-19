/**
 * PDF exporter using Playwright (Chromium) — renders Markdown → HTML → PDF with Noto Sans JP fonts.
 */
import { writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { marked } from "marked";
import { ensureFonts } from "./font-manager.js";
import { browserPool } from "./browser-pool.js";
import { logger } from "./logger.js";
import { parseFrontmatter } from "./frontmatter-parser.js";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface PdfExportInput {
  content: string;
  doc_type: string;
  output_path: string;
  project_name?: string;
}

export interface PdfExportResult {
  file_path: string;
  file_size: number;
}

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function extractToc(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const headingRe = /^(#{1,2})\s+(.+)$/gm;
  let match;
  while ((match = headingRe.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.replace(/[^\w\u3000-\u9fff]+/g, "-").toLowerCase();
    entries.push({ level, text, id });
  }
  return entries;
}

/** TOC heading label per language */
const TOC_LABEL: Record<string, string> = {
  vi: "Mục lục",
  ja: "目次",
  en: "Table of Contents",
};

function buildTocHtml(entries: TocEntry[], docLang = "vi"): string {
  if (entries.length === 0) return "";
  const label = TOC_LABEL[docLang] ?? TOC_LABEL.vi;
  const items = entries.map(e => {
    const indent = e.level === 1 ? "" : "margin-left:16px;";
    return `<li style="${indent}"><a href="#${e.id}" style="text-decoration:none;color:#333;">${e.text}</a></li>`;
  });
  return `<div style="page-break-after:always;"><h2 style="border-bottom:2px solid #333;">${label}</h2><ul style="list-style:none;padding:0;">${items.join("")}</ul></div>`;
}

function buildHtmlPage(bodyHtml: string, fontPaths: { regular: string; bold: string }, docLang = "vi"): string {
  return `<!DOCTYPE html>
<html lang="${docLang}">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Noto Sans JP';
      src: url('file://${fontPaths.regular}');
      font-weight: normal;
    }
    @font-face {
      font-family: 'Noto Sans JP';
      src: url('file://${fontPaths.bold}');
      font-weight: bold;
    }
    body { font-family: 'Noto Sans JP', sans-serif; font-size: 10pt; line-height: 1.6; color: #333; }
    h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 4px; page-break-before: always; }
    h2 { font-size: 13pt; border-bottom: 1px solid #888; padding-bottom: 2px; }
    h3 { font-size: 11pt; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    th { background: #dde; font-weight: bold; padding: 4px 8px; border: 1px solid #999; }
    td { padding: 4px 8px; border: 1px solid #ccc; }
    tr:nth-child(even) { background: #f5f5f5; }
    code { background: #f0f0f0; font-family: monospace; padding: 2px 4px; font-size: 9pt; }
    pre { background: #f0f0f0; padding: 8px; overflow-wrap: break-word; font-size: 9pt; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #666; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export async function exportToPdf(input: PdfExportInput): Promise<PdfExportResult> {
  const { content, output_path, project_name } = input;
  // Prevent path traversal
  if (resolve(output_path) !== output_path && output_path.includes("..")) {
    throw new Error("output_path must not contain path traversal");
  }

  const { meta, body } = parseFrontmatter(content);
  const bodyHtml = await marked(body, { gfm: true, breaks: false });
  const fontPaths = await ensureFonts();

  const titleRaw = String(meta["title"] ?? body.match(/^#\s+(.+)$/m)?.[1] ?? project_name ?? "Document");
  const versionRaw = String(meta["version"] ?? "1.0.0");
  const dateRaw = String(meta["date"] ?? new Date().toISOString().slice(0, 10));
  const statusRaw = String(meta["status"] ?? "draft");
  // Use language from frontmatter for html lang attribute and TOC label; default vi (Vietnamese-primary)
  const docLang = String(meta["language"] ?? "vi");

  const title = escapeHtml(titleRaw);
  const version = escapeHtml(versionRaw);
  const date = escapeHtml(dateRaw);
  const status = escapeHtml(statusRaw);
  const safeProjectName = escapeHtml(project_name ?? "");

  const coverHtml = `<div style="page-break-after:always;text-align:center;padding-top:200px;">` +
    `<h1 style="font-size:24pt;">${title}</h1>` +
    `<p style="font-size:14pt;margin-top:40px;">${safeProjectName}</p>` +
    `<table style="margin:60px auto;font-size:12pt;border-collapse:collapse;">` +
    `<tr><td style="padding:4px 16px;text-align:right;font-weight:bold;">Version:</td><td style="padding:4px 16px;">${version}</td></tr>` +
    `<tr><td style="padding:4px 16px;text-align:right;font-weight:bold;">Date:</td><td style="padding:4px 16px;">${date}</td></tr>` +
    `<tr><td style="padding:4px 16px;text-align:right;font-weight:bold;">Status:</td><td style="padding:4px 16px;">${status}</td></tr>` +
    `</table></div>`;

  const tocEntries = extractToc(body);
  const tocHtml = buildTocHtml(tocEntries, docLang);
  const html = buildHtmlPage(coverHtml + tocHtml + bodyHtml, fontPaths, docLang);

  const browser = await browserPool.acquire();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (globalThis as any).document.fonts.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "25mm", bottom: "25mm", left: "30mm", right: "20mm" },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;width:100%;padding:0 30mm;display:flex;justify-content:space-between;color:#555">` +
        `<span>${title}</span><span>v${version}</span></div>`,
      footerTemplate: `<div style="font-size:9px;width:100%;padding:0 20mm;display:flex;justify-content:space-between;color:#555">` +
        `<span>v${version} | ${date}</span><span>${status}</span>` +
        `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });

    await writeFile(output_path, pdfBuffer);
    const { size } = await stat(output_path);
    logger.info({ output_path, size }, "PDF exported");
    return { file_path: output_path, file_size: size };
  } finally {
    browserPool.release(); // return to pool — browser stays alive for next export
  }
}
