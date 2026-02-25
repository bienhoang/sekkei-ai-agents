/**
 * generate_document MCP tool — returns template + AI instructions + input context
 * for the skill layer to orchestrate actual document generation.
 */
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
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
  buildConfidenceInstruction,
  buildTraceabilityInstruction,
  buildLearningInstruction,
  buildChangelogPreservationInstruction,
} from "../lib/generation-instructions.js";
import { loadGlossary } from "../lib/glossary-native.js";
import { extractAllIds } from "../lib/id-extractor.js";
import { resolveOutputPath } from "../lib/resolve-output-path.js";
import { autoCommit } from "../lib/git-committer.js";
import { appendGlobalChangelog } from "../lib/changelog-manager.js";

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
    .refine((p) => !p || !p.includes(".."), { message: "config_path must not contain .." })
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml — enables git auto-commit if autoCommit: true"),
  source_code_path: z.string().max(500).optional()
    .refine((p) => !p || !p.includes(".."), { message: "Path must not contain .." })
    .describe("Path to source code directory for code-aware generation (TypeScript projects)"),
  include_confidence: z.boolean().default(true).optional()
    .describe("Include AI confidence annotations (高/中/低) per section (default: true)"),
  include_traceability: z.boolean().default(true).optional()
    .describe("Include source traceability annotations per paragraph (default: true)"),
  ticket_ids: z.array(z.string().max(50)).max(20).optional()
    .describe("Related ticket IDs (e.g., PROJ-123) to reference in the document"),
  existing_content: z.string().max(500_000).optional()
    .describe("Existing document content to preserve 改訂履歴 when regenerating"),
  auto_insert_changelog: z.boolean().default(false).optional()
    .describe("Auto-insert new 改訂履歴 row before preservation. Requires existing_content."),
  change_description: z.string().max(200).optional()
    .describe("Change description for auto-inserted 改訂履歴 row (default: 'Updated from upstream')"),
  append_mode: z.boolean().default(false).optional()
    .describe("Append new requirements to existing document. Requires existing_content. Preserves existing REQ-xxx/NFR-xxx IDs and adds new ones with next sequential ID."),
  input_sources: z.array(z.object({
    name: z.string().max(100).describe("Source name (e.g., 'Business Team', 'Compliance Team')"),
    content: z.string().max(200_000).describe("Content from this source"),
  })).max(10).optional()
    .describe("Multiple input sources. Each requirement will be tagged with its origin source in 出典 column."),
};

/** Extract existing 改訂履歴 section from document content */
export function extractRevisionHistory(content: string): string {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    if (/^#{1,4}\s+改訂履歴/.test(line)) {
      capturing = true;
      captured.push(line);
      continue;
    }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) captured.push(line);
  }
  return captured.join("\n").trim();
}

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
  government: {
    requirements: "## Project Type: Government\n法令要件セクションを追加: デジタル庁ガイドライン準拠, 監査要件, 政府セキュリティ要件を含めること",
  },
  finance: {
    requirements: "## Project Type: Finance\n金融庁ガイドライン, FISC安全対策基準への準拠を明記. 取引記録保存要件セクションを追加",
  },
  healthcare: {
    requirements: "## Project Type: Healthcare\n医療情報ガイドライン参照. HL7/FHIR連携要件を検討. 個人情報保護（医療特則）セクションを追加",
  },
};

/** Doc types that support split generation (scope param) */
const SPLIT_ALLOWED: ReadonlySet<DocType> = new Set([
  "basic-design", "detail-design", "ut-spec", "it-spec",
]);

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

/** Insert a new row at the end of the 改訂履歴 table */
export function insertChangelogRow(content: string, newRow: string): string {
  const lines = content.split("\n");
  let lastDataRowIdx = -1;
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s+改訂履歴/.test(lines[i])) { inSection = true; continue; }
    if (inSection && /^#{1,4}\s/.test(lines[i])) break;
    if (inSection && /^\|\s*v?\d+\.\d+\s*\|/.test(lines[i])) {
      lastDataRowIdx = i;
    }
  }
  if (lastDataRowIdx === -1) return content; // no table found
  lines.splice(lastDataRowIdx + 1, 0, newRow);
  return lines.join("\n");
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
  source_code_path?: string;
  include_confidence?: boolean;
  include_traceability?: boolean;
  ticket_ids?: string[];
  existing_content?: string;
  auto_insert_changelog?: boolean;
  change_description?: string;
  append_mode?: boolean;
  input_sources?: Array<{ name: string; content: string }>;
  templateDir?: string;
  overrideDir?: string;
}

export async function handleGenerateDocument(
  args: GenerateDocumentArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { doc_type, input_content, project_name, language, input_lang, keigo_override,
    upstream_content, project_type, feature_name, scope, output_path, config_path,
    source_code_path, include_confidence, include_traceability, ticket_ids,
    existing_content, auto_insert_changelog, change_description,
    append_mode, input_sources,
    templateDir: tDir, overrideDir } = args;
  if (scope && !SPLIT_ALLOWED.has(doc_type)) {
    return {
      content: [{ type: "text" as const, text: `Split mode (scope) not supported for ${doc_type}. Supported: ${[...SPLIT_ALLOWED].join(", ")}` }],
      isError: true,
    };
  }

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

    let codeContextBlock = "";
    if (source_code_path && (doc_type === "detail-design" || doc_type === "ut-spec")) {
      try {
        const { analyzeTypeScript } = await import("../lib/code-analyzer.js");
        const { formatCodeContext } = await import("../lib/code-context-formatter.js");
        const codeCtx = await analyzeTypeScript(source_code_path);
        codeContextBlock = formatCodeContext(codeCtx);
        logger.info({ fileCount: codeCtx.fileCount, classes: codeCtx.classes.length }, "Code analysis complete");
      } catch (err) {
        logger.warn({ err, source_code_path }, "Code analysis failed — proceeding without code context");
      }
    }

    const projectTypeBlock = project_type
      ? (PROJECT_TYPE_INSTRUCTIONS[project_type as ProjectType]?.[doc_type] ?? "")
      : "";

    logger.info({ doc_type, language, input_lang, keigo: effectiveKeigo, project_type, project_name: name, scope, feature_name }, "Generating document context");

    let bilingualBlock = "";
    if (input_lang && input_lang !== "ja") {
      let glossaryTerms = "";
      try {
        const glossary = loadGlossary("glossary.yaml");
        glossaryTerms = formatGlossaryForContext(glossary as unknown as Record<string, unknown>);
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

    if (append_mode) {
      sections.push(
        ``,
        `## Append Mode (MANDATORY)`,
        `Preserve ALL existing requirements exactly. Add new requirements with sequential IDs starting after the highest existing ID (e.g., if REQ-015 exists, new IDs start at REQ-016). Do NOT modify or remove any existing rows.`,
      );
    }

    if (input_sources && input_sources.length > 0) {
      const sourceNames = input_sources.map((s) => `"${s.name}"`).join(", ");
      sections.push(
        ``,
        `## Multiple Input Sources`,
        `Input is provided from ${input_sources.length} source(s): ${sourceNames}.`,
        `When multiple input sources are provided, tag each requirement's origin in the 出典 column with the source name.`,
        ``,
        ...input_sources.map((s) => `### Source: ${s.name}\n\n${s.content}`),
      );
    }

    if (codeContextBlock) {
      sections.push(``, codeContextBlock);
    }

    // Trust features: confidence and traceability annotations (default: on)
    if (include_confidence !== false) {
      sections.push(``, buildConfidenceInstruction());
    }
    if (include_traceability !== false) {
      sections.push(``, buildTraceabilityInstruction());
    }

    // Pre-generate advisory: check if upstream docs changed since last generation
    if (existing_content && config_path) {
      try {
        const { checkDocStaleness } = await import("../lib/doc-staleness.js");
        const stalenessWarnings = await checkDocStaleness(config_path, doc_type);
        if (stalenessWarnings.length > 0) {
          const advisory = [
            "## Advisory: Upstream Changes Detected",
            "",
            "The following upstream documents have changed since this document was last generated:",
            "",
            "| Upstream Doc | Modified |",
            "|-------------|----------|",
            ...stalenessWarnings.map(w => `| ${w.upstream} | ${w.upstreamModified} |`),
            "",
            "Consider updating upstream content before regeneration.",
          ];
          sections.push(``, advisory.join("\n"));
        }
      } catch { /* non-blocking */ }
    }

    // Auto-insert 改訂履歴 row when requested
    let effectiveExistingContent = existing_content;
    let insertedVersion: string | undefined;
    if (auto_insert_changelog && existing_content) {
      const { extractVersionFromContent, incrementVersion } = await import("../lib/changelog-manager.js");
      const oldVer = extractVersionFromContent(existing_content);
      insertedVersion = incrementVersion(oldVer);
      const today = new Date().toISOString().slice(0, 10);
      const desc = change_description ?? "Updated from upstream";
      const newRow = `| ${insertedVersion} | ${today} | ${desc} | |`;
      effectiveExistingContent = insertChangelogRow(existing_content, newRow);
    }

    // Changelog preservation: when regenerating, preserve existing 改訂履歴
    if (effectiveExistingContent) {
      const revisionHistory = extractRevisionHistory(effectiveExistingContent);
      if (revisionHistory) {
        sections.push(``, buildChangelogPreservationInstruction(revisionHistory));
      }
    }

    // Ticket linking
    if (ticket_ids && ticket_ids.length > 0) {
      sections.push(
        ``,
        `## Related Tickets`,
        `Include these ticket references in the document header and cross-reference them in requirements and acceptance criteria:`,
        ...ticket_ids.map((id) => `- ${id}`),
      );
    }

    // Config-driven features: learning mode, extra columns
    if (config_path) {
      try {
        const raw = await readFile(config_path, "utf-8");
        const projectCfg = parseYaml(raw) as ProjectConfig;
        if (projectCfg?.learning_mode === true) {
          sections.push(``, buildLearningInstruction());
        }
        // Extra columns for functions-list
        const extraCols = (projectCfg as unknown as Record<string, unknown>)?.functions_list as { extra_columns?: string[] } | undefined;
        if (doc_type === "functions-list" && extraCols?.extra_columns?.length) {
          sections.push(``, `## Extra Columns`, `Include these additional columns after 備考: ${extraCols.extra_columns.join(", ")}`);
        }
      } catch {
        // config read failed — skip config features
      }
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

    // Global changelog: append entry when regenerating existing document
    if (effectiveExistingContent && config_path) {
      try {
        const { extractVersionFromContent, incrementVersion } = await import("../lib/changelog-manager.js");
        const oldVersion = extractVersionFromContent(existing_content ?? "");
        const nextVersion = insertedVersion ?? incrementVersion(oldVersion);
        const workspacePath = dirname(config_path);
        await appendGlobalChangelog(workspacePath, {
          date: new Date().toISOString().slice(0, 10),
          docType: doc_type,
          version: nextVersion,
          changes: "Regenerated from upstream",
          author: "",
          crId: "",
        });
      } catch { /* non-blocking */ }
    }

    // Advisory staleness check — non-blocking
    let advisoryOutput = finalOutput;
    if (config_path) {
      try {
        const raw2 = await readFile(config_path, "utf-8");
        const cfg2 = parseYaml(raw2) as ProjectConfig;
        if (cfg2?.autoValidate) {
          const { checkDocStaleness } = await import("../lib/doc-staleness.js");
          const stale = await checkDocStaleness(config_path, doc_type);
          if (stale && stale.length > 0) {
            const advisory = stale.map(w => `- ${w.message}`).join("\n");
            advisoryOutput += `\n\n---\n**Staleness Advisory (自動チェック):**\n${advisory}`;
          }
        }
      } catch (e) {
        logger.warn({ err: e }, "auto-validate staleness check failed");
      }
    }

    return {
      content: [{ type: "text", text: advisoryOutput }],
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
    async ({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, project_type, feature_name, scope, output_path, config_path, source_code_path, include_confidence, include_traceability, ticket_ids, existing_content, auto_insert_changelog, change_description, append_mode, input_sources }) => {
      return handleGenerateDocument({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, project_type, feature_name, scope, output_path, config_path, source_code_path, include_confidence, include_traceability, ticket_ids, existing_content, auto_insert_changelog, change_description, append_mode, input_sources, templateDir, overrideDir });
    }
  );
}
