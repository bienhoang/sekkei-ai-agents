/**
 * analyze_update MCP tool — diffs upstream changes and finds downstream impacts.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPython } from "../lib/python-bridge.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  upstream_old: z.string().max(500_000).describe("Previous version of upstream document"),
  upstream_new: z.string().max(500_000).describe("New version of upstream document"),
  downstream_content: z.string().max(500_000).describe("Downstream document to check for impacts"),
  revision_mode: z.boolean().default(false)
    .describe("When true, output includes change markers and revision history row suggestion (朱書き)"),
};

export function registerUpdateTool(server: McpServer): void {
  server.tool(
    "analyze_update",
    "Analyze upstream document changes and identify impacted downstream sections",
    inputSchema,
    async ({ upstream_old, upstream_new, downstream_content, revision_mode }) => {
      try {
        logger.info({ revision_mode }, "Analyzing upstream changes");

        const result = await callPython("diff", {
          upstream_old,
          upstream_new,
          downstream: downstream_content,
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
  );
}
