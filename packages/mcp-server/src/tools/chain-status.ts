/**
 * get_chain_status MCP tool — reads sekkei.config.yaml and returns document chain progress.
 */
import { z } from "zod";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger.js";
import { readDocumentFrontmatter } from "../lib/frontmatter-reader.js";
import { LIFECYCLE_LABELS } from "../types/documents.js";

async function fileExists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

const inputSchema = {
  config_path: z.string()
    .refine((p) => /\.ya?ml$/i.test(p), { message: "config_path must be a .yaml or .yml file" })
    .describe("Path to sekkei.config.yaml"),
};

interface ChainStatusEntry {
  doc_type: string;
  status: string;
  output?: string;
  lifecycle?: string;
  version?: string;
}

export function registerChainStatusTool(server: McpServer): void {
  server.tool(
    "get_chain_status",
    "Get document chain progress from sekkei.config.yaml",
    inputSchema,
    async ({ config_path }) => {
      logger.info({ config_path }, "Reading chain status");

      let raw: string;
      try {
        raw = await readFile(config_path, "utf-8");
      } catch (err: unknown) {
        const isNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
        const message = isNotFound
          ? `Config not found: ${config_path}`
          : "Failed to read config file";
        logger.error({ err, config_path }, "get_chain_status failed");
        return {
          content: [{ type: "text", text: `[CONFIG_ERROR] ${message}` }],
          isError: true,
        };
      }

      if (raw.length > 100_000) {
        return {
          content: [{ type: "text", text: "[CONFIG_ERROR] Config file too large (>100KB)" }],
          isError: true,
        };
      }

      const config = parseYaml(raw);
      if (!config?.chain || typeof config.chain !== "object") {
        return {
          content: [{ type: "text", text: "[CONFIG_ERROR] No chain section in config" }],
          isError: true,
        };
      }

      const entries: ChainStatusEntry[] = [];
      const chain = config.chain as Record<string, unknown>;

      const configDir = dirname(config_path);

      // RFP is a string path, not a ChainEntry
      if (typeof chain.rfp === "string" && chain.rfp) {
        entries.push({ doc_type: "rfp", status: "provided", output: chain.rfp });
      } else {
        entries.push({ doc_type: "rfp", status: "missing" });
      }

      // Remaining chain entries
      const docKeys = [
        "overview",
        "functions_list", "requirements", "basic_design",
        "detail_design", "test_spec",
        "operation_design", "migration_design", "glossary",
      ];
      for (const key of docKeys) {
        const entry = chain[key] as {
          status?: string;
          output?: string;
          system_output?: string;
          features_output?: string;
          global_output?: string;
        } | undefined;

        const outputStr = entry?.output
          ?? (entry?.system_output
            ? `system: ${entry.system_output}, features: ${entry.features_output ?? "-"}`
            : undefined)
          ?? entry?.global_output;

        // Read lifecycle/version from output file frontmatter when available
        let lifecycle: string | undefined;
        let version: string | undefined;
        if (entry?.output) {
          const outputPath = join(configDir, entry.output);
          const meta = await readDocumentFrontmatter(outputPath);
          if (meta.status) lifecycle = LIFECYCLE_LABELS[meta.status] ?? meta.status;
          if (meta.version) version = meta.version;
        }

        entries.push({
          doc_type: key.replace(/_/g, "-"),
          status: entry?.status ?? "pending",
          output: outputStr,
          lifecycle,
          version,
        });
      }

      const lines: string[] = [
        `# Document Chain Status`,
        ``,
        `**Project:** ${config.project?.name ?? "Unknown"}`,
        ``,
        `| Document | Chain Status | Lifecycle | Version | Output |`,
        `|----------|-------------|-----------|---------|--------|`,
      ];

      for (const e of entries) {
        const icon = e.status === "complete" ? "✅" : e.status === "in-progress" ? "🔄" : e.status === "provided" ? "📄" : "⏳";
        lines.push(`| ${e.doc_type} | ${icon} ${e.status} | ${e.lifecycle ?? "-"} | ${e.version ?? "-"} | ${e.output ?? "-"} |`);
      }

      // Feature status table — discover from filesystem at runtime
      const outputDir = config.output?.directory
        ? join(configDir, config.output.directory)
        : configDir;
      const featuresDir = join(outputDir, "05-features");
      try {
        const entries = await readdir(featuresDir, { withFileTypes: true });
        const featureDirs = entries.filter(e => e.isDirectory() && e.name !== "." && e.name !== "..").map(e => e.name);
        if (featureDirs.length > 0) {
          lines.push(``, `## Feature Status`, ``);
          lines.push(`| Feature | basic-design | detail-design | test-spec |`);
          lines.push(`|---------|-------------|---------------|-----------|`);
          for (const name of featureDirs.sort()) {
            const hasBD = await fileExists(join(featuresDir, name, "basic-design.md"));
            const hasDD = await fileExists(join(featuresDir, name, "detail-design.md"));
            const hasTS = await fileExists(join(featuresDir, name, "test-spec.md"));
            lines.push(`| ${name} | ${hasBD ? "✅" : "⏳"} | ${hasDD ? "✅" : "⏳"} | ${hasTS ? "✅" : "⏳"} |`);
          }
          lines.push(``, `_Run \`/sekkei:validate --structure\` for detailed validation._`);
        }
      } catch {
        // 05-features/ doesn't exist yet — skip feature table
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
