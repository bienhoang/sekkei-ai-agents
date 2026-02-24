/**
 * CLI migrate command — migrate underscore chain keys to hyphen format.
 */
import { defineCommand } from "citty";
import { resolve } from "node:path";
import { migrateConfigKeys } from "../../lib/config-migrator.js";

export const migrateCommand = defineCommand({
  meta: { name: "migrate", description: "Migrate sekkei.config.yaml underscore keys to hyphen format" },
  args: {
    config: { type: "string", description: "Path to sekkei.config.yaml", default: "sekkei.config.yaml" },
  },
  async run({ args }) {
    const configPath = resolve(args.config);
    process.stderr.write("Migrating config keys (underscore → hyphen)...\n");

    const result = await migrateConfigKeys(configPath);

    for (const w of result.warnings) {
      process.stderr.write(`⚠️  ${w}\n`);
    }

    if (result.migrated.length === 0) {
      process.stderr.write("No keys to migrate — config already uses hyphen format.\n");
      return;
    }

    process.stderr.write(`✅ Migrated ${result.migrated.length} keys:\n`);
    for (const m of result.migrated) process.stderr.write(`  - ${m}\n`);
    if (result.skipped.length > 0) {
      process.stderr.write(`⏭️  Skipped ${result.skipped.length} (hyphen key already exists):\n`);
      for (const s of result.skipped) process.stderr.write(`  - ${s}\n`);
    }
  },
});
