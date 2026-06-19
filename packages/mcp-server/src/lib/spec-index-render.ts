/**
 * Pure logic for the agent spec-index: ID parsing/ordering, drift diff,
 * advisory next-free-ID, and Markdown rendering. No I/O — testable in isolation.
 */
import { extractIds } from "./id-extractor.js";

export interface SpecIndexEntry {
  id: string;
  type: string;      // origin doc type (= "Defined In")
  titleJa: string;
  source: string;    // owning file relpath
  status: string;    // doc-level status (inherited)
  traced: boolean;   // downstream_refs.length > 0
}

export interface PartialInfo {
  present: number;
  total: number;
  isPartial: boolean;
}

export interface SpecIndexData {
  entries: SpecIndexEntry[];
  nonOrigin: string[];   // IDs present but with no origin row (origin-gated matrix)
  duplicates: string[];  // IDs with more than one origin entry
  partial: PartialInfo;
}

export interface ReconcileReport {
  added: string[];
  removed: string[];
  duplicates: string[];
  nextFree: Record<string, string>;  // numbering-space key -> next free ID
  partial: PartialInfo;
}

/** Flatten every ID (standard + feature-scoped + guarded custom) present in content.
 *  Uses extractIds only — it guards against feature-scoped sub-parts (so `SCR-SAL-001`
 *  does NOT also yield a phantom `SAL-001`), keeping current/prior ID sets consistent. */
export function allIdsIn(content: string): Set<string> {
  const ids = new Set<string>();
  for (const list of extractIds(content).values()) for (const id of list) ids.add(id);
  return ids;
}

/** Parse (prefix, feature?, num) from an ID; returns null for non-conforming. */
function parseId(id: string): { prefix: string; feature?: string; num: number } | null {
  const m = id.match(/^([A-Z]+)(?:-([A-Z]{2,5}))?-(\d{1,4})$/);
  if (!m) return null;
  return { prefix: m[1], feature: m[2], num: parseInt(m[3], 10) };
}

/** Deterministic ID ordering: by (prefix, feature, numeric suffix). */
export function compareIds(a: string, b: string): number {
  const pa = parseId(a);
  const pb = parseId(b);
  if (!pa || !pb) return a.localeCompare(b);
  return (
    pa.prefix.localeCompare(pb.prefix) ||
    (pa.feature ?? "").localeCompare(pb.feature ?? "") ||
    pa.num - pb.num
  );
}

/** Advisory next-free-ID per numbering space (prefix, and prefix+feature separately).
 *  Feature-scoped (SCR-SAL-001) and base (SCR-001) are SEPARATE numbering spaces. */
export function computeNextFreeIds(ids: string[]): Record<string, string> {
  const maxByKey = new Map<string, { feature?: string; prefix: string; max: number }>();
  for (const id of ids) {
    const p = parseId(id);
    if (!p) continue;
    const key = p.feature ? `${p.prefix}-${p.feature}` : p.prefix;
    const cur = maxByKey.get(key);
    if (!cur || p.num > cur.max) maxByKey.set(key, { feature: p.feature, prefix: p.prefix, max: p.num });
  }
  const out: Record<string, string> = {};
  for (const [key, v] of maxByKey) {
    const next = String(v.max + 1).padStart(3, "0"); // canonical 3-digit
    out[key] = v.feature ? `${v.prefix}-${v.feature}-${next}` : `${v.prefix}-${next}`;
  }
  return out;
}

/** Extract the prior ID universe from an existing spec-index.md (read-only). */
export function parsePriorIds(priorContent: string): Set<string> {
  return allIdsIn(priorContent);
}

/** Diff current vs prior + advisory next-free-ID. Read-only w.r.t. source docs.
 *  `currentSet` spans origin rows AND non-origin IDs so the diff is symmetric with
 *  `priorIds` (which parses the whole prior file incl. the non-origin note) —
 *  otherwise non-origin IDs would be reported "removed" on every run. */
export function computeReconcile(data: SpecIndexData, priorIds: Set<string>): ReconcileReport {
  const currentSet = new Set([...data.entries.map((e) => e.id), ...data.nonOrigin]);
  return {
    added: [...currentSet].filter((id) => !priorIds.has(id)).sort(compareIds),
    removed: [...priorIds].filter((id) => !currentSet.has(id)).sort(compareIds),
    duplicates: data.duplicates,
    nextFree: computeNextFreeIds([...currentSet]),
    partial: data.partial,
  };
}

/** Render the spec-index.md (thin table, 1 line/ID, PARTIAL banner when partial). */
export function renderSpecIndex(data: SpecIndexData): string {
  const lines: string[] = ["# Spec Index", ""];
  if (data.partial.isPartial) {
    lines.push(
      `> ⚠ PARTIAL: ${data.partial.present} of ${data.partial.total} chain docs present (some pending or absent). This index is incomplete.`,
      "",
    );
  }
  lines.push(
    "> Tool-generated ID→file index (projection of validate_chain). Grep the ID inside its Source file to locate it. " +
      "Status is doc-level (inherited by the doc's IDs). Traced = referenced by a downstream doc. Do not edit by hand.",
    "",
    "| ID | Type | Title (JA) | Source | Status | Traced |",
    "|----|------|-----------|--------|--------|--------|",
  );
  for (const e of data.entries) {
    lines.push(`| ${e.id} | ${e.type} | ${e.titleJa} | ${e.source} | ${e.status} | ${e.traced ? "✓" : "—"} |`);
  }
  if (data.entries.length === 0) lines.push("| _(no origin IDs found)_ |  |  |  |  |  |");
  if (data.nonOrigin.length > 0) {
    lines.push(
      "",
      "## Non-origin IDs",
      "",
      "Present in the set but with no origin row (the matrix is origin-gated). Grep to locate:",
      "",
      data.nonOrigin.join(", "),
    );
  }
  return lines.join("\n") + "\n";
}
