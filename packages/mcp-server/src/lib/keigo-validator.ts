/**
 * Comprehensive keigo validation for Japanese spec documents.
 * Detects keigo level, mixed keigo, and common BrSE mistakes.
 */
import type { DocType } from "../types/documents.js";
import type { Preset } from "../types/documents.js";
import type { ValidationIssue } from "./validator.js";

// Compiled regex patterns for keigo detection
const TEINEIGO_PATTERNS = [
  /です[。\n]/g,
  /ます[。\s\n]/g,
  /ました[。\n]/g,
  /ません[。\n]/g,
  /でしょう[。\n]/g,
];

const KEIGO_PATTERNS = [
  /いたします/g,
  /ございます/g,
  /申し上げます/g,
  /させていただ/g,
  /拝察/g,
];

const JOUTAI_PATTERNS = [
  /である[。\n]/g,
  /とする[。\n]/g,
  /できる[。\n]/g,
  /ない[。\n]/g,
  /べき[。\n]/g,
];

const VERBOSE_PATTERNS = [
  /削除処理を行う/g,
  /更新処理を行う/g,
  /検索処理を行う/g,
  /を行っていただく/g,
  /となります/g,
];

type DetectedLevel = "teineigo" | "keigo" | "joutai" | "mixed";

interface KeigoDetection {
  level: DetectedLevel;
  counts: { teineigo: number; keigo: number; joutai: number };
}

// Count regex matches in text
function countMatches(text: string, patterns: RegExp[]): number {
  let total = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    total += matches?.length ?? 0;
  }
  return total;
}

// Strip non-prose lines (headings, tables, code blocks, comments, list markers)
function extractProse(content: string): string {
  return content.split("\n")
    .filter(line => {
      const t = line.trim();
      return t && !t.startsWith("#") && !t.startsWith("|") && !t.startsWith("```")
        && !t.startsWith("<!--") && !t.startsWith("-") && !t.startsWith("*")
        && !t.startsWith(">");
    })
    .join("\n");
}

export function detectKeigoLevel(text: string): KeigoDetection {
  const prose = extractProse(text);
  const teineigo = countMatches(prose, TEINEIGO_PATTERNS);
  const keigo = countMatches(prose, KEIGO_PATTERNS);
  const joutai = countMatches(prose, JOUTAI_PATTERNS);

  // keigo folds into teineigo for classification (keigo is superset of teineigo)
  const politeTotal = teineigo + keigo;

  // Mixed: both polite and plain forms in significant quantities (≥3 each)
  if (politeTotal >= 3 && joutai >= 3) {
    return { level: "mixed", counts: { teineigo, keigo, joutai } };
  }

  if (keigo > teineigo && keigo > joutai) {
    return { level: "keigo", counts: { teineigo, keigo, joutai } };
  }

  if (politeTotal > joutai) {
    return { level: "teineigo", counts: { teineigo, keigo, joutai } };
  }

  if (joutai > 0) {
    return { level: "joutai", counts: { teineigo, keigo, joutai } };
  }

  // No patterns detected — insufficient prose to classify
  return { level: "joutai", counts: { teineigo: 0, keigo: 0, joutai: 0 } };
}

// Expected keigo matrix: doc_type × preset → expected level
const EXPECTED_KEIGO: Record<string, Record<string, "teineigo" | "joutai" | "any">> = {
  "requirements":      { enterprise: "teineigo", standard: "teineigo", agile: "joutai",  default: "teineigo" },
  "nfr":               { enterprise: "teineigo", standard: "teineigo", agile: "joutai",  default: "teineigo" },
  "functions-list":    { enterprise: "teineigo", standard: "teineigo", agile: "joutai",  default: "teineigo" },
  "project-plan":      { enterprise: "teineigo", standard: "teineigo", agile: "joutai",  default: "teineigo" },
  "basic-design":      { enterprise: "teineigo", standard: "any",      agile: "joutai",  default: "any" },
  "security-design":   { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "detail-design":     { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "test-plan":         { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "ut-spec":           { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "it-spec":           { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "st-spec":           { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
  "uat-spec":          { enterprise: "teineigo", standard: "joutai",   agile: "joutai",  default: "joutai" },
};

export function detectBrseMistakes(text: string, docType: DocType): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prose = extractProse(text);

  // Over-keigo in developer-only docs
  const devOnlyDocs: DocType[] = ["detail-design", "ut-spec", "it-spec", "st-spec", "uat-spec"];
  if (devOnlyDocs.includes(docType)) {
    const overKeigo = countMatches(prose, [/させていただ/g]);
    if (overKeigo > 0) {
      const label = docType === "detail-design" ? "詳細設計書" : `${docType}`;
      issues.push({
        type: "keigo_violation",
        message: `Over-keigo detected: 「させていただ」が${label}で${overKeigo}回使用（開発者向けドキュメントには不要）`,
        severity: "warning",
      });
    }
  }

  // Verbose nominalization patterns
  const verboseCount = countMatches(prose, VERBOSE_PATTERNS);
  if (verboseCount > 2) {
    issues.push({
      type: "keigo_violation",
      message: `冗長な表現が${verboseCount}箇所検出（例: 「削除処理を行う」→「削除する」に簡潔化推奨）`,
      severity: "warning",
    });
  }

  // 処理 overuse (>5 per 500 chars)
  const shoriCount = (prose.match(/処理/g) ?? []).length;
  const charsPer500 = Math.max(prose.length / 500, 1);
  if (shoriCount / charsPer500 > 5) {
    issues.push({
      type: "keigo_violation",
      message: `「処理」の過剰使用: ${shoriCount}回（500文字あたり${Math.round(shoriCount / charsPer500)}回）— 具体的な動詞への置換を推奨`,
      severity: "warning",
    });
  }

  return issues;
}

/**
 * Main keigo validation entry point.
 * Returns ValidationIssue[] with type "keigo_violation", severity "warning".
 */
export function validateKeigoComprehensive(
  text: string,
  docType: DocType,
  preset?: Preset
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const expected = EXPECTED_KEIGO[docType]?.[preset ?? "default"] ?? "any";
  const detection = detectKeigoLevel(text);

  // No prose detected — skip keigo checks (structural/table-only documents)
  const totalCounts = detection.counts.teineigo + detection.counts.keigo + detection.counts.joutai;
  if (totalCounts === 0) {
    return detectBrseMistakes(text, docType);
  }

  // Mixed keigo warning
  if (detection.level === "mixed") {
    issues.push({
      type: "keigo_violation",
      message: `混在した敬語レベルが検出されました（丁寧語: ${detection.counts.teineigo + detection.counts.keigo}回, 常体: ${detection.counts.joutai}回）— 統一を推奨`,
      severity: "warning",
    });
  }

  // Level mismatch
  if (expected !== "any" && detection.level !== "mixed") {
    const actual = detection.level === "keigo" ? "teineigo" : detection.level;
    if (actual !== expected) {
      const expectedLabel = expected === "teineigo" ? "丁寧語（ですます調）" : "常体（である調）";
      const actualLabel = actual === "teineigo" ? "丁寧語（ですます調）" : "常体（である調）";
      issues.push({
        type: "keigo_violation",
        message: `敬語レベル不一致: 期待=${expectedLabel}, 検出=${actualLabel}`,
        severity: "warning",
      });
    }
  }

  // BrSE mistake detection (always runs)
  issues.push(...detectBrseMistakes(text, docType));

  return issues;
}
