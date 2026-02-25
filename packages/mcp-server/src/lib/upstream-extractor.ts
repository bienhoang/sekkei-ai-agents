/**
 * Upstream extractor: parses markdown tables in upstream documents and extracts
 * ID+label pairs for server-side prompt injection (eliminates full content in context).
 */
import { logger } from "./logger.js";

/** Extracted upstream reference item */
export interface UpstreamItem {
  id: string;
  prefix: string;
  label: string;
  row_text: string;
  source_doc: string;
}

// ID patterns matching: REQ-001, NFR-001, F-001, F-SAL-001, SCR-001, TBL-001, API-001
const ID_PATTERN = /\b(REQ|NFR|F|SCR|TBL|API|SEC|RPT|CLS|UT|IT|ST|UAT)-(?:[A-Z]+-)?(\d{1,4})\b/;

// Column header keywords for label detection
const LABEL_KEYWORDS = /名|名称|title|概要|description|説明/i;

/**
 * Detect the label column index from a table header row.
 * Scans for columns containing 名/名称/title-like keywords adjacent to or after the ID column.
 */
function detectLabelColumn(headerCells: string[], idColIdx: number): number {
  // Search forward from ID column for a label-like column
  for (let i = idColIdx + 1; i < headerCells.length; i++) {
    if (LABEL_KEYWORDS.test(headerCells[i])) return i;
  }
  // Fallback: next column after ID
  return Math.min(idColIdx + 1, headerCells.length - 1);
}

/**
 * Extract ID+label pairs from markdown table content.
 * Parses markdown tables, extracts rows matching given ID prefixes.
 */
export function extractUpstreamItems(
  content: string,
  prefixes: string[],
  sourceDoc: string
): UpstreamItem[] {
  const lines = content.split("\n");
  const items: UpstreamItem[] = [];
  const seen = new Set<string>();
  const prefixPattern = new RegExp(`\\b(${prefixes.join("|")})-(?:[A-Z]+-)?\\d{1,4}\\b`);

  let headerCells: string[] | null = null;
  let idColIdx = -1;
  let labelColIdx = -1;
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect table header: starts with |, ends with |, no ID pattern match
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && !inTable) {
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !prefixPattern.test(trimmed)) {
        headerCells = cells;
        // Find ID column: look for cells containing "ID" or prefix-like patterns
        idColIdx = cells.findIndex(c => /ID|番号/i.test(c));
        if (idColIdx === -1) idColIdx = 0;
        labelColIdx = detectLabelColumn(cells, idColIdx);
        inTable = true;
        continue;
      }
    }

    // Skip separator row
    if (inTable && /^\|[\s:\-|]+\|$/.test(trimmed)) continue;

    // End of table
    if (inTable && (!trimmed.startsWith("|") || !trimmed.endsWith("|"))) {
      inTable = false;
      headerCells = null;
      continue;
    }

    // Parse data row
    if (inTable && headerCells) {
      const match = trimmed.match(prefixPattern);
      if (match) {
        const id = match[0];
        if (seen.has(id)) continue;
        seen.add(id);

        const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
        let label = cells[labelColIdx] ?? cells[Math.min(idColIdx + 1, cells.length - 1)] ?? "";

        // Clean AI comment placeholders from label
        label = label.replace(/<!--\s*AI[^>]*-->/g, "").trim();

        // Fallback: cleaned row text when label extraction fails
        if (!label || label === id) {
          label = trimmed.replace(/<!--[^>]*-->/g, "").replace(/\|/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
          logger.warn({ id, sourceDoc }, "Label heuristic failed, using row text fallback");
        }

        items.push({
          id,
          prefix: match[1],
          label,
          row_text: trimmed,
          source_doc: sourceDoc,
        });
      }
    }
  }

  // Sort by ID
  return items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * Format extracted items into a compact prompt-injectable brief.
 * Groups by source_doc, then lists ID: label pairs.
 */
export function formatUpstreamContext(items: UpstreamItem[]): string {
  if (items.length === 0) return "";

  const groups = new Map<string, UpstreamItem[]>();
  for (const item of items) {
    const existing = groups.get(item.source_doc) ?? [];
    existing.push(item);
    groups.set(item.source_doc, existing);
  }

  const sections: string[] = [];
  for (const [doc, docItems] of groups) {
    sections.push(`### Upstream: ${doc}`);
    for (const item of docItems) {
      sections.push(`${item.id}: ${item.label}`);
    }
  }

  return sections.join("\n");
}
