/**
 * CR state machine — YAML persistence, transitions, CRUD operations.
 * Follows rfp-state-machine.ts patterns with yaml package for nested data.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
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

  const body = [
    `# Change Request: ${cr.description}`,
    "",
    "## Changed IDs",
    ...cr.changed_ids.map(id => `- ${id}`),
    "",
    "## Notes",
    "(user/agent appends notes here)",
  ].join("\n");

  await writeFile(crFilePath, `---\n${frontmatter}---\n\n${body}\n`, "utf-8");
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

/** Validate CR ID format */
export function isValidCRId(id: string): boolean {
  return CR_ID_RE.test(id);
}
