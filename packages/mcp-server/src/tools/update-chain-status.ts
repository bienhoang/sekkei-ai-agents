/**
 * update_chain_status MCP tool — atomically updates a document's
 * chain status in sekkei.config.yaml.
 */
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger.js";

const CHAIN_STATUSES = ["pending", "in-progress", "complete"] as const;

const inputSchema = {
  config_path: z.string()
    .refine((p) => /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .refine((p) => !p.includes(".."), { message: "config_path must not contain '..'" })
    .describe("Path to sekkei.config.yaml"),
  doc_type: z.string()
    .regex(/^[a-z][a-z_-]{1,30}$/, "doc_type must be lowercase with underscores or hyphens")
    .describe("Chain key (e.g. requirements, functions-list, basic-design). Both hyphens and underscores accepted."),
  status: z.enum(CHAIN_STATUSES)
    .describe("New chain status for the document"),
  output: z.string().max(500).optional()
    .describe("Output file path relative to config directory"),
};

export interface UpdateChainStatusArgs {
  config_path: string;
  doc_type: string;
  status: (typeof CHAIN_STATUSES)[number];
  output?: string;
}

export async function handleUpdateChainStatus(
  args: UpdateChainStatusArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { config_path, status, output } = args;
  // Normalize hyphens to underscores to match YAML chain keys
  const doc_type = args.doc_type.replace(/-/g, "_");
  logger.info({ config_path, doc_type, status }, "Updating chain status");

  let raw: string;
  try {
    raw = await readFile(config_path, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    const msg = code === "ENOENT"
      ? `Config not found: ${config_path}`
      : "Failed to read config file";
    return { content: [{ type: "text", text: `[CONFIG_ERROR] ${msg}` }], isError: true };
  }

  if (raw.length > 100_000) {
    return {
      content: [{ type: "text", text: "[CONFIG_ERROR] Config file too large (>100KB)" }],
      isError: true,
    };
  }

  const config = parseYaml(raw);
  if (!config?.chain || typeof config.chain !== "object") {
    return {
      content: [{ type: "text", text: "[CONFIG_ERROR] No chain section in config" }],
      isError: true,
    };
  }

  const chain = config.chain as Record<string, unknown>;
  // Auto-create chain entry if missing (common when config was initialized without all doc types)
  if (!(doc_type in chain)) {
    logger.info({ doc_type }, "Chain key not found — auto-creating entry");
    chain[doc_type] = {};
  }

  const entry = (chain[doc_type] ?? {}) as Record<string, unknown>;
  entry.status = status;
  if (output !== undefined) entry.output = output;
  chain[doc_type] = entry;

  const updated = stringifyYaml(config, { lineWidth: 120 });
  await writeFile(config_path, updated, "utf-8");

  const msg = output
    ? `Updated ${doc_type}: status=${status}, output=${output}`
    : `Updated ${doc_type}: status=${status}`;
  return { content: [{ type: "text", text: msg }] };
}

export function registerUpdateChainStatusTool(server: McpServer): void {
  server.tool(
    "update_chain_status",
    "Atomically update a document's chain status in sekkei.config.yaml",
    inputSchema,
    async ({ config_path, doc_type, status, output }) => {
      return handleUpdateChainStatus({ config_path, doc_type, status, output });
    }
  );
}
