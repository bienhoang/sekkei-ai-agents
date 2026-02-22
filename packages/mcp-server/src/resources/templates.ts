/**
 * MCP resource handlers for document templates.
 * Exposes templates://{doc_type}/{language} resource URIs.
 */
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadTemplate } from "../lib/template-loader.js";
import { DOC_TYPES, LANGUAGES } from "../types/documents.js";
import type { DocType, Language } from "../types/documents.js";
import { logger } from "../lib/logger.js";

export function registerTemplateResources(server: McpServer, templateDir: string, overrideDir?: string): void {
  const template = new ResourceTemplate("templates://{doc_type}/{language}", {
    list: async () => {
      const resources = [];
      for (const docType of DOC_TYPES) {
        for (const lang of LANGUAGES) {
          resources.push({
            uri: `templates://${docType}/${lang}`,
            name: `${docType} template (${lang})`,
            description: `Japanese specification template for ${docType}`,
            mimeType: "text/markdown" as const,
          });
        }
      }
      return { resources };
    },
  });

  server.resource("templates", template, async (uri, params) => {
    const rawDocType = params.doc_type as string;
    const rawLang = (params.language as string) ?? "ja";

    if (!DOC_TYPES.includes(rawDocType as DocType)) {
      throw new Error(`Invalid doc_type: ${rawDocType}`);
    }
    if (!LANGUAGES.includes(rawLang as Language)) {
      throw new Error(`Invalid language: ${rawLang}`);
    }

    const docType = rawDocType as DocType;
    const language = rawLang as Language;

    logger.debug({ docType, language }, "Resource read: template");

    try {
      const data = await loadTemplate(templateDir, docType, language, overrideDir);
      return {
        contents: [
          {
            uri: uri.href,
            text: data.content,
            mimeType: "text/markdown",
          },
        ],
      };
    } catch (err) {
      logger.error({ err, docType, language }, "Resource read failed");
      throw err;
    }
  });
}
