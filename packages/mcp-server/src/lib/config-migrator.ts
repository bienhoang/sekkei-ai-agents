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

  // Add missing new entries (v2.0 full chain)
  if (!chain.nfr)                 chain.nfr                 = { status: "pending", output: "02-requirements/nfr.md" };
  if (!chain.project_plan)        chain.project_plan        = { status: "pending", output: "02-requirements/project-plan.md" };
  if (!chain.architecture_design) chain.architecture_design = { status: "pending", output: "03-system/architecture-design.md" };
  if (!chain.security_design)     chain.security_design     = { status: "pending", output: "03-system/security-design.md" };
  if (!chain.db_design)           chain.db_design           = { status: "pending", output: "03-system/db-design.md" };
  if (!chain.screen_design)       chain.screen_design       = { status: "pending", output: "09-ui/screen-design.md" };
  if (!chain.interface_spec)      chain.interface_spec      = { status: "pending", output: "09-ui/interface-spec.md" };
  if (!chain.report_design)       chain.report_design       = { status: "pending", output: "03-system/report-design.md" };
  if (!chain.batch_design)        chain.batch_design        = { status: "pending", output: "03-system/batch-design.md" };
  if (!chain.sitemap)             chain.sitemap             = { status: "pending", output: "03-system/sitemap.md" };
  if (!chain.test_plan)           chain.test_plan           = { status: "pending", output: "08-test/test-plan.md" };
  if (!chain.test_result_report)  chain.test_result_report  = { status: "pending", output: "08-test/test-result-report.md" };
  if (!chain.crud_matrix)         chain.crud_matrix         = { status: "pending", output: "03-system/crud-matrix.md" };
  if (!chain.traceability_matrix) chain.traceability_matrix = { status: "pending", output: "03-system/traceability-matrix.md" };
  if (!chain.test_evidence)       chain.test_evidence       = { status: "pending", output: "08-test/test-evidence.md" };
  if (!chain.meeting_minutes)     chain.meeting_minutes     = { status: "pending", output: "03-system/meeting-minutes.md" };
  if (!chain.decision_record)     chain.decision_record     = { status: "pending", output: "03-system/decision-record.md" };
  if (!chain.mockups)             chain.mockups             = { status: "pending", output: "11-mockups/" };

  // Migrate requirements path: 02-requirements.md → 02-requirements/requirements.md
  const req = chain.requirements as Record<string, unknown> | undefined;
  if (req?.output === "02-requirements.md") {
    req.output = "02-requirements/requirements.md";
  }

  // Reorder chain keys for v2.0
  const orderedChain: Record<string, unknown> = {};
  const keyOrder = [
    "rfp", "requirements", "nfr", "functions_list", "project_plan",
    "architecture_design", "basic_design", "security_design", "detail_design",
    "db_design", "screen_design", "interface_spec", "report_design", "batch_design", "sitemap",
    "test_plan", "ut_spec", "it_spec", "st_spec", "uat_spec", "test_result_report",
    "operation_design", "migration_design", "crud_matrix", "traceability_matrix",
    "glossary", "test_evidence", "meeting_minutes", "decision_record", "mockups",
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
