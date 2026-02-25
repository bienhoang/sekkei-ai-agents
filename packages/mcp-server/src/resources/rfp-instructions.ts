/**
 * MCP resource handlers for RFP analysis instructions.
 * Exposes rfp://instructions/{flow} resource URIs.
 */
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../lib/logger.js";
import { SekkeiError } from "../lib/errors.js";

const RFP_FLOWS = ["analyze", "questions", "draft", "impact", "proposal", "freeze"] as const;
type RfpFlow = (typeof RFP_FLOWS)[number];

export function registerRfpResources(server: McpServer, templateDir: string): void {
  const template = new ResourceTemplate("rfp://instructions/{flow}", {
    list: async () => ({
      resources: RFP_FLOWS.map(flow => ({
        uri: `rfp://instructions/${flow}`,
        name: `RFP ${flow} instructions`,
        description: `Analysis instructions for RFP ${flow} phase`,
        mimeType: "text/markdown" as const,
      })),
    }),
  });

  server.resource("rfp-instructions", template, async (uri, params) => {
    const rawFlow = params.flow as string;
    if (!RFP_FLOWS.includes(rawFlow as RfpFlow)) {
      throw new SekkeiError("RFP_WORKSPACE_ERROR", `Invalid RFP flow: ${rawFlow}`);
    }

    const filename = `flow-${rawFlow}.md`;
    const filePath = join(templateDir, "rfp", filename);

    logger.debug({ flow: rawFlow }, "Resource read: rfp instruction");

    try {
      const text = await readFile(filePath, "utf-8");
      return { contents: [{ uri: uri.href, text, mimeType: "text/markdown" }] };
    } catch (err) {
      logger.error({ err, flow: rawFlow }, "RFP resource read failed");
      throw new SekkeiError("TEMPLATE_NOT_FOUND", `RFP instruction template not found: ${rawFlow}`);
    }
  });
}
