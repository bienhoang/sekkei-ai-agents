/**
 * Change Request (CR) entity types for tracking and propagating
 * specification changes across the V-model document chain.
 */

export const CR_STATUSES = [
  "INITIATED", "ANALYZING", "IMPACT_ANALYZED", "APPROVED",
  "PROPAGATING", "VALIDATED", "COMPLETED", "CANCELLED",
] as const;
export type CRStatus = (typeof CR_STATUSES)[number];

export const PROPAGATION_DIRECTIONS = ["upstream", "downstream"] as const;
export type PropagationDirection = (typeof PROPAGATION_DIRECTIONS)[number];

export interface PropagationStep {
  doc_type: string;
  direction: PropagationDirection;
  status: "pending" | "instructed" | "done" | "skipped";
  note?: string;
  content_hash?: string;  // IMP-6: MD5 hash of upstream doc at instruction time
}

export interface CRHistoryEntry {
  status: CRStatus;
  entered: string;  // ISO date
  reason?: string;
}

export interface ChangeRequest {
  id: string;                        // CR-YYMMDD-NNN
  status: CRStatus;
  origin_doc: string;                // doc type where change originated
  description: string;               // human summary
  changed_ids: string[];             // e.g. ["REQ-003", "F-005"]
  impact_summary?: string;           // populated after ANALYZING
  propagation_steps: PropagationStep[];
  propagation_index: number;         // current step (0-based)
  conflict_warnings: string[];       // populated at APPROVED transition
  created: string;                   // ISO date
  updated: string;                   // ISO date
  history: CRHistoryEntry[];         // transition log
}
