/**
 * import_document MCP tool — import Excel documents into Sekkei markdown format.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPython } from "../lib/python-bridge.js";
import { DOC_TYPES } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  file_path: z.string().max(500)
    .refine((p) => /\.xlsx?$/i.test(p), { message: "file_path must be .xls or .xlsx" })
    .refine((p) => !p.includes(".."), { message: "Path must not contain .." })
    .describe("Path to Excel file to import"),
  doc_type_hint: z.enum(DOC_TYPES).optional()
    .describe("Hint for document type (auto-detected if not provided)"),
  sheet_name: z.string().max(100).optional()
    .describe("Specific sheet name to import (imports first sheet by default)"),
};

async function handleImportDocument(args: {
  file_path: string;
  doc_type_hint?: string;
  sheet_name?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { file_path, doc_type_hint, sheet_name } = args;

  try {
    logger.info({ file_path, doc_type_hint, sheet_name }, "Importing Excel document");

    const result = await callPython("import-excel", {
      file_path,
      doc_type_hint: doc_type_hint ?? null,
      sheet_name: sheet_name ?? null,
    });

    const content = result.content as string;
    const detectedType = result.detected_doc_type as string | null;
    const sheetCount = result.sheet_count as number;
    const rowCount = result.row_count as number;
    const warnings = (result.warnings as string[]) ?? [];

    const lines = [
      `# Excel Import Complete`,
      ``,
      `**File:** ${file_path}`,
      `**Detected doc type:** ${detectedType ?? "unknown"}`,
      `**Sheets:** ${sheetCount}`,
      `**Rows:** ${rowCount}`,
    ];

    if (warnings.length > 0) {
      lines.push(``, `## Warnings`, ...warnings.map((w) => `- ${w}`));
    }

    lines.push(``, `## Imported Content`, ``, content);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const message = err instanceof SekkeiError ? err.toClientMessage() : "Excel import failed";
    logger.error({ err, file_path }, "import_document failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerImportDocumentTool(server: McpServer): void {
  server.tool(
    "import_document",
    "Import an Excel specification document into Sekkei markdown format",
    inputSchema,
    handleImportDocument,
  );
}
