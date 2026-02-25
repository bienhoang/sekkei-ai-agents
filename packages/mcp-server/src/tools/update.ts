/**
 * analyze_update MCP tool — diffs upstream changes and finds downstream impacts.
 * Also supports check_staleness mode for git-diff-based staleness detection.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPython } from "../lib/python-bridge.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  upstream_old: z.string().max(500_000).optional()
    .describe("Previous version of upstream document"),
  upstream_new: z.string().max(500_000).optional()
    .describe("New version of upstream document"),
  downstream_content: z.string().max(500_000).optional()
    .describe("Downstream document to check for impacts"),
  revision_mode: z.boolean().default(false)
    .describe("Include 朱書き change markers and revision history row suggestion"),
  check_staleness: z.boolean().optional()
    .describe("Check code-to-doc staleness via git diff (requires config_path)"),
  config_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml; required for staleness check"),
  since: z.string().max(100).optional()
    .describe("Git ref to compare against (tag, branch, commit, or relative e.g. 30d)"),
};

async function handleAnalyzeUpdate(args: {
  upstream_old?: string;
  upstream_new?: string;
  downstream_content?: string;
  revision_mode: boolean;
  check_staleness?: boolean;
  config_path?: string;
  since?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { upstream_old, upstream_new, downstream_content, revision_mode, check_staleness, config_path, since } = args;

  // Staleness check mode
  if (check_staleness) {
    if (!config_path) {
      return {
        content: [{ type: "text", text: "[STALENESS_ERROR] config_path required for staleness check" }],
        isError: true,
      };
    }
    try {
      const { detectStaleness } = await import("../lib/staleness-detector.js");
      const { formatStalenessReport } = await import("../lib/staleness-formatter.js");
      const report = await detectStaleness(config_path, { since });
      return { content: [{ type: "text", text: formatStalenessReport(report) }] };
    } catch (err) {
      const message = err instanceof SekkeiError ? err.toClientMessage() : "Staleness check failed";
      logger.error({ err }, "check_staleness failed");
      return { content: [{ type: "text", text: message }], isError: true };
    }
  }

  // Standard diff mode
  try {
    logger.info({ revision_mode }, "Analyzing upstream changes");

    const result = await callPython("diff", {
      upstream_old: upstream_old ?? "",
      upstream_new: upstream_new ?? "",
      downstream: downstream_content ?? "",
      revision_mode,
    });

    const diff = result.diff as Record<string, unknown>;
    const impacts = result.impacts as Array<{ section: string; referenced_ids: string[] }>;

    const lines = [
      `# Update Impact Analysis`,
      ``,
      `## Upstream Changes`,
      `- Added sections: ${(diff.added_sections as string[])?.length ?? 0}`,
      `- Removed sections: ${(diff.removed_sections as string[])?.length ?? 0}`,
      `- Modified sections: ${(diff.modified_sections as string[])?.length ?? 0}`,
      `- Changed IDs: ${(result.changed_ids as string[])?.join(", ") || "none"}`,
      ``,
      `## Downstream Impacts`,
      `- Total impacted sections: ${result.total_impacted_sections}`,
      ``,
    ];

    if (impacts?.length > 0) {
      lines.push(`| Section | Referenced IDs |`, `|---------|---------------|`);
      for (const imp of impacts) {
        lines.push(`| ${imp.section} | ${imp.referenced_ids.join(", ")} |`);
      }
    } else {
      lines.push(`No downstream sections impacted.`);
    }

    if (revision_mode && result.revision_history_row) {
      const row = result.revision_history_row as Record<string, string>;
      lines.push(
        ``,
        `## Suggested 改訂履歴 Row`,
        ``,
        `| 版数 | 日付 | 変更内容 | 変更者 |`,
        `|------|------|----------|--------|`,
        `| ${row["版数"]} | ${row["日付"]} | ${row["変更内容"]} | ${row["変更者"]} |`,
      );
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const message = err instanceof SekkeiError ? err.toClientMessage() : "Update analysis failed";
    logger.error({ err }, "analyze_update failed");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerUpdateTool(server: McpServer): void {
  server.tool(
    "analyze_update",
    "Analyze upstream document changes and identify impacted downstream sections",
    inputSchema,
    handleAnalyzeUpdate,
  );
}
