/**
 * generate_document MCP tool — returns template + AI instructions + input context
 * for the skill layer to orchestrate actual document generation.
 */
import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadTemplate } from "../lib/template-loader.js";
import { DOC_TYPES, LANGUAGES, INPUT_LANGUAGES, KEIGO_LEVELS, PROJECT_TYPES } from "../types/documents.js";
import type { DocType, ProjectType, ProjectConfig } from "../types/documents.js";
import { SekkeiError } from "../lib/errors.js";
import { isSubPath } from "../lib/platform.js";
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
import { extractAllIds, extractIds } from "../lib/id-extractor.js";
import { estimateOutputTokens, formatAdvisory } from "../lib/token-budget-estimator.js";
import { resolveOutputPath } from "../lib/resolve-output-path.js";
import { autoCommit } from "../lib/git-committer.js";
import { appendGlobalChangelog, extractVersionFromContent, incrementVersion } from "../lib/changelog-manager.js";
import { PROJECT_TYPE_INSTRUCTIONS } from "../lib/project-type-instructions.js";

/** Cache for server-side upstream extraction briefs (5-min TTL) */
const upstreamBriefCache = new Map<string, { brief: string; expires: number }>();

const inputSchema = {
  doc_type: z.enum(DOC_TYPES).describe("Type of document to generate"),
  input_content: z.string().max(500_000).describe("RFP text or upstream document content"),
  project_name: z.string().optional().describe("Project name for document header"),
  language: z.enum(LANGUAGES).default("ja").describe("Output language: ja, en, or vi"),
  input_lang: z.enum(INPUT_LANGUAGES).default("ja").optional()
    .describe("Language of the input content"),
  keigo_override: z.enum(KEIGO_LEVELS).optional()
    .describe("Override default keigo level for this doc type"),
  upstream_content: z.string().max(500_000).optional()
    .describe("Upstream V-model document; IDs extracted as constraints"),
  upstream_paths: z.array(z.string().max(500).refine((p) => !p.includes(".."), { message: "upstream path must not contain '..'" })).max(5).optional()
    .describe("Upstream doc paths for server-side ID extraction"),
  project_type: z.enum(PROJECT_TYPES).optional()
    .describe("Project type for conditional section instructions"),
  feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
    .describe("Feature folder name (kebab-case) for split generation"),
  scope: z.enum(["shared", "feature"]).optional()
    .describe("Split scope: shared system sections or feature-specific sections"),
  output_path: z.string().max(500).optional()
    .describe("Suggested output path; auto-derived from doc_type if omitted"),
  config_path: z.string().max(500).optional()
    .refine((p) => !p || !p.includes(".."), { message: "config_path must not contain .." })
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml for project settings"),
  source_code_path: z.string().max(500).optional()
    .refine((p) => !p || !p.includes(".."), { message: "Path must not contain .." })
    .describe("TypeScript source directory for code-aware generation"),
  include_confidence: z.boolean().optional()
    .describe("Include AI confidence annotations 高/中/低 per section"),
  include_traceability: z.boolean().optional()
    .describe("Include source traceability annotations per paragraph"),
  ticket_ids: z.array(z.string().max(50)).max(20).optional()
    .describe("Ticket IDs (e.g. PROJ-123) to cross-reference in output"),
  existing_content: z.string().max(500_000).optional()
    .describe("Existing document content; preserves 改訂履歴 on regen"),
  auto_insert_changelog: z.boolean().default(false).optional()
    .describe("Auto-insert new 改訂履歴 row; requires existing_content"),
  change_description: z.string().max(200).optional()
    .describe("Description for auto-inserted 改訂履歴 row"),
  append_mode: z.boolean().default(false).optional()
    .describe("Append to existing doc, preserving existing IDs"),
  input_sources: z.array(z.object({
    name: z.string().max(100).describe("Source name (e.g. 'Business Team')"),
    content: z.string().max(200_000).describe("Content from this source"),
  })).max(10).optional()
    .describe("Multiple sources; tagged by origin in 出典 column"),
  post_actions: z.array(z.enum(["update_chain_status"])).max(1).optional()
    .describe("Server-side actions to run after building generation context"),
  template_mode: z.enum(["full", "skeleton"]).default("full").optional()
    .describe("Template mode: full content or skeleton (headings only)"),
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

const MAX_UPSTREAM_IDS = 50;

/** Build upstream IDs injection block for cross-reference constraints */
function buildUpstreamIdsBlock(content: string): string {
  const allIds = Array.from(extractAllIds(content));
  if (allIds.length === 0) return "";

  // Group by ID type prefix for relevance ordering
  const priority = ["REQ", "F", "NFR", "SCR", "TBL", "API", "CLS", "SEC"];
  const grouped: string[] = [];
  const used = new Set<string>();
  for (const prefix of priority) {
    const group = allIds.filter(id => id.startsWith(prefix + "-") && !used.has(id));
    group.forEach(id => used.add(id));
    grouped.push(...group.sort());
  }
  // Remaining IDs not matched by priority prefixes
  allIds.filter(id => !used.has(id)).sort().forEach(id => grouped.push(id));

  let ids = grouped;
  let truncNote = "";
  if (ids.length > MAX_UPSTREAM_IDS) {
    logger.warn({ total: ids.length, capped: MAX_UPSTREAM_IDS }, "upstream IDs truncated to cap");
    ids = ids.slice(0, MAX_UPSTREAM_IDS);
    truncNote = `\n_(${grouped.length - MAX_UPSTREAM_IDS} additional IDs omitted)_\n`;
  }

  const items = ids.map(id => `- [ ] ${id}`).join("\n");

  return [
    "## Upstream Cross-Reference Checklist",
    "Each ID below MUST appear at least once in the generated document body:",
    items,
    truncNote,
    "After generating, verify all checkboxes would be ticked by a reader.",
  ].join("\n");
}

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
  const prefix = featureName ? featureName.split("-").map(w => w[0]?.toUpperCase()).join("") : "UNK";
  return [
    base,
    "",
    `## Split Mode: Feature "${label}" (05-features/${featureName}/)`,
    `Generate ONLY sections specific to feature "${label}".`,
    "Focus: business-flow, screen-design, report-design, scoped functions.",
    "Reference 03-system/ sections by cross-reference only — do not duplicate.",
    "",
    `## Feature-Scoped ID Rules (MANDATORY)`,
    `Screen IDs: SCR-${prefix}-001, SCR-${prefix}-002... (feature prefix prevents collision).`,
    `Report IDs: RPT-${prefix}-001, RPT-${prefix}-002...`,
    `Class IDs: CLS-${prefix}-001, CLS-${prefix}-002... (feature prefix prevents collision).`,
    `Design IDs: DD-${prefix}-001, DD-${prefix}-002...`,
    `Use sequential numbering within this feature scope only.`,
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
  upstream_paths?: string[];
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
  post_actions?: Array<"update_chain_status">;
  template_mode?: "full" | "skeleton";
  templateDir?: string;
  overrideDir?: string;
}

export async function handleGenerateDocument(
  args: GenerateDocumentArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { doc_type, input_content, project_name, language, input_lang, keigo_override,
    upstream_content, upstream_paths, project_type, feature_name, scope, output_path, config_path,
    source_code_path, include_confidence, include_traceability, ticket_ids,
    existing_content, auto_insert_changelog, change_description,
    append_mode, input_sources, post_actions, template_mode,
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

    // Single config read (Phase 03: dedup)
    let projectCfg: ProjectConfig | null = null;
    if (config_path) {
      try {
        projectCfg = parseYaml(await readFile(config_path, "utf-8")) as ProjectConfig;
      } catch { /* config optional */ }
    }

    // Single staleness check (Phase 03: dedup)
    let stalenessWarnings: Array<{ upstream: string; upstreamModified: string; message: string }> = [];
    if (existing_content && config_path) {
      try {
        const { checkDocStaleness } = await import("../lib/doc-staleness.js");
        stalenessWarnings = await checkDocStaleness(config_path, doc_type);
      } catch { /* non-blocking */ }
    }

    // Server-side upstream extraction (Phase 04)
    let serverUpstreamBlock = "";
    if (upstream_paths && upstream_paths.length > 0 && !projectCfg) {
      logger.warn({ upstream_paths }, "upstream_paths provided but config_path missing — extraction requires config for path resolution");
    }
    if (upstream_paths && upstream_paths.length > 0 && projectCfg) {
      try {
        const { extractUpstreamItems, formatUpstreamContext } = await import("../lib/upstream-extractor.js");
        const { deriveUpstreamIdTypes } = await import("../lib/cross-ref-linker.js");
        const outputDir = (projectCfg as any)?.output?.directory as string | undefined;
        const workspaceRoot = dirname(config_path!);
        const baseDir = outputDir ? resolve(workspaceRoot, outputDir) : workspaceRoot;

        const prefixes = deriveUpstreamIdTypes(doc_type);
        if (prefixes.length === 0) {
          prefixes.push("REQ", "F", "NFR");
        }

        const allItems: import("../lib/upstream-extractor.js").UpstreamItem[] = [];

        // Build cache key from paths + mtimes
        const mtimes: number[] = [];
        const resolvedPaths: string[] = [];
        for (const p of upstream_paths) {
          const abs = resolve(baseDir, p);
          // Path containment security check
          if (!isSubPath(abs, baseDir)) {
            logger.warn({ path: p, baseDir }, "upstream_paths: path outside workspace, skipping");
            continue;
          }
          resolvedPaths.push(abs);
          try {
            const s = await stat(abs);
            mtimes.push(s.mtimeMs);
          } catch {
            mtimes.push(0);
          }
        }

        const cacheKey = resolvedPaths.join("|") + "|" + mtimes.join("|");
        const cached = upstreamBriefCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
          serverUpstreamBlock = cached.brief;
        } else {
          for (const abs of resolvedPaths) {
            try {
              const fileContent = await readFile(abs, "utf-8");
              const docName = abs.split(sep).slice(-2).join("/");
              allItems.push(...extractUpstreamItems(fileContent, prefixes, docName));
            } catch (err) {
              logger.warn({ err, path: abs }, "upstream_paths: failed to read file, skipping");
            }
          }

          const brief = formatUpstreamContext(allItems);
          if (brief) {
            serverUpstreamBlock = `## Upstream Reference\n${brief}`;
            upstreamBriefCache.set(cacheKey, { brief: serverUpstreamBlock, expires: Date.now() + 300_000 });
          }
        }
      } catch (err) {
        logger.warn({ err }, "upstream_paths extraction failed — falling back to upstream_content");
      }
    }

    const instructions = scope
      ? buildSplitInstructions(doc_type, scope, feature_name)
      : GENERATION_INSTRUCTIONS[doc_type];
    const name = project_name ?? "Unnamed Project";

    // Priority chain: tool input param → template frontmatter → hardcoded default
    const effectiveKeigo = keigo_override ?? template.metadata.keigo ?? KEIGO_MAP[doc_type];
    // Skip keigo block when it matches the template-declared default (Phase 02: consolidation)
    const keigoBlock = (effectiveKeigo === template.metadata.keigo)
      ? ""
      : buildKeigoInstruction(effectiveKeigo as Parameters<typeof buildKeigoInstruction>[0]);

    // upstream_paths takes priority over upstream_content (Phase 04)
    const upstreamIdsBlock = serverUpstreamBlock
      ? serverUpstreamBlock
      : upstream_content
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

    const effectiveLang = language ?? "ja";
    // Skip output lang block when it matches the template-declared default (Phase 02: consolidation)
    const outputLangBlock = (effectiveLang === template.metadata.output_language)
      ? ""
      : buildOutputLanguageInstruction(effectiveLang);

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
      ...(keigoBlock ? [``, keigoBlock] : []),
    ];

    if (outputLangBlock) {
      sections.push(``, outputLangBlock);
    }

    if (bilingualBlock) {
      sections.push(``, bilingualBlock);
    }

    if (projectTypeBlock) {
      sections.push(``, projectTypeBlock);
    }

    if (upstreamIdsBlock) {
      sections.push(``, upstreamIdsBlock);
    }

    // Token budget advisory: estimate output size from entity counts
    const upstreamForEstimation = upstream_content ?? "";
    if (upstreamForEstimation) {
      const idMap = extractIds(upstreamForEstimation);
      const entityCounts: Record<string, number> = {};
      for (const [prefix, ids] of idMap) entityCounts[prefix] = ids.length;
      const budgetResult = estimateOutputTokens(doc_type, entityCounts);
      if (budgetResult.estimated_tokens > 16000) {
        sections.push(``, formatAdvisory(budgetResult));
      }
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

    // Trust features: confidence and traceability annotations
    // Priority chain: tool input param → template frontmatter → default (true)
    // Skip separate blocks when instructions already contain inline annotation rules (Phase 02: consolidation)
    const instrHasAnnotations = instructions.includes("Confidence:") && instructions.includes("Traceability:");
    const shouldConfidence = include_confidence ?? template.metadata.include_confidence ?? true;
    const shouldTraceability = include_traceability ?? template.metadata.include_traceability ?? true;
    if (shouldConfidence && !instrHasAnnotations) {
      if (include_confidence !== true) {
        logger.warn("confidence block injected by default — will require explicit include_confidence=true in next major version");
      }
      sections.push(``, buildConfidenceInstruction());
    }
    if (shouldTraceability && !instrHasAnnotations) {
      if (include_traceability !== true) {
        logger.warn("traceability block injected by default — will require explicit include_traceability=true in next major version");
      }
      sections.push(``, buildTraceabilityInstruction());
    }

    // Pre-generate advisory: check if upstream docs changed since last generation
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

    // Auto-insert 改訂履歴 row when requested
    let effectiveExistingContent = existing_content;
    let insertedVersion: string | undefined;
    if (auto_insert_changelog && existing_content) {
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
    if (projectCfg) {
      if (projectCfg.learning_mode === true) {
        sections.push(``, buildLearningInstruction());
      }
      // Extra columns for functions-list
      const extraCols = (projectCfg as unknown as Record<string, unknown>)?.functions_list as { extra_columns?: string[] } | undefined;
      if (doc_type === "functions-list" && extraCols?.extra_columns?.length) {
        sections.push(``, `## Extra Columns`, `Include these additional columns after 備考: ${extraCols.extra_columns.join(", ")}`);
      }
    }

    // Template injection: full content or skeleton (headings only) mode
    if (template_mode === "skeleton") {
      const skeleton = template.content.split("\n")
        .filter(line => /^#{1,4}\s/.test(line))
        .join("\n");
      sections.push(``, `## Template (skeleton)`, ``, skeleton);
    } else {
      sections.push(``, `## Template`, ``, template.content);
    }

    sections.push(
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

    if (output_path && projectCfg?.autoCommit === true) {
      try {
        await autoCommit(output_path, doc_type);
      } catch (err) {
        logger.warn({ err, config_path }, "git auto-commit failed — skipping");
      }
    }

    // Global changelog: append entry when regenerating existing document
    if (effectiveExistingContent && config_path) {
      try {
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
    if (projectCfg?.autoValidate && stalenessWarnings.length > 0) {
      const advisory = stalenessWarnings.map(w => `- ${w.message}`).join("\n");
      advisoryOutput += `\n\n---\n**Staleness Advisory (自動チェック):**\n${advisory}`;
    }

    // Post-actions: run server-side after generation context is built (Phase 06)
    const postResults: string[] = [];
    if (post_actions?.includes("update_chain_status") && config_path && suggestedPath) {
      try {
        const { handleUpdateChainStatus } = await import("./update-chain-status.js");
        const chainDocType = doc_type.replace(/-/g, "_");
        const result = await handleUpdateChainStatus({
          config_path,
          doc_type: chainDocType,
          status: "complete",
          output: suggestedPath,
        });
        const resultText = result.content[0]?.text ?? "";
        postResults.push(result.isError ? `⚠ Chain status: ${resultText}` : `✓ ${resultText}`);
      } catch (e) {
        postResults.push(`⚠ Chain status update failed: ${(e as Error).message}`);
      }
    }
    const postSection = postResults.length > 0
      ? `\n\n## Post-actions Results\n${postResults.join("\n")}`
      : "";

    return {
      content: [{ type: "text", text: advisoryOutput + postSection }],
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
    async ({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, upstream_paths, project_type, feature_name, scope, output_path, config_path, source_code_path, include_confidence, include_traceability, ticket_ids, existing_content, auto_insert_changelog, change_description, append_mode, input_sources, post_actions, template_mode }) => {
      return handleGenerateDocument({ doc_type, input_content, project_name, language, input_lang, keigo_override, upstream_content, upstream_paths, project_type, feature_name, scope, output_path, config_path, source_code_path, include_confidence, include_traceability, ticket_ids, existing_content, auto_insert_changelog, change_description, append_mode, input_sources, post_actions, template_mode, templateDir, overrideDir });
    }
  );
}
