/**
 * export_document MCP tool — converts Markdown to Excel or PDF via Python subprocess.
 * Supports direct content or manifest-based merge mode.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPython } from "../lib/python-bridge.js";
import { exportToExcel } from "../lib/excel-exporter.js";
import { exportToPdf } from "../lib/pdf-exporter.js";
import { loadConfig } from "../config.js";
import { DOC_TYPES } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { readManifest } from "../lib/manifest-manager.js";
import { mergeFromManifest } from "../lib/merge-documents.js";

const EXPORT_FORMATS = ["xlsx", "pdf", "docx"] as const;

const inputSchema = {
  content: z.string().max(500_000).optional().describe("Markdown document content to export"),
  doc_type: z.enum(DOC_TYPES).describe("Document type"),
  format: z.enum(EXPORT_FORMATS).describe("Export format: xlsx or pdf"),
  output_path: z.string().max(500)
    .refine((p) => /\.(xlsx|pdf|docx)$/i.test(p), { message: "output_path must end with .xlsx, .pdf, or .docx" })
    .describe("Output file path"),
  project_name: z.string().optional().describe("Project name for cover page"),
  source: z.enum(["file", "manifest"]).default("file")
    .describe("Content source: direct file content or manifest-based merge"),
  manifest_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "manifest_path must be .yaml/.yml" })
    .describe("Path to _index.yaml manifest (required when source=manifest)"),
  feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
    .describe("Feature folder name (kebab-case) to export a single feature"),
};

export function registerExportDocumentTool(server: McpServer): void {
  server.tool(
    "export_document",
    "Export a Markdown specification document to Excel (.xlsx), PDF, or Word (.docx)",
    inputSchema,
    async ({ content, doc_type, format, output_path, project_name, source, manifest_path, feature_name }) => {
      try {
        logger.info({ doc_type, format, output_path, source }, "Exporting document");

        let exportContent: string;

        if (source === "manifest") {
          if (!manifest_path) {
            return {
              content: [{ type: "text", text: "[MANIFEST_ERROR] manifest_path required when source=manifest" }],
              isError: true,
            };
          }
          const manifest = await readManifest(manifest_path);
          exportContent = await mergeFromManifest(manifest_path, manifest, doc_type, feature_name);
        } else {
          if (!content) {
            return {
              content: [{ type: "text", text: "[VALIDATION_FAILED] content required when source=file" }],
              isError: true,
            };
          }
          exportContent = content;
        }

        const isMatrix = doc_type === "crud-matrix" || doc_type === "traceability-matrix";
        const { exportEngine } = loadConfig();

        let result: { file_path: unknown; file_size: unknown };

        if (exportEngine === "node" && (format === "xlsx" || isMatrix)) {
          result = await exportToExcel({
            content: exportContent,
            doc_type,
            output_path,
            project_name: project_name ?? "",
            isMatrix,
          });
        } else if (exportEngine === "node" && format === "pdf") {
          result = await exportToPdf({
            content: exportContent,
            doc_type,
            output_path,
            project_name: project_name ?? "",
          });
        } else {
          let action: string;
          let pythonInput: Record<string, unknown>;

          if (isMatrix) {
            action = "export-matrix";
            pythonInput = {
              content: exportContent,
              matrix_type: doc_type,
              output_path,
              project_name: project_name ?? "",
            };
          } else {
            action = format === "pdf" ? "export-pdf" : "export-docx";
            pythonInput = {
              content: exportContent,
              doc_type,
              output_path,
              project_name: project_name ?? "",
            };
          }

          result = await callPython(action, pythonInput) as { file_path: unknown; file_size: unknown };
        }

        return {
          content: [{
            type: "text",
            text: [
              `# Export Complete`,
              ``,
              `**Format:** ${format}`,
              `**File:** ${result.file_path}`,
              `**Size:** ${result.file_size} bytes`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        const message = err instanceof SekkeiError ? err.toClientMessage() : "Export failed";
        logger.error({ err, doc_type, format }, "export_document failed");
        return { content: [{ type: "text", text: message }], isError: true };
      }
    }
  );
}
