/**
 * TS -> Python subprocess bridge. Calls Python CLI with JSON input/output.
 */
import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";
import { SekkeiError } from "./errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PYTHON_DIR = resolve(__dirname, "../../python");
const CLI_PATH = resolve(PYTHON_DIR, "cli.py");
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const VALID_ACTIONS = ["export-excel", "export-pdf", "export-docx", "glossary", "diff", "export-matrix"] as const;

/** Find python3 executable (venv or system) */
function getPythonPath(): string {
  const venvPython = resolve(PYTHON_DIR, ".venv/bin/python3");
  return process.env.SEKKEI_PYTHON ?? venvPython;
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
