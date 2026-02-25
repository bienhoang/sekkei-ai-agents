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

/** Load blueprint.css content */
function loadCss(): string {
  try {
    return readFileSync(join(WIREFRAME_DIR, "blueprint.css"), "utf-8");
  } catch {
    throw new SekkeiError("MOCKUP_ERROR", "blueprint.css not found in templates/wireframe/");
  }
}

/** Load a .hbs template by layout type, falling back to form.hbs */
function loadTemplate(layoutType: string): string {
  try {
    return readFileSync(join(WIREFRAME_DIR, `${layoutType}.hbs`), "utf-8");
  } catch {
    // Fall back to form template for layout types not yet implemented
    try {
      return readFileSync(join(WIREFRAME_DIR, "form.hbs"), "utf-8");
    } catch {
      throw new SekkeiError("MOCKUP_ERROR", `Template "${layoutType}.hbs" not found in templates/wireframe/`);
    }
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

/**
 * Build a self-contained HTML string from a ScreenLayout.
 * The HTML includes inline CSS and Google Fonts link — ready for Playwright screenshot.
 */
export function buildMockupHtml(layout: ScreenLayout): string {
  const css = loadCss();
  const templateSrc = loadTemplate(layout.layout_type);

  const hbs = Handlebars.create();
  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  hbs.registerHelper("circledNumber", (n: number) => circledNumber(n));
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

  return compiled({
    ...layout,
    css,
    viewportWidth: VIEWPORT_WIDTHS[layout.viewport] ?? 1024,
    regionEntries,
  });
}
