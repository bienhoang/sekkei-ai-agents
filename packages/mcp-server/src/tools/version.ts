/**
 * MCP tool handler for document version management.
 * Schema + dispatch layer — delegates to version-actions.ts for handler logic.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleVersionAction } from "./version-actions.js";
import { logger } from "../lib/logger.js";

export const VERSION_ACTIONS = ["bump", "query", "release", "history"] as const;

const inputSchema = {
  action: z.enum(VERSION_ACTIONS).describe("Version action"),
  workspace_path: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Project root path"),
  doc_type: z.string().max(50).optional()
    .describe("Document type (required for bump)"),
  bump_type: z.enum(["major", "minor", "patch"]).optional()
    .describe("Semver bump type (required for bump)"),
  reason: z.string().max(500).optional()
    .describe("Reason for version bump (required for bump)"),
  tag: z.string().max(100).optional()
    .refine(p => !p || /^v?[\w.\-]+$/.test(p), { message: "invalid tag format" })
    .describe("Release tag (required for release, e.g. v2026.03-R1)"),
  description: z.string().max(1000).optional()
    .describe("Release description (for release action)"),
};

export interface VersionArgs {
  action: (typeof VERSION_ACTIONS)[number];
  workspace_path: string;
  doc_type?: string;
  bump_type?: "major" | "minor" | "patch";
  reason?: string;
  tag?: string;
  description?: string;
}

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
export function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export async function handleVersion(args: VersionArgs): Promise<ToolResult> {
  try {
    return await handleVersionAction(args);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Version operation failed";
    logger.error({ err: e, action: args.action }, "manage_version failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerVersionTool(server: McpServer): void {
  server.tool(
    "manage_version",
    "Manage document versions: bump (semver increment), query (version table), release (git tag + notes), history (timeline)",
    inputSchema,
    async (args) => handleVersion(args as unknown as VersionArgs),
  );
}
