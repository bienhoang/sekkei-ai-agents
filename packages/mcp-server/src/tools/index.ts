/**
 * Tool registry — registers all MCP tools on the server instance.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetTemplateTool } from "./get-template.js";
import { registerGenerateDocumentTool } from "./generate.js";
import { registerValidateDocumentTool } from "./validate.js";
import { registerChainStatusTool } from "./chain-status.js";
import { registerExportDocumentTool } from "./export.js";
import { registerTranslateDocumentTool } from "./translate.js";
import { registerGlossaryTool } from "./glossary.js";
import { registerUpdateTool } from "./update.js";
import { registerValidateChain } from "./validate-chain.js";
import { registerSimulateImpactTool } from "./simulate-impact.js";
import { registerImportDocumentTool } from "./import-document.js";
import { registerRfpWorkspaceTool } from "./rfp-workspace.js";
import { registerChangeRequestTool } from "./change-request.js";

export function registerAllTools(server: McpServer, templateDir: string, templateOverrideDir?: string): void {
  registerGetTemplateTool(server, templateDir, templateOverrideDir);
  registerGenerateDocumentTool(server, templateDir, templateOverrideDir);
  registerValidateDocumentTool(server);
  registerChainStatusTool(server);
  registerExportDocumentTool(server);
  registerTranslateDocumentTool(server);
  registerGlossaryTool(server);
  registerUpdateTool(server);
  registerValidateChain(server);
  registerSimulateImpactTool(server);
  registerImportDocumentTool(server);
  registerRfpWorkspaceTool(server);
  registerChangeRequestTool(server);
}
