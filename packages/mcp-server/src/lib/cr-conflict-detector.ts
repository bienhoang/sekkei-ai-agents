/**
 * Parallel CR conflict detection.
 * Scans active CRs for overlapping changed_ids or propagation doc types.
 */
import type { ChangeRequest } from "../types/change-request.js";

export interface ConflictResult {
  cr_id: string;              // conflicting CR
  overlap_type: "changed_ids" | "propagation_docs";
  overlapping: string[];      // the IDs or doc types that overlap
}

/** Compute set intersection */
function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter(x => setB.has(x));
}

/**
 * Check if a candidate CR conflicts with any active CRs.
 * Active = APPROVED or PROPAGATING status.
 */
export function detectConflicts(
  candidate: ChangeRequest,
  activeCRs: ChangeRequest[],
): ConflictResult[] {
  const results: ConflictResult[] = [];
  const active = activeCRs.filter(
    cr => (cr.status === "APPROVED" || cr.status === "PROPAGATING") && cr.id !== candidate.id,
  );

  for (const cr of active) {
    // Check changed_ids overlap
    const idOverlap = intersect(candidate.changed_ids, cr.changed_ids);
    if (idOverlap.length > 0) {
      results.push({ cr_id: cr.id, overlap_type: "changed_ids", overlapping: idOverlap });
    }

    // Check propagation doc_type overlap
    const candidateDocs = candidate.propagation_steps.map(s => s.doc_type);
    const crDocs = cr.propagation_steps.map(s => s.doc_type);
    const docOverlap = intersect(candidateDocs, crDocs);
    if (docOverlap.length > 0) {
      results.push({ cr_id: cr.id, overlap_type: "propagation_docs", overlapping: docOverlap });
    }
  }

  return results;
}
