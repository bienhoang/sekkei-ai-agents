/**
 * Compile Handlebars wireframe templates into self-contained HTML strings.
 * Reads CSS + .hbs templates from templates/wireframe/, applies ScreenLayout data.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { ScreenLayout } from "./mockup-schema.js";
import { SekkeiError } from "./errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve path to templates/wireframe/ relative to mcp-server root */
const WIREFRAME_DIR = join(__dirname, "..", "..", "templates", "wireframe");

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1024,
  tablet: 768,
  mobile: 375,
};

/**
 * Convert annotation number to display string.
 * Returns plain Latin digits for all numbers (cleaner in wireframe mockups).
 */
export function circledNumber(n: number): string {
  return String(n);
}

/** Load embedded font as base64 @font-face CSS block (cached per process) */
let fontFaceCache: string | null = null;
function loadFontFace(): string {
  if (fontFaceCache) return fontFaceCache;
  try {
    const woff2 = readFileSync(join(WIREFRAME_DIR, "fonts", "NotoSansJP-Regular-subset.woff2"));
    const b64 = woff2.toString("base64");
    fontFaceCache = `@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(data:font/woff2;base64,${b64}) format('woff2');
}\n`;
  } catch {
    fontFaceCache = ""; // graceful fallback — system font used
  }
  return fontFaceCache;
}

/** Load blueprint.css content with embedded font */
function loadCss(): string {
  try {
    const css = readFileSync(join(WIREFRAME_DIR, "blueprint.css"), "utf-8");
    return loadFontFace() + css;
  } catch {
    throw new SekkeiError("MOCKUP_ERROR", "blueprint.css not found in templates/wireframe/");
  }
}

/** Load a layout .hbs template by type from layouts/ directory */
function loadTemplate(layoutType: string): string {
  try {
    return readFileSync(join(WIREFRAME_DIR, "layouts", `${layoutType}.hbs`), "utf-8");
  } catch {
    throw new SekkeiError("MOCKUP_ERROR", `Layout template "${layoutType}.hbs" not found in templates/wireframe/layouts/`);
  }
}

/** Load the shared component partial */
function loadComponentPartial(): string {
  try {
    return readFileSync(join(WIREFRAME_DIR, "partials", "component.hbs"), "utf-8");
  } catch {
    throw new SekkeiError("MOCKUP_ERROR", "component.hbs partial not found in templates/wireframe/partials/");
  }
}

/**
 * Parse table label to extract title and column names.
 * Supports formats: "タイトル（col1 / col2 / col3）" or "タイトル（col1/col2/col3）"
 * Also supports parentheses: "タイトル(col1 / col2)"
 */
export function parseTableColumns(label: string): { title: string; columns: string[] } {
  const match = label.match(/^(.+?)[（(](.+?)[）)]$/);
  if (!match) return { title: label, columns: [] };
  const title = match[1].trim();
  const columns = match[2].split(/\s*[/／]\s*/).map(c => c.trim()).filter(Boolean);
  return { title, columns };
}

/** Split slash-separated label into items array */
export function parseSlashItems(label: string): string[] {
  return label.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
}

/** Return first character of label, or "?" if empty */
export function firstChar(label: string): string {
  return label.trim().charAt(0) || "?";
}

/** Generate array of page number strings from label (clamped 1–10, default 3) */
export function parsePageCount(label: string): string[] {
  const n = Math.max(1, Math.min(parseInt(label, 10) || 3, 10));
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

/**
 * Build a self-contained HTML string from a ScreenLayout.
 * The HTML includes inline CSS and embedded fonts — ready for Playwright screenshot.
 */
export function buildMockupHtml(layout: ScreenLayout): string {
  const css = loadCss();
  const templateSrc = loadTemplate(layout.layout_type);
  const componentPartialSrc = loadComponentPartial();

  const hbs = Handlebars.create();
  hbs.registerPartial("component", componentPartialSrc);
  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  hbs.registerHelper("circledNumber", (n: number) => circledNumber(n));
  hbs.registerHelper("parseSlashItems", parseSlashItems);
  hbs.registerHelper("firstChar", firstChar);
  hbs.registerHelper("parsePageCount", parsePageCount);
  hbs.registerHelper("renderTable", (label: string) => {
    const { title, columns } = parseTableColumns(label);
    if (columns.length === 0) {
      return new Handlebars.SafeString(`<div class="table-placeholder">[${Handlebars.Utils.escapeExpression(label)}]</div>`);
    }
    const esc = Handlebars.Utils.escapeExpression;
    const headerCells = columns.map(c => `<th>${esc(c)}</th>`).join("");
    const sampleRow = columns.map(() => `<td>—</td>`).join("");
    const rows = [sampleRow, sampleRow, sampleRow].join("</tr><tr>");
    return new Handlebars.SafeString(
      `<div class="wf-table-title">${esc(title)}</div>` +
      `<table class="wf-table"><thead><tr>${headerCells}</tr></thead>` +
      `<tbody><tr>${rows}</tr></tbody></table>`
    );
  });

  const compiled = hbs.compile(templateSrc);

  // Convert regions record to ordered entries array for Handlebars iteration
  const regionOrder = ["header", "main", "footer"];
  const regionEntries = regionOrder
    .filter(name => layout.regions[name])
    .map(name => ({ name, region: layout.regions[name] }));

  // Append any regions not in the standard order
  for (const name of Object.keys(layout.regions)) {
    if (!regionOrder.includes(name)) {
      regionEntries.push({ name, region: layout.regions[name] });
    }
  }

  // Wizard: derive completed state for steps before active step
  if (layout.layout_type === "wizard") {
    const stepsEntry = regionEntries.find(e => e.name === "steps");
    if (stepsEntry) {
      const activeIdx = stepsEntry.region.components.findIndex(c => c.active);
      if (activeIdx >= 0) {
        for (let i = 0; i < activeIdx; i++) {
          (stepsEntry.region.components[i] as Record<string, unknown>)._completed = true;
        }
      }
    }
  }

  return compiled({
    ...layout,
    css,
    viewportWidth: VIEWPORT_WIDTHS[layout.viewport] ?? 1024,
    regionEntries,
  });
}
