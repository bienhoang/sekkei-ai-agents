/**
 * translate_document MCP tool — returns content + glossary context for AI-powered translation.
 * The skill layer performs actual translation using the returned context.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadGlossary } from "../lib/glossary-native.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  content: z.string().max(500_000).describe("Document content to translate"),
  source_lang: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).default("ja").describe("Source language code"),
  target_lang: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).describe("Target language code (e.g. en, vi, zh)"),
  glossary_path: z.string().optional().describe("Path to glossary.yaml for consistent terminology"),
};

export function registerTranslateDocumentTool(server: McpServer): void {
  server.tool(
    "translate_document",
    "Prepare translation context with glossary terms for AI-powered document translation",
    inputSchema,
    async ({ content, source_lang, target_lang, glossary_path }) => {
      try {
      logger.info({ source_lang, target_lang, hasGlossary: !!glossary_path }, "Preparing translation context");

      let glossaryTerms: string[] = [];
      if (glossary_path) {
        try {
          const glossary = loadGlossary(glossary_path);
          const terms = glossary.terms;
          glossaryTerms = terms.map(
            (t) => `${t.ja} → ${t.en}${t.context ? ` (${t.context})` : ""}`
          );
        } catch {
          logger.warn({ glossary_path }, "Failed to load glossary, proceeding without");
        }
      }

      const output = [
        `# Translation Context`,
        ``,
        `**Source:** ${source_lang}`,
        `**Target:** ${target_lang}`,
        ``,
      ];

      if (glossaryTerms.length > 0) {
        output.push(
          `## Glossary (use these translations consistently)`,
          ``,
          ...glossaryTerms.map((t) => `- ${t}`),
          ``,
        );
      }

      output.push(
        `## Translation Instructions`,
        ``,
        `Translate the following document from ${source_lang} to ${target_lang}.`,
        `Preserve all Markdown formatting, table structures, and ID references (F-xxx, REQ-xxx, etc.).`,
        `Use the glossary terms above for consistent terminology.`,
        ``,
        `## Content to Translate`,
        ``,
        content,
      );

      return { content: [{ type: "text", text: output.join("\n") }] };
      } catch (err) {
        logger.error({ err, source_lang, target_lang }, "translate_document failed");
        return { content: [{ type: "text", text: "Translation preparation failed" }], isError: true };
      }
    }
  );
}
