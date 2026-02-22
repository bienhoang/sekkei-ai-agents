/**
 * Core type definitions for Sekkei document generation system.
 * Covers document types, metadata, request/response shapes, and project config.
 */

export const DOC_TYPES = ["overview", "functions-list", "requirements", "basic-design", "detail-design", "test-spec", "crud-matrix", "traceability-matrix", "operation-design", "migration-design"] as const;
export type DocType = (typeof DOC_TYPES)[number];

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

/** Chain entry for split docs (basic-design, detail-design, test-spec) */
export interface SplitChainEntry {
  status: "pending" | "in-progress" | "complete";
  system_output?: string;   // path prefix for 03-system/
  features_output?: string; // path prefix for 05-features/
  global_output?: string;   // path prefix for 08-test/ (test-spec global)
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
  chain: {
    rfp: string;
    overview: ChainEntry;
    functions_list: ChainEntry;
    requirements: ChainEntry;
    basic_design: SplitChainEntry;
    detail_design: SplitChainEntry;
    test_spec: SplitChainEntry;
    operation_design?: ChainEntry;
    migration_design?: ChainEntry;
    glossary?: ChainEntry;
  };
}

// --- Manifest Types (Document Splitting) ---

export const SPLIT_DOC_TYPES = ["basic-design", "detail-design", "test-spec"] as const;
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

