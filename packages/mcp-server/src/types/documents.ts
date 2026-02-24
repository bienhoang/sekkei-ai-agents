/**
 * Core type definitions for Sekkei document generation system.
 * Covers document types, metadata, request/response shapes, and project config.
 */

export const DOC_TYPES = [
  // Requirements phase
  "requirements", "nfr", "functions-list", "project-plan",
  // Design phase
  "basic-design", "security-design", "detail-design",
  // Test phase
  "test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
  // Supplementary
  "crud-matrix", "traceability-matrix", "operation-design", "migration-design",
  "sitemap", "test-evidence", "meeting-minutes", "decision-record",
  "interface-spec", "screen-design",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

// --- Phase Grouping (v2.0) ---

export const PHASES = ["requirements", "design", "test", "supplementary"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_MAP: Record<DocType, Phase> = {
  requirements: "requirements",
  nfr: "requirements",
  "functions-list": "requirements",
  "project-plan": "requirements",
  "basic-design": "design",
  "security-design": "design",
  "detail-design": "design",
  "test-plan": "test",
  "ut-spec": "test",
  "it-spec": "test",
  "st-spec": "test",
  "uat-spec": "test",
  "crud-matrix": "supplementary",
  "traceability-matrix": "supplementary",
  "operation-design": "supplementary",
  "migration-design": "supplementary",
  sitemap: "supplementary",
  "test-evidence": "supplementary",
  "meeting-minutes": "supplementary",
  "decision-record": "supplementary",
  "interface-spec": "supplementary",
  "screen-design": "supplementary",
};

export const PHASE_LABELS: Record<Phase, string> = {
  requirements: "要件定義",
  design: "設計",
  test: "テスト",
  supplementary: "補足",
};

export const LANGUAGES = ["ja", "en", "vi"] as const;
export type Language = (typeof LANGUAGES)[number];

export const INPUT_LANGUAGES = ["ja", "en", "vi"] as const;
export type InputLanguage = (typeof INPUT_LANGUAGES)[number];

export const PROCESSING_TYPES = ["入力", "照会", "帳票", "バッチ"] as const;
export type ProcessingType = (typeof PROCESSING_TYPES)[number];

export const PRIORITIES = ["高", "中", "低"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const KEIGO_LEVELS = ["丁寧語", "謙譲語", "simple"] as const;
export type KeigoLevel = (typeof KEIGO_LEVELS)[number];

export const PROJECT_TYPES = ["web", "mobile", "api", "desktop", "lp", "internal-system", "saas", "batch"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PRESETS = ["enterprise", "standard", "agile"] as const;
export type Preset = (typeof PRESETS)[number];

export const LIFECYCLE_STATUSES = ["draft", "review", "approved", "revised", "obsolete"] as const;
export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  draft: "ドラフト",
  review: "レビュー中",
  approved: "承認済み",
  revised: "改版",
  obsolete: "廃版",
};

/** Approval chain entry for digital ハンコ workflow */
export interface ApprovalEntry {
  role: string;
  name: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
}

/** YAML frontmatter parsed from template files */
export interface DocumentMeta {
  doc_type: DocType;
  version: string;
  language: Language;
  sections: string[];
  // Lifecycle fields (optional for backward compat)
  status?: LifecycleStatus;
  author?: string;
  reviewer?: string;
  approver?: string;
  approved_date?: string;
  related_tickets?: string[];
  approvals?: ApprovalEntry[];
}

/** Template loaded from disk: frontmatter + markdown body */
export interface TemplateData {
  metadata: DocumentMeta;
  content: string;
}

/** Input for the generate_document MCP tool */
export interface GenerateRequest {
  doc_type: DocType;
  input_content: string;
  project_name?: string;
  language?: Language;
}

/** Output from the generate_document MCP tool */
export interface GenerateResponse {
  doc_type: DocType;
  template: string;
  input_content: string;
  project_name: string;
  language: Language;
  instructions: string;
}

/** Chain status for a single-file document type */
export interface ChainEntry {
  status: "pending" | "in-progress" | "complete";
  input?: string;
  output?: string;
}

/** Chain entry for split docs (basic-design, detail-design) */
export interface SplitChainEntry {
  status: "pending" | "in-progress" | "complete";
  system_output?: string;   // path prefix for 03-system/
  features_output?: string; // path prefix for 05-features/
}

/** Project-level config matching sekkei.config.yaml */
export interface ProjectConfig {
  project: {
    name: string;
    type: ProjectType;
    stack: string[];
    team_size: number;
    language: Language;
    keigo: KeigoLevel;
    industry?: string;
    preset?: Preset;
  };
  output: {
    directory: string;
  };
  /** Auto-commit generated documents to git. Default: false */
  autoCommit?: boolean;
  /** If true, append staleness advisory after document generation */
  autoValidate?: boolean;
  /** Feature-to-file mapping for staleness detection */
  feature_file_map?: Record<string, { label: string; files: string[] }>;
  /** Google Workspace export config */
  google?: {
    credentials_path: string;
    auth_type: "service_account" | "oauth2";
    folder_id?: string;
  };
  /** Approval chain per doc type */
  approval_chain?: Record<string, string[]>;
  /** UI mode: simple (Excel-like) or power (full markdown) */
  ui_mode?: "simple" | "power";
  /** Learning mode: add educational annotations */
  learning_mode?: boolean;
  /** Nulab Backlog integration config */
  backlog?: {
    space_key: string;
    project_key: string;
    api_key_env: string;
    issue_type_id?: number;
    sync_mode: "push" | "bidirectional";
  };
  chain: {
    rfp: string;
    // Requirements phase
    requirements: ChainEntry;
    nfr?: ChainEntry;
    functions_list: ChainEntry;
    project_plan?: ChainEntry;
    // Design phase
    basic_design: SplitChainEntry;
    security_design?: ChainEntry;
    detail_design: SplitChainEntry;
    // Test phase
    test_plan?: ChainEntry;
    ut_spec?: ChainEntry;
    it_spec?: ChainEntry;
    st_spec?: ChainEntry;
    uat_spec?: ChainEntry;
    // Supplementary
    operation_design?: ChainEntry;
    migration_design?: ChainEntry;
    glossary?: ChainEntry;
  };
}

// --- RFP Workspace Types ---

export const RFP_PHASES = [
  "RFP_RECEIVED", "ANALYZING", "QNA_GENERATION", "WAITING_CLIENT",
  "DRAFTING", "CLIENT_ANSWERED", "PROPOSAL_UPDATE", "SCOPE_FREEZE",
] as const;
export type RfpPhase = (typeof RFP_PHASES)[number];

export const RFP_FILES = [
  "00_status.md", "01_raw_rfp.md", "02_analysis.md", "03_questions.md",
  "04_client_answers.md", "05_proposal.md", "06_scope_freeze.md", "07_decisions.md",
] as const;
export type RfpFile = (typeof RFP_FILES)[number];

export interface PhaseEntry {
  phase: RfpPhase;
  entered: string;  // ISO date
  reason?: string;  // why transitioned
}

export interface RfpStatus {
  project: string;
  phase: RfpPhase;
  last_update: string;
  next_action: string;
  blocking_issues: string[];
  assumptions: string[];
  qna_round: number;            // starts at 0, incremented on each QNA_GENERATION entry
  phase_history: PhaseEntry[];   // ordered list of phase transitions
}

export interface RfpFileInventory {
  files: Record<string, { exists: boolean; size: number }>;
}

// --- Manifest Types (Document Splitting) ---

export const SPLIT_DOC_TYPES = ["basic-design", "detail-design"] as const;
export type SplitDocType = (typeof SPLIT_DOC_TYPES)[number];

export const SHARED_SECTIONS = [
  "system-architecture", "database-design", "external-interface",
  "non-functional-design", "technology-rationale",
] as const;
export type SharedSection = (typeof SHARED_SECTIONS)[number];

export const FEATURE_SECTIONS = [
  "overview", "business-flow", "screen-design",
  "report-design", "functions-list",
] as const;
export type FeatureSection = (typeof FEATURE_SECTIONS)[number];

export interface ManifestSharedEntry {
  file: string;
  section: SharedSection | string;
  title: string;
}

export interface ManifestFeatureEntry {
  name: string;    // kebab-case folder name
  display: string; // human label
  file: string;
}

export interface SplitDocument {
  type: "split";
  status: ChainEntry["status"];
  shared: ManifestSharedEntry[];
  features: ManifestFeatureEntry[];
  merge_order: ("shared" | "features")[];
}

export type ManifestDocument = SplitDocument;

export interface Manifest {
  version: string;
  project: string;
  language: Language;
  documents: Record<string, ManifestDocument>;
  translations?: { lang: string; manifest: string }[];
  source_language?: Language;
}

// --- Cross-Reference Linker Types ---

export interface TraceabilityEntry {
  id: string;
  doc_type: string;
  downstream_refs: string[];
}

export interface ChainLinkReport {
  upstream: string;
  downstream: string;
  orphaned_ids: string[];  // defined in upstream but not referenced in downstream
  missing_ids: string[];   // referenced in downstream but not defined in upstream
}

/** Staleness warning for a document pair where upstream is newer than downstream */
export interface StalenessWarning {
  upstream: string;
  downstream: string;
  upstreamModified: string;
  downstreamModified: string;
  message: string;
}

export interface ChainRefReport {
  links: ChainLinkReport[];
  orphaned_ids: { id: string; defined_in: string; expected_in: string }[];
  missing_ids: { id: string; referenced_in: string; expected_from: string }[];
  traceability_matrix: TraceabilityEntry[];
  suggestions: string[];
  staleness_warnings?: StalenessWarning[];
}

// --- Impact Cascade Types ---

export interface ImpactEntry {
  doc_type: string;
  section: string;
  referenced_ids: string[];
  severity: "high" | "medium" | "low";
}

export interface ImpactReport {
  changed_ids: string[];
  affected_docs: ImpactEntry[];
  total_affected_sections: number;
  dependency_graph: string;
  suggested_actions: string[];
}

