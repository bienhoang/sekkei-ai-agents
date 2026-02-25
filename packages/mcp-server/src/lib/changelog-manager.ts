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

/** Extract latest version from 改訂履歴 table — collects all versions and returns maximum */
export function extractVersionFromContent(content: string): string {
  const lines = content.split("\n");
  let capturing = false;
  const versions: string[] = [];
  for (const line of lines) {
    if (/^#{1,4}\s+改訂履歴/.test(line)) { capturing = true; continue; }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) {
      // Match version anywhere in a table row (not just first cell)
      const matches = line.matchAll(/v?(\d+\.\d+)/g);
      for (const m of matches) {
        // Only capture if it looks like a version (not a random decimal)
        const val = m[1];
        if (parseFloat(val) < 100) versions.push(val);
      }
    }
  }
  if (versions.length === 0) {
    logger.warn("extractVersionFromContent: no version found in 改訂履歴");
    return "";
  }
  // Return highest version (handles unsorted tables)
  versions.sort((a, b) => {
    const [aMaj, aMin] = a.split(".").map(Number);
    const [bMaj, bMin] = b.split(".").map(Number);
    return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
  });
  return versions[versions.length - 1];
}

/** Read last version for a doc type from global changelog (fallback) */
export async function getLastChangelogVersion(
  workspacePath: string,
  docType: string,
): Promise<string> {
  const changelogPath = join(workspacePath, DEFAULT_WORKSPACE_DIR, "CHANGELOG.md");
  try {
    const content = await readFile(changelogPath, "utf-8");
    const lines = content.split("\n");
    // Scan table rows in reverse for matching doc type
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").map(c => c.trim());
      // Table: | date | docType | version | changes | author | crId |
      if (cells.length >= 4 && cells[2] === docType && cells[3]) {
        const version = cells[3].replace(/^v/, "");
        if (/^\d+\.\d+$/.test(version)) return version;
      }
    }
  } catch { /* non-blocking */ }
  return "";
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
