/**
 * CLI update command — rebuilds MCP server, re-copies skill files, regenerates stubs,
 * and updates MCP entry in ~/.claude/settings.json.
 */
import { defineCommand } from "citty";
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getVenvPython } from "../../lib/platform.js";
import { homedir } from "node:os";
import { checkHealth, formatHealthReport } from "./health-check.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..", "..", "..");
const SEKKEI_ROOT = resolve(PKG_ROOT, "..", "..");
const SKILL_SRC = resolve(SEKKEI_ROOT, "packages", "skills", "content");
const TEMPLATES_DIR = resolve(PKG_ROOT, "templates");
const PYTHON_DIR = resolve(PKG_ROOT, "python");
const MCP_ENTRY = resolve(PKG_ROOT, "dist", "index.js");

const CLAUDE_DIR = join(homedir(), ".claude");
const SKILL_DEST = join(CLAUDE_DIR, "skills", "sekkei");
const COMMANDS_DIR = join(CLAUDE_DIR, "commands");
const SUBCMD_DIR = join(COMMANDS_DIR, "sekkei");
const SETTINGS = join(CLAUDE_DIR, "settings.json");

/** Sub-command definitions: [name, description, argumentHint] */
const SUBCMD_DEFS: [string, string, string][] = [
  ["init", "Initialize Sekkei project config", ""],
  ["functions-list", "Generate 機能一覧 (Function List)", "@input"],
  ["requirements", "Generate 要件定義書 (Requirements)", "@input"],
  ["nfr", "Generate 非機能要件定義書 (NFR)", "@requirements"],
  ["project-plan", "Generate プロジェクト計画書 (Project Plan)", "@requirements"],
  ["basic-design", "Generate 基本設計書 (Basic Design)", "@input"],
  ["security-design", "Generate セキュリティ設計書 (Security Design)", "@basic-design"],
  ["detail-design", "Generate 詳細設計書 (Detail Design)", "@input"],
  ["test-plan", "Generate テスト計画書 (Test Plan)", "@requirements"],
  ["ut-spec", "Generate 単体テスト仕様書 (UT Spec)", "@detail-design"],
  ["it-spec", "Generate 結合テスト仕様書 (IT Spec)", "@basic-design"],
  ["st-spec", "Generate システムテスト仕様書 (ST Spec)", "@basic-design"],
  ["uat-spec", "Generate 受入テスト仕様書 (UAT Spec)", "@requirements"],
  ["matrix", "Generate CRUD図 or トレーサビリティ", ""],
  ["sitemap", "Generate サイトマップ (System Structure Map)", ""],
  ["operation-design", "Generate 運用設計書", "@input"],
  ["migration-design", "Generate 移行設計書", "@input"],
  ["validate", "Validate document completeness", "@doc"],
  ["status", "Show document chain progress", ""],
  ["export", "Export to Excel, PDF, or Word", "@doc --format=xlsx|pdf|docx"],
  ["translate", "Translate with glossary context", "@doc --lang=en"],
  ["glossary", "Manage project terminology", "[add|list|find|export|import]"],
  ["update", "Detect upstream changes", "@doc"],
  ["diff-visual", "Color-coded revision Excel (朱書き)", "@before @after"],
  ["preview", "Start Express+React docs preview with WYSIWYG editor", "[--guide] [--docs path] [--port N]"],
  ["dashboard", "Start analytics dashboard for workspace-docs overview", "[--docs path] [--port N] [--no-open]"],
  ["version", "Show version and health check", ""],
  ["uninstall", "Remove Sekkei from Claude Code", "[--force]"],
  ["rfp", "Presales RFP lifecycle", "[@project-name]"],
  ["change", "Change request lifecycle", ""],
  ["plan", "Create generation plan for large documents", "@doc-type"],
  ["implement", "Execute a generation plan phase by phase", "@plan-path"],
  ["rebuild", "Rebuild and re-install Sekkei skill + MCP", "[--skip-build]"],
  ["doctor", "Check installation health and fix suggestions", ""],
];

/** Number of expected sub-command stubs — used by health-check */
export const EXPECTED_SUBCMD_COUNT = SUBCMD_DEFS.length;

function createSubCmdStub(name: string, desc: string, hint: string): void {
  const content = [
    "---",
    `description: "${desc}"`,
    `argument-hint: ${hint}`,
    "---",
    "",
    `Load and follow the full Sekkei SKILL.md workflow for the \`/sekkei:${name}\` sub-command.`,
    "",
    `SKILL file: ${SKILL_DEST}/SKILL.md`,
    "",
  ].join("\n");
  writeFileSync(join(SUBCMD_DIR, `${name}.md`), content);
}

function updateMcpEntry(): void {
  const mcpConfig = JSON.stringify({
    command: "node",
    args: [MCP_ENTRY],
    env: {
      SEKKEI_TEMPLATE_DIR: TEMPLATES_DIR,
      SEKKEI_PYTHON: getVenvPython(PYTHON_DIR),
    },
  });
  try {
    // Remove existing entry first (ignore if not found)
    execSync("claude mcp remove sekkei -s user", { stdio: "ignore" });
  } catch { /* not found — ok */ }
  try {
    execSync(`claude mcp add-json -s user sekkei '${mcpConfig}'`, { stdio: "pipe" });
  } catch {
    // Fallback: write to settings.json for non-Claude editors
    try {
      if (existsSync(SETTINGS)) {
        const settings = JSON.parse(readFileSync(SETTINGS, "utf-8"));
        if (!settings.mcpServers) settings.mcpServers = {};
        settings.mcpServers.sekkei = JSON.parse(mcpConfig);
        writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
      }
    } catch { /* non-fatal */ }
  }
}

export const updateCommand = defineCommand({
  meta: { name: "update", description: "Rebuild and re-install Sekkei skill + MCP" },
  args: {
    skipBuild: { type: "boolean", description: "Skip npm build step", default: false },
  },
  async run({ args }) {
    // 1. Build MCP server
    if (!args.skipBuild) {
      const s = p.spinner();
      s.start("Building MCP server...");
      try {
        execSync("npx tsc", { cwd: PKG_ROOT, stdio: "pipe" });
        s.stop("Build complete");
      } catch (err) {
        s.stop("Build failed");
        process.stderr.write((err as Error).message + "\n");
        process.exit(1);
      }
    }

    // 1b. Build preview package (force override old version)
    if (!args.skipBuild) {
      const previewDir = resolve(SEKKEI_ROOT, "packages", "preview");
      if (existsSync(previewDir)) {
        const s = p.spinner();
        s.start("Building preview package...");
        try {
          execSync("npm run build", { cwd: previewDir, stdio: "pipe" });
          s.stop("Preview build complete");
        } catch (err) {
          s.stop("Preview build failed (non-fatal)");
          process.stderr.write(`  Preview: ${(err as Error).message}\n`);
        }
      }
    }

    // 1c. Build dashboard package
    if (!args.skipBuild) {
      const dashboardDir = resolve(SEKKEI_ROOT, "packages", "dashboard");
      if (existsSync(dashboardDir)) {
        const s = p.spinner();
        s.start("Building dashboard package...");
        try {
          execSync("npm run build", { cwd: dashboardDir, stdio: "pipe" });
          s.stop("Dashboard build complete");
        } catch (err) {
          s.stop("Dashboard build failed (non-fatal)");
          process.stderr.write(`  Dashboard: ${(err as Error).message}\n`);
        }
      }
    }

    // 2. Copy skill files
    if (existsSync(SKILL_SRC)) {
      mkdirSync(SKILL_DEST, { recursive: true });
      cpSync(SKILL_SRC, SKILL_DEST, { recursive: true });
      process.stdout.write("  \u2713 Skill files copied\n");
    } else {
      process.stdout.write("  \u26A0 Skill source not found, skipped\n");
    }

    // 3. Clean stale stubs and regenerate
    if (existsSync(SUBCMD_DIR)) {
      rmSync(SUBCMD_DIR, { recursive: true, force: true });
    }
    mkdirSync(SUBCMD_DIR, { recursive: true });
    for (const [name, desc, hint] of SUBCMD_DEFS) {
      createSubCmdStub(name, desc, hint);
    }
    // Symlink SKILL.md → /sekkei
    const symlinkPath = join(COMMANDS_DIR, "sekkei.md");
    try {
      lstatSync(symlinkPath); // succeeds for files AND dangling symlinks
      unlinkSync(symlinkPath);
    } catch {
      // truly doesn't exist — nothing to remove
    }
    try {
      symlinkSync(join(SKILL_DEST, "SKILL.md"), symlinkPath);
    } catch {
      // Windows without admin/Dev Mode — fallback to file copy
      try {
        copyFileSync(join(SKILL_DEST, "SKILL.md"), symlinkPath);
      } catch (copyErr) {
        process.stderr.write(`Warning: could not link or copy SKILL.md: ${copyErr}\n`);
      }
    }
    process.stdout.write(`  \u2713 ${SUBCMD_DEFS.length} sub-command stubs regenerated\n`);

    // 4. Update MCP entry
    updateMcpEntry();
    process.stdout.write("  \u2713 MCP entry updated\n");

    // 5. Health check
    process.stdout.write("\n");
    const report = await checkHealth();
    process.stdout.write(formatHealthReport(report) + "\n");
  },
});
