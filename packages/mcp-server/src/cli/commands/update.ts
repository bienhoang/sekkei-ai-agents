/**
 * CLI update command — rebuilds MCP server, re-copies skill files, regenerates stubs,
 * and updates MCP entry in ~/.claude/settings.json.
 */
import { defineCommand } from "citty";
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { checkHealth, formatHealthReport } from "./health-check.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..", "..");
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
  ["preview", "Start VitePress docs preview (--edit for WYSIWYG)", "[--edit] [--docs path] [--port N]"],
  ["version", "Show version and health check", ""],
  ["uninstall", "Remove Sekkei from Claude Code", "[--force]"],
];

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
  if (!existsSync(SETTINGS)) return;
  try {
    const settings = JSON.parse(readFileSync(SETTINGS, "utf-8"));
    if (!settings.mcpServers) settings.mcpServers = {};
    settings.mcpServers.sekkei = {
      command: "node",
      args: [MCP_ENTRY],
      env: {
        SEKKEI_TEMPLATE_DIR: TEMPLATES_DIR,
        SEKKEI_PYTHON: join(PYTHON_DIR, ".venv", "bin", "python3"),
      },
    };
    writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
  } catch {
    // non-fatal
  }
}

export const updateCommand = defineCommand({
  meta: { name: "update", description: "Rebuild and re-install Sekkei skill + MCP" },
  args: {
    skipBuild: { type: "boolean", description: "Skip npm build step", default: false },
  },
  async run({ args }) {
    // 1. Build
    if (!args.skipBuild) {
      const s = p.spinner();
      s.start("Building MCP server...");
      try {
        execSync("npm run build", { cwd: PKG_ROOT, stdio: "pipe" });
        s.stop("Build complete");
      } catch (err) {
        s.stop("Build failed");
        process.stderr.write((err as Error).message + "\n");
        process.exit(1);
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

    // 3. Regenerate sub-command stubs
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
      // non-fatal
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
