/**
 * Sekkei CLI root — citty defineCommand with subcommands.
 * Entry point: bin/cli.js → dist/cli/main.js
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import { initCommand } from "./commands/init.js";
import { glossaryCommand } from "./commands/glossary.js";
import { versionCommand } from "./commands/version.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { updateCommand } from "./commands/update.js";
import { migrateCommand } from "./commands/migrate.js";
import { doctorCommand } from "./commands/doctor.js";

const __cli_dirname = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(readFileSync(resolve(__cli_dirname, "..", "..", "package.json"), "utf-8"));

const main = defineCommand({
  meta: {
    name: "sekkei",
    version: pkgJson.version,
    description: "Sekkei — AI Documentation Agent CLI for Japanese V-model spec documents",
  },
  subCommands: {
    init: initCommand,
    glossary: glossaryCommand,
    version: versionCommand,
    uninstall: uninstallCommand,
    update: updateCommand,
    migrate: migrateCommand,
    doctor: doctorCommand,
  },
});

runMain(main);
