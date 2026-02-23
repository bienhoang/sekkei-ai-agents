#!/usr/bin/env node
/**
 * Sekkei setup script — detects editors and configures MCP integration.
 * Usage: npx @sekkei/setup
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const home = homedir();

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function log(msg) { console.log(msg); }
function ok(msg) { log(`${GREEN}  [OK]${RESET} ${msg}`); }
function warn(msg) { log(`${YELLOW}  [WARN]${RESET} ${msg}`); }
function fail(msg) { log(`${RED}  [FAIL]${RESET} ${msg}`); }

/** Check if a command exists */
function commandExists(cmd) {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch { return false; }
}

/** Detect installed editors/tools */
function detectEditors() {
  const editors = [];

  // Claude Code
  const claudeDir = resolve(home, ".claude");
  if (existsSync(claudeDir)) {
    editors.push({ name: "Claude Code", id: "claude-code", configDir: claudeDir });
  }

  // Cursor
  const cursorDir = resolve(home, ".cursor");
  if (existsSync(cursorDir)) {
    editors.push({ name: "Cursor", id: "cursor", configDir: cursorDir });
  }

  // VS Code (Copilot)
  const vscodeDir = resolve(home, ".vscode");
  const githubDir = resolve(process.cwd(), ".github");
  if (existsSync(vscodeDir) || existsSync(githubDir)) {
    editors.push({ name: "VS Code / Copilot", id: "copilot", configDir: githubDir });
  }

  return editors;
}

/** Configure Cursor MCP */
function setupCursor(configDir) {
  const mcpConfigDir = resolve(configDir, "mcp");
  const mcpJsonPath = resolve(mcpConfigDir, "mcp.json");

  const config = {
    mcpServers: {
      sekkei: {
        command: "npx",
        args: ["@sekkei/mcp-server"],
        env: {}
      }
    }
  };

  // Merge with existing config if present
  if (existsSync(mcpJsonPath)) {
    try {
      const existing = JSON.parse(readFileSync(mcpJsonPath, "utf-8"));
      existing.mcpServers = { ...existing.mcpServers, ...config.mcpServers };
      mkdirSync(mcpConfigDir, { recursive: true });
      writeFileSync(mcpJsonPath, JSON.stringify(existing, null, 2) + "\n");
      ok("Updated existing Cursor MCP config");
      return;
    } catch { /* write fresh */ }
  }

  mkdirSync(mcpConfigDir, { recursive: true });
  writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + "\n");
  ok("Created Cursor MCP config");
}

/** Configure VS Code / Copilot */
function setupCopilot(configDir) {
  mkdirSync(configDir, { recursive: true });
  const instructionsPath = resolve(configDir, "copilot-instructions.md");

  // Don't overwrite existing user customizations
  if (existsSync(instructionsPath)) {
    warn("copilot-instructions.md already exists — skipping to preserve your customizations");
    return;
  }

  const adaptersDir = resolve(PACKAGE_ROOT, "adapters", "copilot");
  if (existsSync(resolve(adaptersDir, "copilot-instructions.md"))) {
    const content = readFileSync(resolve(adaptersDir, "copilot-instructions.md"), "utf-8");
    writeFileSync(instructionsPath, content);
    ok("Created Copilot instructions");
  } else {
    const content = [
      "# Sekkei Documentation Agent",
      "",
      "You have access to the Sekkei MCP server for Japanese documentation generation.",
      "Use MCP tools: generate_document, validate_document, export_document, translate_document,",
      "get_template, manage_glossary, analyze_update, get_chain_status.",
      "",
      "Document types: functions-list, requirements, basic-design, detail-design, test-spec",
    ].join("\n");
    writeFileSync(instructionsPath, content + "\n");
    ok("Created basic Copilot instructions");
  }
}

/** Check Python availability */
function checkPython() {
  log("");
  log(`${BOLD}Checking Python...${RESET}`);

  const pythonCmd = commandExists("python3") ? "python3" : commandExists("python") ? "python" : null;
  if (!pythonCmd) {
    warn("Python not found. Export features (Excel/PDF) require Python 3.9+");
    warn("Install: https://www.python.org/downloads/");
    return;
  }

  try {
    const version = execFileSync(pythonCmd, ["--version"], { encoding: "utf-8" }).trim();
    ok(`Found ${version}`);
  } catch {
    warn("Python found but version check failed");
  }

  // Check required packages
  const reqPath = resolve(PACKAGE_ROOT, "python", "requirements.txt");
  if (existsSync(reqPath)) {
    log("  To install Python dependencies for export features:");
    log(`  ${pythonCmd} -m pip install -r ${reqPath}`);
  }
}

/** Main setup flow */
export async function runEditorSetup({ skipPython = false } = {}) {
  log("");
  log(`${BOLD}Sekkei Setup${RESET}`);
  log("Configuring MCP server integration for detected editors...");
  log("");

  const editors = detectEditors();

  if (editors.length === 0) {
    warn("No supported editors detected.");
    log("  Supported: Claude Code, Cursor, VS Code (Copilot)");
    log("  You can manually configure MCP. See: https://github.com/bienhoang/sekkei#setup");
    if (!skipPython) checkPython();
    return;
  }

  log(`${BOLD}Detected editors:${RESET} ${editors.map(e => e.name).join(", ")}`);
  log("");

  for (const editor of editors) {
    log(`${BOLD}Setting up ${editor.name}...${RESET}`);

    switch (editor.id) {
      case "claude-code":
        ok("Claude Code uses SKILL.md — no MCP config needed");
        ok("Copy skills/sekkei/ to your project or ~/.claude/skills/");
        break;
      case "cursor":
        setupCursor(editor.configDir);
        break;
      case "copilot":
        setupCopilot(editor.configDir);
        break;
    }
    log("");
  }

  if (!skipPython) checkPython();

  log("");
  log(`${BOLD}${GREEN}Setup complete!${RESET}`);
  log("  Run 'sekkei-mcp' or 'npx sekkei-mcp-server' to start the MCP server.");
  log("");
}

// Standalone execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runEditorSetup().catch(console.error);
}
