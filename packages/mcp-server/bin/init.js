#!/usr/bin/env node

/**
 * npx sekkei init — Interactive project setup wizard.
 * Supports 3 CLI languages: English, Japanese, Vietnamese.
 */

import * as p from "@clack/prompts";
import { stringify } from "yaml";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { runEditorSetup } from "./setup.js";
import { t } from "./init/i18n.js";
import { askLanguage, askProject, askStacks, askDocOptions, showSummary } from "./init/prompts.js";
import { installDeps } from "./init/deps.js";

const CONFIG_FILE = "sekkei.config.yaml";
const __init_dirname = dirname(fileURLToPath(import.meta.url));
const MCP_DIR = resolve(__init_dirname, "..");
const PYTHON_DIR = resolve(MCP_DIR, "python");
const DIST_DIR = resolve(MCP_DIR, "dist");

// Parse flags
const skipDeps = process.argv.includes("--skip-deps");
const presetArg = process.argv.find((a) => a.startsWith("--preset"));
const presetValue = presetArg?.includes("=")
  ? presetArg.split("=")[1]
  : process.argv[process.argv.indexOf("--preset") + 1];

async function main() {
  p.intro("Sekkei");

  // 1. CLI language (first prompt — determines all subsequent UI text)
  const lang = await askLanguage();
  if (p.isCancel(lang)) { p.cancel("Cancelled"); process.exit(0); }

  // 2. Check existing config
  if (existsSync(CONFIG_FILE)) {
    const overwrite = await p.confirm({
      message: t(lang, "overwrite"),
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel(t(lang, "cancel"));
      process.exit(0);
    }
  }

  // 3–6. Prompt loop with summary + redo
  let project = await askProject(lang);
  if (!project || p.isCancel(project)) { p.cancel(t(lang, "cancel")); process.exit(0); }

  let stack = await askStacks(lang, project.type);
  if (p.isCancel(stack)) { p.cancel(t(lang, "cancel")); process.exit(0); }

  let docOpts = await askDocOptions(lang, presetValue);
  if (!docOpts || p.isCancel(docOpts)) { p.cancel(t(lang, "cancel")); process.exit(0); }

  // Summary + redo loop
  let confirmed = false;
  while (!confirmed) {
    const action = await showSummary(lang, project, stack, docOpts);
    if (action === "cancel") { p.cancel(t(lang, "cancel")); process.exit(0); }
    if (action === "ok") { confirmed = true; break; }
    if (action === "project") {
      const redo = await askProject(lang, project);
      if (redo && !p.isCancel(redo)) {
        project = redo;
        // Re-ask stacks if project type changed (different conditional sections)
        stack = await askStacks(lang, project.type, stack);
        if (p.isCancel(stack)) { p.cancel(t(lang, "cancel")); process.exit(0); }
      }
    } else if (action === "stack") {
      const redo = await askStacks(lang, project.type, stack);
      if (!p.isCancel(redo)) stack = redo;
    } else if (action === "doc") {
      const redo = await askDocOptions(lang, presetValue, docOpts);
      if (redo && !p.isCancel(redo)) docOpts = redo;
    }
  }

  const outDir = String(docOpts.outputDir || "./output");
  if (outDir.includes("..")) {
    p.cancel(t(lang, "path_invalid"));
    process.exit(1);
  }

  // 7. Write config YAML
  const config = {
    project: {
      name: project.name,
      type: project.type,
      stack: stack || [],
      language: docOpts.language,
      keigo: docOpts.keigo,
      preset: docOpts.preset,
      team_size: 1,
      industry: docOpts.industry !== "none" ? docOpts.industry : undefined,
    },
    output: { directory: outDir },
    chain: {
      rfp: "",
      overview: { status: "pending" },
      functions_list: { status: "pending" },
      requirements: { status: "pending" },
      basic_design: { status: "pending" },
      detail_design: { status: "pending" },
      test_spec: { status: "pending" },
    },
  };
  writeFileSync(CONFIG_FILE, stringify(config), "utf-8");
  p.log.success(t(lang, "config_written"));

  // 8. Import industry glossary
  if (config.project.industry) {
    try {
      const { importIndustry, loadGlossary, saveGlossary } = await import(
        "../dist/lib/glossary-native.js"
      );
      const glossaryPath = resolve(outDir, "glossary.yaml");
      mkdirSync(outDir, { recursive: true });
      const glossary = loadGlossary(glossaryPath);
      const { imported } = importIndustry(config.project.industry, glossary);
      saveGlossary(glossary, glossaryPath);
      p.log.success(`${imported}${t(lang, "glossary_imported")}`);
    } catch {
      p.log.warn(t(lang, "glossary_fail"));
    }
  }

  // 9. Editor setup (skip Python check — handled by installDeps)
  const s = p.spinner();
  s.start(t(lang, "editor_detect"));
  try {
    await runEditorSetup({ skipPython: true });
    s.stop(t(lang, "editor_done"));
  } catch {
    s.stop(t(lang, "editor_skip"));
  }

  // 10. Install dependencies
  await installDeps(lang, { pythonDir: PYTHON_DIR, mcpDir: MCP_DIR, distDir: DIST_DIR }, skipDeps);

  // 11. Auto-register MCP server in Claude Code settings
  const claudeDir = join(homedir(), ".claude");
  const settingsPath = join(claudeDir, "settings.json");
  try {
    const venvPython = resolve(PYTHON_DIR, ".venv", "bin", "python3");
    const mcpEntry = {
      command: "node",
      args: [resolve(DIST_DIR, "index.js")],
      env: {
        SEKKEI_TEMPLATE_DIR: resolve(MCP_DIR, "templates"),
        SEKKEI_PYTHON: venvPython,
      },
    };
    let settings = {};
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    }
    settings.mcpServers = settings.mcpServers || {};
    settings.mcpServers.sekkei = mcpEntry;
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
    p.log.success(t(lang, "mcp_registered"));
  } catch {
    p.log.warn(t(lang, "mcp_register_fail"));
  }

  // 12. Regenerate command stubs (sekkei update)
  try {
    execSync("node bin/cli.js update", { cwd: MCP_DIR, stdio: "pipe", timeout: 10_000 });
    p.log.success(t(lang, "commands_updated"));
  } catch {
    // update command may not be built yet
  }

  p.outro(t(lang, "setup_done"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
