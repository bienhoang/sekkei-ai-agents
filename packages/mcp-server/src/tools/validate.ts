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
};

export function registerValidateDocumentTool(server: McpServer): void {
  server.tool(
    "validate_document",
    "Validate a Japanese specification document for completeness and cross-references",
    inputSchema,
    async ({ content, doc_type, upstream_content, manifest_path, structure_path }) => {
      logger.info({ doc_type, hasUpstream: !!upstream_content, hasManifest: !!manifest_path, hasStructure: !!structure_path }, "Validating document");

      // Structural validation mode
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

      if (manifest_path) {
        if (!doc_type) {
          return {
            content: [{ type: "text", text: "[VALIDATION_FAILED] doc_type required for manifest validation" }],
            isError: true,
          };
        }
        const manifest = await readManifest(manifest_path);
        const result = await validateSplitDocument(manifest_path, manifest, doc_type, upstream_content);

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

      // Content validation
      if (!content || !doc_type) {
        return {
          content: [{ type: "text", text: "[VALIDATION_FAILED] content and doc_type required for content validation" }],
          isError: true,
        };
      }

      const result = validateDocument(content, doc_type, upstream_content);

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
  );
}
