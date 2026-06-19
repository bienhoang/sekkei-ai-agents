/**
 * Document validation logic: section completeness, cross-references, table structure.
 * Language-aware: picks heading/column sets by document language (ja|vi|en).
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { DocType, KeigoLevel, Manifest } from "../types/documents.js";
import { DOC_TYPES } from "../types/documents.js";
import { extractIds, extractIdsByType } from "./id-extractor.js";
import { deriveUpstreamIdTypes } from "./cross-ref-linker.js";
import { SekkeiError } from "./errors.js";
import { isSubPath } from "./platform.js";
import { validateKeigoComprehensive } from "./keigo-validator.js";
import { CONTENT_DEPTH_RULES } from "./completeness-rules.js";
import { validateMermaidBlocks } from "./mermaid-validator.js";
import { parseFrontmatter } from "./frontmatter-parser.js";
import {
  type Lang,
  resolveLang,
  STRUCTURAL_SECTIONS_BY_LANG,
  REQUIRED_SECTIONS_BY_LANG,
  REVISION_HISTORY_COLUMNS_BY_LANG,
  REQUIRED_COLUMNS_BY_LANG,
  SHARED_SECTION_HEADINGS_BY_LANG,
  FEATURE_SECTION_HEADINGS_BY_LANG,
  REVISION_HEADING_BY_LANG,
} from "./validator-section-maps.js";

export type { Lang };

export interface ValidationIssue {
  type: "missing_section" | "missing_id" | "orphaned_id" | "missing_column" | "keigo_violation" | "completeness" | "staleness" | "changelog_preservation";
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

/**
 * Edge-case overrides where pure derivation from CHAIN_PAIRS is wrong:
 * - nfr: NFR prefix is self-referential (requirements doc also defines NFR-xxx)
 * - security-design: SEC originates from security-design itself, not upstream
 */
const UPSTREAM_OVERRIDES: Partial<Record<DocType, string[]>> = {
  nfr: ["NFR", "REQ"],
  "security-design": ["API", "NFR", "REQ", "SCR", "TBL"],
  "operation-design": ["NFR", "REQ", "API", "TBL", "F"],
  "detail-design": ["SCR", "TBL", "API", "REQ", "F", "RPT"],
  "it-spec": ["API", "SCR", "TBL", "REQ", "F", "TP"],
  "db-design": ["TBL", "REQ", "NFR", "ARCH"],
  "report-design": ["RPT", "F", "SCR", "TBL", "REQ"],
  "batch-design": ["F", "TBL", "REQ", "NFR", "OP"],
  "test-result-report": ["TP", "UT", "IT", "ST", "UAT"],
};

/** Computed once at module load from CHAIN_PAIRS + ID_ORIGIN */
const UPSTREAM_ID_TYPES: Record<DocType, string[]> = Object.fromEntries(
  (DOC_TYPES as readonly string[]).map(dt => [
    dt,
    deriveUpstreamIdTypes(dt, UPSTREAM_OVERRIDES as Record<string, string[]>),
  ])
) as Record<DocType, string[]>;

/** Check that all required sections exist as headings in the content */
export function validateCompleteness(
  content: string,
  docType: DocType,
  lang: Lang = "vi"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = REQUIRED_SECTIONS_BY_LANG[lang][docType];

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
  // O(n+m) Set-based lookup — avoids O(n×m) Array.includes() in inner loops
  const upstreamIdSet = new Set<string>(upstreamIds);

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
      if (!upstreamIdSet.has(id)) {
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
  docType: DocType,
  lang: Lang = "vi"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const columnSets = REQUIRED_COLUMNS_BY_LANG[lang][docType];

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

/**
 * Extract lines between the revision-history heading and the next heading.
 * Uses the heading resolved from the document language so vi docs find
 * "Lịch sử sửa đổi" and ja docs find "改訂履歴".
 */
export function extractRevisionSection(content: string, lang: Lang = "vi"): string[] {
  const heading = REVISION_HEADING_BY_LANG[lang];
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    if (new RegExp(`^#{1,4}\\s+${escapeRegex(heading)}`).test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) captured.push(line);
  }
  return captured;
}

/** Validate revision-history content quality (warnings only) */
export function validateRevisionHistoryContent(
  content: string,
  lang: Lang = "vi"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const heading = REVISION_HEADING_BY_LANG[lang];

  const sectionLines = extractRevisionSection(content, lang);
  if (sectionLines.length === 0) return issues;

  const dataRows = sectionLines
    .filter((line) => /^\|\s*\d+\.\d+\s*\|/.test(line));

  if (dataRows.length === 0) {
    issues.push({
      type: "completeness",
      severity: "warning",
      message: `${heading} table has no data rows`,
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
        message: `${heading} version not ascending: ${versions[i - 1]} → ${versions[i]}`,
      });
    }
  }

  // Check for empty change-description cells (column index 2)
  for (const row of dataRows) {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[2] === "") {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `${heading} row ${cells[0]}: empty change description`,
      });
    }
  }

  return issues;
}

/** Extract the date from the last revision-history row */
export function extractLastRevisionDate(content: string, lang: Lang = "vi"): string | null {
  const sectionLines = extractRevisionSection(content, lang);
  const dates = sectionLines
    .map((line) => line.match(/\|\s*\d+\.\d+\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1]);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

/** Filter lines matching revision data rows (e.g., | 1.0 | ... ) */
export function parseRevisionDataRows(lines: string[]): string[] {
  return lines.filter((line) => /^\|\s*\d+\.\d+\s*\|/.test(line));
}

/** Compare revision-history rows before/after regeneration to detect silent data loss */
export function validateChangelogPreservation(
  previousContent: string,
  newContent: string,
  lang: Lang = "vi"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const heading = REVISION_HEADING_BY_LANG[lang];
  const oldLines = extractRevisionSection(previousContent, lang);
  const newLines = extractRevisionSection(newContent, lang);
  const oldRows = parseRevisionDataRows(oldLines);
  const newRows = parseRevisionDataRows(newLines);

  // No previous changelog → nothing to preserve
  if (oldRows.length === 0) return issues;

  // Row count check
  if (newRows.length < oldRows.length) {
    issues.push({
      type: "changelog_preservation",
      severity: "error",
      message: `${heading} rows decreased: ${oldRows.length} → ${newRows.length}`,
    });
  }

  // Verbatim check: each old row must exist in new content
  for (const oldRow of oldRows) {
    const normalized = oldRow.replace(/\s+/g, " ").trim();
    const found = newRows.some(
      (nr) => nr.replace(/\s+/g, " ").trim() === normalized,
    );
    if (!found) {
      issues.push({
        type: "changelog_preservation",
        severity: "error",
        message: `${heading} row missing or modified: ${oldRow.length > 60 ? oldRow.slice(0, 60) + "..." : oldRow}`,
      });
    }
  }

  // Exactly 1 new row expected (warning if not)
  if (newRows.length !== oldRows.length + 1 && issues.length === 0) {
    issues.push({
      type: "changelog_preservation",
      severity: "warning",
      message: `Expected exactly 1 new ${heading} row, got ${newRows.length - oldRows.length}`,
    });
  }

  return issues;
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

/** Validate SCR IDs in stateDiagram match screen table; TBL IDs in erDiagram match table list */
export function validateDiagramConsistency(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Extract SCR IDs from stateDiagram blocks
  const stateBlocks = content.match(/```mermaid[\s\S]*?stateDiagram[\s\S]*?```/g) ?? [];
  const diagramSCRs = new Set<string>();
  for (const block of stateBlocks) {
    for (const m of block.matchAll(/SCR[-_]?([A-Z]*-?)(\d{1,4})/g)) {
      diagramSCRs.add(`SCR-${m[2].padStart(3, "0")}`);
    }
  }

  // Extract SCR IDs from table rows (| SCR-001 |)
  const tableSCRs = new Set<string>();
  for (const m of content.matchAll(/\|\s*(SCR-\d{1,4})/g)) {
    tableSCRs.add(m[1]);
  }

  if (diagramSCRs.size > 0 && tableSCRs.size > 0) {
    for (const id of tableSCRs) {
      if (!diagramSCRs.has(id)) {
        issues.push({
          type: "completeness",
          severity: "warning",
          message: `${id} in screen table but missing from transition diagram`,
        });
      }
    }
  }

  // Extract TBL IDs from erDiagram blocks
  const erBlocks = content.match(/```mermaid[\s\S]*?erDiagram[\s\S]*?```/g) ?? [];
  if (erBlocks.length > 0) {
    const tableTBLs = new Set<string>();
    for (const m of content.matchAll(/\|\s*(TBL-\d{1,4})/g)) {
      tableTBLs.add(m[1]);
    }
    if (tableTBLs.size === 0) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: "ER diagram exists but no TBL-xxx entries in table definition",
      });
    }
  }

  return issues;
}

/** Check CLS-xxx from class table appear in classDiagram (detail-design) */
export function validateClassDiagramConsistency(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Extract CLS IDs from table rows (| CLS-001 |)
  const tableCLSIds = new Set<string>();
  for (const m of content.matchAll(/\|\s*(CLS-\d{1,4})/g)) {
    tableCLSIds.add(m[1]);
  }

  if (tableCLSIds.size === 0) return issues;

  // Check for classDiagram block
  const classBlocks = content.match(/```mermaid[\s\S]*?classDiagram[\s\S]*?```/g) ?? [];
  if (classBlocks.length === 0) {
    issues.push({
      type: "completeness",
      severity: "warning",
      message: `${tableCLSIds.size} CLS-xxx defined in tables but no classDiagram block found`,
    });
    return issues;
  }

  // Extract class names from classDiagram (CLS-xxx or class CLS_xxx)
  const diagramCLSIds = new Set<string>();
  for (const block of classBlocks) {
    for (const m of block.matchAll(/CLS[-_]?(\d{1,4})/g)) {
      diagramCLSIds.add(`CLS-${m[1].padStart(3, "0")}`);
    }
  }

  for (const id of tableCLSIds) {
    if (!diagramCLSIds.has(id)) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `${id} in class table but missing from classDiagram`,
      });
    }
  }

  return issues;
}

/** Check no two API rows share the same HTTP method + endpoint */
export function validateApiUniqueness(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const apiRows = content.split("\n").filter(l => /\|\s*API-\d+/.test(l));
  const seen = new Map<string, string>();

  for (const row of apiRows) {
    const cells = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    const apiId = cells[0];
    const endpoint = cells[1];
    const method = cells[2];
    const key = `${method.toUpperCase()}:${endpoint}`;
    const existing = seen.get(key);
    if (existing) {
      issues.push({
        type: "completeness",
        severity: "error",
        message: `Duplicate API endpoint: ${apiId} and ${existing} both use ${method} ${endpoint}`,
      });
    }
    seen.set(key, apiId);
  }
  return issues;
}

/** Run full validation on a document */
export function validateDocument(
  content: string,
  docType: DocType,
  upstreamContent?: string,
  options?: { check_completeness?: boolean },
  lang: Lang = "vi"
): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateFrontmatterStatus(content),
    ...validateCompleteness(content, docType, lang),
    ...validateTableStructure(content, docType, lang),
    // Keigo is Japanese-only — skip for vi/en to avoid false positives
    ...(lang === "ja" ? validateKeigo(content, docType) : []),
  ];

  if (options?.check_completeness === true) {
    issues.push(...validateContentDepth(content, docType));
    issues.push(...validateRevisionHistoryContent(content, lang));
    // Mermaid diagram validation
    const mermaidIssues = validateMermaidBlocks(content);
    for (const mi of mermaidIssues) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: mi.message,
      });
    }
  }

  // Advanced validation for basic-design
  if (docType === "basic-design") {
    issues.push(...validateDiagramConsistency(content));
    issues.push(...validateApiUniqueness(content));
  }

  // Advanced validation for detail-design
  if (docType === "detail-design") {
    issues.push(...validateClassDiagramConsistency(content));
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
    // Warn if upstream coverage < 80%
    if (cross_ref_report.coverage < 80) {
      issues.push({
        type: "missing_id",
        severity: "warning",
        message: `Upstream ID coverage is ${cross_ref_report.coverage}% (< 80%). ${cross_ref_report.missing.length} IDs not referenced.`,
      });
    }
  }

  const hasErrors = issues.some((i) => !i.severity || i.severity === "error");
  return {
    valid: !hasErrors,
    issues,
    cross_ref_report,
  };
}

export interface PerFeatureValidationResult {
  valid: boolean;
  per_file: { file: string; issues: ValidationIssue[] }[];
  aggregate_issues: ValidationIssue[];
  cross_ref_report?: CrossRefReport;
}

export async function validatePerFeatureDocument(
  manifestPath: string,
  manifest: Manifest,
  docType: DocType,
  upstreamContent?: string,
  lang?: Lang
): Promise<PerFeatureValidationResult> {
  const baseDir = dirname(manifestPath);
  const doc = manifest.documents[docType];
  if (!doc || doc.type !== "per-feature") {
    throw new SekkeiError("MANIFEST_ERROR", `${docType} is not a per-feature document`);
  }

  const perFile: { file: string; issues: ValidationIssue[] }[] = [];
  const allContent: string[] = [];

  // Per-feature files carry their own language; derive it from the first
  // file's frontmatter so ja and vi docs each validate against their own
  // headings. An explicit lang arg, when given, overrides the derived value.
  let effectiveLang: Lang = lang ?? "vi";
  if (!lang) {
    const firstFile = doc.shared[0]?.file ?? doc.features[0]?.file;
    if (firstFile && isSubPath(resolve(baseDir, firstFile), resolve(baseDir))) {
      try {
        const fc = await readFile(resolve(baseDir, firstFile), "utf-8");
        const fm = parseFrontmatter(fc).meta.language;
        effectiveLang = resolveLang(typeof fm === "string" ? fm : undefined);
      } catch {
        // keep default when the first file is unreadable
      }
    }
  }

  const sharedHeadings = SHARED_SECTION_HEADINGS_BY_LANG[effectiveLang];
  const featureHeadings = FEATURE_SECTION_HEADINGS_BY_LANG[effectiveLang];

  // Validate shared files
  for (const shared of doc.shared) {
    assertContained(baseDir, shared.file);
    const content = await readFile(resolve(baseDir, shared.file), "utf-8");
    allContent.push(content);
    const heading = sharedHeadings[shared.section];
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
    const requiredSections = featureHeadings[docType] ?? [];
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
  const aggregateIssues = validateTableStructure(merged, docType, effectiveLang);
  let crossRefReport: CrossRefReport | undefined;
  if (upstreamContent) {
    crossRefReport = validateCrossRefs(merged, upstreamContent, docType);
  }

  // Cross-feature duplicate ID check (SCR, RPT)
  const featureIdSets = new Map<string, Set<string>>();
  for (let fi = 0; fi < doc.features.length; fi++) {
    const feature = doc.features[fi];
    const content = allContent[doc.shared.length + fi];
    const scrIds = content.match(/\bSCR-[A-Z0-9]+-?\d{1,4}\b/g) ?? [];
    const rptIds = content.match(/\bRPT-[A-Z0-9]+-?\d{1,4}\b/g) ?? [];
    const clsIds = content.match(/\bCLS-[A-Z0-9]+-?\d{1,4}\b/g) ?? [];
    const ddIds = content.match(/\bDD-[A-Z0-9]+-?\d{1,4}\b/g) ?? [];
    featureIdSets.set(feature.name, new Set([...scrIds, ...rptIds, ...clsIds, ...ddIds]));
  }
  const seen = new Map<string, string>();
  for (const [featureName, ids] of featureIdSets) {
    for (const id of ids) {
      const existing = seen.get(id);
      if (existing && existing !== featureName) {
        aggregateIssues.push({
          type: "completeness" as const,
          severity: "error" as const,
          message: `Duplicate ID ${id} found in features "${existing}" and "${featureName}"`,
        });
      }
      seen.set(id, featureName);
    }
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
  if (!isSubPath(resolved, baseDir)) {
    throw new SekkeiError("MANIFEST_ERROR", `Path escapes base directory: ${filePath}`);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Re-export the structural-sections array for callers that need it at runtime
// (e.g. generate.ts uses the ja revision heading directly via REVISION_HEADING_BY_LANG)
export { REVISION_HEADING_BY_LANG, STRUCTURAL_SECTIONS_BY_LANG };
