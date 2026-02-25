/**
 * Git diff analysis + file-to-feature mapping + staleness scoring.
 * Uses simple-git for git operations (read-only).
 */
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { simpleGit } from "simple-git";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import { resolveOutputPath } from "./resolve-output-path.js";
import type { ProjectConfig, DocType } from "../types/documents.js";

/** Module-level git instance cache keyed by repoRoot to avoid repeated construction overhead */
const gitInstances = new Map<string, ReturnType<typeof simpleGit>>();
function getGit(repoRoot: string): ReturnType<typeof simpleGit> {
  if (!gitInstances.has(repoRoot)) gitInstances.set(repoRoot, simpleGit(repoRoot));
  return gitInstances.get(repoRoot)!;
}

export interface StalenessEntry {
  featureId: string;
  label: string;
  score: number;
  changedFiles: string[];
  linesChanged: number;
  lastDocUpdate: string | null;
  daysSinceDocUpdate: number;
  affectedDocTypes: string[];
}

export interface StalenessReport {
  repoRoot: string;
  sinceRef: string;
  scanDate: string;
  features: StalenessEntry[];
  overallScore: number;
  staleCount: number;
  summary: string;
}

export interface StalenessOptions {
  since?: string;
  threshold?: number;
}

/** Convert a glob pattern to a RegExp for path matching */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "DOUBLE_STAR")
    .replace(/\*/g, "[^/]*")
    .replace(/DOUBLE_STAR/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const rx = globToRegex(pattern);
    // Also match if file starts with pattern (directory-style)
    return rx.test(filePath) || rx.test(filePath.replace(/\\/g, "/"));
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calcScore(daysSince: number, numFiles: number, linesChanged: number): number {
  // Ignore trivial changes: < 5 total lines changed
  if (linesChanged < 5) return 0;
  return Math.round(
    clamp(daysSince / 90, 0, 1) * 40 +
      clamp(numFiles / 10, 0, 1) * 30 +
      clamp(linesChanged / 500, 0, 1) * 30
  );
}

/** Determine affected doc types based on feature ID prefix */
function getAffectedDocTypes(featureId: string): string[] {
  if (featureId.startsWith("F-")) return ["functions-list", "basic-design"];
  if (featureId.startsWith("REQ-")) return ["requirements", "basic-design"];
  if (featureId.startsWith("SCR-")) return ["basic-design", "detail-design"];
  if (featureId.startsWith("TBL-")) return ["basic-design", "detail-design"];
  if (featureId.startsWith("API-")) return ["basic-design", "detail-design"];
  if (featureId.startsWith("CLS-")) return ["detail-design"];
  if (featureId.startsWith("UT-")) return ["ut-spec"];
  if (featureId.startsWith("IT-")) return ["it-spec"];
  if (featureId.startsWith("ST-")) return ["st-spec"];
  if (featureId.startsWith("UAT-")) {
    return ["uat-spec"];
  }
  return ["requirements", "basic-design", "detail-design"];
}

/** Parse git diff --stat output to extract total lines changed */
function parseLinesChanged(statOutput: string): number {
  // Format: "N files changed, X insertions(+), Y deletions(-)"
  const match = statOutput.match(/(\d+) insertions?\(\+\)/) ;
  const inserts = match ? parseInt(match[1], 10) : 0;
  const delMatch = statOutput.match(/(\d+) deletions?\(-\)/);
  const deletes = delMatch ? parseInt(delMatch[1], 10) : 0;
  return inserts + deletes;
}

export async function detectStaleness(
  configPath: string,
  opts?: StalenessOptions
): Promise<StalenessReport> {
  const threshold = opts?.threshold ?? 50;
  const scanDate = new Date().toISOString();

  // Read and parse config
  let config: ProjectConfig;
  try {
    const raw = await readFile(configPath, "utf-8");
    config = parseYaml(raw) as ProjectConfig;
  } catch (err) {
    throw new SekkeiError("CONFIG_ERROR", `Failed to read config: ${configPath}`, { err });
  }

  if (!config.feature_file_map || Object.keys(config.feature_file_map).length === 0) {
    logger.info("No feature_file_map in config — returning empty staleness report");
    return {
      repoRoot: dirname(resolve(configPath)),
      sinceRef: "N/A",
      scanDate,
      features: [],
      overallScore: 0,
      staleCount: 0,
      summary: "No features configured for staleness tracking.",
    };
  }

  const repoRoot = dirname(resolve(configPath));
  const git = getGit(repoRoot);

  // Verify git repo
  try {
    await git.log(["--oneline", "-1"]);
  } catch {
    throw new SekkeiError("STALENESS_ERROR", `Not a git repository: ${repoRoot}`);
  }

  // Resolve since ref — validate to prevent git argument injection
  let sinceRef: string;
  if (opts?.since) {
    if (/^\d+d$/.test(opts.since)) {
      const days = opts.since.replace("d", "");
      sinceRef = `--since="${days} days ago"`;
    } else if (/^[a-zA-Z0-9._\/-]{1,100}$/.test(opts.since) || /^\d{4}-\d{2}-\d{2}$/.test(opts.since)) {
      sinceRef = opts.since;
    } else {
      throw new SekkeiError("STALENESS_ERROR", `Invalid since ref format: ${opts.since}`);
    }
  } else {
    try {
      const tagResult = await git.raw(["describe", "--tags", "--abbrev=0"]);
      sinceRef = tagResult.trim();
    } catch {
      sinceRef = "--since=\"30 days ago\"";
    }
  }

  // Get changed files
  let changedFiles: string[] = [];
  let totalLinesChanged = 0;
  try {
    const isSinceFlag = sinceRef.startsWith("--since=");
    const diffArgs = isSinceFlag
      ? ["diff", "--name-only", sinceRef]
      : ["diff", "--name-only", `${sinceRef}..HEAD`];

    const nameOnly = await git.raw(diffArgs);
    const NON_SOURCE_PATTERNS = [
      /\.(test|spec)\.[jt]sx?$/,
      /\/__tests__\//,
      /\/test\//,
      /\.config\.[jt]s$/,
      /\.env/,
      /package-lock\.json$/,
      /yarn\.lock$/,
    ];
    changedFiles = nameOnly
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .filter((f) => !NON_SOURCE_PATTERNS.some((p) => p.test(f)));

    const statArgs = isSinceFlag
      ? ["diff", "--stat", sinceRef]
      : ["diff", "--stat", `${sinceRef}..HEAD`];
    const statOutput = await git.raw(statArgs);
    totalLinesChanged = parseLinesChanged(statOutput);
  } catch (err) {
    logger.warn({ err, sinceRef }, "git diff failed — treating as empty diff");
  }

  const outputDir = config.output?.directory ?? "output";
  // Process all features in parallel — each git log call is independent
  const features: StalenessEntry[] = await Promise.all(
    Object.entries(config.feature_file_map).map(async ([featureId, mapping]) => {
      const matched = changedFiles.filter((f) => matchGlob(f, mapping.files));

      let lastDocUpdate: string | null = null;
      let daysSinceDocUpdate = 0;

      if (matched.length > 0) {
        try {
          // Build per-feature doc paths via resolveOutputPath
          const affectedTypes = getAffectedDocTypes(featureId);
          const featureDocPaths = affectedTypes
            .map((dt) => resolveOutputPath(dt as DocType))
            .filter((p): p is string => p != null)
            .map((p) => `${outputDir}/${p}`);

          // git log with per-feature paths (not whole outputDir)
          const logOutput = await git.raw([
            "log", "-1", "--format=%aI", "--", ...featureDocPaths,
          ]);
          const trimmed = logOutput.trim();
          if (trimmed) {
            lastDocUpdate = trimmed;
            const docDate = new Date(lastDocUpdate).getTime();
            daysSinceDocUpdate = Math.round((Date.now() - docDate) / 86_400_000);
          }
        } catch {
          daysSinceDocUpdate = 90; // assume worst case
        }
      }

      const linesForFeature = matched.length > 0
        ? Math.round(totalLinesChanged * (matched.length / Math.max(changedFiles.length, 1)))
        : 0;

      const score = matched.length > 0
        ? calcScore(daysSinceDocUpdate, matched.length, linesForFeature)
        : 0;

      return {
        featureId,
        label: mapping.label,
        score,
        changedFiles: matched,
        linesChanged: linesForFeature,
        lastDocUpdate,
        daysSinceDocUpdate,
        affectedDocTypes: getAffectedDocTypes(featureId),
      };
    })
  );

  const overallScore =
    features.length > 0
      ? Math.round(features.reduce((sum, f) => sum + f.score, 0) / features.length)
      : 0;
  const staleCount = features.filter((f) => f.score >= threshold).length;

  const displayRef = sinceRef.startsWith("--since=")
    ? sinceRef.replace(/^--since="(.+)"$/, "$1")
    : sinceRef;

  return {
    repoRoot,
    sinceRef: displayRef,
    scanDate,
    features,
    overallScore,
    staleCount,
    summary: `${staleCount}/${features.length} features stale (threshold: ${threshold}, overall score: ${overallScore}/100)`,
  };
}
