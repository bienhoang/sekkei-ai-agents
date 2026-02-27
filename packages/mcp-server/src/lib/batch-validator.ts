/**
 * Batch validator: validates all documents listed in a sekkei config file
 * and computes an aggregate health score.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ProjectConfig, HealthScore } from "../types/documents.js";
import type { ValidationResult } from "./validator.js";
import { validateDocument } from "./validator.js";
import { computeHealthScore } from "./health-scorer.js";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

interface BatchValidationResult {
  results: { docType: string; result: ValidationResult }[];
  health: HealthScore;
}

/** Load and validate all documents referenced in the sekkei config */
export async function validateAllDocuments(configPath: string): Promise<BatchValidationResult> {
  if (configPath.includes("..")) {
    throw new SekkeiError("CONFIG_ERROR", "config_path must not contain '..'");
  }
  if (!/\.ya?ml$/i.test(configPath)) {
    throw new SekkeiError("CONFIG_ERROR", "config_path must end in .yaml or .yml");
  }

  const absConfig = resolve(configPath);
  let raw: string;
  try {
    raw = await readFile(absConfig, "utf-8");
  } catch {
    throw new SekkeiError("CONFIG_ERROR", `Cannot read config: ${configPath}`);
  }

  const config = parseYaml(raw) as ProjectConfig;
  const base = dirname(absConfig);
  const chain = config.chain;

  if (!chain) {
    return { results: [], health: { overall: 0, perDoc: [] } };
  }

  // Map of docType → output file path (single-file entries only)
  const singleEntries: [string, { output?: string } | undefined][] = [
    ["requirements", chain.requirements],
    ["nfr", chain.nfr],
    ["functions-list", chain.functions_list],
    ["project-plan", chain.project_plan],
    ["security-design", chain.security_design],
    ["test-plan", chain.test_plan],
    ["st-spec", chain.st_spec],
    ["uat-spec", chain.uat_spec],
    ["operation-design", chain.operation_design],
    ["migration-design", chain.migration_design],
  ];

  const results: { docType: string; result: ValidationResult }[] = [];

  for (const [docType, entry] of singleEntries) {
    if (!entry?.output) continue;

    let content: string;
    try {
      content = await readFile(resolve(base, entry.output), "utf-8");
    } catch {
      logger.warn({ docType, path: entry.output }, "Batch validate: doc file not found, skipping");
      continue;
    }

    try {
      const result = validateDocument(content, docType as Parameters<typeof validateDocument>[1]);
      results.push({ docType, result });
    } catch (err) {
      logger.warn({ docType, err }, "Batch validate: validation threw, recording as invalid");
      results.push({
        docType,
        result: {
          valid: false,
          issues: [{ type: "missing_section", message: String(err), severity: "error" }],
        },
      });
    }
  }

  const health = computeHealthScore(results);
  return { results, health };
}
