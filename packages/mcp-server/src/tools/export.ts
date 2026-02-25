/**
 * export_document MCP tool — converts Markdown to Excel or PDF via Python subprocess.
 * Supports direct content or manifest-based merge mode.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPython } from "../lib/python-bridge.js";
import { exportToExcel, applyDiffHighlighting } from "../lib/excel-exporter.js";
import { exportToPdf } from "../lib/pdf-exporter.js";
import { exportToDocx } from "../lib/docx-exporter.js";
import { loadConfig } from "../config.js";
import { DOC_TYPES } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { readManifest } from "../lib/manifest-manager.js";
import { mergeFromManifest } from "../lib/merge-documents.js";

const EXPORT_FORMATS = ["xlsx", "pdf", "docx", "gsheet"] as const;

const inputSchema = {
  content: z.string().max(500_000).optional().describe("Markdown document content to export"),
  doc_type: z.enum(DOC_TYPES).describe("Document type"),
  format: z.enum(EXPORT_FORMATS).describe("Export format: xlsx, pdf, docx, or gsheet"),
  output_path: z.string().max(500).optional()
    .refine((p) => !p || /\.(xlsx|pdf|docx)$/i.test(p), { message: "output_path must end with .xlsx, .pdf, or .docx (not needed for gsheet)" })
    .describe("Output file path (omit for gsheet)"),
  config_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml; required for Google Sheets export"),
  project_name: z.string().optional().describe("Project name for cover page"),
  source: z.enum(["file", "manifest"]).default("file")
    .describe("Content source: file content or manifest-based merge"),
  manifest_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "manifest_path must be .yaml/.yml" })
    .describe("Path to _index.yaml manifest; required when source=manifest"),
  feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
    .describe("Kebab-case feature folder name to export a single feature"),
  template_path: z.string().max(500).optional()
    .refine((p) => !p || p.toLowerCase().endsWith(".xlsx"), {
      message: "template_path must end with .xlsx",
    })
    .describe("Existing .xlsx template to fill instead of generating from scratch"),
  diff_mode: z.boolean().optional()
    .describe("Enable 朱書き redline diff in Excel (additions=green, deletions=red)"),
  old_path: z.string().max(500).optional()
    .describe("Previous version file path; required when diff_mode=true"),
  read_only: z.boolean().optional()
    .describe("Strip confidence/traceability annotations for external sharing"),
};

export interface ExportDocumentArgs {
  content?: string;
  doc_type: string;
  format: "xlsx" | "pdf" | "docx" | "gsheet";
  output_path?: string;
  project_name?: string;
  source?: "file" | "manifest";
  manifest_path?: string;
  feature_name?: string;
  template_path?: string;
  diff_mode?: boolean;
  old_path?: string;
  config_path?: string;
  read_only?: boolean;
}

export async function handleExportDocument(
  args: ExportDocumentArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { content, doc_type, format, output_path, project_name, source, manifest_path, feature_name, template_path, diff_mode, old_path, config_path, read_only } = args;
  try {
    logger.info({ doc_type, format, output_path, source, diff_mode }, "Exporting document");

    // gsheet format: handled separately, does not use output_path
    if (format === "gsheet") {
      if (!config_path) {
        return {
          content: [{ type: "text", text: "[GOOGLE_EXPORT_FAILED] config_path required for Google Sheets export" }],
          isError: true,
        };
      }
      let exportContent: string;
      if (source === "manifest") {
        if (!manifest_path) {
          return {
            content: [{ type: "text", text: "[MANIFEST_ERROR] manifest_path required when source=manifest" }],
            isError: true,
          };
        }
        const manifest = await readManifest(manifest_path);
        exportContent = await mergeFromManifest(manifest_path, manifest, doc_type as Parameters<typeof mergeFromManifest>[2], feature_name);
      } else {
        if (!content) {
          return {
            content: [{ type: "text", text: "[VALIDATION_FAILED] content required when source=file" }],
            isError: true,
          };
        }
        exportContent = content;
      }
      if (read_only) {
        const { sanitizeForReadOnly } = await import("../lib/content-sanitizer.js");
        exportContent = sanitizeForReadOnly(exportContent);
      }
      try {
        const { readFile } = await import("node:fs/promises");
        const { parse: parseYaml } = await import("yaml");
        const raw = await readFile(config_path, "utf-8");
        const projectCfg = parseYaml(raw) as import("../types/documents.js").ProjectConfig;
        if (!projectCfg?.google) {
          return {
            content: [{ type: "text", text: "[GOOGLE_EXPORT_FAILED] google section missing from config" }],
            isError: true,
          };
        }
        const { getGoogleAuthClient } = await import("../lib/google-auth.js");
        const { exportToGoogleSheets } = await import("../lib/google-sheets-exporter.js");
        const authClient = await getGoogleAuthClient(projectCfg.google);
        const result = await exportToGoogleSheets({
          content: exportContent,
          docType: doc_type,
          projectName: project_name ?? "Unnamed",
          authClient,
          folderId: projectCfg.google.folder_id,
        });
        return {
          content: [{
            type: "text",
            text: [
              `# Google Sheets Export Complete`,
              ``,
              `**Format:** gsheet`,
              `**URL:** ${result.spreadsheet_url}`,
              `**Sheets:** ${result.sheet_count}`,
              `**Rows:** ${result.row_count}`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        const message = err instanceof SekkeiError ? err.toClientMessage() : "Google Sheets export failed";
        logger.error({ err, doc_type }, "gsheet export failed");
        return { content: [{ type: "text", text: message }], isError: true };
      }
    }

    // Non-gsheet formats require output_path
    if (!output_path) {
      return {
        content: [{ type: "text", text: "[VALIDATION_FAILED] output_path required for xlsx/pdf/docx export" }],
        isError: true,
      };
    }

    let exportContent: string;

    if (source === "manifest") {
      if (!manifest_path) {
        return {
          content: [{ type: "text", text: "[MANIFEST_ERROR] manifest_path required when source=manifest" }],
          isError: true,
        };
      }
      const manifest = await readManifest(manifest_path);
      exportContent = await mergeFromManifest(manifest_path, manifest, doc_type as Parameters<typeof mergeFromManifest>[2], feature_name);
    } else {
      if (!content) {
        return {
          content: [{ type: "text", text: "[VALIDATION_FAILED] content required when source=file" }],
          isError: true,
        };
      }
      exportContent = content;
    }

    // Sanitize content for read-only export (strip internal metadata)
    if (read_only) {
      const { sanitizeForReadOnly } = await import("../lib/content-sanitizer.js");
      exportContent = sanitizeForReadOnly(exportContent);
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
        template_path,
        isMatrix,
      });
    } else if (exportEngine === "node" && format === "pdf") {
      result = await exportToPdf({
        content: exportContent,
        doc_type,
        output_path,
        project_name: project_name ?? "",
      });
    } else if (exportEngine === "node" && format === "docx") {
      result = await exportToDocx({
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

    if (diff_mode === true && format === "xlsx" && old_path) {
      try {
        const diffResult = await callPython("diff", {
          old_path,
          new_path: output_path,
          output_path,
        });
        await applyDiffHighlighting(output_path, diffResult);
        logger.info({ output_path }, "Applied 朱書き diff highlighting");
      } catch (diffErr) {
        logger.warn({ diffErr, output_path }, "Diff highlighting failed — returning plain export");
      }
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
          ...(diff_mode === true ? [`**Diff mode:** 朱書き highlighting applied`] : []),
        ].join("\n"),
      }],
    };
  } catch (err) {
    const message = err instanceof SekkeiError ? err.toClientMessage() : "Export failed";
    logger.error({ err, doc_type, format }, "export_document failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerExportDocumentTool(server: McpServer): void {
  server.tool(
    "export_document",
    "Export a Markdown specification document to Excel (.xlsx), PDF, Word (.docx), or Google Sheets (gsheet)",
    inputSchema,
    async ({ content, doc_type, format, output_path, project_name, source, manifest_path, feature_name, template_path, diff_mode, old_path, config_path, read_only }) => {
      return handleExportDocument({ content, doc_type, format, output_path, project_name, source, manifest_path, feature_name, template_path, diff_mode, old_path, config_path, read_only });
    }
  );
}
