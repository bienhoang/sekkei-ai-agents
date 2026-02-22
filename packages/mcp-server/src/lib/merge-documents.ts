/**
 * Document merge logic for manifest-based export.
 * Reads split files, strips per-file frontmatter, concatenates with separators.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { Manifest } from "../types/documents.js";
import { getMergeOrder } from "./manifest-manager.js";
import { SekkeiError } from "./errors.js";

/** Ensure resolved path stays within base directory (prevent path traversal) */
function assertContained(baseDir: string, filePath: string): void {
  const resolved = resolve(baseDir, filePath);
  if (!resolved.startsWith(baseDir + "/") && resolved !== baseDir) {
    throw new SekkeiError("MANIFEST_ERROR", `Path escapes base directory: ${filePath}`);
  }
}

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n/;

/** Strip YAML frontmatter from markdown content */
export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_RE, "").trim();
}

/** Generate merged frontmatter for exported doc */
export function generateMergedFrontmatter(
  manifest: Manifest, docType: string
): string {
  return [
    "---",
    `doc_type: ${docType}`,
    `version: "1.0"`,
    `language: ${manifest.language}`,
    `project: ${manifest.project}`,
    `merged: true`,
    `merge_date: ${new Date().toISOString().split("T")[0]}`,
    "---",
  ].join("\n");
}

/** Read and merge all files for a doc type per manifest merge order */
export async function mergeFromManifest(
  manifestPath: string,
  manifest: Manifest,
  docType: string,
  featureName?: string
): Promise<string> {
  const baseDir = dirname(manifestPath);
  let files = getMergeOrder(manifest, docType);

  // Filter to single feature if requested
  if (featureName) {
    const doc = manifest.documents[docType];
    if (doc) {
      const featureFile = doc.features.find(f => f.name === featureName)?.file;
      const sharedFiles = doc.shared.map(s => s.file)
        .filter(f => !f.endsWith("/index.md"));
      files = featureFile
        ? [...sharedFiles, featureFile]
        : sharedFiles;
    }
  }

  const sections: string[] = [];
  for (const file of files) {
    assertContained(baseDir, file);
    const content = await readFile(resolve(baseDir, file), "utf-8");
    sections.push(stripFrontmatter(content));
  }

  const frontmatter = generateMergedFrontmatter(manifest, docType);
  return `${frontmatter}\n\n${sections.join("\n\n---\n\n")}`;
}
