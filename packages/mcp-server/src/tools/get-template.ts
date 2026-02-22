/**
 * get_template MCP tool — returns raw template content for a doc type.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadTemplate } from "../lib/template-loader.js";
import { DOC_TYPES, LANGUAGES } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  doc_type: z.enum(DOC_TYPES).describe("Document type to retrieve template for"),
  language: z.enum(LANGUAGES).default("ja").describe("Template language"),
};

export function registerGetTemplateTool(server: McpServer, templateDir: string, overrideDir?: string): void {
  server.tool(
    "get_template",
    "Get raw Markdown template for a Japanese specification document type",
    inputSchema,
    async ({ doc_type, language }) => {
      try {
        const template = await loadTemplate(templateDir, doc_type, language, overrideDir);
        logger.info({ doc_type, language }, "Template retrieved");

        return {
          content: [{ type: "text", text: template.content }],
        };
      } catch (err) {
        const message =
          err instanceof SekkeiError ? err.toClientMessage() : "Failed to load template";
        logger.error({ err, doc_type, language }, "get_template failed");
        return {
          content: [{ type: "text", text: message }],
          isError: true,
        };
      }
    }
  );
}
