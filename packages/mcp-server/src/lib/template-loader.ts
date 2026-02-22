/**
 * Load Markdown templates from disk, parse YAML frontmatter.
 * Templates live in templates/{lang}/{doc-type}.md
 * Supports override directories for company customization.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { SekkeiError } from "./errors.js";
import { resolveTemplatePath } from "./template-resolver.js";
import type { DocType, DocumentMeta, Language, TemplateData } from "../types/documents.js";
import { logger } from "./logger.js";

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

/** Load and parse a template file from disk. Checks overrideDir first, then language-specific, then ja/ fallback. */
export async function loadTemplate(
  baseDir: string,
  docType: DocType,
  language: Language = "ja",
  overrideDir?: string
): Promise<TemplateData> {
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
  const { metadata, content } = parseFrontmatter(raw);
  return { metadata, content };
}

/** Load a shared template (cover-page, update-history) */
export async function loadSharedTemplate(
  baseDir: string,
  name: string
): Promise<string> {
  const filePath = resolve(baseDir, "shared", `${name}.md`);

  try {
    return await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    const isNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
    throw new SekkeiError(
      isNotFound ? "TEMPLATE_NOT_FOUND" : "PARSE_ERROR",
      isNotFound ? `Shared template not found: ${name}` : "Failed to read shared template",
      { path: filePath }
    );
  }
}
