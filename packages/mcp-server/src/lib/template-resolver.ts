/**
 * Template resolver — checks override directory first, falls back to default.
 * Supports company-specific template customization via config.
 */
import { access, constants } from "node:fs/promises";
import { resolve, normalize } from "node:path";
import type { DocType } from "../types/documents.js";
import { logger } from "./logger.js";
import { isSubPath } from "./platform.js";

/** Resolve template path: override dir → language-specific default → ja/ fallback. */
export async function resolveTemplatePath(
  defaultDir: string,
  docType: DocType,
  language: string,
  overrideDir?: string
): Promise<string> {
  if (overrideDir) {
    const normalizedBase = normalize(resolve(overrideDir));
    const overridePath = resolve(overrideDir, language, `${docType}.md`);
    const normalizedPath = normalize(overridePath);

    // Path containment check — prevent traversal outside override dir
    if (!isSubPath(normalizedPath, normalizedBase)) {
      logger.warn({ overrideDir, docType }, "Path traversal detected in override, using default");
    } else {
      try {
        await access(overridePath, constants.R_OK);
        logger.debug({ docType, language, path: overridePath }, "Using override template");
        return overridePath;
      } catch {
        logger.debug({ docType, language }, "Override template not found, using default");
      }
    }
  }

  // Try language-specific path first, fall back to ja/
  const langPath = resolve(defaultDir, language, `${docType}.md`);
  if (language !== "ja") {
    try {
      await access(langPath, constants.R_OK);
      return langPath;
    } catch {
      const fallbackPath = resolve(defaultDir, "ja", `${docType}.md`);
      logger.debug({ docType, language, fallbackPath }, "Language-specific template not found, falling back to ja/");
      return fallbackPath;
    }
  }
  return langPath;
}
