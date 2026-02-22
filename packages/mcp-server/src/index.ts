#!/usr/bin/env node
/**
 * Entry point — connects the Sekkei MCP server via STDIO transport.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config.templateDir, config.templateOverrideDir);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("Sekkei MCP server started on STDIO");
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start Sekkei MCP server");
  process.exit(1);
});
