/**
 * Extract AI confidence annotations from generated document content.
 * Parses <!-- confidence: 高|中|低 | source: {ID} --> comments.
 */

/** Confidence annotation extracted from HTML comment */
export interface ConfidenceAnnotation {
  level: "高" | "中" | "低";
  source: string;
  line: number;
}

/** Summary of confidence distribution */
export interface ConfidenceSummary {
  annotations: ConfidenceAnnotation[];
  counts: { high: number; medium: number; low: number };
  total: number;
}

const CONFIDENCE_PATTERN = /<!--\s*confidence:\s*(高|中|低)\s*\|\s*source:\s*(.+?)\s*-->/g;

/** Extract all confidence annotations from content */
export function extractConfidence(content: string): ConfidenceSummary {
  const annotations: ConfidenceAnnotation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].matchAll(new RegExp(CONFIDENCE_PATTERN.source, "g"));
    for (const match of matches) {
      annotations.push({
        level: match[1] as "高" | "中" | "低",
        source: match[2].trim(),
        line: i + 1,
      });
    }
  }

  const counts = {
    high: annotations.filter((a) => a.level === "高").length,
    medium: annotations.filter((a) => a.level === "中").length,
    low: annotations.filter((a) => a.level === "低").length,
  };

  return { annotations, counts, total: annotations.length };
}

/** Format confidence summary as markdown table */
export function formatConfidenceSummary(summary: ConfidenceSummary): string {
  if (summary.total === 0) return "No confidence annotations found.";
  const pct = (n: number) => summary.total > 0 ? Math.round((n / summary.total) * 100) : 0;
  return [
    "| 信頼度 | セクション数 | 割合 |",
    "|--------|-------------|------|",
    `| 高 | ${summary.counts.high} | ${pct(summary.counts.high)}% |`,
    `| 中 | ${summary.counts.medium} | ${pct(summary.counts.medium)}% |`,
    `| 低 | ${summary.counts.low} | ${pct(summary.counts.low)}% |`,
    `| 合計 | ${summary.total} | 100% |`,
  ].join("\n");
}
