/**
 * CLI status command — wraps handleChainStatus tool handler.
 */
import { defineCommand } from "citty";
import { handleChainStatus } from "../../tools/chain-status.js";

export const statusCommand = defineCommand({
  meta: { name: "status", description: "Show document chain progress from sekkei.config.yaml" },
  args: {
    config: { type: "string", description: "Path to sekkei.config.yaml", default: "sekkei.config.yaml" },
  },
  async run({ args }) {
    const result = await handleChainStatus({
      config_path: args.config as string,
    });
    if (result.isError) {
      process.stderr.write(result.content[0].text + "\n");
      process.exit(1);
    }
    process.stdout.write(result.content[0].text + "\n");
  },
});
