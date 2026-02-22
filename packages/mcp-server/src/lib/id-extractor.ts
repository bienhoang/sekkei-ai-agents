/**
 * Extract document cross-reference IDs from markdown content.
 * Supports all Sekkei ID formats: F-xxx, REQ-xxx, SCR-xxx, TBL-xxx, API-xxx, UT-xxx, IT-xxx, ST-xxx, UAT-xxx.
 */

/** Known ID prefix types in Sekkei documents */
export const ID_TYPES = [
  "F", "REQ", "NFR", "SCR", "TBL", "API",
  "CLS", "DD", "TS",
  "UT", "IT", "ST", "UAT",
  "OP", "MIG",
] as const;
export type IdType = (typeof ID_TYPES)[number];

/** Regex pattern that matches any standard ID: PREFIX-NNN (1-4 digits) */
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG)-(\d{1,4})\b/g;

/** Also match custom-prefix IDs like SAL-001, ACC-001 */
const CUSTOM_ID_PATTERN = /\b([A-Z]{2,5})-(\d{1,4})\b/g;

/** Extract all standard IDs from markdown content, grouped by type */
export function extractIds(content: string): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const match of content.matchAll(ID_PATTERN)) {
    const type = match[1];
    const id = match[0];
    const existing = result.get(type) ?? [];
    if (!existing.includes(id)) {
      existing.push(id);
    }
    result.set(type, existing);
  }

  return result;
}

/** Extract all IDs (including custom prefixes) as a flat set */
export function extractAllIds(content: string): Set<string> {
  const ids = new Set<string>();
  for (const match of content.matchAll(CUSTOM_ID_PATTERN)) {
    ids.add(match[0]);
  }
  return ids;
}

/** Get IDs of a specific type from content */
export function extractIdsByType(content: string, type: string): string[] {
  if (!/^[A-Z]{1,5}$/.test(type)) return [];
  const pattern = new RegExp(`\\b${type}-(\\d{1,4})\\b`, "g");
  const ids: string[] = [];
  for (const match of content.matchAll(pattern)) {
    if (!ids.includes(match[0])) {
      ids.push(match[0]);
    }
  }
  return ids;
}
