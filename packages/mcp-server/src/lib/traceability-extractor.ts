/**
 * Extract source traceability annotations from generated document content.
 * Parses <!-- source: {ID or input:section:N} --> comments.
 */

export interface SourceAnnotation {
  source: string;
  line: number;
}

export interface TraceabilityCoverage {
  annotations: SourceAnnotation[];
  total_sections: number;
  covered_sections: number;
  coverage_percent: number;
}

const SOURCE_PATTERN = /<!--\s*source:\s*(.+?)\s*-->/g;
const SECTION_HEADING = /^#{1,4}\s+(.+)$/gm;

/** Extract all source annotations from content */
export function extractTraceability(content: string): TraceabilityCoverage {
  const annotations: SourceAnnotation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].matchAll(new RegExp(SOURCE_PATTERN.source, "g"));
    for (const match of matches) {
      annotations.push({ source: match[1].trim(), line: i + 1 });
    }
  }

  // Count sections and check which have source annotations
  const sections: { heading: string; startLine: number; hasSource: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      sections.push({ heading: headingMatch[1], startLine: i, hasSource: false });
    }
  }

  // Mark sections that have source annotations within them
  for (const annotation of annotations) {
    for (let s = sections.length - 1; s >= 0; s--) {
      if (annotation.line > sections[s].startLine) {
        sections[s].hasSource = true;
        break;
      }
    }
  }

  const total_sections = sections.length;
  const covered_sections = sections.filter((s) => s.hasSource).length;
  const coverage_percent = total_sections > 0 ? Math.round((covered_sections / total_sections) * 100) : 100;

  return { annotations, total_sections, covered_sections, coverage_percent };
}

/** Format traceability coverage as markdown */
export function formatTraceabilityCoverage(coverage: TraceabilityCoverage): string {
  return [
    "## Source Traceability Report",
    "",
    `- Total sections: ${coverage.total_sections}`,
    `- Sections with source attribution: ${coverage.covered_sections}`,
    `- Coverage: ${coverage.coverage_percent}%`,
    `- Total annotations: ${coverage.annotations.length}`,
  ].join("\n");
}
