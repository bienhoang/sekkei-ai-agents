/**
 * Cross-platform utilities for Windows/POSIX compatibility.
 */
import { resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

/** True when running on Windows. */
export const isWin = process.platform === "win32";

/**
 * Check if `child` path is inside `parent` directory (or equals it).
 * Uses path.resolve for normalization — handles both / and \ separators.
 */
export function isSubPath(child: string, parent: string): boolean {
  const normalChild = resolve(child);
  const normalParent = resolve(parent);
  return normalChild === normalParent || normalChild.startsWith(normalParent + sep);
}

/**
 * Return the correct Python venv executable path for the current platform.
 * Windows: .venv/Scripts/python.exe
 * POSIX:   .venv/bin/python3
 */
export function getVenvPython(baseDir: string): string {
  return resolve(
    baseDir,
    ".venv",
    isWin ? "Scripts" : "bin",
    isWin ? "python.exe" : "python3",
  );
}

/**
 * Check if a CLI command exists on the system.
 * Uses `where` on Windows, `which` on POSIX.
 */
export function commandExists(cmd: string): boolean {
  try {
    execFileSync(isWin ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
