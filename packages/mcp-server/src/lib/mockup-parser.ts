/**
 * Extract and validate YAML layout blocks from screen-design markdown.
 * Parses the ```yaml code fence in section 1 (画面レイアウト) of each screen.
 */

import { parse as parseYaml } from "yaml";
import { ScreenLayoutSchema, type ScreenLayout } from "./mockup-schema.js";
import { SekkeiError } from "./errors.js";

/**
 * Extract YAML code block content from a markdown section.
 * Looks for ```yaml...``` or <details data-yaml-layout> blocks after a ## 1. heading.
 * Details blocks are checked directly; bare fence requires a "## 1." heading.
 */
export function extractLayoutYaml(markdown: string): string | null {
  // Check for <details data-yaml-layout> block first (self-contained, no heading prefix needed)
  const divPattern = /<details[^>]*data-yaml-layout[^>]*>[\s\S]*?```yaml\n([\s\S]*?)```[\s\S]*?<\/details>/;
  const divMatch = markdown.match(divPattern);
  if (divMatch) return divMatch[1].trim();

  // Fall back to bare ```yaml block after "## 1." heading
  const fencePattern = /##\s+1\.\s+[^\n]+\n[\s\S]*?```yaml\n([\s\S]*?)```/;
  const fenceMatch = markdown.match(fencePattern);
  return fenceMatch ? fenceMatch[1].trim() : null;
}

/**
 * Extract all YAML layout blocks from a multi-screen markdown file.
 * Each screen has its own "## 1." section under a top-level screen heading.
 * Matches both bare ```yaml code fences and <details data-yaml-layout> blocks.
 * Details blocks are matched directly; bare fences require a "## 1." heading.
 */
export function extractAllLayoutYamls(markdown: string): string[] {
  // Collect all matches with their position to preserve order
  type MatchEntry = { index: number; end: number; yaml: string };
  const entries: MatchEntry[] = [];

  // Pass 1: collect all self-contained <details data-yaml-layout> blocks (no heading prefix needed —
  // data-yaml-layout attribute is already specific to layout blocks)
  const divPattern = /<details[^>]*data-yaml-layout[^>]*>[\s\S]*?```yaml\n([\s\S]*?)```[\s\S]*?<\/details>/g;
  let match: RegExpExecArray | null;
  const divRanges: Array<{ start: number; end: number }> = [];
  while ((match = divPattern.exec(markdown)) !== null) {
    entries.push({ index: match.index, end: match.index + match[0].length, yaml: match[1].trim() });
    divRanges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Pass 2: collect fence matches under "## 1." headings, skipping fences inside div blocks
  const fencePattern = /##\s+1\.\s+[^\n]+\n[\s\S]*?```yaml\n([\s\S]*?)```/g;
  while ((match = fencePattern.exec(markdown)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    const insideDiv = divRanges.some(r => matchEnd > r.start && matchStart < r.end);
    if (!insideDiv) {
      entries.push({ index: match.index, end: matchEnd, yaml: match[1].trim() });
    }
  }

  entries.sort((a, b) => a.index - b.index);
  return entries.map(e => e.yaml);
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
