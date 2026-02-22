/**
 * Git integration for auto-committing generated documents.
 * All operations are best-effort: errors are logged to stderr, never thrown.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Check if the given directory is inside a git repository.
 * Returns false on any error (not a git repo, git not installed, etc.)
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-commit a generated document file.
 * Stages the file and commits with a conventional message.
 * Never throws — all errors are logged to stderr.
 *
 * @param outputPath - Absolute path to the generated file
 * @param docType - Document type enum value (e.g. "requirements", "basic-design")
 */
export async function autoCommit(outputPath: string, docType: string): Promise<void> {
  const cwd = dirname(outputPath);

  try {
    const isRepo = await isGitRepo(cwd);
    if (!isRepo) {
      process.stderr.write(`[sekkei] git auto-commit skipped: not a git repository (${cwd})\n`);
      return;
    }

    await execFileAsync("git", ["add", outputPath], { cwd });

    try {
      await execFileAsync("git", ["commit", "-m", `sekkei: update ${docType}`], { cwd });
    } catch (commitErr: unknown) {
      // Exit code 1 means "nothing to commit" — not an error
      const err = commitErr as { code?: number; stderr?: string };
      if (err.code === 1) {
        process.stderr.write(`[sekkei] git commit: nothing to commit for ${outputPath}\n`);
        return;
      }
      throw commitErr;
    }
  } catch (err) {
    process.stderr.write(`[sekkei] git auto-commit failed: ${String(err)}\n`);
  }
}
