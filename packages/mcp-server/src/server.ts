/**
 * McpServer factory — creates and configures the Sekkei MCP server
 * with all tools and resources registered.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { logger } from "./lib/logger.js";

export function createServer(templateDir: string, templateOverrideDir?: string): McpServer {
  const server = new McpServer({
    name: "sekkei",
    version: "1.0.0",
  });

  registerAllTools(server, templateDir, templateOverrideDir);
  registerAllResources(server, templateDir, templateOverrideDir);

  logger.info({ templateDir, templateOverrideDir }, "Sekkei MCP server configured");
  return server;
}
