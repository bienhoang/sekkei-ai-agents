const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/**
 * Split markdown into frontmatter YAML and body content.
 */
export function splitFrontmatter(raw: string): { fm: string; body: string } {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) {
    return { fm: '', body: raw }
  }
  const fm = match[1]
  const body = raw.slice(match[0].length)
  return { fm, body }
}

/**
 * Re-attach frontmatter YAML to body content.
 */
export function joinFrontmatter(fm: string, body: string): string {
  if (!fm) return body
  return `---\n${fm}\n---\n${body}`
}
