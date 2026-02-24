/**
 * Global changelog manager — append-only markdown changelog for all document changes.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "./logger.js";
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";

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

/** Increment version by 0.1 (e.g., "1.0" → "1.1", "2.9" → "3.0") */
export function incrementVersion(version: string): string {
  if (!version) return "1.0";
  const parts = version.split(".");
  if (parts.length !== 2) return "1.0";
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  if (isNaN(major) || isNaN(minor)) return "1.0";
  const nextMinor = minor + 1;
  if (nextMinor >= 10) return `${major + 1}.0`;
  return `${major}.${nextMinor}`;
}

/** Extract latest version from 改訂履歴 table (last 版数 value) */
export function extractVersionFromContent(content: string): string {
  const lines = content.split("\n");
  let capturing = false;
  let lastVersion = "";
  for (const line of lines) {
    if (/^#{1,4}\s+改訂履歴/.test(line)) { capturing = true; continue; }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) {
      // Standard: | 1.0 | or | v1.0 |
      const match = line.match(/^\|\s*v?(\d+\.\d+)\s*\|/);
      if (match) { lastVersion = match[1]; continue; }
      // Alternative: | 版数 1.0 |
      const altMatch = line.match(/^\|\s*版数\s*(\d+\.\d+)\s*\|/);
      if (altMatch) { lastVersion = altMatch[1]; }
    }
  }
  if (!lastVersion) {
    logger.warn("extractVersionFromContent: no version found in 改訂履歴");
  }
  return lastVersion;
}

export async function appendGlobalChangelog(
  workspacePath: string,
  entry: ChangelogEntry,
): Promise<void> {
  const changelogPath = join(workspacePath, DEFAULT_WORKSPACE_DIR, "CHANGELOG.md");
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
