/**
 * simulate_change_impact MCP tool — find downstream impact when IDs change.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadChainDocs, buildIdGraph } from "../lib/cross-ref-linker.js";
import { findAffectedSections, buildImpactReport, buildDependencyMermaid } from "../lib/impact-analyzer.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  changed_ids: z.array(z.string().max(20)).max(50).optional()
    .describe("IDs that have changed (e.g., ['REQ-003', 'F-005'])"),
  upstream_old: z.string().max(500_000).optional()
    .describe("Previous version of upstream document (to auto-extract changed IDs)"),
  upstream_new: z.string().max(500_000).optional()
    .describe("New version of upstream document"),
  config_path: z.string().max(500)
    .refine((p) => /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml"),
  auto_draft: z.boolean().default(false).optional()
    .describe("When true, return update instruction context per affected section"),
};

async function handleSimulateImpact(args: {
  changed_ids?: string[];
  upstream_old?: string;
  upstream_new?: string;
  config_path: string;
  auto_draft?: boolean;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { changed_ids: inputIds, upstream_old, upstream_new, config_path, auto_draft } = args;

  try {
    logger.info({ config_path, auto_draft }, "Simulating change impact");

    let changedIds: string[] = inputIds ?? [];

    // If upstream docs provided, extract changed IDs via diff
    if (upstream_old && upstream_new && changedIds.length === 0) {
      const { callPython } = await import("../lib/python-bridge.js");
      const result = await callPython("diff", {
        upstream_old,
        upstream_new,
        downstream: "",
        revision_mode: false,
      });
      changedIds = (result.changed_ids as string[]) ?? [];
    }

    if (changedIds.length === 0) {
      return {
        content: [{ type: "text", text: "No changed IDs detected. Provide changed_ids or upstream_old + upstream_new." }],
      };
    }

    // Load all chain docs and find affected sections
    const docs = await loadChainDocs(config_path);
    const entries = findAffectedSections(changedIds, docs);
    const report = buildImpactReport(changedIds, entries);

    // Format output
    const lines = [
      `# Impact Cascade Analysis`,
      ``,
      `## Changed IDs`,
      changedIds.map((id) => `- ${id}`).join("\n"),
      ``,
      `## Impact Summary`,
      `- Total affected sections: ${report.total_affected_sections}`,
      ``,
    ];

    if (entries.length > 0) {
      lines.push(
        `## Affected Sections`,
        ``,
        `| Doc Type | Section | IDs Referenced | Severity |`,
        `|----------|---------|----------------|----------|`,
      );
      for (const e of entries) {
        lines.push(`| ${e.doc_type} | ${e.section} | ${e.referenced_ids.join(", ")} | ${e.severity} |`);
      }

      lines.push(``, `## Dependency Graph`, ``, report.dependency_graph);
    } else {
      lines.push(`No downstream sections reference the changed IDs.`);
    }

    if (auto_draft && entries.length > 0) {
      lines.push(``, `## Update Instructions`, ``);
      for (const action of report.suggested_actions) {
        lines.push(`- ${action}`);
      }
      lines.push(``, `Use \`generate_document\` with updated upstream content to regenerate affected documents.`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const message = err instanceof SekkeiError ? err.toClientMessage() : "Impact simulation failed";
    logger.error({ err }, "simulate_change_impact failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerSimulateImpactTool(server: McpServer): void {
  server.tool(
    "simulate_change_impact",
    "Simulate the downstream impact of specification changes across the V-model chain",
    inputSchema,
    handleSimulateImpact,
  );
}
