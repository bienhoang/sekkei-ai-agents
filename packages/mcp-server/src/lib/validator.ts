/**
 * Document validation logic: section completeness, cross-references, table structure.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { DocType, KeigoLevel, Manifest } from "../types/documents.js";
import { extractIds, extractIdsByType } from "./id-extractor.js";
import { SekkeiError } from "./errors.js";
import { validateKeigoComprehensive } from "./keigo-validator.js";
import { CONTENT_DEPTH_RULES } from "./completeness-rules.js";

export interface ValidationIssue {
  type: "missing_section" | "missing_id" | "orphaned_id" | "missing_column" | "keigo_violation" | "completeness" | "staleness";
  message: string;
  severity?: "error" | "warning";
}

export interface CrossRefReport {
  upstream_ids: string[];
  referenced_ids: string[];
  missing: string[];
  orphaned: string[];
  coverage: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  cross_ref_report?: CrossRefReport;
}

/** Required markdown heading sections per document type */
/** Structural sections required in ALL document types */
const STRUCTURAL_SECTIONS = ["改訂履歴", "承認欄", "配布先", "用語集"];

const REQUIRED_SECTIONS: Record<DocType, string[]> = {
  "functions-list": [...STRUCTURAL_SECTIONS, "機能一覧"],
  requirements: [...STRUCTURAL_SECTIONS, "概要", "機能要件", "非機能要件"],
  nfr: [
    ...STRUCTURAL_SECTIONS,
    "非機能要件概要", "可用性", "性能・拡張性",
    "運用・保守性", "移行性", "セキュリティ", "システム環境",
  ],
  "project-plan": [
    ...STRUCTURAL_SECTIONS,
    "プロジェクト概要", "WBS", "体制", "リスク管理",
  ],
  "basic-design": [
    ...STRUCTURAL_SECTIONS,
    "概要", "システム構成", "業務フロー", "画面設計",
    "DB設計", "外部インターフェース",
  ],
  "security-design": [
    ...STRUCTURAL_SECTIONS,
    "セキュリティ方針", "認証・認可設計", "データ保護",
    "通信セキュリティ", "脆弱性対策", "監査ログ",
  ],
  "detail-design": [
    ...STRUCTURAL_SECTIONS,
    "概要", "モジュール設計", "クラス設計", "画面設計詳細",
    "DB詳細設計", "API詳細仕様", "処理フロー", "エラーハンドリング",
  ],
  "test-plan": [
    ...STRUCTURAL_SECTIONS,
    "テスト方針", "テスト戦略", "テスト環境", "完了基準",
  ],
  "ut-spec": [
    ...STRUCTURAL_SECTIONS,
    "テスト設計", "単体テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "it-spec": [
    ...STRUCTURAL_SECTIONS,
    "テスト設計", "結合テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "st-spec": [
    ...STRUCTURAL_SECTIONS,
    "テスト設計", "システムテストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "uat-spec": [
    ...STRUCTURAL_SECTIONS,
    "テスト設計", "受入テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "crud-matrix": [],
  "traceability-matrix": [],
  "operation-design": [
    ...STRUCTURAL_SECTIONS,
    "運用体制", "バックアップ・リストア方針", "監視・アラート定義",
    "障害対応手順", "ジョブ管理", "SLA定義",
  ],
  "migration-design": [
    ...STRUCTURAL_SECTIONS,
    "移行方針", "データ移行計画", "システム切替手順",
    "ロールバック計画", "移行テスト計画",
  ],
  "sitemap": [],
  "test-evidence": [
    "改訂履歴", "承認欄",
    "単体テスト (UT) エビデンス", "テストエビデンスサマリー",
  ],
  "meeting-minutes": [
    "改訂履歴",
    "会議情報", "出席者", "議題", "決定事項", "アクション項目",
  ],
  "decision-record": [
    "改訂履歴",
    "コンテキスト", "検討事項", "決定内容", "影響範囲",
  ],
  "interface-spec": [
    "改訂履歴", "承認欄",
    "インターフェース概要", "データフォーマット", "プロトコル",
    "エラーハンドリング", "SLA定義",
  ],
  "screen-design": [
    "改訂履歴", "承認欄",
    "画面一覧", "画面遷移図",
  ],
};

/** Expected upstream ID types for cross-reference validation */
const UPSTREAM_ID_TYPES: Record<DocType, string[]> = {
  "functions-list": ["REQ"],
  requirements: [],
  nfr: ["REQ", "NFR"],
  "project-plan": ["REQ", "F"],
  "basic-design": ["REQ", "F"],
  "security-design": ["REQ", "NFR", "API", "SCR", "TBL"],
  "detail-design": ["SCR", "TBL", "API"],
  "test-plan": ["REQ", "F", "NFR"],
  "ut-spec": ["CLS", "DD"],
  "it-spec": ["API", "SCR", "TBL"],
  "st-spec": ["SCR", "TBL", "F"],
  "uat-spec": ["REQ", "NFR"],
  "crud-matrix": ["F", "TBL"],
  "traceability-matrix": ["REQ", "SCR", "API"],
  "operation-design": ["NFR", "REQ"],
  "migration-design": ["TBL", "REQ", "OP"],
  "sitemap": ["F"],
  "test-evidence": ["UT", "IT", "ST", "UAT"],
  "meeting-minutes": [],
  "decision-record": [],
  "interface-spec": ["API"],
  "screen-design": ["SCR", "API"],
};

/** Required table columns (partial match) per doc type */
/** 改訂履歴 table columns required in ALL document types */
const REVISION_HISTORY_COLUMNS = ["版数", "日付", "変更内容", "変更者"];

const REQUIRED_COLUMNS: Record<DocType, string[][]> = {
  "functions-list": [REVISION_HISTORY_COLUMNS, ["大分類", "中分類", "機能ID", "機能名", "関連要件ID"]],
  requirements: [REVISION_HISTORY_COLUMNS, ["要件ID", "要件名"], ["NFR-ID", "カテゴリ", "目標値", "測定方法"]],
  nfr: [REVISION_HISTORY_COLUMNS, ["NFR-ID", "カテゴリ", "目標値", "測定方法"]],
  "project-plan": [REVISION_HISTORY_COLUMNS, ["PP-ID"]],
  "basic-design": [REVISION_HISTORY_COLUMNS, ["画面ID"], ["テーブルID"], ["API"]],
  "security-design": [REVISION_HISTORY_COLUMNS, ["SEC-ID", "対策項目"]],
  "detail-design": [REVISION_HISTORY_COLUMNS, ["クラスID"], ["エラーコード"]],
  "test-plan": [REVISION_HISTORY_COLUMNS, ["TP-ID"]],
  "ut-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
  "it-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
  "st-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
  "uat-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
  "crud-matrix": [["機能ID", "機能名"]],
  "traceability-matrix": [["要件ID"]],
  "operation-design": [REVISION_HISTORY_COLUMNS, ["OP-ID", "手順名", "担当者"]],
  "migration-design": [REVISION_HISTORY_COLUMNS, ["MIG-ID", "対象データ", "移行方法"]],
  "sitemap": [["ページID", "ページ名"]],
  "test-evidence": [REVISION_HISTORY_COLUMNS, ["エビデンスID", "テストケースID"]],
  "meeting-minutes": [REVISION_HISTORY_COLUMNS],
  "decision-record": [REVISION_HISTORY_COLUMNS],
  "interface-spec": [REVISION_HISTORY_COLUMNS, ["IF-ID"]],
  "screen-design": [REVISION_HISTORY_COLUMNS, ["画面ID"]],
};

/** Check that all required sections exist as headings in the content */
export function validateCompleteness(
  content: string,
  docType: DocType
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = REQUIRED_SECTIONS[docType];

  for (const section of required) {
    // Match heading (## or ###) containing the section name
    const pattern = new RegExp(`^#{1,4}\\s+.*${escapeRegex(section)}`, "m");
    if (!pattern.test(content)) {
      issues.push({
        type: "missing_section",
        message: `Missing required section: ${section}`,
      });
    }
  }

  return issues;
}

/** Validate cross-references between current doc and upstream doc */
export function validateCrossRefs(
  currentContent: string,
  upstreamContent: string,
  docType: DocType
): CrossRefReport {
  const upstreamTypes = UPSTREAM_ID_TYPES[docType];
  if (upstreamTypes.length === 0) {
    return { upstream_ids: [], referenced_ids: [], missing: [], orphaned: [], coverage: 100 };
  }

  // Collect all upstream IDs of expected types
  const upstreamIdMap = extractIds(upstreamContent);
  const upstreamIds: string[] = [];
  for (const type of upstreamTypes) {
    upstreamIds.push(...(upstreamIdMap.get(type) ?? []));
  }

  // Find which upstream IDs are referenced in the current doc
  const referencedIds: string[] = [];
  const missing: string[] = [];
  for (const id of upstreamIds) {
    if (currentContent.includes(id)) {
      referencedIds.push(id);
    } else {
      missing.push(id);
    }
  }

  // Find IDs in current doc of upstream types that don't exist in upstream
  const orphaned: string[] = [];
  for (const type of upstreamTypes) {
    const currentIds = extractIdsByType(currentContent, type);
    for (const id of currentIds) {
      if (!upstreamIds.includes(id)) {
        orphaned.push(id);
      }
    }
  }

  const coverage = upstreamIds.length > 0
    ? Math.round((referencedIds.length / upstreamIds.length) * 100)
    : 100;

  return { upstream_ids: upstreamIds, referenced_ids: referencedIds, missing, orphaned, coverage };
}

/** Check that required table columns exist in the content */
export function validateTableStructure(
  content: string,
  docType: DocType
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const columnSets = REQUIRED_COLUMNS[docType];

  for (const columns of columnSets) {
    // Check if at least one table row/header contains all required columns
    const allPresent = columns.every((col) => content.includes(col));
    if (!allPresent) {
      const missingCols = columns.filter((col) => !content.includes(col));
      issues.push({
        type: "missing_column",
        message: `Missing table column(s): ${missingCols.join(", ")}`,
      });
    }
  }

  return issues;
}

/** Validate keigo consistency — returns advisory warnings, not blocking errors */
export function validateKeigo(
  content: string,
  docType: DocType,
  _keigoOverride?: KeigoLevel
): ValidationIssue[] {
  // Delegate to comprehensive keigo validator
  return validateKeigoComprehensive(content, docType);
}

/** Check content depth: required ID patterns and table rows per doc type */
export function validateContentDepth(
  content: string,
  docType: DocType
): ValidationIssue[] {
  const rules = CONTENT_DEPTH_RULES[docType];
  if (!rules) return [];
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    if (!rule.test(content)) {
      issues.push({ type: "completeness", severity: "warning", message: rule.message });
    }
  }
  return issues;
}

/** Extract lines between 改訂履歴 heading and next heading */
function extractRevisionSection(content: string): string[] {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    if (/^#{1,4}\s+改訂履歴/.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) captured.push(line);
  }
  return captured;
}

/** Validate 改訂履歴 content quality (warnings only) */
export function validateRevisionHistoryContent(
  content: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const sectionLines = extractRevisionSection(content);
  if (sectionLines.length === 0) return issues;

  const dataRows = sectionLines
    .filter((line) => /^\|\s*\d+\.\d+\s*\|/.test(line));

  if (dataRows.length === 0) {
    issues.push({
      type: "completeness",
      severity: "warning",
      message: "改訂履歴 table has no data rows",
    });
    return issues;
  }

  // Check version sequence (ascending)
  const versions: string[] = [];
  for (const row of dataRows) {
    const match = row.match(/^\|\s*([0-9]+\.[0-9]+)\s*\|/);
    if (match) versions.push(match[1]);
  }

  for (let i = 1; i < versions.length; i++) {
    const [prevMaj, prevMin] = versions[i - 1].split(".").map(Number);
    const [currMaj, currMin] = versions[i].split(".").map(Number);
    if (currMaj < prevMaj || (currMaj === prevMaj && currMin <= prevMin)) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `改訂履歴 版数 not ascending: ${versions[i - 1]} → ${versions[i]}`,
      });
    }
  }

  // Check for empty 変更内容 cells
  for (const row of dataRows) {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[2] === "") {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `改訂履歴 row ${cells[0]}: empty 変更内容`,
      });
    }
  }

  return issues;
}

/** Extract the date from the last 改訂履歴 row */
export function extractLastRevisionDate(content: string): string | null {
  const sectionLines = extractRevisionSection(content);
  const dates = sectionLines
    .map((line) => line.match(/\|\s*\d+\.\d+\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1]);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

/** Check YAML frontmatter for required lifecycle status field */
function validateFrontmatterStatus(content: string): ValidationIssue[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  // Frontmatter present — check for status field
  const hasFrontmatter = match[1].trim().length > 0;
  if (hasFrontmatter && !/^\s*status\s*:/m.test(match[1])) {
    return [{
      type: "missing_section",
      message: "YAMLフロントマターに status フィールドが必要です",
      severity: "warning",
    }];
  }
  return [];
}

/** Run full validation on a document */
export function validateDocument(
  content: string,
  docType: DocType,
  upstreamContent?: string,
  options?: { check_completeness?: boolean }
): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateFrontmatterStatus(content),
    ...validateCompleteness(content, docType),
    ...validateTableStructure(content, docType),
    ...validateKeigo(content, docType),
  ];

  if (options?.check_completeness === true) {
    issues.push(...validateContentDepth(content, docType));
    issues.push(...validateRevisionHistoryContent(content));
  }

  let cross_ref_report: CrossRefReport | undefined;
  if (upstreamContent) {
    cross_ref_report = validateCrossRefs(content, upstreamContent, docType);
    for (const id of cross_ref_report.missing) {
      issues.push({ type: "missing_id", message: `Upstream ID not referenced: ${id}` });
    }
    for (const id of cross_ref_report.orphaned) {
      issues.push({ type: "orphaned_id", message: `ID not found in upstream: ${id}` });
    }
  }

  const hasErrors = issues.some((i) => !i.severity || i.severity === "error");
  return {
    valid: !hasErrors,
    issues,
    cross_ref_report,
  };
}

/** Required headings for shared section files */
const SHARED_SECTION_HEADINGS: Record<string, string> = {
  "system-architecture": "システム構成",
  "database-design": "DB設計",
  "external-interface": "外部インターフェース",
  "non-functional-design": "非機能",
  "technology-rationale": "技術選定",
};

/** Required headings for per-feature files */
const FEATURE_SECTION_HEADINGS: Partial<Record<DocType, string[]>> = {
  "basic-design": ["概要", "業務フロー", "画面設計"],
  "detail-design": ["概要", "モジュール設計", "画面設計詳細"],
  "ut-spec": ["単体テストケース"],
  "it-spec": ["結合テストケース"],
};

export interface SplitValidationResult {
  valid: boolean;
  per_file: { file: string; issues: ValidationIssue[] }[];
  aggregate_issues: ValidationIssue[];
  cross_ref_report?: CrossRefReport;
}

export async function validateSplitDocument(
  manifestPath: string,
  manifest: Manifest,
  docType: DocType,
  upstreamContent?: string
): Promise<SplitValidationResult> {
  const baseDir = dirname(manifestPath);
  const doc = manifest.documents[docType];
  if (!doc || doc.type !== "split") {
    throw new SekkeiError("MANIFEST_ERROR", `${docType} is not a split document`);
  }

  const perFile: { file: string; issues: ValidationIssue[] }[] = [];
  const allContent: string[] = [];

  // Validate shared files
  for (const shared of doc.shared) {
    assertContained(baseDir, shared.file);
    const content = await readFile(resolve(baseDir, shared.file), "utf-8");
    allContent.push(content);
    const heading = SHARED_SECTION_HEADINGS[shared.section];
    const issues: ValidationIssue[] = [];
    if (heading && !new RegExp(`^#{1,4}\\s+.*${escapeRegex(heading)}`, "m").test(content)) {
      issues.push({ type: "missing_section", message: `[${shared.file}] Missing: ${heading}` });
    }
    perFile.push({ file: shared.file, issues });
  }

  // Validate feature files
  for (const feature of doc.features) {
    assertContained(baseDir, feature.file);
    const content = await readFile(resolve(baseDir, feature.file), "utf-8");
    allContent.push(content);
    const requiredSections = FEATURE_SECTION_HEADINGS[docType] ?? [];
    const issues: ValidationIssue[] = [];
    for (const section of requiredSections) {
      if (!new RegExp(`^#{1,4}\\s+.*${escapeRegex(section)}`, "m").test(content)) {
        issues.push({ type: "missing_section", message: `[${feature.file}] Missing: ${section}` });
      }
    }
    perFile.push({ file: feature.file, issues });
  }

  // Aggregate cross-ref validation
  const merged = allContent.join("\n\n");
  const aggregateIssues = validateTableStructure(merged, docType);
  let crossRefReport: CrossRefReport | undefined;
  if (upstreamContent) {
    crossRefReport = validateCrossRefs(merged, upstreamContent, docType);
  }

  const allIssues = perFile.flatMap(f => f.issues).concat(aggregateIssues);
  return {
    valid: allIssues.length === 0 && (!crossRefReport || crossRefReport.missing.length === 0),
    per_file: perFile,
    aggregate_issues: aggregateIssues,
    cross_ref_report: crossRefReport,
  };
}

/** Ensure resolved path stays within base directory (prevent path traversal) */
function assertContained(baseDir: string, filePath: string): void {
  const resolved = resolve(baseDir, filePath);
  if (!resolved.startsWith(baseDir + "/") && resolved !== baseDir) {
    throw new SekkeiError("MANIFEST_ERROR", `Path escapes base directory: ${filePath}`);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
