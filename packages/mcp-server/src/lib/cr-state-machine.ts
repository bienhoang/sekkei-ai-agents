/**
 * CR state machine — YAML persistence, transitions, CRUD operations.
 * Follows rfp-state-machine.ts patterns with yaml package for nested data.
 */
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parse, stringify } from "yaml";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";
import type { ChangeRequest, CRStatus } from "../types/change-request.js";
import { CR_STATUSES } from "../types/change-request.js";

// --- Transition Graph ---

const transitionEntries: [CRStatus, readonly CRStatus[]][] = [
  ["INITIATED", ["ANALYZING", "CANCELLED"]],
  ["ANALYZING", ["IMPACT_ANALYZED", "CANCELLED"]],
  ["IMPACT_ANALYZED", ["APPROVED", "CANCELLED"]],
  ["APPROVED", ["PROPAGATING", "CANCELLED"]],
  ["PROPAGATING", ["VALIDATED", "APPROVED", "CANCELLED"]],
  ["VALIDATED", ["COMPLETED", "CANCELLED"]],
  ["COMPLETED", []],
  ["CANCELLED", []],
];

export const ALLOWED_TRANSITIONS: ReadonlyMap<CRStatus, readonly CRStatus[]> =
  new Map(transitionEntries);

export function validateTransition(from: CRStatus, to: CRStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  return allowed ? allowed.includes(to) : false;
}

// --- Path Helpers ---

export function getCRDir(basePath: string): string {
  return join(basePath, DEFAULT_WORKSPACE_DIR, "change-requests");
}

const CR_ID_RE = /^CR-\d{6}-\d{3}$/;
const CR_FILE_RE = /^CR-\d{6}-\d{3}\.md$/;

// --- ID Generation ---

export async function generateCRId(crDir: string): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  let maxSeq = 0;
  try {
    const entries = await readdir(crDir);
    for (const entry of entries) {
      const match = entry.match(new RegExp(`^CR-${datePrefix}-(\\d{3})\\.md$`));
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  } catch {
    // dir may not exist yet
  }

  return `CR-${datePrefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

// --- YAML Persistence ---

export async function readCR(crFilePath: string): Promise<ChangeRequest> {
  let raw: string;
  try {
    raw = await readFile(crFilePath, "utf-8");
  } catch {
    throw new SekkeiError("CHANGE_REQUEST_ERROR", `CR file not found: ${crFilePath}`);
  }

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new SekkeiError("CHANGE_REQUEST_ERROR", "Invalid CR file: missing YAML frontmatter");
  }

  const data = parse(fmMatch[1]) as Record<string, unknown>;
  const status = data.status as string;
  if (!CR_STATUSES.includes(status as CRStatus)) {
    throw new SekkeiError("CHANGE_REQUEST_ERROR", `Invalid CR status: "${status}"`);
  }

  return {
    id: (data.id as string) ?? "",
    status: status as CRStatus,
    origin_doc: (data.origin_doc as string) ?? "",
    description: (data.description as string) ?? "",
    changed_ids: (data.changed_ids as string[]) ?? [],
    impact_summary: (data.impact_summary as string) ?? undefined,
    propagation_steps: (data.propagation_steps as ChangeRequest["propagation_steps"]) ?? [],
    propagation_index: (data.propagation_index as number) ?? 0,
    conflict_warnings: (data.conflict_warnings as string[]) ?? [],
    created: (data.created as string) ?? "",
    updated: (data.updated as string) ?? "",
    history: (data.history as ChangeRequest["history"]) ?? [],
  };
}

export async function writeCR(crFilePath: string, cr: ChangeRequest): Promise<void> {
  const frontmatter = stringify({
    id: cr.id,
    status: cr.status,
    origin_doc: cr.origin_doc,
    description: cr.description,
    changed_ids: cr.changed_ids,
    impact_summary: cr.impact_summary ?? "",
    propagation_steps: cr.propagation_steps,
    propagation_index: cr.propagation_index,
    conflict_warnings: cr.conflict_warnings,
    created: cr.created,
    updated: cr.updated,
    history: cr.history,
  });

  const body = buildCRBody(cr);
  await writeFile(crFilePath, `---\n${frontmatter}---\n\n${body}\n`, "utf-8");

  // Auto-rebuild INDEX.md — derive basePath from crFilePath
  // crFilePath = {basePath}/{workspace-docs}/change-requests/CR-xxx.md
  const basePath = dirname(dirname(dirname(crFilePath)));
  await writeCRIndex(basePath).catch(() => {
    // Non-critical: index rebuild may fail if listing fails during partial writes
  });
}

/** Build human-readable markdown body from CR data. */
function buildCRBody(cr: ChangeRequest): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${cr.id}: ${cr.description}`);
  lines.push("");
  lines.push("## Status");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Status | ${cr.status} |`);
  lines.push(`| Created | ${cr.created} |`);
  lines.push(`| Updated | ${cr.updated} |`);
  lines.push("");

  // Content table
  lines.push("## Content");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Origin Document | ${cr.origin_doc} |`);
  lines.push(`| Changed IDs | ${cr.changed_ids.join(", ") || "—"} |`);
  lines.push(`| Description | ${cr.description} |`);
  lines.push("");

  // Impact
  lines.push("## Impact");
  lines.push("");
  lines.push(cr.impact_summary || "Not yet analyzed");
  lines.push("");

  // Propagation table
  if (cr.propagation_steps.length > 0) {
    lines.push("## Propagation Progress");
    lines.push("");
    lines.push("| # | Document | Direction | Status | Note |");
    lines.push("|---|----------|-----------|--------|------|");
    cr.propagation_steps.forEach((step, i) => {
      const icon = step.status === "done" ? "✅" : step.status === "skipped" ? "⏭️" : "⏳";
      lines.push(`| ${i + 1} | ${step.doc_type} | ${step.direction} | ${icon} ${step.status} | ${step.note ?? ""} |`);
    });
    lines.push("");
  }

  // Conflict warnings
  if (cr.conflict_warnings.length > 0) {
    lines.push("## Conflict Warnings");
    lines.push("");
    cr.conflict_warnings.forEach(w => lines.push(`- ⚠️ ${w}`));
    lines.push("");
  }

  // History table
  lines.push("## History");
  lines.push("");
  lines.push("| Date | Status | Reason |");
  lines.push("|------|--------|--------|");
  cr.history.forEach(h => {
    lines.push(`| ${h.entered} | ${h.status} | ${h.reason ?? ""} |`);
  });
  lines.push("");

  // Notes section
  lines.push("## Notes");
  lines.push("");

  return lines.join("\n");
}

// --- RFP Decision Log ---

/** Summarize propagation progress: "↑ upstream: 1/2 done | ↓ downstream: 3/5 done" */
function formatPropagationSummary(cr: ChangeRequest): string {
  if (cr.propagation_steps.length === 0) return "No propagation steps";

  const summary: string[] = [];
  for (const dir of ["upstream", "downstream"] as const) {
    const steps = cr.propagation_steps.filter(s => s.direction === dir);
    if (steps.length === 0) continue;
    const done = steps.filter(s => s.status === "done").length;
    const skipped = steps.filter(s => s.status === "skipped").length;
    const arrow = dir === "upstream" ? "↑" : "↓";
    const parts = [`${done}/${steps.length} done`];
    if (skipped > 0) parts.push(`${skipped} skipped`);
    summary.push(`${arrow} ${dir}: ${parts.join(", ")}`);
  }
  return summary.join(" | ") || "No propagation steps";
}

/** Append CR status entry to RFP decisions file. Skips silently if no RFP workspace. */
export async function appendCRToRFPDecisions(basePath: string, cr: ChangeRequest): Promise<void> {
  const filePath = join(basePath, DEFAULT_WORKSPACE_DIR, "01-rfp", "07_decisions.md");
  try {
    await access(filePath);
  } catch {
    return; // No RFP workspace — skip silently
  }

  const now = new Date().toISOString().slice(0, 10);
  const entry = [
    `## ${now} — ${cr.id}: ${cr.description} [${cr.status}]`,
    `- **Origin**: ${cr.origin_doc}`,
    `- **Changed IDs**: ${cr.changed_ids.join(", ") || "—"}`,
    `- **Impact**: ${cr.impact_summary || "Not yet analyzed"}`,
    `- **Propagation**: ${formatPropagationSummary(cr)}`,
    "",
  ].join("\n");

  let existing = "";
  try { existing = await readFile(filePath, "utf-8"); } catch { /* empty */ }
  const separator = existing.trim() ? "\n\n" : "";
  await writeFile(filePath, existing + separator + entry, "utf-8");
  logger.debug({ crId: cr.id, status: cr.status }, "CR decision logged to RFP");
}

// --- CRUD ---

export async function createCR(
  basePath: string,
  originDoc: string,
  description: string,
  changedIds: string[],
): Promise<ChangeRequest> {
  const crDir = getCRDir(basePath);
  await mkdir(crDir, { recursive: true });

  const id = await generateCRId(crDir);
  const now = new Date().toISOString().slice(0, 10);

  const cr: ChangeRequest = {
    id,
    status: "INITIATED",
    origin_doc: originDoc,
    description,
    changed_ids: changedIds,
    propagation_steps: [],
    propagation_index: 0,
    conflict_warnings: [],
    created: now,
    updated: now,
    history: [{ status: "INITIATED", entered: now, reason: "Initial creation" }],
  };

  const filePath = join(crDir, `${id}.md`);
  await writeCR(filePath, cr);
  logger.info({ id, originDoc }, "CR created");
  return cr;
}

export async function transitionCR(
  crFilePath: string,
  toStatus: CRStatus,
  reason?: string,
): Promise<ChangeRequest> {
  const cr = await readCR(crFilePath);

  if (!validateTransition(cr.status, toStatus)) {
    throw new SekkeiError(
      "CHANGE_REQUEST_ERROR",
      `Invalid transition: ${cr.status} → ${toStatus}`,
    );
  }

  const now = new Date().toISOString().slice(0, 10);
  cr.status = toStatus;
  cr.updated = now;
  cr.history.push({ status: toStatus, entered: now, reason });

  await writeCR(crFilePath, cr);

  // Append to RFP decision log (best-effort — failure won't break transition)
  const basePath = dirname(dirname(dirname(crFilePath)));
  await appendCRToRFPDecisions(basePath, cr).catch(() => {});

  logger.debug({ id: cr.id, from: cr.history.at(-2)?.status, to: toStatus }, "CR transitioned");
  return cr;
}

export async function listCRs(basePath: string): Promise<ChangeRequest[]> {
  const crDir = getCRDir(basePath);
  let entries: string[];
  try {
    entries = await readdir(crDir);
  } catch {
    return [];
  }

  const crs: ChangeRequest[] = [];
  for (const entry of entries) {
    if (!CR_FILE_RE.test(entry)) continue;
    try {
      const cr = await readCR(join(crDir, entry));
      crs.push(cr);
    } catch {
      // skip unreadable CR files
    }
  }

  return crs.sort((a, b) => a.id.localeCompare(b.id));
}

/** Write INDEX.md listing all CRs in the change-requests directory. */
export async function writeCRIndex(basePath: string): Promise<void> {
  const crDir = getCRDir(basePath);
  const crs = await listCRs(basePath);

  const lines: string[] = [
    "# Change Requests",
    "",
    `> Auto-generated index — ${crs.length} CR(s) total`,
    "",
    "| ID | Status | Origin | Description | Created | Updated |",
    "|----|--------|--------|-------------|---------|---------|",
  ];

  for (const cr of crs) {
    lines.push(
      `| [${cr.id}](./${cr.id}.md) | ${cr.status} | ${cr.origin_doc} | ${cr.description} | ${cr.created} | ${cr.updated} |`,
    );
  }

  lines.push("");
  await writeFile(join(crDir, "INDEX.md"), lines.join("\n"), "utf-8");
}

/** Validate CR ID format */
export function isValidCRId(id: string): boolean {
  return CR_ID_RE.test(id);
}
