/**
 * AI generation instructions per document type.
 * Extracted from generate.ts to keep tool handlers lean and allow
 * future phases (keigo, project-type, bilingual) to extend cleanly.
 */
import type { DocType, KeigoLevel, Language } from "../types/documents.js";

/** Base AI generation instructions per document type */
export const GENERATION_INSTRUCTIONS: Record<DocType, string> = {
  overview: [
    "Generate 01-overview.md — project summary document from RFP or initial brief.",
    "Required sections:",
    "1. プロジェクト概要 (Project Summary) — background, goals, success criteria",
    "2. ビジネス目標 (Business Goals) — measurable objectives",
    "3. システムスコープ (System Scope) — in-scope and out-of-scope boundaries",
    "4. ステークホルダー (Stakeholders) — roles, responsibilities, contact",
    "5. アーキテクチャ概要 (High-Level Architecture) — one-paragraph summary + Mermaid C4 context diagram",
    "Keep concise — max 500 lines. Must NOT contain requirements or design decisions.",
  ].join("\n"),

  "functions-list": [
    "Generate a 機能一覧 (Function List) from the provided input.",
    "Use 3-tier hierarchy: 大分類 -> 中分類 -> 小機能.",
    "ID format: [PREFIX]-001 (derive prefix from major category).",
    "Processing types: 入力/照会/帳票/バッチ.",
    "Priority: 高/中/低. Fill all 10 columns per row.",
    "Generate at least 10 functions covering the scope described.",
  ].join("\n"),

  requirements: [
    "Generate a 要件定義書 (Requirements Definition) from the provided input.",
    "Follow the 10-section structure defined in the template.",
    "Functional requirements: REQ-001 format, map to function IDs (F-xxx).",
    "Non-functional requirements: NFR-001 format with measurable targets.",
    "Include acceptance criteria for each major requirement.",
    "Cross-reference function IDs from 機能一覧 if upstream doc is provided.",
    "For 非機能要件: Apply IPA NFUG 6 categories (可用性/性能・拡張性/運用・保守性/移行性/セキュリティ/システム環境・エコロジー). Every NFR-xxx MUST have a specific numeric 目標値. Prohibited vague terms: 高速, 十分, 適切, 高い, 良好.",
  ].join("\n"),

  "basic-design": [
    "Generate a 基本設計書 (Basic Design Document) from the provided input.",
    "Follow the 10-section structure defined in the template.",
    "Screen list: SCR-001 format with 8 columns.",
    "Table definitions: TBL-001 format with 8 columns.",
    "API list: API-001 format with 8 columns.",
    "Include Mermaid diagram suggestions for system architecture and business flow.",
    "Cross-reference REQ-xxx IDs from 要件定義書 if upstream doc is provided.",
  ].join("\n"),

  "detail-design": [
    "Generate a 詳細設計書 (Detail Design Document) from the provided input.",
    "Follow the 10-section structure defined in the template.",
    "Module design with call relationships between modules.",
    "Class specifications: クラス仕様 table with 7 columns.",
    "API detail specs: endpoint, req/res schemas, error codes.",
    "Validation rules: バリデーション規則 table with 7 columns.",
    "Error message list: エラーメッセージ一覧 table with 6 columns.",
    "Include Mermaid sequence diagrams for key processing flows.",
    "Cross-reference SCR-xxx, TBL-xxx, API-xxx IDs from 基本設計書.",
  ].join("\n"),

  "test-spec": [
    "Generate a テスト仕様書 (Test Specification) from the provided input.",
    "Follow the 4-section structure defined in the template.",
    "Test cases: 12-column table per test level (UT/IT/ST/UAT).",
    "テスト観点: 正常系/異常系/境界値/パフォーマンス/セキュリティ.",
    "Traceability matrix: REQ-ID -> F-ID -> テストケースID mapping.",
    "Defect report template with standard columns.",
    "Generate at least 5 test cases per major function.",
    "Cross-reference REQ-xxx, F-xxx IDs from upstream documents.",
  ].join("\n"),

  "crud-matrix": [
    "Generate a CRUD matrix (CRUD図) in markdown table format.",
    "Rows = functions (F-xxx from 機能一覧). Columns = tables (TBL-xxx from テーブル定義).",
    "Cell values: C (Create), R (Read), U (Update), D (Delete), CR, CRU, CRUD, or blank.",
    "Format: | 機能ID | 機能名 | TBL-001 テーブル名 | TBL-002 テーブル名 | ...",
    "Every function must have at least one CRUD operation. Every table must be referenced by at least one function.",
    "Include a summary row at the bottom with total C/R/U/D counts per table.",
  ].join("\n"),

  "traceability-matrix": [
    "Generate a traceability matrix (トレーサビリティマトリックス) in markdown table format.",
    "Rows = requirements (REQ-xxx). Columns = SCR-xxx, API-xxx, UT-xxx, IT-xxx, ST-xxx.",
    "Cell value: ○ if covered, blank if not.",
    "Format: | REQ-ID | 要件名 | SCR-xxx | API-xxx | UT-xxx | IT-xxx | ST-xxx |",
    "Every REQ must be covered by at least one SCR, API, or test case.",
    "Include a coverage summary row at the bottom: covered/total per column.",
  ].join("\n"),

  "operation-design": [
    "Generate a 運用設計書 (Operation Design Document) from the provided input.",
    "Include all 6 sections: 運用体制, バックアップ・リストア方針, 監視・アラート定義, 障害対応手順, ジョブ管理, SLA定義.",
    "障害対応手順: Use OP-001 format with columns: OP-ID, 手順名, 手順内容, 担当者, 想定時間.",
    "SLA定義: Must include numeric targets (稼働率 %, RTO, RPO). Prohibit vague terms.",
    "ジョブ管理: List batch jobs with schedule (cron), retry policy, failure alert.",
    "Cross-reference NFR-xxx and REQ-xxx IDs from upstream documents.",
  ].join("\n"),

  "migration-design": [
    "Generate a 移行設計書 (Migration Design Document) from the provided input.",
    "Include all 5 sections: 移行方針, データ移行計画, システム切替手順, ロールバック計画, 移行テスト計画.",
    "データ移行計画: Use MIG-001 format with columns: MIG-ID, 対象データ, 移行方法, 検証方法, 担当者.",
    "ロールバック計画: Must include step-by-step rollback procedure with time estimates.",
    "移行テスト計画: Reference TBL-xxx IDs for data validation targets.",
    "Cross-reference TBL-xxx, REQ-xxx, and OP-xxx IDs from upstream documents.",
  ].join("\n"),
};

/** Default keigo level per document type */
export const KEIGO_MAP: Record<DocType, KeigoLevel> = {
  overview: "丁寧語",
  "functions-list": "丁寧語",
  requirements: "丁寧語",
  "basic-design": "丁寧語",
  "detail-design": "simple",
  "test-spec": "simple",
  "crud-matrix": "simple",
  "traceability-matrix": "simple",
  "operation-design": "simple",
  "migration-design": "simple",
};

/** Build keigo style instruction for AI generation context */
export function buildKeigoInstruction(level: KeigoLevel): string {
  switch (level) {
    case "丁寧語":
      return [
        "## Writing Style (敬語)",
        "Use ですます調 throughout. Every sentence must end with です or ます.",
        "Never use だ or である for sentence endings.",
      ].join("\n");
    case "謙譲語":
      return [
        "## Writing Style (敬語)",
        "Use 謙譲語 keigo throughout. Be appropriately humble.",
        "Maintain consistent formal register across all sections.",
      ].join("\n");
    case "simple":
      return [
        "## Writing Style (敬語)",
        "Use である調 throughout. Sentences end with である, する, した, etc.",
        "Never use です or ます for sentence endings.",
      ].join("\n");
  }
}

/** Language display names for bilingual and output language instruction blocks */
const LANG_DISPLAY_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese (Tiếng Việt)",
};

/**
 * Build output language instruction block.
 * Always injected to ensure explicit output language directive.
 */
export function buildOutputLanguageInstruction(lang: Language): string {
  if (lang === "ja") {
    return [
      `## Output Language`,
      ``,
      `Write ALL output content in **Japanese (日本語)**. You MUST:`,
      `1. Follow the document structure and section order defined in the template`,
      `2. Write all headings, table headers, body text in formal Japanese`,
      `3. Keep technical identifiers as-is (e.g., REQ-001, SCR-001, F-001)`,
      `4. Write exclusively in Japanese — do not mix in English or other languages except for technical terms`,
    ].join("\n");
  }
  const langName = LANG_DISPLAY_NAMES[lang] ?? lang;
  return [
    `## Output Language`,
    ``,
    `Write ALL output content in **${langName}**. You MUST:`,
    `1. Follow the document structure and section order defined in the Japanese template exactly`,
    `2. Write all headings, table headers, body text, and comments in ${langName}`,
    `3. Translate Japanese section headings (e.g., 概要 → Overview, 画面設計 → Screen Design)`,
    `4. Keep technical identifiers as-is (e.g., REQ-001, SCR-001, F-001, TBL-001)`,
    `5. Keep cross-reference IDs, status values, and format codes unchanged`,
    `6. Do NOT output any Japanese text in the final document`,
  ].join("\n");
}

/**
 * Build bilingual translation instruction block for non-Japanese input.
 * Injected into generation context when input_lang != "ja".
 */
export function buildBilingualInstructions(inputLang: string, glossaryTerms: string): string {
  const langName = LANG_DISPLAY_NAMES[inputLang] ?? inputLang;
  const lines = [
    `## Input Language Instructions`,
    ``,
    `The input content is written in **${langName}**. You MUST:`,
    `1. Fully understand the input in ${langName}`,
    `2. Use the glossary terms below for consistent translation of domain terminology`,
    `3. Extract all requirements, features, and constraints from the ${langName} input`,
    `4. The output language is governed by the ## Output Language section above (or Japanese by default)`,
  ];
  if (glossaryTerms) {
    lines.push(``, `### Domain Glossary`, ``, glossaryTerms);
  }
  return lines.join("\n");
}

/** Format glossary result from Python bridge into context-friendly markdown */
export function formatGlossaryForContext(result: Record<string, unknown>): string {
  const terms = result.terms as Array<{ ja: string; en?: string; vi?: string; context?: string }> | undefined;
  if (!terms || terms.length === 0) return "";
  const rows = terms.slice(0, 50).map(
    (t) => `| ${t.ja} | ${t.en ?? ""} | ${t.vi ?? ""} | ${t.context ?? ""} |`
  );
  return [
    `| Japanese | English | Vietnamese | Context |`,
    `|---------|---------|------------|---------|`,
    ...rows,
  ].join("\n");
}

// Re-export screen design instructions (extracted for file size management)
export { buildScreenDesignInstruction } from "./screen-design-instructions.js";
