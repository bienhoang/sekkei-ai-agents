/**
 * validate_document MCP tool — checks document completeness, cross-references, and table structure.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DOC_TYPES } from "../types/documents.js";
import { validateDocument, validateSplitDocument } from "../lib/validator.js";
import { readManifest } from "../lib/manifest-manager.js";
import { validateNumberedStructure } from "../lib/structure-validator.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  content: z.string().max(500_000).optional()
    .describe("Markdown document content to validate (not needed when manifest_path or structure_path provided)"),
  doc_type: z.enum(DOC_TYPES).optional().describe("Type of document being validated (not needed for structure validation)"),
  upstream_content: z.string().max(500_000).optional().describe("Upstream document content for cross-reference checking"),
  manifest_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "Must be .yaml/.yml" })
    .describe("Path to _index.yaml for split document validation"),
  structure_path: z.string().max(500).optional()
    .refine((p) => !p || !p.includes(".."), { message: "Path must not contain .." })
    .describe("Path to output directory for numbered structure validation"),
  check_completeness: z.boolean().optional()
    .describe("Run content depth checks (required ID patterns, table rows per doc type)"),
  check_structure_rules: z.boolean().optional()
    .describe("Check document structure against template rules (section ordering, required fields)"),
  preset: z.enum(["enterprise", "standard", "agile"]).optional()
    .describe("Strictness preset (default: standard)"),
};

export interface ValidateDocumentArgs {
  content?: string;
  doc_type?: string;
  upstream_content?: string;
  manifest_path?: string;
  structure_path?: string;
  check_completeness?: boolean;
  check_structure_rules?: boolean;
  preset?: "enterprise" | "standard" | "agile";
}

export async function handleValidateDocument(
  args: ValidateDocumentArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { content, doc_type, upstream_content, manifest_path, structure_path, check_completeness, check_structure_rules, preset } = args;
  logger.info({ doc_type, hasUpstream: !!upstream_content, hasManifest: !!manifest_path, hasStructure: !!structure_path }, "Validating document");

  if (structure_path) {
    let issues: Awaited<ReturnType<typeof validateNumberedStructure>>;
    try {
      issues = await validateNumberedStructure(structure_path);
    } catch (err: unknown) {
      logger.error({ err, structure_path }, "Structure validation failed");
      return {
        content: [{ type: "text", text: `[VALIDATION_FAILED] Cannot read directory: ${structure_path}` }],
        isError: true,
      };
    }
    const valid = issues.filter(i => i.type === "error").length === 0;
    const lines = [
      `# Structure Validation Result`,
      ``,
      `**Directory:** ${structure_path}`,
      `**Valid:** ${valid ? "Yes" : "No"}`,
      `**Issues:** ${issues.length}`,
      ``,
    ];
    if (issues.length > 0) {
      lines.push(`## Issues`, ``);
      for (const issue of issues) {
        lines.push(`- [${issue.type.toUpperCase()}] ${issue.message}`);
      }
    } else {
      lines.push(`All structure rules pass.`);
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (check_structure_rules && content && doc_type) {
    const { checkStructureRules, extractFrontmatter } = await import("../lib/structure-rules.js");
    const { loadTemplate } = await import("../lib/template-loader.js");
    const { loadConfig } = await import("../config.js");

    let templateSections: string[] = [];
    try {
      const cfg = loadConfig();
      const template = await loadTemplate(cfg.templateDir, doc_type as Parameters<typeof loadTemplate>[1], "ja");
      templateSections = template.metadata.sections ?? [];
    } catch {
      logger.warn("Could not load template for structure rules — using empty sections");
    }

    const frontmatter = extractFrontmatter(content);
    const violations = checkStructureRules({
      content,
      docType: doc_type,
      templateSections,
      preset: preset ?? "standard",
      frontmatter: frontmatter ?? undefined,
    });

    const errors = violations.filter(v => v.severity === "error");
    const warnings = violations.filter(v => v.severity === "warning");
    const infos = violations.filter(v => v.severity === "info");

    const lines = [
      `# Structure Rules Validation`,
      ``,
      `**Document Type:** ${doc_type}`,
      `**Preset:** ${preset ?? "standard"}`,
      `**Violations:** ${violations.length} (${errors.length} errors, ${warnings.length} warnings, ${infos.length} info)`,
      `**Valid:** ${errors.length === 0 ? "Yes" : "No"}`,
      ``,
    ];

    if (violations.length > 0) {
      lines.push(`## Violations`, ``);
      for (const v of violations) {
        const loc = v.line ? ` (line ${v.line})` : "";
        lines.push(`- [${v.severity.toUpperCase()}] ${v.rule}: ${v.message}${loc}`);
      }
    } else {
      lines.push(`All structure rules pass.`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (manifest_path) {
    if (!doc_type) {
      return {
        content: [{ type: "text", text: "[VALIDATION_FAILED] doc_type required for manifest validation" }],
        isError: true,
      };
    }
    const manifest = await readManifest(manifest_path);
    const result = await validateSplitDocument(manifest_path, manifest, doc_type as Parameters<typeof validateSplitDocument>[2], upstream_content);

    const lines: string[] = [
      `# Split Validation Result`,
      ``,
      `**Document Type:** ${doc_type}`,
      `**Files Validated:** ${result.per_file.length}`,
      `**Valid:** ${result.valid ? "Yes" : "No"}`,
      ``,
    ];

    if (result.per_file.some(f => f.issues.length > 0)) {
      lines.push(`## Per-File Issues`, ``);
      for (const f of result.per_file) {
        if (f.issues.length > 0) {
          lines.push(`### ${f.file}`);
          for (const issue of f.issues) {
            lines.push(`- [${issue.type}] ${issue.message}`);
          }
          lines.push(``);
        }
      }
    }

    if (result.aggregate_issues.length > 0) {
      lines.push(`## Aggregate Issues`, ``);
      for (const issue of result.aggregate_issues) {
        lines.push(`- [${issue.type}] ${issue.message}`);
      }
      lines.push(``);
    }

    if (result.cross_ref_report) {
      const cr = result.cross_ref_report;
      lines.push(
        `## Cross-Reference Report`,
        ``,
        `- Upstream IDs: ${cr.upstream_ids.length}`,
        `- Referenced: ${cr.referenced_ids.length}`,
        `- Missing: ${cr.missing.length}`,
        `- Orphaned: ${cr.orphaned.length}`,
        `- Coverage: ${cr.coverage}%`,
      );
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (!content || !doc_type) {
    return {
      content: [{ type: "text", text: "[VALIDATION_FAILED] content and doc_type required for content validation" }],
      isError: true,
    };
  }

  const result = validateDocument(content, doc_type as Parameters<typeof validateDocument>[1], upstream_content, { check_completeness });

  const lines: string[] = [
    `# Validation Result`,
    ``,
    `**Document Type:** ${doc_type}`,
    `**Valid:** ${result.valid ? "Yes" : "No"}`,
    `**Issues Found:** ${result.issues.length}`,
    ``,
  ];

  if (result.issues.length > 0) {
    lines.push(`## Issues`, ``);
    for (const issue of result.issues) {
      lines.push(`- [${issue.type}] ${issue.message}`);
    }
    lines.push(``);
  }

  if (result.cross_ref_report) {
    const cr = result.cross_ref_report;
    lines.push(
      `## Cross-Reference Report`,
      ``,
      `- Upstream IDs: ${cr.upstream_ids.length}`,
      `- Referenced: ${cr.referenced_ids.length}`,
      `- Missing: ${cr.missing.length}`,
      `- Orphaned: ${cr.orphaned.length}`,
      `- Coverage: ${cr.coverage}%`,
    );
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
  };
}

export function registerValidateDocumentTool(server: McpServer): void {
  server.tool(
    "validate_document",
    "Validate a Japanese specification document for completeness and cross-references",
    inputSchema,
    async ({ content, doc_type, upstream_content, manifest_path, structure_path, check_completeness, check_structure_rules, preset }) => {
      return handleValidateDocument({ content, doc_type, upstream_content, manifest_path, structure_path, check_completeness, check_structure_rules, preset });
    }
  );
}
