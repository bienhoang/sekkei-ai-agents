/**
 * Shared health check module — detects environment status for version/init/update commands.
 * All checks are non-throwing; each returns a structured HealthItem.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { EXPECTED_SUBCMD_COUNT } from "./update.js";

// ── Interfaces ─────────────────────────────────────────────────────────
export interface HealthItem {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface HealthReport {
  version: string;
  environment: HealthItem[];
  paths: HealthItem[];
  claudeCode: HealthItem[];
}

// ── Path helpers ───────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..", "..", "..");
const CLAUDE_DIR = join(homedir(), ".claude");

// ── Individual checks ──────────────────────────────────────────────────

function getPackageVersion(): string {
  // Read from monorepo root (../../.. from dist/cli/commands/)
  const monorepoRoot = resolve(PKG_ROOT, "..", "..");
  try {
    const pkg = JSON.parse(readFileSync(join(monorepoRoot, "package.json"), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    // Fallback to mcp-server package.json
    try {
      const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf-8"));
      return pkg.version ?? "unknown";
    } catch {
      return "unknown";
    }
  }
}

function checkNodeVersion(): HealthItem {
  const ver = process.version; // e.g. "v20.10.0"
  const major = parseInt(ver.slice(1).split(".")[0], 10);
  return {
    name: "Node.js",
    status: major >= 20 ? "ok" : "fail",
    detail: ver,
  };
}

function checkPython(): HealthItem {
  try {
    const out = execFileSync("python3", ["--version"], { timeout: 3000 })
      .toString()
      .trim();
    // "Python 3.11.5"
    const ver = out.replace("Python ", "");
    return { name: "Python", status: "ok", detail: ver };
  } catch {
    try {
      const out = execFileSync("python", ["--version"], { timeout: 3000 })
        .toString()
        .trim();
      const ver = out.replace("Python ", "");
      return { name: "Python", status: "ok", detail: ver };
    } catch {
      return { name: "Python", status: "warn", detail: "not found" };
    }
  }
}

function checkPlaywright(): HealthItem {
  // Check common cache dirs for chromium
  const cacheDir = join(homedir(), ".cache", "ms-playwright");
  try {
    if (existsSync(cacheDir)) {
      const entries = readdirSync(cacheDir).filter((e) => e.startsWith("chromium"));
      if (entries.length > 0) {
        return { name: "Playwright", status: "ok", detail: "chromium installed" };
      }
    }
  } catch {
    // fall through
  }
  // Fallback: try npx playwright --version
  try {
    const out = execFileSync("npx", ["playwright", "--version"], { timeout: 5000 })
      .toString()
      .trim();
    return { name: "Playwright", status: "ok", detail: out };
  } catch {
    return { name: "Playwright", status: "warn", detail: "not found" };
  }
}

function checkTemplateDir(): HealthItem {
  const templatesDir = resolve(PKG_ROOT, "templates");
  const jaDir = join(templatesDir, "ja");
  try {
    if (!existsSync(jaDir)) {
      return { name: "Templates", status: "fail", detail: "ja/ directory missing" };
    }
    const mdFiles = readdirSync(jaDir).filter((f) => f.endsWith(".md"));
    if (mdFiles.length === 0) {
      return { name: "Templates", status: "fail", detail: "no .md files in ja/" };
    }
    return { name: "Templates", status: "ok", detail: templatesDir };
  } catch {
    return { name: "Templates", status: "fail", detail: "cannot read templates dir" };
  }
}

function checkConfig(): HealthItem {
  const configPath = join(process.cwd(), "sekkei.config.yaml");
  if (existsSync(configPath)) {
    return { name: "Config", status: "ok", detail: configPath };
  }
  return { name: "Config", status: "warn", detail: "not found (optional)" };
}

function checkPythonVenv(): HealthItem {
  const venvPython = resolve(PKG_ROOT, "python", ".venv", "bin", "python3");
  if (existsSync(venvPython)) {
    return { name: "Python venv", status: "ok", detail: resolve(PKG_ROOT, "python", ".venv") };
  }
  return { name: "Python venv", status: "warn", detail: "not found" };
}

function checkClaudeSkill(): HealthItem {
  const skillPath = join(CLAUDE_DIR, "skills", "sekkei", "SKILL.md");
  if (existsSync(skillPath)) {
    return { name: "Skill", status: "ok", detail: join(CLAUDE_DIR, "skills", "sekkei") };
  }
  return { name: "Skill", status: "fail", detail: "not installed" };
}

function checkMcpRegistration(): HealthItem {
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  try {
    if (!existsSync(settingsPath)) {
      return { name: "MCP Server", status: "fail", detail: "settings.json not found" };
    }
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    if (settings?.mcpServers?.sekkei) {
      return { name: "MCP Server", status: "ok", detail: "registered" };
    }
    return { name: "MCP Server", status: "fail", detail: "not registered" };
  } catch {
    return { name: "MCP Server", status: "fail", detail: "cannot parse settings.json" };
  }
}

function checkPreviewBuild(): HealthItem {
  const previewDir = resolve(PKG_ROOT, "..", "preview");
  const previewServer = join(previewDir, "dist", "server.js");
  if (existsSync(previewServer)) {
    try {
      const pkg = JSON.parse(readFileSync(join(previewDir, "package.json"), "utf-8"));
      return { name: "Preview", status: "ok", detail: `v${pkg.version}` };
    } catch {
      return { name: "Preview", status: "ok", detail: "dist/server.js found" };
    }
  }
  return { name: "Preview", status: "warn", detail: "not built (run sekkei update)" };
}

function checkSubCommands(): HealthItem {
  const cmdDir = join(CLAUDE_DIR, "commands", "sekkei");
  try {
    if (!existsSync(cmdDir)) {
      return { name: "Commands", status: "fail", detail: "directory missing" };
    }
    const mdFiles = readdirSync(cmdDir).filter((f) => f.endsWith(".md"));
    const count = mdFiles.length;
    if (count >= EXPECTED_SUBCMD_COUNT) {
      return { name: "Commands", status: "ok", detail: `${count}/${EXPECTED_SUBCMD_COUNT}` };
    }
    return { name: "Commands", status: "warn", detail: `${count}/${EXPECTED_SUBCMD_COUNT}` };
  } catch {
    return { name: "Commands", status: "fail", detail: "cannot read commands dir" };
  }
}

// ── Compose ────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthReport> {
  return {
    version: getPackageVersion(),
    environment: [checkNodeVersion(), checkPython(), checkPlaywright()],
    paths: [checkTemplateDir(), checkConfig(), checkPythonVenv(), checkPreviewBuild()],
    claudeCode: [checkClaudeSkill(), checkMcpRegistration(), checkSubCommands()],
  };
}

// ── Format ─────────────────────────────────────────────────────────────

const ICONS: Record<HealthItem["status"], string> = { ok: "\u2713", warn: "\u26A0", fail: "\u2717" };

function pad(s: string, len: number): string {
  return s + " ".repeat(Math.max(0, len - s.length));
}

export function formatHealthReport(report: HealthReport): string {
  const lines: string[] = [];
  lines.push(`sekkei v${report.version}\n`);

  const sections: [string, HealthItem[]][] = [
    ["Environment", report.environment],
    ["Paths", report.paths],
    ["Claude Code", report.claudeCode],
  ];

  for (const [title, items] of sections) {
    lines.push(`${title}:`);
    for (const item of items) {
      const icon = ICONS[item.status];
      lines.push(`  ${pad(item.name + ":", 16)} ${item.detail}  ${icon}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
