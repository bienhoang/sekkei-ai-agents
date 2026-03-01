#!/usr/bin/env node
/**
 * Cross-platform installer — replaces install.sh for Windows compatibility.
 * Usage: node bin/install.js [--skip-python]
 */
import { execSync, execFileSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === "win32";
const skipPython = process.argv.includes("--skip-python");
const PKG_ROOT = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: PKG_ROOT, ...opts });
}

function findPython() {
  const cmds = isWin ? ["python", "python3"] : ["python3", "python"];
  for (const cmd of cmds) {
    try {
      execFileSync(isWin ? "where" : "which", [cmd], { stdio: "ignore" });
      return cmd;
    } catch { /* not found */ }
  }
  return null;
}

const MONOREPO_ROOT = resolve(PKG_ROOT, "..", "..");

console.log("=== Sekkei Installer ===\n");

// Step 1: npm install
console.log("[1/6] Installing npm dependencies...");
run("npm install");

// Step 2: Build MCP server
console.log("\n[2/6] Building MCP server...");
run("npm run build");

// Step 3: Build preview & dashboard
console.log("\n[3/6] Building preview & dashboard...");
for (const pkg of ["preview", "dashboard"]) {
  const pkgDir = resolve(MONOREPO_ROOT, "packages", pkg);
  if (existsSync(pkgDir)) {
    try {
      console.log(`  Building ${pkg}...`);
      execSync("npm run build", { cwd: pkgDir, stdio: "pipe" });
      console.log(`  ✓ ${pkg} built`);
    } catch {
      console.log(`  ⚠ ${pkg} build failed (non-fatal)`);
    }
  }
}

// Step 4: Python venv (optional)
console.log("\n[4/6] Setting up Python environment...");
if (!skipPython) {
  const pythonCmd = findPython();
  if (pythonCmd) {
    const pythonDir = join(PKG_ROOT, "python");
    const venvDir = join(pythonDir, ".venv");
    if (!existsSync(venvDir)) {
      console.log(`  Creating venv with ${pythonCmd}...`);
      execFileSync(pythonCmd, ["-m", "venv", venvDir], { stdio: "inherit", cwd: pythonDir });
    } else {
      console.log("  Venv already exists, skipping creation.");
    }
    const pip = isWin
      ? join(venvDir, "Scripts", "pip.exe")
      : join(venvDir, "bin", "pip");
    const reqPath = join(pythonDir, "requirements.txt");
    if (existsSync(reqPath)) {
      execFileSync(pip, ["install", "-r", "requirements.txt"], { stdio: "inherit", cwd: pythonDir });
    }
  } else {
    console.log("  Python not found — skipping venv setup (export features disabled)");
  }
} else {
  console.log("  --skip-python: skipping Python venv setup");
}

// Step 5: Run setup (adapter config)
console.log("\n[5/6] Configuring editor adapters...");
run("node bin/setup.js");

// Step 6: Health check
console.log("\n[6/6] Running health check...");
try { run("npx sekkei doctor"); } catch { /* non-fatal */ }

console.log("\n=== Sekkei installed successfully! ===");
