/**
 * CLI config loader — reads sekkei.config.yaml from project directory.
 */
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { resolve } from "node:path";

export interface CliConfig {
  project?: { name?: string; type?: string };
  chain?: Record<string, unknown>;
  output?: { directory?: string };
  autoCommit?: boolean;
}

export async function loadCliConfig(configPath?: string): Promise<CliConfig> {
  const path = resolve(configPath ?? "sekkei.config.yaml");
  const raw = await readFile(path, "utf-8");
  return parseYaml(raw) as CliConfig;
}
