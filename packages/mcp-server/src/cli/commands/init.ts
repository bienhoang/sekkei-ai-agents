/**
 * sekkei init — Delegates to the interactive init wizard (bin/init.js).
 */
import { defineCommand } from "citty";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __cmd_dirname = dirname(fileURLToPath(import.meta.url));
const initScript = resolve(__cmd_dirname, "..", "..", "..", "bin", "init.js");

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize Sekkei project config (interactive wizard)",
  },
  args: {
    "skip-deps": {
      type: "boolean",
      description: "Skip dependency installation",
      default: false,
    },
    preset: {
      type: "string",
      description: "Preset name (enterprise, startup, minimal)",
    },
  },
  run({ args }) {
    const argv: string[] = [initScript];
    if (args["skip-deps"]) argv.push("--skip-deps");
    if (args.preset) argv.push("--preset", args.preset);

    execFileSync(process.execPath, argv, { stdio: "inherit" });
  },
});
