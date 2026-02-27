/**
 * NFR classifier: parses NFR markdown and categorizes NFR-xxx IDs
 * per IPA NFUG (非機能要求グレード) category headings.
 */
import type { NfrCategory } from "../types/documents.js";

/** IPA NFUG categories with Japanese heading patterns and English labels */
const NFR_CATEGORIES: { pattern: RegExp; category: string; categoryEn: string }[] = [
  { pattern: /可用性/, category: "可用性", categoryEn: "Availability" },
  { pattern: /性能[・\s]*拡張性/, category: "性能・拡張性", categoryEn: "Performance/Scalability" },
  { pattern: /運用[・\s]*保守性/, category: "運用・保守性", categoryEn: "Operability/Maintainability" },
  { pattern: /移行性/, category: "移行性", categoryEn: "Migration" },
  { pattern: /セキュリティ/, category: "セキュリティ", categoryEn: "Security" },
  { pattern: /システム環境[・\s]*エコロジー|システム環境/, category: "システム環境・エコロジー", categoryEn: "System Environment" },
];

const NFR_ID_PATTERN = /NFR-\d{1,4}/g;

/**
 * Split markdown into sections at heading boundaries.
 * Returns array of { heading, content } pairs.
 */
function splitIntoSections(markdown: string): { heading: string; content: string }[] {
  const lines = markdown.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n") });
      }
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n") });
  }

  return sections;
}

/**
 * Extract NFR-xxx IDs from a text string.
 */
function extractNfrIds(text: string): string[] {
  const matches = text.matchAll(new RegExp(NFR_ID_PATTERN.source, "g"));
  const ids = new Set<string>();
  for (const m of matches) {
    ids.add(m[0]);
  }
  return [...ids].sort();
}

/**
 * Parse NFR markdown content and classify NFR-xxx IDs per IPA NFUG category.
 * Coverage is set to 0 by default (requires external data to compute).
 *
 * @param markdownContent - Content of the NFR document
 * @returns Array of NfrCategory objects, one per matched IPA category
 */
export function classifyNfrContent(markdownContent: string): NfrCategory[] {
  const sections = splitIntoSections(markdownContent);
  const results: NfrCategory[] = [];

  for (const catDef of NFR_CATEGORIES) {
    const matchedIds = new Set<string>();

    for (const section of sections) {
      if (catDef.pattern.test(section.heading)) {
        // Include IDs from section heading and content
        const headingIds = extractNfrIds(section.heading);
        const contentIds = extractNfrIds(section.content);
        for (const id of [...headingIds, ...contentIds]) {
          matchedIds.add(id);
        }
      }
    }

    // Only include categories that have IDs or exist in the document
    const headingFound = sections.some(s => catDef.pattern.test(s.heading));
    if (headingFound) {
      results.push({
        category: catDef.category,
        categoryEn: catDef.categoryEn,
        nfrIds: [...matchedIds].sort(),
        coverage: 0,
      });
    }
  }

  return results;
}

/**
 * Compute category coverage given the set of NFR IDs that have downstream references.
 *
 * @param categories - Output from classifyNfrContent
 * @param tracedNfrIds - Set of NFR IDs that appear in downstream documents
 */
export function computeNfrCoverage(
  categories: NfrCategory[],
  tracedNfrIds: Set<string>
): NfrCategory[] {
  return categories.map(cat => {
    const traced = cat.nfrIds.filter(id => tracedNfrIds.has(id)).length;
    const coverage = cat.nfrIds.length > 0
      ? Math.round((traced / cat.nfrIds.length) * 100)
      : 0;
    return { ...cat, coverage };
  });
}
