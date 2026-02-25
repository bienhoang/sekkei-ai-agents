/**
 * MCP tool handler for change request management.
 * Schema + dispatch layer — delegates to cr-actions.ts for handler logic.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleCRAction } from "./cr-actions.js";
import { logger } from "../lib/logger.js";

export const CR_ACTIONS = [
  "create", "analyze", "approve", "propagate_next", "propagate_confirm", "simulate",
  "validate", "complete", "status", "list", "cancel", "rollback",
] as const;

const inputSchema = {
  action: z.enum(CR_ACTIONS).describe("CR action"),
  workspace_path: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Project root path"),
  cr_id: z.string().max(20).optional()
    .refine(p => !p || /^CR-\d{6}-\d{3}$/.test(p), { message: "must match CR-YYMMDD-NNN format" })
    .describe("CR ID (e.g. CR-260224-001). Required for all except create/list"),
  config_path: z.string().max(500).optional()
    .refine(p => !p || !p.includes(".."), { message: "no path traversal" })
    .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml; required for analyze/propagate_next/validate"),
  origin_doc: z.string().max(50).optional()
    .describe("Origin doc type; required for create"),
  description: z.string().max(2000).optional()
    .describe("Change description; required for create"),
  changed_ids: z.array(z.string().max(20)).max(50).optional()
    .describe("Changed IDs; used for create"),
  old_content: z.string().max(500_000).optional()
    .describe("Previous doc content for auto-detect mode"),
  new_content: z.string().max(500_000).optional()
    .describe("Updated doc content for auto-detect mode"),
  status_filter: z.string().max(20).optional()
    .describe("Status filter for list action"),
  reason: z.string().max(500).optional()
    .describe("Reason for cancel"),
  note: z.string().max(2000).optional()
    .describe("Note for propagate_next step"),
  suggest_content: z.boolean().optional()
    .describe("Return suggested content snippets for propagation steps"),
  partial: z.boolean().optional()
    .describe("Skip incomplete-steps check in validate (mid-propagation)"),
  skip_docs: z.array(z.string().max(50)).max(20).optional()
    .describe("Doc types to skip during propagation"),
  max_depth: z.number().int().min(1).max(10).optional()
    .describe("Max propagation depth in hops from origin"),
};

export interface ChangeRequestArgs {
  action: (typeof CR_ACTIONS)[number];
  workspace_path: string;
  cr_id?: string;
  config_path?: string;
  origin_doc?: string;
  description?: string;
  changed_ids?: string[];
  old_content?: string;
  new_content?: string;
  status_filter?: string;
  reason?: string;
  note?: string;
  suggest_content?: boolean;
  partial?: boolean;
  skip_docs?: string[];
  max_depth?: number;
}

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
export function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export async function handleChangeRequest(args: ChangeRequestArgs): Promise<ToolResult> {
  try {
    return await handleCRAction(args);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Change request operation failed";
    logger.error({ err: e, action: args.action }, "manage_change_request failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerChangeRequestTool(server: McpServer): void {
  server.tool(
    "manage_change_request",
    "Manage change requests: create, analyze impact, approve, propagate changes, validate, complete",
    inputSchema,
    async (args) => handleChangeRequest(args as unknown as ChangeRequestArgs),
  );
}
