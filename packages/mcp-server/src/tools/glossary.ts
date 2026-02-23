/**
 * manage_glossary MCP tool — CRUD operations for project terminology glossary.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleGlossaryAction } from "../lib/glossary-native.js";
import { logger } from "../lib/logger.js";

const GLOSSARY_ACTIONS = ["add", "list", "find", "export", "import"] as const;
const INDUSTRIES = [
  "finance", "medical", "manufacturing", "real-estate",
  "logistics", "retail", "insurance", "education",
  "government", "construction", "telecom", "automotive",
  "energy", "food-service", "common",
] as const;

const inputSchema = {
  action: z.enum(GLOSSARY_ACTIONS).describe("Glossary action to perform"),
  project_path: z.string().max(500)
    .refine((p) => /\.ya?ml$/i.test(p), { message: "project_path must be a .yaml or .yml file" })
    .describe("Path to glossary.yaml"),
  ja: z.string().optional().describe("Japanese term (for add action)"),
  en: z.string().optional().describe("English term (for add action)"),
  vi: z.string().optional().describe("Vietnamese term (for add action)"),
  context: z.string().optional().describe("Term context/description"),
  query: z.string().optional().describe("Search query (for find action)"),
  industry: z.enum(INDUSTRIES).optional().describe("Industry glossary to import (for import action)"),
};

export interface GlossaryArgs {
  action: "add" | "list" | "find" | "export" | "import";
  project_path: string;
  ja?: string;
  en?: string;
  vi?: string;
  context?: string;
  query?: string;
  industry?: string;
}

export async function handleGlossary(
  args: GlossaryArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { action, project_path, ja, en, vi, context, query, industry } = args;
  try {
    logger.info({ action, project_path }, "Managing glossary");

    const result = handleGlossaryAction(action, { project_path, ja, en, vi, context, query, industry });

    let text: string;
    if (action === "export" && result.content) {
      text = result.content as string;
    } else {
      text = JSON.stringify(result, null, 2);
    }

    return { content: [{ type: "text", text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Glossary operation failed";
    logger.error({ err, action }, "manage_glossary failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerGlossaryTool(server: McpServer): void {
  server.tool(
    "manage_glossary",
    "Manage project terminology glossary (add, list, find, export terms)",
    inputSchema,
    async ({ action, project_path, ja, en, vi, context, query, industry }) => {
      return handleGlossary({ action, project_path, ja, en, vi, context, query, industry });
    }
  );
}
