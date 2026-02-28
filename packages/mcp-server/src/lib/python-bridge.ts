/**
 * TS -> Python subprocess bridge. Calls Python CLI with JSON input/output.
 */
import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";
import { SekkeiError } from "./errors.js";
import { getVenvPython, isWin } from "./platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PYTHON_DIR = resolve(__dirname, "../../python");
const CLI_PATH = resolve(PYTHON_DIR, "cli.py");
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const VALID_ACTIONS = ["export-excel", "export-pdf", "export-docx", "diff", "export-matrix", "import-excel"] as const;

/** Find python3 executable — checks venv, env var, then system python. */
function getPythonPath(): string {
  // 1. Explicit env var override
  if (process.env.SEKKEI_PYTHON) {
    if (!existsSync(process.env.SEKKEI_PYTHON)) {
      throw new SekkeiError("CONFIG_ERROR", `SEKKEI_PYTHON points to missing file: ${process.env.SEKKEI_PYTHON}`);
    }
    return process.env.SEKKEI_PYTHON;
  }

  // 2. Project venv
  const venvPython = getVenvPython(PYTHON_DIR);
  if (existsSync(venvPython)) return venvPython;

  // 3. System python fallback (try platform-preferred order)
  const candidates = isWin ? ["python", "python3"] : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ["--version"], { stdio: "pipe" });
      return cmd;
    } catch { /* not available */ }
  }

  throw new SekkeiError(
    "CONFIG_ERROR",
    "Python not found. Run 'npx sekkei init' to set up the Python venv, or set SEKKEI_PYTHON env var.",
  );
}

export interface PythonResult {
  [key: string]: unknown;
}

/** Call Python CLI with action and JSON input */
export function callPython(action: string, input: Record<string, unknown>): Promise<PythonResult> {
  if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return Promise.reject(new SekkeiError("VALIDATION_FAILED", `Invalid Python action: ${action}`));
  }

  return new Promise((resolve, reject) => {
    const python = getPythonPath();
    const inputJson = JSON.stringify(input);

    logger.debug({ action, python }, "Calling Python bridge");

    const proc = execFile(
      python,
      [CLI_PATH, action],
      {
        env: { ...process.env, SEKKEI_INPUT: inputJson },
        maxBuffer: MAX_BUFFER,
        timeout: TIMEOUT_MS,
        cwd: PYTHON_DIR,
      },
      (error, stdout, stderr) => {
        if (stderr && stderr.trim()) {
          logger.warn({ stderr: stderr.trim(), action }, "Python stderr output");
        }

        if (error) {
          // Try parsing error from stderr JSON
          let message = error.message;
          try {
            const errObj = JSON.parse(stderr);
            message = errObj.error ?? message;
          } catch { /* use original message */ }

          logger.error({ error: message, action }, "Python bridge failed");
          reject(new SekkeiError("GENERATION_FAILED", `Python ${action} failed: ${message}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new SekkeiError("GENERATION_FAILED", result.error));
            return;
          }
          resolve(result);
        } catch {
          reject(new SekkeiError("PARSE_ERROR", `Invalid JSON from Python: ${stdout.slice(0, 200)}`));
        }
      }
    );
  });
}
