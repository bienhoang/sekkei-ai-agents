/**
 * Post-translation validation — compares source and translated documents.
 * Detects missing IDs, table row mismatches, and heading structure drift.
 * Returns advisory warnings (not errors) since AI may legitimately restructure.
 */
import { extractAllIds } from "./id-extractor.js";

export interface TranslationValidation {
  warnings: string[];
  stats: {
    sourceIdCount: number;
    translatedIdCount: number;
    missingIds: string[];
    sourceTableRows: number;
    translatedTableRows: number;
    sourceHeadings: number;
    translatedHeadings: number;
  };
}

const TABLE_ROW_RE = /^\|.*\|$/gm;
const TABLE_SEP_RE = /^\|(\s*:?-{2,}:?\s*\|)+$/gm;
const HEADING_RE = /^#{1,6} /gm;

function countTableRows(content: string): number {
  const allRows = content.match(TABLE_ROW_RE)?.length ?? 0;
  const sepRows = content.match(TABLE_SEP_RE)?.length ?? 0;
  return allRows - sepRows;
}

function countHeadings(content: string): number {
  return content.match(HEADING_RE)?.length ?? 0;
}

/** Compare source and translated documents, returning advisory warnings. */
export function validateTranslation(source: string, translated: string): TranslationValidation {
  const warnings: string[] = [];

  // ID comparison
  const sourceIds = extractAllIds(source);
  const translatedIds = extractAllIds(translated);
  const missingIds = [...sourceIds].filter((id) => !translatedIds.has(id));

  if (missingIds.length > 0) {
    warnings.push(`Missing ${missingIds.length} ID(s) in translation: ${missingIds.slice(0, 10).join(", ")}${missingIds.length > 10 ? "..." : ""}`);
  }

  // Table row comparison
  const sourceTableRows = countTableRows(source);
  const translatedTableRows = countTableRows(translated);
  if (sourceTableRows > 0 && Math.abs(sourceTableRows - translatedTableRows) / sourceTableRows > 0.1) {
    warnings.push(`Table row count: source=${sourceTableRows}, translated=${translatedTableRows}`);
  }

  // Heading comparison
  const sourceHeadings = countHeadings(source);
  const translatedHeadings = countHeadings(translated);
  if (sourceHeadings !== translatedHeadings) {
    warnings.push(`Heading count: source=${sourceHeadings}, translated=${translatedHeadings}`);
  }

  return {
    warnings,
    stats: {
      sourceIdCount: sourceIds.size,
      translatedIdCount: translatedIds.size,
      missingIds,
      sourceTableRows,
      translatedTableRows,
      sourceHeadings,
      translatedHeadings,
    },
  };
}
