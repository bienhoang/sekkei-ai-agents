/**
 * PDF exporter using Playwright (Chromium) — renders Markdown → HTML → PDF with Noto Sans JP fonts.
 */
import { writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { marked } from "marked";
import { ensureFonts } from "./font-manager.js";
import { logger } from "./logger.js";

const execFile = promisify(execFileCb);

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

function buildHtmlPage(bodyHtml: string, fontPaths: { regular: string; bold: string }): string {
  return `<!DOCTYPE html>
<html lang="ja">
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
    h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 4px; }
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

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    logger.info("Chromium not found — installing via playwright...");
    await execFile("npx", ["playwright", "install", "chromium"], { timeout: 300_000 });
    return await chromium.launch({ headless: true });
  }
}

export async function exportToPdf(input: PdfExportInput): Promise<PdfExportResult> {
  const { content, output_path, project_name } = input;
  // Prevent path traversal
  if (resolve(output_path) !== output_path && output_path.includes("..")) {
    throw new Error("output_path must not contain path traversal");
  }

  const bodyHtml = await marked(content, { gfm: true, breaks: false });
  const fontPaths = await ensureFonts();

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? project_name ?? "Document";

  const html = buildHtmlPage(bodyHtml, fontPaths);

  const browser = await launchBrowser();
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
      headerTemplate: `<div style="font-size:9px;width:100%;text-align:center;color:#555;padding:0 30mm">${title}</div>`,
      footerTemplate: `<div style="font-size:9px;width:100%;text-align:right;padding-right:20mm;color:#555">` +
        `<span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });

    await writeFile(output_path, pdfBuffer);
    const { size } = await stat(output_path);
    logger.info({ output_path, size }, "PDF exported");
    return { file_path: output_path, file_size: size };
  } finally {
    await browser.close();
  }
}
