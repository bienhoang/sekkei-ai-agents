/**
 * CLI uninstall command — removes Sekkei skill, commands, and MCP entry from ~/.claude/.
 * Keeps build artifacts and Python venv intact.
 */
import { defineCommand } from "citty";
import * as p from "@clack/prompts";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CLAUDE_DIR = join(homedir(), ".claude");
const SKILL_DIR = join(CLAUDE_DIR, "skills", "sekkei");
const CMD_LINK = join(CLAUDE_DIR, "commands", "sekkei.md");
const CMD_DIR = join(CLAUDE_DIR, "commands", "sekkei");
const SETTINGS = join(CLAUDE_DIR, "settings.json");

interface RemovalResult {
  target: string;
  removed: boolean;
}

function tryRemove(target: string, opts?: { recursive?: boolean }): RemovalResult {
  if (!existsSync(target)) {
    return { target, removed: false };
  }
  rmSync(target, { recursive: opts?.recursive ?? false, force: true });
  return { target, removed: true };
}

function removeMcpEntry(): RemovalResult {
  try {
    if (!existsSync(SETTINGS)) {
      return { target: "MCP entry", removed: false };
    }
    const settings = JSON.parse(readFileSync(SETTINGS, "utf-8"));
    if (!settings?.mcpServers?.sekkei) {
      return { target: "MCP entry", removed: false };
    }
    delete settings.mcpServers.sekkei;
    writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
    return { target: "MCP entry", removed: true };
  } catch {
    return { target: "MCP entry", removed: false };
  }
}

export const uninstallCommand = defineCommand({
  meta: { name: "uninstall", description: "Remove Sekkei skill and MCP from Claude Code" },
  args: {
    force: { type: "boolean", description: "Skip confirmation prompt", default: false },
  },
  async run({ args }) {
    if (!args.force) {
      const confirmed = await p.confirm({
        message: "Remove Sekkei from Claude Code? (skills, commands, MCP) [y/N]",
        initialValue: false,
      });
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel("Uninstall cancelled.");
        return;
      }
    }

    const results: RemovalResult[] = [
      tryRemove(SKILL_DIR, { recursive: true }),
      tryRemove(CMD_LINK),
      tryRemove(CMD_DIR, { recursive: true }),
      removeMcpEntry(),
    ];

    const labels = ["Skill directory", "Command symlink", "Command stubs", "MCP entry"];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const icon = r.removed ? "\u2713" : "\u2014";
      const status = r.removed ? "removed" : "skipped";
      process.stdout.write(`  ${icon} ${labels[i]}: ${status}\n`);
    }

    process.stdout.write("\nNote: If you used /sekkei:preview, manually remove .vitepress/ and node_modules symlink from your docs directory.\n");
    process.stdout.write("Package remains. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove.\n");
  },
});
