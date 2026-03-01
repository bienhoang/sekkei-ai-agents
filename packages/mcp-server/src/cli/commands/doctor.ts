/**
 * sekkei doctor — Installation health check with fix suggestions.
 */
import { defineCommand } from "citty";
import { checkHealth, formatHealthReport, type HealthItem } from "./health-check.js";

const FIX_SUGGESTIONS: Record<string, { fail?: string; warn?: string }> = {
  "Node.js": { fail: "Install Node.js 20+ from https://nodejs.org" },
  "Python": { warn: "Install Python 3.9+ (optional, for Excel/PDF export)" },
  "Playwright": { warn: "Run: npx playwright install chromium (optional, for PDF export)" },
  "Templates": { fail: "Re-run installer: ~/.sekkei/install.sh" },
  "Config": { fail: "Run: sekkei init (in your project folder)" },
  "Python venv": {
    warn: "Run: cd ~/.sekkei/packages/mcp-server && python3 -m venv python/.venv && python/.venv/bin/pip install -r python/requirements.txt",
  },
  "Skill": { fail: "Re-run installer: ~/.sekkei/install.sh" },
  "MCP Server": { fail: "Run: sekkei update (or: claude mcp add-json -s user sekkei '{...}')", warn: "Run: sekkei update (to migrate from legacy settings.json)" },
  "Commands": { warn: "Run: sekkei update" },
};

function formatSuggestions(items: HealthItem[]): string {
  const lines: string[] = [];
  const issues = items.filter((i) => i.status !== "ok");
  if (issues.length === 0) return "";

  lines.push("Suggestions:");
  for (const item of issues) {
    const suggestion = FIX_SUGGESTIONS[item.name];
    if (!suggestion) continue;
    const fix = item.status === "fail" ? suggestion.fail : suggestion.warn;
    if (fix) {
      lines.push(`  ${item.name}: ${fix}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "Check installation health and show fix suggestions",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    const report = await checkHealth();
    const allItems = [...report.environment, ...report.paths, ...report.claudeCode];
    const failures = allItems.filter((i) => i.status === "fail");

    if (args.json) {
      process.stdout.write(JSON.stringify({ ...report, ok: failures.length === 0 }, null, 2) + "\n");
    } else {
      process.stdout.write(formatHealthReport(report));
      process.stdout.write(formatSuggestions(allItems));
      const banner =
        failures.length === 0
          ? "\x1b[32m\u2713 All checks passed.\x1b[0m\n"
          : `\x1b[31m\u2717 ${failures.length} check(s) failed. See suggestions above.\x1b[0m\n`;
      process.stdout.write(banner);
    }

    if (failures.length > 0) process.exit(1);
  },
});
