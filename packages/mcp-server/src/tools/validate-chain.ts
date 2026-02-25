/**
 * validate_chain MCP tool — validates cross-references across the entire document chain.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { validateChain } from "../lib/cross-ref-linker.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export interface ValidateChainArgs {
  config_path: string;
}

export async function handleValidateChain(
  args: ValidateChainArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { config_path } = args;
  logger.info({ config_path }, "Validating document chain");

  let report;
  try {
    report = await validateChain(config_path);
  } catch (err: unknown) {
    const msg = err instanceof SekkeiError
      ? err.toClientMessage()
      : `[VALIDATION_FAILED] ${String(err)}`;
    logger.error({ err, config_path }, "Chain validation failed");
    return { content: [{ type: "text" as const, text: msg }], isError: true };
  }

  const lines: string[] = [
    "# Chain Cross-Reference Report",
    "",
    `**Links analyzed:** ${report.links.length}`,
    `**Orphaned IDs:** ${report.orphaned_ids.length}`,
    `**Missing IDs:** ${report.missing_ids.length}`,
    "",
  ];

  if (report.links.length > 0) {
    lines.push("## Chain Links", "");
    for (const link of report.links) {
      const status = link.orphaned_ids.length === 0 && link.missing_ids.length === 0 ? "OK" : "ISSUES";
      lines.push(`### ${link.upstream} → ${link.downstream} [${status}]`, "");
      if (link.orphaned_ids.length > 0) {
        lines.push(`- **Orphaned (defined but unreferenced):** ${link.orphaned_ids.join(", ")}`);
      }
      if (link.missing_ids.length > 0) {
        lines.push(`- **Missing (referenced but undefined):** ${link.missing_ids.join(", ")}`);
      }
      if (link.orphaned_ids.length === 0 && link.missing_ids.length === 0) {
        lines.push("- All references valid.");
      }
      lines.push("");
    }
  }

  if (report.suggestions.length > 0) {
    lines.push("## Suggested Fixes", "");
    for (const s of report.suggestions) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }

  if (report.traceability_matrix.length > 0) {
    lines.push("## Traceability Matrix", "");
    lines.push("| ID | Defined In | Referenced In |");
    lines.push("|----|-----------|---------------|");
    for (const entry of report.traceability_matrix) {
      const refs = entry.downstream_refs.length > 0 ? entry.downstream_refs.join(", ") : "—";
      lines.push(`| ${entry.id} | ${entry.doc_type} | ${refs} |`);
    }
    lines.push("");
  }

  // Staleness warnings section
  if (report.staleness_warnings && report.staleness_warnings.length > 0) {
    lines.push("## Staleness Warnings", "");
    lines.push("| Upstream | Downstream | Upstream Modified | Downstream Modified |");
    lines.push("|----------|------------|-------------------|---------------------|");
    for (const w of report.staleness_warnings) {
      lines.push(`| ${w.upstream} | ${w.downstream} | ${w.upstreamModified} | ${w.downstreamModified} |`);
    }
    lines.push("");
  }

  if (report.links.length === 0) {
    lines.push("No document pairs found in config chain. Ensure docs have been generated.");
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

export function registerValidateChain(server: McpServer): void {
  server.tool(
    "validate_chain",
    "Validate cross-references across entire document chain and generate traceability matrix",
    {
      config_path: z.string().max(500)
        .refine((p) => !p.includes(".."), { message: "Path must not contain .." })
        .refine((p) => /\.ya?ml$/i.test(p), { message: "Must end in .yaml or .yml" })
        .describe("Path to sekkei.config.yaml"),
    },
    async (args: { config_path: string }) => {
      return handleValidateChain(args);
    }
  );
}
