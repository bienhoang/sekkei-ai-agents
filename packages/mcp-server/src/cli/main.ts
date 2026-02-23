/**
 * Sekkei CLI root — citty defineCommand with subcommands.
 * Entry point: bin/cli.js → dist/cli/main.js
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import { generateCommand } from "./commands/generate.js";
import { validateCommand } from "./commands/validate.js";
import { exportCommand } from "./commands/export-cmd.js";
import { statusCommand } from "./commands/status.js";
import { glossaryCommand } from "./commands/glossary.js";
import { watchCommand } from "./commands/watch.js";
import { versionCommand } from "./commands/version.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { updateCommand } from "./commands/update.js";

const __cli_dirname = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(readFileSync(resolve(__cli_dirname, "..", "..", "package.json"), "utf-8"));

const main = defineCommand({
  meta: {
    name: "sekkei",
    version: pkgJson.version,
    description: "Sekkei — AI Documentation Agent CLI for Japanese V-model spec documents",
  },
  subCommands: {
    generate: generateCommand,
    validate: validateCommand,
    export: exportCommand,
    status: statusCommand,
    glossary: glossaryCommand,
    watch: watchCommand,
    version: versionCommand,
    uninstall: uninstallCommand,
    update: updateCommand,
  },
});

runMain(main);
