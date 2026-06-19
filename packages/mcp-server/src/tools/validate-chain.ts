/**
 * validate_chain MCP tool — validates cross-references across the entire document chain.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { validateChain } from "../lib/cross-ref-linker.js";
import { computeCoverageMetrics } from "../lib/coverage-metrics.js";
import { AGENT_DIR_NAME } from "../lib/consumption-index.js";
import { writeAgentArtifacts, reconcileAgentIndex } from "../lib/spec-index-builder.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export interface ValidateChainArgs {
  config_path: string;
  /** When true, emit tool-only agent navigation artifacts (llms.txt + spec-index.md) to .sekkei-agent/. */
  emit_agent_index?: boolean;
  /** When true, rebuild spec-index.md and report drift (added/removed/dup + advisory next-free-ID). */
  reconcile?: boolean;
}

export async function handleValidateChain(
  args: ValidateChainArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { config_path, emit_agent_index, reconcile } = args;
  logger.info({ config_path, emit_agent_index, reconcile }, "Validating document chain");

  let report;
  try {
    report = await validateChain(config_path);
    report.coverage_metrics = computeCoverageMetrics(
      report.traceability_matrix,
      report.links.map(l => ({ upstream: l.upstream, downstream: l.downstream }))
    );
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

  // Coverage metrics section
  if (report.coverage_metrics) {
    const cm = report.coverage_metrics;
    lines.push("## Coverage Metrics", "");
    lines.push(`- **Overall coverage:** ${cm.overall}%`);
    lines.push(`- **Req → Design:** ${cm.reqToDesign}%`);
    lines.push(`- **Req → Test:** ${cm.reqToTest}%`);
    lines.push(`- **Full trace (Design + Test):** ${cm.fullTrace}%`);
    if (Object.keys(cm.byDocType).length > 0) {
      lines.push("", "| Doc Type | Total | Traced | Coverage |");
      lines.push("|----------|-------|--------|----------|");
      for (const [dt, stats] of Object.entries(cm.byDocType)) {
        lines.push(`| ${dt} | ${stats.total} | ${stats.traced} | ${stats.coverage}% |`);
      }
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

  // Tool-only consumption artifacts (llms.txt + spec-index.md) for downstream coding agents.
  // `reconcile` is a superset of `emit`: it rewrites the artifacts AND reports ID drift.
  if (reconcile) {
    try {
      const r = await reconcileAgentIndex(config_path);
      lines.push("", "## Agent Index — Reconcile", "");
      if (r.partial.isPartial) {
        lines.push(`> ⚠ PARTIAL: ${r.partial.present} of ${r.partial.total} chain docs present — index is incomplete.`, "");
      }
      lines.push(
        `- **Added IDs:** ${r.added.length > 0 ? r.added.join(", ") : "none"}`,
        `- **Removed IDs:** ${r.removed.length > 0 ? r.removed.join(", ") : "none"}`,
        `- **Duplicate IDs:** ${r.duplicates.length > 0 ? r.duplicates.join(", ") : "none"}`,
        "",
        "**Advisory next-free-ID** (suggestion only — IDs are LLM-minted, not auto-allocated):",
      );
      const nf = Object.entries(r.nextFree);
      if (nf.length === 0) lines.push("- (none)");
      else for (const [space, id] of nf) lines.push(`- ${space}: \`${id}\``);
      lines.push("", `Artifacts written to \`${r.agentDir}\` (\`llms.txt\`, \`spec-index.md\`).`);
      lines.push(`Add \`${AGENT_DIR_NAME}/\` to \`.gitignore\` — it is tool output, not a review deliverable.`);
    } catch (err: unknown) {
      logger.error({ err, config_path }, "Failed to reconcile agent index");
      lines.push("", `> ⚠ Could not reconcile agent index: ${String(err)}`);
    }
  } else if (emit_agent_index) {
    try {
      const { agentDir } = await writeAgentArtifacts(config_path);
      lines.push(
        "",
        "## Agent Index",
        "",
        `Generated tool-only navigation artifacts in \`${agentDir}\` (\`llms.txt\`, \`spec-index.md\`).`,
        `Add \`${AGENT_DIR_NAME}/\` to \`.gitignore\` — it is tool output, not a review deliverable.`,
      );
    } catch (err: unknown) {
      logger.error({ err, config_path }, "Failed to emit agent index");
      lines.push("", `> ⚠ Could not emit agent index: ${String(err)}`);
    }
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
      emit_agent_index: z.boolean().optional()
        .describe("Emit tool-only agent navigation artifacts (llms.txt + spec-index.md) to .sekkei-agent/"),
      reconcile: z.boolean().optional()
        .describe("Rebuild spec-index.md and report ID drift (added/removed/duplicate) + advisory next-free-ID"),
    },
    async (args: { config_path: string; emit_agent_index?: boolean; reconcile?: boolean }) => {
      return handleValidateChain(args);
    }
  );
}
