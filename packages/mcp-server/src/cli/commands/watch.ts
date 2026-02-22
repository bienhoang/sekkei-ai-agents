/**
 * CLI watch command — check documentation staleness against code changes.
 */
import { defineCommand } from "citty";
import { detectStaleness } from "../../lib/staleness-detector.js";
import { formatStalenessReport } from "../../lib/staleness-formatter.js";

export const watchCommand = defineCommand({
  meta: { name: "watch", description: "Check documentation staleness against code changes" },
  args: {
    config: {
      type: "string",
      default: "sekkei.config.yaml",
      description: "Config file path",
    },
    since: {
      type: "string",
      description: "Git ref to compare (tag, branch, commit, or relative like '30d')",
    },
    threshold: {
      type: "string",
      default: "50",
      description: "Staleness threshold 0-100 (default: 50)",
    },
    ci: {
      type: "boolean",
      default: false,
      description: "CI mode: exit 1 if stale docs found",
    },
  },
  async run({ args }) {
    try {
      const rawThreshold = parseInt(args.threshold as string, 10);
      const threshold = Number.isNaN(rawThreshold) ? 50 : rawThreshold;
      const report = await detectStaleness(args.config as string, {
        since: args.since as string | undefined,
        threshold,
      });
      process.stdout.write(formatStalenessReport(report) + "\n");
      if (args.ci && report.staleCount > 0) process.exit(1);
    } catch (err) {
      process.stderr.write(
        `Error: ${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    }
  },
});
