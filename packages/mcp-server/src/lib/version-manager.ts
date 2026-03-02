/**
 * Core version management — semver parsing, releases.yaml persistence,
 * doc version bumping with frontmatter + 改訂履歴 updates.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { SekkeiError } from "./errors.js";
import { parseFrontmatter } from "./frontmatter-parser.js";
import { resolveOutputPath } from "./resolve-output-path.js";
import { logger } from "./logger.js";
import type { SemVer, ReleasesFile, VersionQueryResult, ReleaseResult } from "../types/version.js";
import type { DocType, ProjectConfig } from "../types/documents.js";

const RELEASES_FILENAME = "sekkei.releases.yaml";

// --- Pure semver functions ---

export function parseSemver(str: string): SemVer {
  const m = str.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new SekkeiError("VERSION_ERROR", `Invalid semver: "${str}"`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatSemver(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function incrementSemver(v: SemVer, type: "major" | "minor" | "patch"): SemVer {
  if (type === "major") return { major: v.major + 1, minor: 0, patch: 0 };
  if (type === "minor") return { major: v.major, minor: v.minor + 1, patch: 0 };
  return { major: v.major, minor: v.minor, patch: v.patch + 1 };
}

// --- Releases file I/O ---

export function releasesFilePath(workspacePath: string): string {
  return join(workspacePath, RELEASES_FILENAME);
}

function defaultReleasesFile(): ReleasesFile {
  return { format: "semver", current: {}, releases: [] };
}

export async function readReleases(workspacePath: string): Promise<ReleasesFile> {
  const path = releasesFilePath(workspacePath);
  try {
    const raw = await readFile(path, "utf-8");
    const data = parseYaml(raw) as ReleasesFile;
    if (!data || typeof data !== "object") return defaultReleasesFile();
    return {
      format: data.format ?? "semver",
      current: data.current ?? {},
      releases: Array.isArray(data.releases) ? data.releases : [],
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultReleasesFile();
    }
    throw new SekkeiError("VERSION_ERROR", `Failed to read ${RELEASES_FILENAME}: ${(err as Error).message}`);
  }
}

export async function writeReleases(workspacePath: string, data: ReleasesFile): Promise<void> {
  const path = releasesFilePath(workspacePath);
  await writeFile(path, stringifyYaml(data), "utf-8");
}

// --- Doc file resolution ---

function resolveDocPath(workspacePath: string, config: ProjectConfig, docType: string): string {
  const outputDir = config.output?.directory ?? "workspace-docs";
  const relativePath = resolveOutputPath(docType as DocType);
  if (!relativePath) {
    throw new SekkeiError("VERSION_ERROR", `Cannot resolve output path for doc_type: ${docType}`);
  }
  return resolve(workspacePath, outputDir, relativePath);
}

// --- Frontmatter update ---

function updateFrontmatterVersion(content: string, newVersion: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---\n)/);
  if (!fmMatch) {
    // No frontmatter — prepend one
    return `---\nversion: "${newVersion}"\n---\n${content}`;
  }
  const [, open, fmBody, close] = fmMatch;
  const rest = content.slice(fmMatch[0].length);
  const versionRe = /^(version:\s*).+$/m;
  let updatedFm: string;
  if (versionRe.test(fmBody)) {
    updatedFm = fmBody.replace(versionRe, `$1"${newVersion}"`);
  } else {
    updatedFm = fmBody.trimEnd() + `\nversion: "${newVersion}"`;
  }
  return `${open}${updatedFm}${close}${rest}`;
}

// --- 改訂履歴 table row insertion ---

function appendRevisionHistoryRow(content: string, version: string, reason: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const newRow = `| ${version} | ${date} | ${reason} | — |`;

  const lines = content.split("\n");
  // Find 改訂履歴 section, then locate last table row
  let inSection = false;
  let lastTableRowIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s+改訂履歴/.test(lines[i])) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,4}\s/.test(lines[i]) && !/改訂履歴/.test(lines[i])) {
      break; // next section
    }
    if (inSection && lines[i].trim().startsWith("|")) {
      lastTableRowIdx = i;
    }
  }

  if (lastTableRowIdx === -1) {
    logger.warn("No 改訂履歴 table found — skipping row insertion");
    return content;
  }

  lines.splice(lastTableRowIdx + 1, 0, newRow);
  return lines.join("\n");
}

// --- Main operations ---

export async function bumpDocVersion(
  workspacePath: string,
  docType: string,
  bumpType: "major" | "minor" | "patch",
  reason: string,
): Promise<{ old: string; new: string }> {
  // Read releases
  const releases = await readReleases(workspacePath);
  const currentStr = releases.current[docType] ?? "0.0.0";
  const current = parseSemver(currentStr);
  const bumped = incrementSemver(current, bumpType);
  const newVersion = formatSemver(bumped);

  // Update releases.yaml
  releases.current[docType] = newVersion;
  await writeReleases(workspacePath, releases);

  // Try to update the doc file (best-effort — file may not exist yet)
  try {
    const configPath = join(workspacePath, "sekkei.config.yaml");
    const configRaw = await readFile(configPath, "utf-8");
    const config = parseYaml(configRaw) as ProjectConfig;
    const docPath = resolveDocPath(workspacePath, config, docType);
    const docContent = await readFile(docPath, "utf-8");

    let updated = updateFrontmatterVersion(docContent, newVersion);
    updated = appendRevisionHistoryRow(updated, newVersion, reason);
    await writeFile(docPath, updated, "utf-8");
    logger.info({ docType, newVersion, docPath }, "Doc file updated with new version");
  } catch (err) {
    logger.warn({ err, docType }, "Could not update doc file — version tracked in releases.yaml only");
  }

  return { old: currentStr, new: newVersion };
}

export async function queryVersions(
  workspacePath: string,
  docType?: string,
): Promise<VersionQueryResult> {
  const releases = await readReleases(workspacePath);
  const versions: VersionQueryResult["versions"] = {};
  const mismatches: string[] = [];

  // Read config for doc path resolution
  let config: ProjectConfig | null = null;
  try {
    const configPath = join(workspacePath, "sekkei.config.yaml");
    config = parseYaml(await readFile(configPath, "utf-8")) as ProjectConfig;
  } catch { /* config may not exist */ }

  const docTypes = docType
    ? { [docType]: releases.current[docType] ?? "0.0.0" }
    : releases.current;

  for (const [dt, trackedVersion] of Object.entries(docTypes)) {
    let actualVersion = trackedVersion;

    if (config) {
      try {
        const docPath = resolveDocPath(workspacePath, config, dt);
        const content = await readFile(docPath, "utf-8");
        const { meta } = parseFrontmatter(content);
        actualVersion = String(meta["version"] ?? trackedVersion);
      } catch { /* file may not exist */ }
    }

    const match = actualVersion === trackedVersion;
    versions[dt] = { tracked: trackedVersion, actual: actualVersion, match };
    if (!match) mismatches.push(dt);
  }

  return { versions, mismatches };
}

// --- Release workflow ---

async function generateReleaseNotes(
  workspacePath: string,
  tag: string,
  description: string,
  snapshot: Record<string, string>,
  releases: ReleasesFile,
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Release: ${tag}`,
    `**Date:** ${date}`,
    `**Description:** ${description}`,
    "",
    "## Document Versions",
    "| Document | Version |",
    "|----------|---------|",
  ];

  for (const [dt, ver] of Object.entries(snapshot)) {
    lines.push(`| ${dt} | ${ver} |`);
  }

  // Changes since last release
  const prevRelease = releases.releases[releases.releases.length - 1];
  if (prevRelease) {
    lines.push("", "## Changes Since Last Release", "");
    for (const [dt, ver] of Object.entries(snapshot)) {
      const prevVer = prevRelease.snapshot[dt];
      if (prevVer && prevVer !== ver) {
        lines.push(`- **${dt}**: ${prevVer} → ${ver}`);
      } else if (!prevVer) {
        lines.push(`- **${dt}**: (new) ${ver}`);
      }
    }
  }

  // Staleness warnings (best-effort)
  try {
    const { checkDocStaleness } = await import("./doc-staleness.js");
    const configPath = join(workspacePath, "sekkei.config.yaml");
    const warnings: Array<{ upstream: string; message: string }> = [];
    for (const dt of Object.keys(snapshot)) {
      try {
        const sw = await checkDocStaleness(configPath, dt);
        warnings.push(...sw);
      } catch { /* skip */ }
    }
    if (warnings.length > 0) {
      lines.push("", "## Staleness Warnings", "");
      for (const w of warnings.slice(0, 10)) {
        lines.push(`- ${w.message}`);
      }
    }
  } catch { /* staleness check optional */ }

  lines.push("");
  return lines.join("\n");
}

export async function createRelease(
  workspacePath: string,
  tag: string,
  description: string,
): Promise<ReleaseResult> {
  const releases = await readReleases(workspacePath);

  if (releases.releases.some(r => r.tag === tag)) {
    throw new SekkeiError("VERSION_ERROR", `Tag already exists: ${tag}`);
  }

  const snapshot = { ...releases.current };
  const notesFile = `RELEASE-NOTES-${tag}.md`;
  const notesContent = await generateReleaseNotes(workspacePath, tag, description, snapshot, releases);
  const notesPath = join(workspacePath, notesFile);
  await writeFile(notesPath, notesContent, "utf-8");

  releases.releases.push({
    tag,
    date: new Date().toISOString().slice(0, 10),
    description,
    snapshot,
    notes_file: notesFile,
  });
  await writeReleases(workspacePath, releases);

  // Git tag (best-effort)
  let gitTagged = false;
  try {
    const { simpleGit } = await import("simple-git");
    const git = simpleGit(workspacePath);
    const existing = await git.tags();
    if (!existing.all.includes(tag)) {
      await git.tag(["-a", tag, "-m", description]);
      gitTagged = true;
    }
  } catch { /* non-blocking */ }

  return { tag, snapshot, notes_file: notesPath, git_tagged: gitTagged };
}
