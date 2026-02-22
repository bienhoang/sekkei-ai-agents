/**
 * Extract and validate YAML layout blocks from screen-design markdown.
 * Parses the ```yaml code fence in section 1 (画面レイアウト) of each screen.
 */

import { parse as parseYaml } from "yaml";
import { ScreenLayoutSchema, type ScreenLayout } from "./mockup-schema.js";
import { SekkeiError } from "./errors.js";

/**
 * Extract YAML code block content from a markdown section.
 * Looks for ```yaml...``` after a ## 1. heading.
 */
export function extractLayoutYaml(markdown: string): string | null {
  // Match ```yaml block after "## 1." heading
  const pattern = /##\s+1\.\s+[^\n]+\n[\s\S]*?```yaml\n([\s\S]*?)```/;
  const match = markdown.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract all YAML layout blocks from a multi-screen markdown file.
 * Each screen has its own "## 1." section under a top-level screen heading.
 */
export function extractAllLayoutYamls(markdown: string): string[] {
  const results: string[] = [];
  const pattern = /##\s+1\.\s+[^\n]+\n[\s\S]*?```yaml\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/**
 * Parse a single screen layout from markdown.
 * Extracts the first YAML block, parses it, and validates against schema.
 */
export function parseScreenLayout(markdown: string): ScreenLayout {
  const yamlStr = extractLayoutYaml(markdown);
  if (!yamlStr) {
    throw new SekkeiError("MOCKUP_ERROR", "No YAML layout block found in section 1 (画面レイアウト)");
  }

  let raw: unknown;
  try {
    raw = parseYaml(yamlStr);
  } catch (err) {
    throw new SekkeiError("MOCKUP_ERROR", `Invalid YAML in layout block: ${(err as Error).message}`);
  }

  const result = ScreenLayoutSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new SekkeiError("MOCKUP_ERROR", `Layout validation failed: ${details}`);
  }

  return result.data;
}

/**
 * Parse all screen layouts from a multi-screen markdown file.
 * Returns empty array if no YAML blocks found (graceful for backward compat).
 */
export function parseScreenLayouts(markdown: string): ScreenLayout[] {
  const yamls = extractAllLayoutYamls(markdown);
  if (yamls.length === 0) return [];

  return yamls.map((yamlStr, index) => {
    let raw: unknown;
    try {
      raw = parseYaml(yamlStr);
    } catch (err) {
      throw new SekkeiError("MOCKUP_ERROR", `Invalid YAML in screen ${index + 1}: ${(err as Error).message}`);
    }

    const result = ScreenLayoutSchema.safeParse(raw);
    if (!result.success) {
      const details = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new SekkeiError("MOCKUP_ERROR", `Screen ${index + 1} validation failed: ${details}`);
    }

    return result.data;
  });
}
