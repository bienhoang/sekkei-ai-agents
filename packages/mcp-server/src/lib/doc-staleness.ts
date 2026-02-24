/**
 * Document-level staleness detection via git timestamps.
 * Compares upstream vs downstream last-modified dates to detect drift.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import { CHAIN_PAIRS } from "./cross-ref-linker.js";
import { logger } from "./logger.js";
import type { ProjectConfig, StalenessWarning } from "../types/documents.js";

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
  const dualEntries: [string, { output?: string; system_output?: string } | undefined][] = [
    ["basic-design", chain.basic_design],
    ["detail-design", chain.detail_design],
    ["ut-spec", chain.ut_spec as { output?: string; system_output?: string } | undefined],
    ["it-spec", chain.it_spec as { output?: string; system_output?: string } | undefined],
  ];

  for (const [docType, entry] of dualEntries) {
    if (!entry) continue;
    if (entry.output) {
      paths.set(docType, resolve(base, entry.output));
    } else if (entry.system_output) {
      // Use system_output dir as representative path for split docs
      paths.set(docType, resolve(base, entry.system_output));
    }
  }

  return paths;
}

/** Get git last-modified date for a file path. Returns ISO string or null. */
async function gitLastModified(repoRoot: string, filePath: string): Promise<string | null> {
  try {
    const { simpleGit } = await import("simple-git");
    const git = simpleGit(repoRoot);
    const log = await git.log({ file: filePath, maxCount: 1, format: { date: "%aI" } });
    return log.latest?.date ?? null;
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

    // Cache git dates to avoid repeated lookups
    const dateCache = new Map<string, string | null>();
    async function getDate(docType: string): Promise<string | null> {
      if (dateCache.has(docType)) return dateCache.get(docType) ?? null;
      const path = docPaths.get(docType);
      if (!path) { dateCache.set(docType, null); return null; }
      const date = await gitLastModified(repoRoot, path);
      dateCache.set(docType, date);
      return date;
    }

    for (const [upstream, downstream] of CHAIN_PAIRS) {
      if (!docPaths.has(upstream) || !docPaths.has(downstream)) continue;

      const upDate = await getDate(upstream);
      const downDate = await getDate(downstream);
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
    const downDate = await gitLastModified(repoRoot, downPath);
    if (!downDate) return [];

    for (const [upstream] of relevantPairs) {
      const upPath = docPaths.get(upstream);
      if (!upPath) continue;
      const upDate = await gitLastModified(repoRoot, upPath);
      if (!upDate) continue;

      if (new Date(upDate).getTime() > new Date(downDate).getTime()) {
        warnings.push({
          upstream,
          downstream: docType,
          upstreamModified: upDate,
          downstreamModified: downDate,
          message: `${upstream} (${upDate}) is newer than ${docType} (${downDate})`,
        });
      }
    }

    return warnings;
  } catch (err) {
    logger.warn({ err }, "Doc staleness check failed — returning empty");
    return [];
  }
}
