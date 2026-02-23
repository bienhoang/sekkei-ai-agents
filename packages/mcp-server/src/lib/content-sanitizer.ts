/**
 * Content sanitizer for read-only exports.
 * Strips internal metadata using blacklist approach: remove known internal patterns.
 */

/** Known internal HTML comment patterns to strip */
const INTERNAL_PATTERNS = [
  /<!--\s*confidence:.*?-->/g,
  /<!--\s*source:.*?-->/g,
  /<!--\s*learn:.*?-->/g,
  /<!--\s*internal\s*-->[\s\S]*?<!--\s*\/internal\s*-->/g,
];

/** Strip internal metadata for external sharing */
export function sanitizeForReadOnly(content: string): string {
  let result = content;

  for (const pattern of INTERNAL_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // Replace draft watermark with public version label
  result = result.replace(/AI下書き\s*[—―]\s*未承認/g, "公開版");

  // Clean up empty lines left by removed comments
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}
