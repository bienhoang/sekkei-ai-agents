/**
 * Document-level staleness detection via git timestamps.
 * Compares upstream vs downstream last-modified dates to detect drift.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import { simpleGit } from "simple-git";
import { CHAIN_PAIRS } from "./cross-ref-linker.js";
import { logger } from "./logger.js";
import type { ProjectConfig, StalenessWarning } from "../types/documents.js";

/** Module-level git instance cache keyed by repoRoot to avoid repeated construction overhead */
const gitInstances = new Map<string, ReturnType<typeof simpleGit>>();
function getGit(repoRoot: string): ReturnType<typeof simpleGit> {
  if (!gitInstances.has(repoRoot)) gitInstances.set(repoRoot, simpleGit(repoRoot));
  return gitInstances.get(repoRoot)!;
}

/**
 * Load chain document file paths from config.
 * Returns Map<docType, absoluteFilePath> for all docs that have output paths.
 */
export async function loadChainDocPaths(configPath: string): Promise<Map<string, string>> {
  const absConfig = resolve(configPath);
  const raw = await readFile(absConfig, "utf-8");
  const config = parseYaml(raw) as ProjectConfig;
  const base = dirname(absConfig);
  const paths = new Map<string, string>();

  const chain = config.chain;
  if (!chain) return paths;

  // Single-file entries
  const singleEntries: [string, { output?: string } | undefined][] = [
    ["functions-list", chain.functions_list],
    ["requirements", chain.requirements],
    ["nfr", chain.nfr],
    ["project-plan", chain.project_plan],
    ["security-design", chain.security_design],
    ["test-plan", chain.test_plan],
    ["st-spec", chain.st_spec],
    ["uat-spec", chain.uat_spec],
    ["operation-design", chain.operation_design],
    ["migration-design", chain.migration_design],
  ];

  for (const [docType, entry] of singleEntries) {
    if (entry?.output) {
      paths.set(docType, resolve(base, entry.output));
    }
  }

  // Dual-mode entries: prefer single-file output for staleness (simpler timestamp)
  const dualEntries: [string, { output?: string; system_output?: string; features_output?: string } | undefined][] = [
    ["basic-design", chain.basic_design],
    ["detail-design", chain.detail_design],
    ["ut-spec", chain.ut_spec as { output?: string; system_output?: string; features_output?: string } | undefined],
    ["it-spec", chain.it_spec as { output?: string; system_output?: string; features_output?: string } | undefined],
  ];

  for (const [docType, entry] of dualEntries) {
    if (!entry) continue;
    if (entry.output) {
      paths.set(docType, resolve(base, entry.output));
    } else if (entry.system_output) {
      // For split docs, store system_output as path; features_output handled in checkChainStaleness
      paths.set(docType, resolve(base, entry.system_output));
      // Store features_output path too if present (keyed with suffix)
      if (entry.features_output) {
        paths.set(`${docType}:features`, resolve(base, entry.features_output));
      }
    }
  }

  return paths;
}

/** Timeout limit for each git operation (ms) */
const GIT_TIMEOUT_MS = 5_000;

/** Race a promise against a timeout. Returns null on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Get git last-modified date for a file path. Returns ISO string or null. */
async function gitLastModified(repoRoot: string, filePath: string): Promise<string | null> {
  try {
    const git = getGit(repoRoot);
    const result = await withTimeout(
      git.log({ file: filePath, maxCount: 1, format: { date: "%aI" } }),
      GIT_TIMEOUT_MS,
    );
    if (!result) {
      logger.warn({ filePath }, "git log timed out for staleness check");
      return null;
    }
    return result.latest?.date ?? null;
  } catch {
    return null;
  }
}

/**
 * Check staleness across the full document chain.
 * Returns warnings for pairs where upstream is newer than downstream.
 */
export async function checkChainStaleness(configPath: string): Promise<StalenessWarning[]> {
  try {
    const docPaths = await loadChainDocPaths(configPath);
    const repoRoot = dirname(resolve(configPath));
    const warnings: StalenessWarning[] = [];

    // Collect all unique docTypes referenced in CHAIN_PAIRS that have paths
    const uniqueDocTypes = new Set<string>();
    for (const [upstream, downstream] of CHAIN_PAIRS) {
      if (docPaths.has(upstream)) uniqueDocTypes.add(upstream);
      if (docPaths.has(downstream)) uniqueDocTypes.add(downstream);
    }

    // Pre-fetch all git dates in parallel
    const dateCache = new Map<string, string | null>();
    await Promise.all(
      Array.from(uniqueDocTypes).map(async (docType) => {
        const path = docPaths.get(docType);
        if (!path) { dateCache.set(docType, null); return; }

        // For split-docs, fetch both paths in parallel and take max
        const featPath = docPaths.get(`${docType}:features`);
        const [date, featDate] = await Promise.all([
          gitLastModified(repoRoot, path),
          featPath ? gitLastModified(repoRoot, featPath) : Promise.resolve(null),
        ]);

        let resolved = date;
        if (featDate && (!resolved || new Date(featDate) > new Date(resolved))) {
          resolved = featDate;
        }
        dateCache.set(docType, resolved);
      })
    );

    for (const [upstream, downstream] of CHAIN_PAIRS) {
      if (!docPaths.has(upstream) || !docPaths.has(downstream)) continue;

      const upDate = dateCache.get(upstream) ?? null;
      const downDate = dateCache.get(downstream) ?? null;
      if (!upDate || !downDate) continue;

      if (new Date(upDate).getTime() > new Date(downDate).getTime()) {
        warnings.push({
          upstream,
          downstream,
          upstreamModified: upDate,
          downstreamModified: downDate,
          message: `${upstream} (${upDate}) is newer than ${downstream} (${downDate})`,
        });
      }
    }

    return warnings;
  } catch (err) {
    logger.warn({ err }, "Staleness check failed — returning empty");
    return [];
  }
}

/**
 * Check staleness for a specific document's upstreams.
 * Returns warnings only for pairs where downstream matches docType.
 */
export async function checkDocStaleness(configPath: string, docType: string): Promise<StalenessWarning[]> {
  try {
    const docPaths = await loadChainDocPaths(configPath);
    const repoRoot = dirname(resolve(configPath));
    const warnings: StalenessWarning[] = [];

    // Filter CHAIN_PAIRS to only pairs where downstream matches docType
    const relevantPairs = CHAIN_PAIRS.filter(([, down]) => down === docType);
    if (relevantPairs.length === 0) return [];

    const downPath = docPaths.get(docType);
    if (!downPath) return [];

    // Fetch downstream date (with split-doc handling) and all upstream dates in parallel
    const featPath = docPaths.get(`${docType}:features`);
    const upstreamDocTypes = relevantPairs.map(([up]) => up).filter((up) => docPaths.has(up));

    const [downDate, featDate, ...upDates] = await Promise.all([
      gitLastModified(repoRoot, downPath),
      featPath ? gitLastModified(repoRoot, featPath) : Promise.resolve(null),
      ...upstreamDocTypes.map((up) => gitLastModified(repoRoot, docPaths.get(up)!)),
    ]);

    // Resolve downstream date (max of main + features)
    let resolvedDownDate = downDate;
    if (featDate && (!resolvedDownDate || new Date(featDate) > new Date(resolvedDownDate))) {
      resolvedDownDate = featDate;
    }
    if (!resolvedDownDate) return [];

    for (let i = 0; i < upstreamDocTypes.length; i++) {
      const upstream = upstreamDocTypes[i];
      const upDate = upDates[i];
      if (!upDate) continue;

      if (new Date(upDate).getTime() > new Date(resolvedDownDate).getTime()) {
        warnings.push({
          upstream,
          downstream: docType,
          upstreamModified: upDate,
          downstreamModified: resolvedDownDate,
          message: `${upstream} (${upDate}) is newer than ${docType} (${resolvedDownDate})`,
        });
      }
    }

    return warnings;
  } catch (err) {
    logger.warn({ err }, "Doc staleness check failed — returning empty");
    return [];
  }
}
