/**
 * Migrate sekkei.config.yaml from v1 (overview + test-spec) to v2.0 chain structure.
 * Pure function — no I/O. Operates on YAML string content.
 * Also: migrateConfigKeys for underscore→hyphen chain key migration.
 */
import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * Migrate v1 config to v2.0 format.
 * - Removes `overview` from chain
 * - Removes `test_spec` and creates ut_spec/it_spec/st_spec/uat_spec
 * - Adds missing new chain entries with pending status
 * - Moves `requirements.output` from flat to nested path
 * - Idempotent: running twice produces same result
 */
export function migrateConfig(yamlContent: string): string {
  const config = parseYaml(yamlContent) as Record<string, unknown>;
  if (!config?.chain || typeof config.chain !== "object") {
    return yamlContent; // No chain section — nothing to migrate
  }

  const chain = config.chain as Record<string, unknown>;

  // Detect if already v2.0 (has ut_spec or no overview/test_spec)
  const hasOldFormat = "overview" in chain || "test_spec" in chain;
  if (!hasOldFormat && "ut_spec" in chain) {
    return yamlContent; // Already v2.0
  }

  // Remove overview
  delete chain.overview;

  // Split test_spec into 4 individual test specs
  const testSpec = chain.test_spec as Record<string, unknown> | undefined;
  if (testSpec) {
    const baseStatus = testSpec.status ?? "pending";
    if (!chain.ut_spec)  chain.ut_spec  = { status: baseStatus, output: "08-test/ut-spec.md" };
    if (!chain.it_spec)  chain.it_spec  = { status: baseStatus, output: "08-test/it-spec.md" };
    if (!chain.st_spec)  chain.st_spec  = { status: baseStatus, output: "08-test/st-spec.md" };
    if (!chain.uat_spec) chain.uat_spec = { status: baseStatus, output: "08-test/uat-spec.md" };
    delete chain.test_spec;
  }

  // Add missing new entries
  if (!chain.nfr)             chain.nfr             = { status: "pending", output: "02-requirements/nfr.md" };
  if (!chain.project_plan)    chain.project_plan    = { status: "pending", output: "02-requirements/project-plan.md" };
  if (!chain.security_design) chain.security_design = { status: "pending", output: "03-system/security-design.md" };
  if (!chain.test_plan)       chain.test_plan       = { status: "pending", output: "08-test/test-plan.md" };

  // Migrate requirements path: 02-requirements.md → 02-requirements/requirements.md
  const req = chain.requirements as Record<string, unknown> | undefined;
  if (req?.output === "02-requirements.md") {
    req.output = "02-requirements/requirements.md";
  }

  // Reorder chain keys for v2.0
  const orderedChain: Record<string, unknown> = {};
  const keyOrder = [
    "rfp", "requirements", "nfr", "functions_list", "project_plan",
    "basic_design", "security_design", "detail_design",
    "test_plan", "ut_spec", "it_spec", "st_spec", "uat_spec",
    "migration_design", "operation_design", "glossary",
  ];
  for (const key of keyOrder) {
    if (chain[key] !== undefined) orderedChain[key] = chain[key];
  }
  // Preserve any unknown keys
  for (const key of Object.keys(chain)) {
    if (!(key in orderedChain)) orderedChain[key] = chain[key];
  }
  config.chain = orderedChain;

  return stringifyYaml(config, { lineWidth: 120 });
}

export interface MigrationResult {
  migrated: string[];
  skipped: string[];
  warnings: string[];
}

/**
 * Migrate underscore chain keys to hyphen equivalents in sekkei.config.yaml.
 * Idempotent: running twice produces same result.
 * Warning: YAML comments will be lost due to stringify round-trip.
 */
export async function migrateConfigKeys(configPath: string): Promise<MigrationResult> {
  const raw = await readFile(configPath, "utf-8");
  const config = parseYaml(raw) as Record<string, unknown>;
  const chain = (config.chain ?? {}) as Record<string, unknown>;

  const migrated: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [
    "YAML comments will be lost during migration (yaml.stringify round-trip). Back up your config first.",
  ];

  const keysToDelete: string[] = [];
  for (const key of Object.keys(chain)) {
    if (key.includes("_")) {
      const hyphenKey = key.replace(/_/g, "-");
      if (chain[hyphenKey] !== undefined) {
        skipped.push(key);
      } else {
        chain[hyphenKey] = chain[key];
        keysToDelete.push(key);
        migrated.push(`${key} → ${hyphenKey}`);
      }
    }
  }
  for (const key of keysToDelete) {
    delete chain[key];
  }

  if (migrated.length > 0) {
    config.chain = chain;
    await writeFile(configPath, stringifyYaml(config, { lineWidth: 120 }), "utf-8");
  }

  return { migrated, skipped, warnings };
}
