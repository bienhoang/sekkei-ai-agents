/**
 * MCP tool handler for generation plan management.
 * Schema + dispatch layer — delegates to plan-actions.ts for handler logic.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handlePlanAction } from "./plan-actions.js";
import { logger } from "../lib/logger.js";

export const PLAN_ACTIONS = [
  "create", "status", "list", "execute", "update", "detect", "cancel", "add_feature",
] as const;

const inputSchema = {
  action: z.enum(PLAN_ACTIONS).describe("Plan action"),
  workspace_path: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Project root path"),
  config_path: z.string().max(500).optional()
    .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml"),
  plan_id: z.string().max(100).optional()
    .describe("Plan directory name (e.g. 20260224-basic-design-generation)"),
  doc_type: z.string().max(30).optional()
    .describe("Document type for create/detect (basic-design, detail-design, test-spec)"),
  features: z.array(z.object({
    id: z.string().max(30).regex(/^[a-z][a-z0-9-]{1,49}$/, "kebab-case feature ID"),
    name: z.string().max(100),
    complexity: z.enum(["simple", "medium", "complex"]).default("medium"),
    priority: z.number().int().min(1).max(50),
  })).max(50).optional()
    .describe("Feature list with survey data (for create)"),
  phase_number: z.number().int().min(1).max(50).optional()
    .describe("Phase number (for execute/update)"),
  phase_status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional()
    .describe("New phase status (for update)"),
  survey_data: z.record(z.unknown()).optional()
    .describe("Survey Round 2 data to persist in plan frontmatter (for create)"),
  new_features: z.array(z.object({
    id: z.string().max(30).regex(/^[a-z][a-z0-9-]{1,49}$/, "kebab-case feature ID"),
    name: z.string().max(100),
    complexity: z.enum(["simple", "medium", "complex"]).default("medium"),
    priority: z.number().int().min(1).max(50),
  })).max(20).optional()
    .describe("Features to add (for add_feature action)"),
};

export interface PlanArgs {
  action: (typeof PLAN_ACTIONS)[number];
  workspace_path: string;
  config_path?: string;
  plan_id?: string;
  doc_type?: string;
  features?: Array<{
    id: string;
    name: string;
    complexity: "simple" | "medium" | "complex";
    priority: number;
  }>;
  phase_number?: number;
  phase_status?: "pending" | "in_progress" | "completed" | "skipped";
  survey_data?: Record<string, unknown>;
  new_features?: Array<{
    id: string;
    name: string;
    complexity: "simple" | "medium" | "complex";
    priority: number;
  }>;
}

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
export function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export async function handlePlan(args: PlanArgs): Promise<ToolResult> {
  try {
    return await handlePlanAction(args);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plan operation failed";
    logger.error({ err: e, action: args.action }, "manage_plan failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerPlanTool(server: McpServer): void {
  server.tool(
    "manage_plan",
    "Manage generation plans: create, status, list, execute phase, update phase status, detect existing plans, add features to existing plans",
    inputSchema,
    async (args) => handlePlan(args as unknown as PlanArgs),
  );
}
