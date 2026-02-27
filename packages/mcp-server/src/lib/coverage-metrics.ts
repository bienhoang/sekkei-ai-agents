/**
 * Coverage metrics computation: measures how well IDs in the traceability matrix
 * are traced across the document chain.
 */
import type { CoverageMetrics } from "../types/documents.js";

const DESIGN_DOCS = new Set(["basic-design", "detail-design", "security-design"]);
const TEST_DOCS = new Set(["ut-spec", "it-spec", "st-spec", "uat-spec", "test-plan"]);
const REQUIREMENTS_DOCS = new Set(["requirements"]);

/**
 * Compute coverage metrics from the traceability matrix and chain links.
 *
 * @param matrix - Array of TraceabilityEntry-like objects (id, doc_type, downstream_refs)
 * @param _links - Chain link reports (unused currently; reserved for future link-level metrics)
 */
export function computeCoverageMetrics(
  matrix: { id: string; doc_type: string; downstream_refs: string[] }[],
  _links: { upstream: string; downstream: string }[]
): CoverageMetrics {
  if (matrix.length === 0) {
    return {
      overall: 0,
      byDocType: {},
      reqToDesign: 0,
      reqToTest: 0,
      fullTrace: 0,
    };
  }

  // Group by doc_type
  const byDocType: Record<string, { total: number; traced: number; coverage: number }> = {};

  for (const entry of matrix) {
    const dt = entry.doc_type;
    if (!byDocType[dt]) {
      byDocType[dt] = { total: 0, traced: 0, coverage: 0 };
    }
    byDocType[dt].total += 1;
    if (entry.downstream_refs.length > 0) {
      byDocType[dt].traced += 1;
    }
  }

  // Compute per-doc-type coverage percentages
  for (const dt of Object.keys(byDocType)) {
    const group = byDocType[dt];
    group.coverage = group.total > 0 ? Math.round((group.traced / group.total) * 100) : 0;
  }

  // Overall coverage: traced entries / total entries
  const totalEntries = matrix.length;
  const tracedEntries = matrix.filter(e => e.downstream_refs.length > 0).length;
  const overall = totalEntries > 0 ? Math.round((tracedEntries / totalEntries) * 100) : 0;

  // Requirements entries (from "requirements" doc type)
  const reqEntries = matrix.filter(e => REQUIREMENTS_DOCS.has(e.doc_type));
  const reqTotal = reqEntries.length;

  // reqToDesign: % of requirements entries with at least one design downstream ref
  const reqToDesign = reqTotal > 0
    ? Math.round(
        (reqEntries.filter(e => e.downstream_refs.some(r => DESIGN_DOCS.has(r))).length / reqTotal) * 100
      )
    : 0;

  // reqToTest: % of requirements entries with at least one test downstream ref
  const reqToTest = reqTotal > 0
    ? Math.round(
        (reqEntries.filter(e => e.downstream_refs.some(r => TEST_DOCS.has(r))).length / reqTotal) * 100
      )
    : 0;

  // fullTrace: % of requirements entries with BOTH design AND test refs
  const fullTrace = reqTotal > 0
    ? Math.round(
        (reqEntries.filter(
          e =>
            e.downstream_refs.some(r => DESIGN_DOCS.has(r)) &&
            e.downstream_refs.some(r => TEST_DOCS.has(r))
        ).length / reqTotal) * 100
      )
    : 0;

  return { overall, byDocType, reqToDesign, reqToTest, fullTrace };
}
