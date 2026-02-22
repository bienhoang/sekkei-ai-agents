/**
 * Anti-chaos structural rules engine — data-driven checks for document conformance.
 * Rules check section ordering, required sections, frontmatter fields, heading hierarchy.
 */
import { parse as parseYaml } from "yaml";
import type { Preset } from "../types/documents.js";
import { LIFECYCLE_STATUSES } from "../types/documents.js";

export type ViolationSeverity = "error" | "warning" | "info";

export interface StructureViolation {
  rule: string;
  severity: ViolationSeverity;
  message: string;
  expected?: string;
  actual?: string;
  line?: number;
}

export interface StructureRuleContext {
  content: string;
  docType: string;
  templateSections: string[];
  preset?: Preset;
  frontmatter?: Record<string, unknown>;
}

export interface StructureRule {
  name: string;
  description: string;
  /** Which presets this rule applies to. Empty array = all presets */
  presets: string[];
  severity: ViolationSeverity;
  check: (ctx: StructureRuleContext) => StructureViolation[];
}

export interface HeadingEntry {
  level: number;
  text: string;
  line: number;
}

/** Extract H2/H3 headings, skipping those inside code blocks */
export function extractHeadings(content: string): HeadingEntry[] {
  const lines = content.split("\n");
  const headings: HeadingEntry[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

/** Parse YAML frontmatter from document content */
export function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return null;
  try {
    const parsed = parseYaml(match[1]);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Normalize section name: strip leading numbers/dots (e.g. "1. 概要" → "概要") */
function normalizeSection(name: string): string {
  return name.replace(/^\d+[\.\s]+/, "").trim();
}

const RULES: StructureRule[] = [
  {
    name: "required-sections",
    description: "All template sections must appear as H2 headings",
    presets: [],
    severity: "error",
    check(ctx) {
      const violations: StructureViolation[] = [];
      if (!ctx.templateSections.length) return violations;
      const headings = extractHeadings(ctx.content)
        .filter(h => h.level === 2)
        .map(h => normalizeSection(h.text));
      for (const section of ctx.templateSections) {
        const normalized = normalizeSection(section);
        if (!headings.some(h => h === normalized)) {
          violations.push({
            rule: "required-sections",
            severity: "error",
            message: `Required section missing: "${section}"`,
            expected: section,
          });
        }
      }
      return violations;
    },
  },
  {
    name: "section-ordering",
    description: "H2 sections must appear in the same order as the template",
    presets: ["enterprise", "standard"],
    severity: "warning",
    check(ctx) {
      if (!ctx.templateSections.length) return [];
      const h2s = extractHeadings(ctx.content)
        .filter(h => h.level === 2)
        .map(h => normalizeSection(h.text));
      const templateNormalized = ctx.templateSections.map(normalizeSection);

      // Build ordered list of template sections that actually appear in document
      const docOrdered = h2s.filter(h => templateNormalized.includes(h));
      const templateOrdered = templateNormalized.filter(s => docOrdered.includes(s));

      for (let i = 0; i < docOrdered.length; i++) {
        if (docOrdered[i] !== templateOrdered[i]) {
          return [{
            rule: "section-ordering",
            severity: "warning",
            message: `Section out of order: "${docOrdered[i]}" found where "${templateOrdered[i]}" expected`,
            expected: templateOrdered[i],
            actual: docOrdered[i],
          }];
        }
      }
      return [];
    },
  },
  {
    name: "unexpected-sections",
    description: "No H2 headings should appear that are not in the template",
    presets: ["enterprise"],
    severity: "warning",
    check(ctx) {
      if (!ctx.templateSections.length) return [];
      const templateNormalized = ctx.templateSections.map(normalizeSection);
      return extractHeadings(ctx.content)
        .filter(h => h.level === 2)
        .filter(h => !templateNormalized.includes(normalizeSection(h.text)))
        .map(h => ({
          rule: "unexpected-sections",
          severity: "warning" as ViolationSeverity,
          message: `Unexpected section: "${h.text}"`,
          actual: h.text,
          line: h.line,
        }));
    },
  },
  {
    name: "frontmatter-fields",
    description: "Required frontmatter fields must be present: doc_type, version",
    presets: [],
    severity: "error",
    check(ctx) {
      const fm = ctx.frontmatter ?? extractFrontmatter(ctx.content) ?? {};
      const required = ["doc_type", "version"];
      return required
        .filter(f => !(f in fm))
        .map(f => ({
          rule: "frontmatter-fields",
          severity: "error" as ViolationSeverity,
          message: `Required frontmatter field missing: "${f}"`,
          expected: f,
        }));
    },
  },
  {
    name: "frontmatter-status",
    description: "Frontmatter must have a valid lifecycle status field",
    presets: ["enterprise", "standard"],
    severity: "warning",
    check(ctx) {
      const fm = ctx.frontmatter ?? extractFrontmatter(ctx.content) ?? {};
      if (!("status" in fm)) {
        return [{
          rule: "frontmatter-status",
          severity: "warning",
          message: `Frontmatter missing "status" field (expected one of: ${LIFECYCLE_STATUSES.join(", ")})`,
          expected: LIFECYCLE_STATUSES.join(" | "),
        }];
      }
      if (!LIFECYCLE_STATUSES.includes(fm.status as typeof LIFECYCLE_STATUSES[number])) {
        return [{
          rule: "frontmatter-status",
          severity: "warning",
          message: `Invalid status value: "${fm.status}" (expected one of: ${LIFECYCLE_STATUSES.join(", ")})`,
          expected: LIFECYCLE_STATUSES.join(" | "),
          actual: String(fm.status),
        }];
      }
      return [];
    },
  },
  {
    name: "heading-level-hierarchy",
    description: "H3 headings must not appear before their parent H2",
    presets: [],
    severity: "error",
    check(ctx) {
      const headings = extractHeadings(ctx.content);
      const violations: StructureViolation[] = [];
      let hasParentH2 = false;
      for (const h of headings) {
        if (h.level === 2) {
          hasParentH2 = true;
        } else if (h.level === 3 && !hasParentH2) {
          violations.push({
            rule: "heading-level-hierarchy",
            severity: "error",
            message: `H3 heading "${h.text}" appears before any H2 parent`,
            actual: h.text,
            line: h.line,
          });
        }
      }
      return violations;
    },
  },
  {
    name: "empty-sections",
    description: "Sections must contain content, not just whitespace",
    presets: ["enterprise", "standard"],
    severity: "warning",
    check(ctx) {
      const headings = extractHeadings(ctx.content);
      if (!headings.length) return [];
      const lines = ctx.content.split("\n");
      const violations: StructureViolation[] = [];

      for (let i = 0; i < headings.length; i++) {
        const start = headings[i].line; // 1-indexed
        const end = i + 1 < headings.length ? headings[i + 1].line - 1 : lines.length;
        const sectionLines = lines.slice(start, end); // skip the heading line itself
        const hasContent = sectionLines.some(l => l.trim().length > 0);
        if (!hasContent) {
          violations.push({
            rule: "empty-sections",
            severity: "warning",
            message: `Section "${headings[i].text}" has no content`,
            actual: headings[i].text,
            line: headings[i].line,
          });
        }
      }
      return violations;
    },
  },
];

export function checkStructureRules(ctx: StructureRuleContext): StructureViolation[] {
  const preset = ctx.preset ?? "standard";
  const applicable = RULES.filter(
    r => r.presets.length === 0 || r.presets.includes(preset)
  );
  const violations: StructureViolation[] = [];
  for (const rule of applicable) {
    violations.push(...rule.check(ctx));
  }
  return violations;
}
