/**
 * Dependency installation for the Sekkei init CLI.
 * Handles Python venv, Playwright chromium, and MCP server build.
 */

import * as p from "@clack/prompts";
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { t } from "./i18n.js";

/** Detect available Python command */
function findPython() {
  try { execSync("python3 --version", { stdio: "pipe" }); return "python3"; } catch { /* empty */ }
  try { execSync("python --version", { stdio: "pipe" }); return "python"; } catch { /* empty */ }
  return null;
}

/**
 * Install all dependencies (Python venv, Playwright, build).
 * @param {string} lang - CLI language
 * @param {object} paths - { pythonDir, mcpDir, distDir }
 * @param {boolean} skipDeps - Skip dependency installation
 */
export async function installDeps(lang, { pythonDir, mcpDir, distDir }, skipDeps) {
  if (skipDeps) {
    p.note(t(lang, "skip_deps_body"), t(lang, "skip_deps_title"));
    return;
  }

  const s = p.spinner();

  // Python venv + pip install
  s.start(t(lang, "python_setup"));
  try {
    const pythonCmd = findPython();
    if (pythonCmd) {
      const venvDir = resolve(pythonDir, ".venv");
      if (!existsSync(venvDir)) {
        execFileSync(pythonCmd, ["-m", "venv", venvDir], { stdio: "pipe" });
      }
      const reqFile = resolve(pythonDir, "requirements.txt");
      if (existsSync(reqFile)) {
        const isWin = process.platform === "win32";
        const venvPython = resolve(venvDir, isWin ? "Scripts" : "bin", isWin ? "python.exe" : "python3");
        execFileSync(venvPython, ["-m", "pip", "install", "-q", "-r", reqFile], {
          stdio: "pipe",
          timeout: 120_000,
        });
      }
      s.stop(t(lang, "python_done"));
    } else {
      s.stop(t(lang, "python_not_found"));
    }
  } catch {
    s.stop(t(lang, "python_fail"));
  }

  // Playwright chromium
  s.start(t(lang, "playwright_setup"));
  try {
    execSync("npx playwright install chromium", {
      cwd: mcpDir,
      stdio: "pipe",
      timeout: 180_000,
    });
    s.stop(t(lang, "playwright_done"));
  } catch {
    s.stop(t(lang, "playwright_fail"));
  }

  // Build MCP server if dist/ is missing
  if (!existsSync(resolve(distDir, "index.js"))) {
    s.start(t(lang, "build_setup"));
    try {
      execSync("npm run build", { cwd: mcpDir, stdio: "pipe", timeout: 60_000 });
      s.stop(t(lang, "build_done"));
    } catch {
      s.stop(t(lang, "build_fail"));
    }
  }

  // Health check summary
  try {
    const healthPath = resolve(distDir, "cli", "commands", "health-check.js");
    const mod = await import(healthPath);
    const report = await mod.checkHealth();
    p.note(mod.formatHealthReport(report), t(lang, "env_status"));
  } catch {
    // health-check module may not be built yet
  }
}
