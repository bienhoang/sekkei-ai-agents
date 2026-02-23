/**
 * Resource registry — registers all MCP resources on the server instance.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTemplateResources } from "./templates.js";
import { registerRfpResources } from "./rfp-instructions.js";

export function registerAllResources(server: McpServer, templateDir: string, templateOverrideDir?: string): void {
  registerTemplateResources(server, templateDir, templateOverrideDir);
  registerRfpResources(server, templateDir);
}
