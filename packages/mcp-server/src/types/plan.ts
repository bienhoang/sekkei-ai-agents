/**
 * Generation Plan entity types for multi-phase document generation.
 * Tracks plan status, phases, and features for split-mode generation.
 */

export const PLAN_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PHASE_STATUSES = ["pending", "in_progress", "completed", "skipped"] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const PHASE_TYPES = ["shared", "per-feature", "validation"] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export interface PlanFeature {
  id: string;          // e.g. "sal" (kebab-case)
  name: string;        // e.g. "Sales Management"
  complexity: "simple" | "medium" | "complex";
  priority: number;    // 1-based
}

export interface PlanPhase {
  number: number;
  name: string;
  type: PhaseType;
  feature_id?: string;   // omit for shared/validation
  status: PhaseStatus;
  file: string;          // e.g. "phase-01-shared-sections.md"
}

export interface GenerationPlan {
  plan_id?: string;       // directory name — persisted in YAML frontmatter
  title: string;
  doc_type: string;       // basic-design | detail-design | test-spec
  status: PlanStatus;
  features: PlanFeature[];
  feature_count: number;
  split_mode: boolean;
  created: string;        // ISO date
  updated: string;        // ISO date
  phases: PlanPhase[];
  survey?: Record<string, unknown>;  // persisted survey data from Round 2
}
