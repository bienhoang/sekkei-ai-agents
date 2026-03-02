/**
 * Shared YAML frontmatter parser — extracted from excel-exporter.ts for reuse.
 */
import { parse as parseYaml } from "yaml";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

export function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return { meta: {}, body: content };
  try {
    const meta = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
    return { meta, body: m[2] };
  } catch {
    return { meta: {}, body: m[2] };
  }
}
