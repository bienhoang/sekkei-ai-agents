/**
 * Load Markdown templates from disk, parse YAML frontmatter.
 * Templates live in templates/{lang}/{doc-type}.md
 * Supports override directories for company customization and preset application.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { SekkeiError } from "./errors.js";
import { resolveTemplatePath } from "./template-resolver.js";
import { loadPreset, applyPreset } from "./preset-resolver.js";
import type { DocType, DocumentMeta, Language, Preset, TemplateData } from "../types/documents.js";
import { logger } from "./logger.js";

/** Module-level cache: key = `${baseDir}:${lang}:${docType}:${overrideDir ?? ""}` */
const templateCache = new Map<string, TemplateData>();
/** Module-level cache for shared templates: key = `shared:${name}` */
const sharedTemplateCache = new Map<string, string>();

/** Clear all template caches — call in tests' beforeEach for isolation */
export function clearTemplateCache(): void {
  templateCache.clear();
  sharedTemplateCache.clear();
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

/** Validate parsed YAML has required DocumentMeta fields */
function isDocumentMeta(v: unknown): v is DocumentMeta {
  return (
    typeof v === "object" &&
    v !== null &&
    "doc_type" in v &&
    "version" in v &&
    "language" in v &&
    Array.isArray((v as DocumentMeta).sections)
  );
}

/** Parse YAML frontmatter + markdown body from raw file content */
function parseFrontmatter(raw: string): { metadata: DocumentMeta; content: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new SekkeiError("PARSE_ERROR", "Template missing YAML frontmatter");
  }
  const parsed = parseYaml(match[1]);
  if (!isDocumentMeta(parsed)) {
    throw new SekkeiError("PARSE_ERROR", "Invalid template frontmatter structure");
  }
  const content = match[2].trim();
  return { metadata: parsed, content };
}

/** Resolve the filesystem path for a template */
function templatePath(baseDir: string, docType: DocType, language: Language): string {
  return resolve(baseDir, language, `${docType}.md`);
}

/** Load and parse a template file from disk. Checks overrideDir first, then language-specific, then ja/ fallback. Applies preset overrides if provided. */
export async function loadTemplate(
  baseDir: string,
  docType: DocType,
  language: Language = "ja",
  overrideDir?: string,
  preset?: Preset
): Promise<TemplateData> {
  // Cache lookup — skip cache when preset is active (preset mutates content)
  // Key includes baseDir so different template directories don't collide
  if (!preset) {
    const cacheKey = `${baseDir}:${language}:${docType}:${overrideDir ?? ""}`;
    const cached = templateCache.get(cacheKey);
    if (cached) return cached;

    const filePath = await resolveTemplatePath(baseDir, docType, language, overrideDir);
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (err: unknown) {
      const isNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
      throw new SekkeiError(
        isNotFound ? "TEMPLATE_NOT_FOUND" : "PARSE_ERROR",
        isNotFound ? `Template not found: ${docType}/${language}` : "Failed to read template",
        { path: filePath }
      );
    }
    logger.debug({ docType, language, path: filePath }, "Loading template");
    const result = parseFrontmatter(raw);
    templateCache.set(cacheKey, result);
    return result;
  }

  // Preset path — no caching (preset varies)
  const filePath = await resolveTemplatePath(baseDir, docType, language, overrideDir);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    const isNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
    throw new SekkeiError(
      isNotFound ? "TEMPLATE_NOT_FOUND" : "PARSE_ERROR",
      isNotFound ? `Template not found: ${docType}/${language}` : "Failed to read template",
      { path: filePath }
    );
  }
  logger.debug({ docType, language, path: filePath, preset }, "Loading template (preset)");
  const { metadata, content } = parseFrontmatter(raw);
  const presetsDir = join(baseDir, "presets");
  const presetConfig = await loadPreset(presetsDir, preset);
  const patched = applyPreset(content, docType, presetConfig);
  return { metadata, content: patched };
}

/** Load a shared template (cover-page, update-history) */
export async function loadSharedTemplate(
  baseDir: string,
  name: string
): Promise<string> {
  const cacheKey = `shared:${name}`;
  const cached = sharedTemplateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const filePath = resolve(baseDir, "shared", `${name}.md`);
  try {
    const content = await readFile(filePath, "utf-8");
    sharedTemplateCache.set(cacheKey, content);
    return content;
  } catch (err: unknown) {
    const isNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
    throw new SekkeiError(
      isNotFound ? "TEMPLATE_NOT_FOUND" : "PARSE_ERROR",
      isNotFound ? `Shared template not found: ${name}` : "Failed to read shared template",
      { path: filePath }
    );
  }
}
