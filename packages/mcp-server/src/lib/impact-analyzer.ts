/**
 * Impact analyzer: find affected sections across chain when IDs change.
 */
import type { ImpactEntry, ImpactReport } from "../types/documents.js";

const SECTION_HEADING = /^(#{1,4})\s+(.+)$/;

/** Find all sections in a document that reference any of the changed IDs */
export function findAffectedSections(
  changedIds: string[],
  docs: Map<string, string>
): ImpactEntry[] {
  const entries: ImpactEntry[] = [];

  for (const [docType, content] of docs) {
    const lines = content.split("\n");
    let currentSection = "_preamble";
    let sectionContent = "";

    const flushSection = () => {
      const referencedIds = changedIds.filter((id) => sectionContent.includes(id));
      if (referencedIds.length > 0) {
        entries.push({
          doc_type: docType,
          section: currentSection,
          referenced_ids: referencedIds,
          severity: scoreSeverity(currentSection, referencedIds, sectionContent),
        });
      }
    };

    for (const line of lines) {
      const headingMatch = line.match(SECTION_HEADING);
      if (headingMatch) {
        flushSection();
        currentSection = headingMatch[2].trim();
        sectionContent = "";
      }
      sectionContent += line + "\n";
    }
    flushSection(); // flush last section
  }

  return entries;
}

/** Score severity: high if ID appears in section heading/title, medium in table, low in comment */
function scoreSeverity(
  sectionName: string,
  referencedIds: string[],
  sectionContent: string
): "high" | "medium" | "low" {
  // High: ID appears in the section heading itself
  for (const id of referencedIds) {
    if (sectionName.includes(id)) return "high";
  }
  // Medium: ID appears in a table row
  const tableLines = sectionContent.split("\n").filter((l) => l.trim().startsWith("|"));
  for (const line of tableLines) {
    for (const id of referencedIds) {
      if (line.includes(id)) return "medium";
    }
  }
  return "low";
}

/** Build Mermaid flowchart showing impact cascade */
export function buildDependencyMermaid(entries: ImpactEntry[], changedIds: string[]): string {
  const lines = ["```mermaid", "flowchart TD"];

  // Source nodes (changed IDs)
  for (const id of changedIds) {
    lines.push(`  ${id}["🔴 ${id} (変更)"]`);
  }

  // Impact nodes
  const seen = new Set<string>();
  for (const entry of entries) {
    const nodeId = `${entry.doc_type}_${entry.section}`.replace(/[^a-zA-Z0-9]/g, "_");
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);

    const label = `${entry.doc_type}: ${entry.section}`;
    const emoji = entry.severity === "high" ? "🔴" : entry.severity === "medium" ? "🟡" : "🟢";
    lines.push(`  ${nodeId}["${emoji} ${label}"]`);

    for (const id of entry.referenced_ids) {
      lines.push(`  ${id} --> ${nodeId}`);
    }
  }

  lines.push("```");
  return lines.join("\n");
}

/** Build full impact report */
export function buildImpactReport(
  changedIds: string[],
  entries: ImpactEntry[]
): ImpactReport {
  const graph = buildDependencyMermaid(entries, changedIds);

  const suggested_actions = entries.map((e) =>
    `Update ${e.doc_type} section "${e.section}" — references: ${e.referenced_ids.join(", ")}`
  );

  return {
    changed_ids: changedIds,
    affected_docs: entries,
    total_affected_sections: entries.length,
    dependency_graph: graph,
    suggested_actions,
  };
}
