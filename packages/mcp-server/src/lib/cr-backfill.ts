/**
 * Upstream backfill suggestion generator.
 * Compares old/new doc content to detect new IDs that reference upstream docs
 * but don't exist there yet.
 */
import { ID_ORIGIN } from "./cross-ref-linker.js";

/** Standard ID regex — same pattern as cross-ref-linker */
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;

export interface BackfillSuggestion {
  id: string;           // the new/changed ID (e.g. "F-012")
  target_doc: string;   // upstream doc that should define it
  action: "add" | "update";
  reason: string;
}

/** Extract all standard Sekkei IDs from content */
function extractIds(content: string): Set<string> {
  const ids = new Set<string>();
  for (const match of content.matchAll(new RegExp(ID_PATTERN.source, "g"))) {
    ids.add(match[0]);
  }
  return ids;
}

/**
 * Compare old and new content for a doc, find IDs that reference
 * upstream docs but don't exist upstream yet.
 */
export function generateBackfillSuggestions(
  originDoc: string,
  oldContent: string,
  newContent: string,
  upstreamDocs: Map<string, string>,
): BackfillSuggestion[] {
  const oldIds = extractIds(oldContent);
  const newIds = extractIds(newContent);
  const suggestions: BackfillSuggestion[] = [];

  for (const id of newIds) {
    const prefix = id.split("-")[0];
    const definingDoc = ID_ORIGIN[prefix];

    // Skip IDs that belong to the origin doc itself
    if (!definingDoc || definingDoc === originDoc) continue;

    // Only suggest for upstream docs we have content for
    const upstreamContent = upstreamDocs.get(definingDoc);
    if (upstreamContent === undefined) continue;

    const isNew = !oldIds.has(id);
    const existsUpstream = upstreamContent.includes(id);

    if (isNew && !existsUpstream) {
      suggestions.push({
        id,
        target_doc: definingDoc,
        action: "add",
        reason: `New ${id} referenced in ${originDoc} but not defined in ${definingDoc}`,
      });
    }
  }

  return suggestions.sort((a, b) => a.id.localeCompare(b.id));
}
