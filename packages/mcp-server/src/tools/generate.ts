/**
 * generate_document MCP tool — returns template + AI instructions + input context
 * for the skill layer to orchestrate actual document generation.
 */
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadTemplate } from "../lib/template-loader.js";
import { DOC_TYPES, LANGUAGES, INPUT_LANGUAGES, KEIGO_LEVELS, PROJECT_TYPES } from "../types/documents.js";
import type { DocType, ProjectType, ProjectConfig } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import {
  GENERATION_INSTRUCTIONS,
  KEIGO_MAP,
  buildBilingualInstructions,
  buildKeigoInstruction,
  buildOutputLanguageInstruction,
  formatGlossaryForContext,
} from "../lib/generation-instructions.js";
import { callPython } from "../lib/python-bridge.js";
import { extractAllIds } from "../lib/id-extractor.js";
import { resolveOutputPath } from "../lib/resolve-output-path.js";
import { autoCommit } from "../lib/git-committer.js";

const inputSchema = {
  doc_type: z.enum(DOC_TYPES).describe("Type of document to generate"),
  input_content: z.string().max(500_000).describe("RFP text or upstream document content"),
  project_name: z.string().optional().describe("Project name for document header"),
  language: z.enum(LANGUAGES).default("ja").describe("Output language: ja (Japanese), en (English), vi (Vietnamese)"),
  input_lang: z.enum(INPUT_LANGUAGES).default("ja").optional()
    .describe("Language of the input content. Output language is controlled by the language param."),
  keigo_override: z.enum(KEIGO_LEVELS).optional()
    .describe("Override default keigo level for this document type"),
  upstream_content: z.string().max(500_000).optional()
    .describe("Content of the upstream document in the V-model chain. IDs will be extracted and injected as constraints."),
  project_type: z.enum(PROJECT_TYPES).optional()
    .describe("Project type for conditional section instructions. Read from sekkei.config.yaml project.type."),
  feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
    .describe("Feature folder name (kebab-case) for split generation (e.g., sales-management)"),
  scope: z.enum(["shared", "feature"]).optional()
    .describe("Generation scope: shared sections or feature-specific"),
  output_path: z.string().max(500).optional()
    .describe("Path where the generated document will be saved — used for git auto-commit when autoCommit=true in sekkei.config.yaml"),
  config_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml — enables git auto-commit if autoCommit: true"),
};

/** Build upstream IDs injection block for cross-reference constraints */
function buildUpstreamIdsBlock(content: string): string {
  const ids = Array.from(extractAllIds(content)).sort();
  if (ids.length === 0) return "";
  return [
    "## Available Upstream IDs",
    "The following IDs exist in the upstream document.",
    "You MUST reference ONLY these IDs for cross-references. Do NOT invent new IDs.",
    "",
    ids.join(", "),
    "",
    "If a new ID is genuinely needed, add it as a NEW entry (increment the highest existing number).",
  ].join("\n");
}

/** Project-type-specific additional instructions (sparse) */
const PROJECT_TYPE_INSTRUCTIONS: Partial<Record<ProjectType, Partial<Record<DocType, string>>>> = {
  saas: {
    "basic-design": "## Project Type: SaaS\nInclude multi-tenant architecture section. Address tenant isolation strategy, billing integration points, subscription management.",
    requirements: "## Project Type: SaaS\nInclude SaaS-specific NFRs: multi-tenant data isolation, subscription tiers, API rate limiting.",
  },
  "internal-system": {
    "basic-design": "## Project Type: Internal System\nInclude migration design references (移行設計). Address legacy system interfaces, data migration approach.",
    requirements: "## Project Type: Internal System\nInclude operational requirements: batch schedule, help desk SLA, training plan.",
  },
  mobile: {
    "basic-design": "## Project Type: Mobile\nInclude screen transition diagram for all screens. Push notification spec. OS version support matrix.",
  },
  batch: {
    "basic-design": "## Project Type: Batch\nInclude ジョブスケジュール table: job-ID, trigger, frequency, dependency, timeout, retry policy.",
    "detail-design": "## Project Type: Batch\nFor each batch process: input/output file specs, error handling procedure, restart procedure.",
  },
  lp: {
    "basic-design": "## Project Type: Landing Page\nFocus on: page structure, conversion funnel, form spec, analytics/tracking integration.",
  },
};

function buildSplitInstructions(
  docType: DocType, scope: "shared" | "feature",
  featureName?: string
): string {
  const base = GENERATION_INSTRUCTIONS[docType];
  if (scope === "shared") {
    return [
      base,
      "",
      "## Split Mode: Shared Sections (03-system/)",
      "Generate ONLY system-wide shared sections.",
      "Focus: system-architecture, database-design, external-interface, non-functional, technology.",
      "Each section → separate file in 03-system/. Do NOT include feature-specific content.",
    ].join("\n");
  }
  const label = featureName ?? "unknown";
  return [
    base,
    "",
    `## Split Mode: Feature "${label}" (05-features/${featureName}/)`,
    `Generate ONLY sections specific to feature "${label}".`,
    "Focus: business-flow, screen-design, report-design, scoped functions.",
    "Reference 03-system/ sections by cross-reference only — do not duplicate.",
  ].join("\n");
}

export interface GenerateDocumentArgs {
  doc_type: DocType;
  input_content: string;
  project_name?: string;
  language?: "ja" | "en" | "vi";
  input_lang?: string;
  keigo_override?: string;
  upstream_content?: string;
  project_type?: ProjectType;
  feature_name?: string;
  scope?: "shared" | "feature";
  output_path?: string;
  config_path?: string;
  templateDir?: string;
  overrideDir?: string;
}

export async function handleGenerateDocument(
  args: GenerateDocumentArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { doc_type, input_content, project_name, language, input_lang, keigo_override,
    upstream_content, project_type, feature_name, scope, output_path, config_path,
    templateDir: tDir, overrideDir } = args;
  try {
    const { loadConfig } = await import("../config.js");
    const cfg = loadConfig();
    const resolvedTemplateDir = tDir ?? cfg.templateDir;
    const template = await loadTemplate(resolvedTemplateDir, doc_type, language ?? "ja", overrideDir);
    const instructions = scope
      ? buildSplitInstructions(doc_type, scope, feature_name)
      : GENERATION_INSTRUCTIONS[doc_type];
    const name = project_name ?? "Unnamed Project";

    const effectiveKeigo = keigo_override ?? KEIGO_MAP[doc_type];
    const keigoBlock = buildKeigoInstruction(effectiveKeigo as Parameters<typeof buildKeigoInstruction>[0]);

    const upstreamIdsBlock = upstream_content
      ? buildUpstreamIdsBlock(upstream_content as string)
      : "";

    const projectTypeBlock = project_type
      ? (PROJECT_TYPE_INSTRUCTIONS[project_type as ProjectType]?.[doc_type] ?? "")
      : "";

    logger.info({ doc_type, language, input_lang, keigo: effectiveKeigo, project_type, project_name: name, scope, feature_name }, "Generating document context");

    let bilingualBlock = "";
    if (input_lang && input_lang !== "ja") {
      let glossaryTerms = "";
      try {
        const result = await callPython("glossary", { action: "list" });
        glossaryTerms = formatGlossaryForContext(result);
      } catch {
        logger.warn("Glossary load failed, proceeding without terms");
      }
      bilingualBlock = buildBilingualInstructions(input_lang as Parameters<typeof buildBilingualInstructions>[0], glossaryTerms);
    }

    const outputLangBlock = buildOutputLanguageInstruction(language ?? "ja");

    const sections = [
      `# Document Generation Context`,
      ``,
      `**Type:** ${doc_type}`,
      `**Project:** ${name}`,
      `**Language:** ${language}`,
      ...(input_lang && input_lang !== "ja" ? [`**Input Language:** ${input_lang}`] : []),
      ``,
      `## AI Instructions`,
      ``,
      instructions,
      ``,
      keigoBlock,
    ];

    sections.push(``, outputLangBlock);

    if (bilingualBlock) {
      sections.push(``, bilingualBlock);
    }

    if (projectTypeBlock) {
      sections.push(``, projectTypeBlock);
    }

    if (upstreamIdsBlock) {
      sections.push(``, upstreamIdsBlock);
    }

    sections.push(
      ``,
      `## Template`,
      ``,
      template.content,
      ``,
      `## Input Content`,
      ``,
      input_content,
    );

    const output = sections.join("\n");

    const suggestedPath = resolveOutputPath(doc_type, scope, feature_name);
    const isFeatureDoc = scope === "feature" && feature_name;
    const pathNote = suggestedPath
      ? [
          ``,
          `## Output Path`,
          ``,
          `Save to: \`{output.directory}/${suggestedPath}\``,
          ...(isFeatureDoc ? [
            ``,
            `After saving, regenerate \`05-features/${feature_name}/index.md\` to reflect updated status.`,
          ] : []),
        ].join("\n")
      : "";

    const finalOutput = output + pathNote;

    if (output_path && config_path) {
      try {
        const raw = await readFile(config_path, "utf-8");
        const projectCfg = parseYaml(raw) as ProjectConfig;
        if (projectCfg?.autoCommit === true) {
          await autoCommit(output_path, doc_type);
        }
      } catch (err) {
        logger.warn({ err, config_path }, "git auto-commit config read failed — skipping");
      }
    }

    return {
      content: [{ type: "text", text: finalOutput }],
    };
  } catch (err) {
    const message =
      err instanceof SekkeiError ? err.toClientMessage() : "Document generation failed";
    logger.error({ err, doc_type }, "generate_document failed");
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}

export function registerGenerateDocumentTool(server: McpServer, templateDir: string, overrideDir?: string): void {
  server.tool(
    "generate_document",
    "Generate a Japanese specification document using template + AI instructions",
    inputSchema,
    async ({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, project_type, feature_name, scope, output_path, config_path }) => {
      return handleGenerateDocument({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, project_type, feature_name, scope, output_path, config_path, templateDir, overrideDir });
    }
  );
}
