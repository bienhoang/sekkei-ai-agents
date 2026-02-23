/**
 * Sekkei CLI root — citty defineCommand with subcommands.
 * Entry point: bin/cli.js → dist/cli/main.js
 */
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

const main = defineCommand({
  meta: {
    name: "sekkei",
    version: "1.0.0",
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
