/**
 * CLI version command — shows version + environment health check.
 */
import { defineCommand } from "citty";
import { checkHealth, formatHealthReport } from "./health-check.js";

export const versionCommand = defineCommand({
  meta: { name: "version", description: "Show version and environment health check" },
  args: {
    json: { type: "boolean", description: "Output as JSON", default: false },
  },
  async run({ args }) {
    const report = await checkHealth();

    if (args.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      process.stdout.write(formatHealthReport(report) + "\n");
    }

    // Exit 1 if any item has status "fail"
    const allItems = [...report.environment, ...report.paths, ...report.claudeCode];
    if (allItems.some((item) => item.status === "fail")) {
      process.exit(1);
    }
  },
});
