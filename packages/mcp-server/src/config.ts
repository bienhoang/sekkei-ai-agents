/**
 * Environment-based config loader for the MCP server.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerConfig {
  templateDir: string;
  templateOverrideDir?: string;
}

export function loadConfig(): ServerConfig {
  const templateDir =
    process.env.SEKKEI_TEMPLATE_DIR ||
    resolve(__dirname, "../templates");

  const templateOverrideDir = process.env.SEKKEI_TEMPLATE_OVERRIDE_DIR || undefined;

  return { templateDir, templateOverrideDir };
}
