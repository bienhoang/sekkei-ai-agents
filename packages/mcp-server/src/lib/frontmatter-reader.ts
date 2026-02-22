import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { DocumentMeta } from "../types/documents.js";

/** Extract YAML frontmatter from a markdown file. Returns {} on any error. */
export async function readDocumentFrontmatter(filePath: string): Promise<Partial<DocumentMeta>> {
  try {
    const content = await readFile(filePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    return parseYaml(match[1]) ?? {};
  } catch {
    return {};
  }
}
