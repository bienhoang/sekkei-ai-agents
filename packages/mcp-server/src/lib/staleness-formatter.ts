/**
 * Format StalenessReport into a markdown table for display.
 */
import type { StalenessReport, StalenessEntry } from "./staleness-detector.js";

function statusLabel(score: number): string {
  if (score >= 50) return "STALE";
  if (score >= 25) return "WARN";
  return "OK";
}

function entryRow(entry: StalenessEntry): string {
  const status = statusLabel(entry.score);
  const docUpdate = entry.lastDocUpdate
    ? entry.lastDocUpdate.slice(0, 10)
    : "never";
  return `| ${entry.featureId} | ${entry.label} | ${entry.score}/100 | ${entry.changedFiles.length} (${entry.linesChanged} lines) | ${docUpdate} (${entry.daysSinceDocUpdate}d) | ${status} |`;
}

export function formatStalenessReport(report: StalenessReport): string {
  if (report.features.length === 0) {
    return "No features configured for staleness tracking.";
  }

  const lines: string[] = [
    "# Staleness Report",
    "",
    `**Repo:** ${report.repoRoot} | **Since:** ${report.sinceRef} | **Date:** ${report.scanDate.slice(0, 10)}`,
    `**Overall Score:** ${report.overallScore}/100 | **Stale Features:** ${report.staleCount}/${report.features.length}`,
    "",
    "| Feature | Label | Score | Changed Files | Days Since Doc Update | Status |",
    "|---------|-------|-------|---------------|----------------------|--------|",
  ];

  for (const entry of report.features) {
    lines.push(entryRow(entry));
  }

  const staleFeatures = report.features.filter((f) => f.score >= 50);
  if (staleFeatures.length > 0) {
    lines.push("", "## Recommended Actions", "");
    for (const f of staleFeatures) {
      const docTypes = f.affectedDocTypes.join(", ");
      lines.push(`- Regenerate \`${docTypes}\` for feature **${f.featureId}** (${f.label}) — score ${f.score}/100`);
    }
  }

  return lines.join("\n");
}
