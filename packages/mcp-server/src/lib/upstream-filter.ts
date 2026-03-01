/**
 * Feature-aware upstream content filter for plan-based generation.
 * Splits markdown by h2 headings and keeps only sections relevant to a feature.
 */

/** Header patterns that should always be included regardless of feature filtering */
const HEADER_PATTERNS = [
  /改訂履歴/,
  /承認欄/,
  /検印欄/,
  /配布先/,
  /用語集/,
  /glossary/i,
  /概要/,
  /overview/i,
  /目的/,
  /purpose/i,
  /scope/i,
  /適用範囲/,
];

/**
 * Filter markdown content by feature, keeping only relevant h2 sections.
 * Falls back to full content when no feature-specific sections are found.
 */
export function filterByFeature(
  content: string,
  featureId: string,
  featureName?: string,
): string {
  if (!content || !featureId) return content;

  // Split by h2 headings, preserving the heading line in each chunk
  const chunks = content.split(/^(?=## )/m);
  if (chunks.length <= 1) return content; // no h2 headings → can't filter

  // First chunk is everything before the first h2 (h1, preamble, etc.)
  const headerBlock = chunks[0];
  const h2Sections = chunks.slice(1);

  // Classify sections
  const featureSections: string[] = [];
  const alwaysInclude: string[] = [];

  const featureLower = featureId.toLowerCase();
  const featureNameLower = featureName?.toLowerCase();
  // Escape special regex chars in featureId
  const escapedId = featureId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const idPrefixPattern = new RegExp(`\\b${escapedId}[-_]`, "i");

  for (const section of h2Sections) {
    const sectionLower = section.toLowerCase();

    // Check if it's a header section that should always be included
    if (HEADER_PATTERNS.some(p => p.test(section))) {
      alwaysInclude.push(section);
      continue;
    }

    // Check if section matches the feature
    const headingMatch = sectionLower.includes(featureLower);
    const idMatch = idPrefixPattern.test(section);
    const nameMatch = featureNameLower ? sectionLower.includes(featureNameLower) : false;

    if (headingMatch || idMatch || nameMatch) {
      featureSections.push(section);
    }
  }

  // If h2 heading match found feature sections, return filtered result
  if (featureSections.length > 0) {
    return [headerBlock, ...alwaysInclude, ...featureSections].join("");
  }

  // ID-based fallback: scan section bodies for F-xxx IDs belonging to the feature
  const featureIdPattern = new RegExp(`\\bF-\\d{1,4}\\b`, "g");
  const featureSpecificIds = extractFeatureIds(content, featureId, featureName);

  if (featureSpecificIds.size > 0) {
    const idMatchedSections: string[] = [];
    for (const section of h2Sections) {
      if (HEADER_PATTERNS.some(p => p.test(section))) continue; // already in alwaysInclude
      const sectionIds = new Set([...section.matchAll(featureIdPattern)].map(m => m[0]));
      const hasOverlap = [...sectionIds].some(id => featureSpecificIds.has(id));
      if (hasOverlap) {
        idMatchedSections.push(section);
      }
    }

    if (idMatchedSections.length > 0) {
      return [headerBlock, ...alwaysInclude, ...idMatchedSections].join("");
    }
  }

  // Full fallback — no feature-specific sections found
  return content;
}

/**
 * Extract F-xxx IDs that belong to a specific feature from functions-list content.
 * Looks under the feature's 大分類 heading for F-xxx references.
 */
function extractFeatureIds(
  content: string,
  featureId: string,
  featureName?: string,
): Set<string> {
  const ids = new Set<string>();
  const chunks = content.split(/^(?=## )/m);
  const featureLower = featureId.toLowerCase();
  const featureNameLower = featureName?.toLowerCase();

  for (const chunk of chunks) {
    const firstLine = chunk.split("\n")[0].toLowerCase();
    const isFeatureSection =
      firstLine.includes(featureLower) ||
      (featureNameLower && firstLine.includes(featureNameLower));

    if (isFeatureSection) {
      for (const match of chunk.matchAll(/\bF-\d{1,4}\b/g)) {
        ids.add(match[0]);
      }
    }
  }

  return ids;
}

/** Calculate reduction ratio for logging */
export function estimateFilteredSize(
  original: string,
  filtered: string,
): { ratio: number; chars: number } {
  const origLen = original.length;
  const filtLen = filtered.length;
  return {
    ratio: origLen > 0 ? Math.round((1 - filtLen / origLen) * 100) : 0,
    chars: filtLen,
  };
}
