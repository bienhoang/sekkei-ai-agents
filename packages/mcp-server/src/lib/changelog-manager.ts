/**
 * Global changelog manager — append-only markdown changelog for all document changes.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "./logger.js";

export interface ChangelogEntry {
  date: string;
  docType: string;
  version: string;
  changes: string;
  author: string;
  crId: string;
}

const HEADER = [
  "# 変更履歴 (Global Changelog)",
  "",
  "| 日付 | 文書 | 版数 | 変更内容 | 変更者 | CR-ID |",
  "|------|------|------|----------|--------|-------|",
].join("\n");

/** Escape pipe chars to prevent markdown table breakage */
function esc(s: string): string { return s.replace(/\|/g, "\\|"); }

function formatRow(e: ChangelogEntry): string {
  return `| ${esc(e.date)} | ${esc(e.docType)} | ${esc(e.version)} | ${esc(e.changes)} | ${esc(e.author)} | ${esc(e.crId)} |`;
}

export async function appendGlobalChangelog(
  workspacePath: string,
  entry: ChangelogEntry,
): Promise<void> {
  const changelogPath = join(workspacePath, "sekkei-docs", "CHANGELOG.md");
  try {
    await mkdir(dirname(changelogPath), { recursive: true });
    let content: string;
    try {
      content = await readFile(changelogPath, "utf-8");
    } catch {
      content = HEADER;
    }
    const row = formatRow(entry);
    const updated = content.trimEnd() + "\n" + row + "\n";
    await writeFile(changelogPath, updated, "utf-8");
    logger.info({ docType: entry.docType, version: entry.version }, "Global changelog updated");
  } catch (err) {
    logger.warn({ err }, "Failed to update global changelog — non-blocking");
  }
}
