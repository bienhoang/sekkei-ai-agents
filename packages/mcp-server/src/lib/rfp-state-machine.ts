/**
 * RFP workspace state machine — deterministic phase transitions, file write rules,
 * workspace creation, status persistence, and phase recovery.
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import type { RfpPhase, RfpStatus, RfpFileInventory } from "../types/documents.js";
import { RFP_PHASES, RFP_FILES } from "../types/documents.js";

// --- Constants ---

const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Valid phase transitions (directed graph) */
export const ALLOWED_TRANSITIONS: ReadonlyMap<RfpPhase, readonly RfpPhase[]> = new Map([
  ["RFP_RECEIVED", ["ANALYZING"]],
  ["ANALYZING", ["QNA_GENERATION"]],
  ["QNA_GENERATION", ["WAITING_CLIENT"]],
  ["WAITING_CLIENT", ["DRAFTING", "CLIENT_ANSWERED"]],
  ["DRAFTING", ["PROPOSAL_UPDATE"]],
  ["CLIENT_ANSWERED", ["PROPOSAL_UPDATE"]],
  ["PROPOSAL_UPDATE", ["SCOPE_FREEZE"]],
  ["SCOPE_FREEZE", []],
]);

/** File write mode rules */
export type WriteMode = "append" | "rewrite" | "checklist";

export const FILE_WRITE_RULES: ReadonlyMap<string, WriteMode> = new Map([
  ["01_raw_rfp.md", "append"],
  ["02_analysis.md", "rewrite"],
  ["03_questions.md", "rewrite"],
  ["04_client_answers.md", "append"],
  ["05_proposal.md", "rewrite"],
  ["06_scope_freeze.md", "checklist"],
  ["07_decisions.md", "append"],
]);

/** Which flows read/write which files */
export const FLOW_FILE_MAP = {
  analyze:   { reads: ["01_raw_rfp.md"], writes: ["02_analysis.md"] },
  questions: { reads: ["01_raw_rfp.md", "02_analysis.md"], writes: ["03_questions.md"] },
  draft:     { reads: ["02_analysis.md", "03_questions.md"], writes: ["05_proposal.md"] },
  impact:    { reads: ["04_client_answers.md", "02_analysis.md"], writes: ["02_analysis.md"] },
  proposal:  { reads: ["01_raw_rfp.md", "02_analysis.md", "03_questions.md", "04_client_answers.md"], writes: ["05_proposal.md"] },
  freeze:    { reads: ["02_analysis.md", "05_proposal.md"], writes: ["06_scope_freeze.md"] },
} as const;

// --- Validation ---

export function validateProjectName(name: string): void {
  if (!PROJECT_NAME_RE.test(name)) {
    throw new SekkeiError("RFP_WORKSPACE_ERROR", `Invalid project name: "${name}". Use kebab-case (a-z, 0-9, hyphens).`);
  }
}

export function validateTransition(from: RfpPhase, to: RfpPhase): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  return allowed ? allowed.includes(to) : false;
}

// --- Workspace Creation ---

export async function createWorkspace(basePath: string, projectName: string): Promise<string> {
  validateProjectName(projectName);
  const wsPath = join(basePath, "sekkei-docs", "rfp", projectName);
  await mkdir(wsPath, { recursive: true });

  const now = new Date().toISOString().slice(0, 10);
  const initialStatus: RfpStatus = {
    project: projectName,
    phase: "RFP_RECEIVED",
    last_update: now,
    next_action: "Paste RFP content into 01_raw_rfp.md",
    blocking_issues: [],
    assumptions: [],
  };
  await writeStatus(wsPath, initialStatus);

  // Create empty workspace files (skip 00_status.md — already written)
  for (const file of RFP_FILES) {
    if (file === "00_status.md") continue;
    const filePath = join(wsPath, file);
    await writeFile(filePath, "", "utf-8");
  }

  logger.info({ wsPath, projectName }, "RFP workspace created");
  return wsPath;
}

// --- Status Read/Write ---

export async function readStatus(workspacePath: string): Promise<RfpStatus> {
  const statusPath = join(workspacePath, "00_status.md");
  let raw: string;
  try {
    raw = await readFile(statusPath, "utf-8");
  } catch {
    throw new SekkeiError("RFP_WORKSPACE_ERROR", `Workspace not found or missing status file: ${workspacePath}`);
  }
  return parseStatusYaml(raw);
}

export async function writeStatus(workspacePath: string, status: RfpStatus): Promise<void> {
  const statusPath = join(workspacePath, "00_status.md");
  const yaml = serializeStatusYaml(status);
  await writeFile(statusPath, yaml, "utf-8");
}

function parseStatusYaml(raw: string): RfpStatus {
  // Simple YAML-in-frontmatter parser (no external dep needed for this shape)
  const lines = raw.split("\n");
  const data: Record<string, unknown> = {};
  let currentArray: string[] | null = null;
  let currentKey = "";

  for (const line of lines) {
    if (line.trim() === "---") continue;
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      if (currentArray) { data[currentKey] = currentArray; currentArray = null; }
      const [, key, value] = kvMatch;
      if (value.trim() === "") {
        currentArray = [];
        currentKey = key;
      } else {
        data[key] = value.trim();
      }
    } else if (line.match(/^\s+-\s+(.*)$/)) {
      const item = line.replace(/^\s+-\s+/, "").trim();
      if (currentArray) currentArray.push(item);
    }
  }
  if (currentArray) data[currentKey] = currentArray;

  const phase = data.phase as string;
  if (!RFP_PHASES.includes(phase as RfpPhase)) {
    throw new SekkeiError("RFP_PHASE_ERROR", `Invalid phase in status file: "${phase}"`);
  }

  return {
    project: (data.project as string) ?? "",
    phase: phase as RfpPhase,
    last_update: (data.last_update as string) ?? "",
    next_action: (data.next_action as string) ?? "",
    blocking_issues: (data.blocking_issues as string[]) ?? [],
    assumptions: (data.assumptions as string[]) ?? [],
  };
}

function sanitizeYamlScalar(v: string): string {
  return v.replace(/[\r\n]/g, " ");
}

function serializeStatusYaml(status: RfpStatus): string {
  const lines = [
    "---",
    `project: ${sanitizeYamlScalar(status.project)}`,
    `phase: ${status.phase}`,
    `last_update: ${status.last_update}`,
    `next_action: ${sanitizeYamlScalar(status.next_action)}`,
    "blocking_issues:",
    ...status.blocking_issues.map(i => `  - ${i}`),
    "assumptions:",
    ...status.assumptions.map(a => `  - ${a}`),
    "---",
    "",
  ];
  return lines.join("\n");
}

// --- File Operations ---

export async function writeWorkspaceFile(workspacePath: string, filename: string, content: string): Promise<void> {
  const rule = FILE_WRITE_RULES.get(filename);
  if (!rule) {
    throw new SekkeiError("RFP_WORKSPACE_ERROR", `Unknown workspace file: "${filename}"`);
  }

  const filePath = join(workspacePath, filename);

  if (rule === "append") {
    let existing = "";
    try { existing = await readFile(filePath, "utf-8"); } catch { /* new file */ }
    const separator = existing.trim() ? "\n\n" : "";
    await writeFile(filePath, existing + separator + content, "utf-8");
  } else if (rule === "rewrite") {
    await writeFile(filePath, content, "utf-8");
  } else {
    // checklist: merge — preserve existing fields, add new ones
    let existing = "";
    try { existing = await readFile(filePath, "utf-8"); } catch { /* new file */ }
    const merged = mergeChecklist(existing, content);
    await writeFile(filePath, merged, "utf-8");
  }

  logger.debug({ filename, rule }, "RFP file written");
}

export async function readWorkspaceFile(workspacePath: string, filename: string): Promise<string> {
  if (!RFP_FILES.includes(filename as typeof RFP_FILES[number])) {
    throw new SekkeiError("RFP_WORKSPACE_ERROR", `Unknown workspace file: "${filename}"`);
  }
  const filePath = join(workspacePath, filename);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    throw new SekkeiError("RFP_WORKSPACE_ERROR", `File not found: ${filename}`);
  }
}

function mergeChecklist(existing: string, incoming: string): string {
  if (!existing.trim()) return incoming;
  // Extract key: value lines from incoming, overlay on existing
  const existingLines = existing.split("\n");
  const incomingMap = new Map<string, string>();
  for (const line of incoming.split("\n")) {
    const m = line.match(/^(\S+):\s*(.*)$/);
    if (m) incomingMap.set(m[1], m[2]);
  }
  const result = existingLines.map(line => {
    const m = line.match(/^(\S+):\s*(.*)$/);
    if (m && incomingMap.has(m[1])) {
      const val = incomingMap.get(m[1])!;
      incomingMap.delete(m[1]);
      return `${m[1]}: ${val}`;
    }
    return line;
  });
  // Append any new fields not in existing
  for (const [k, v] of incomingMap) {
    result.push(`${k}: ${v}`);
  }
  return result.join("\n");
}

// --- Phase Recovery ---

export async function recoverPhase(workspacePath: string): Promise<RfpPhase> {
  const inv = await getFileInventory(workspacePath);
  const has = (f: string) => inv.files[f]?.exists && inv.files[f]?.size > 0;

  if (has("06_scope_freeze.md")) return "SCOPE_FREEZE";
  if (has("05_proposal.md") && has("04_client_answers.md")) return "PROPOSAL_UPDATE";
  if (has("05_proposal.md")) return "DRAFTING";
  if (has("04_client_answers.md")) return "CLIENT_ANSWERED";
  if (has("03_questions.md")) return "WAITING_CLIENT";
  if (has("02_analysis.md")) return "ANALYZING";
  return "RFP_RECEIVED";
}

export async function getFileInventory(workspacePath: string): Promise<RfpFileInventory> {
  const files: Record<string, { exists: boolean; size: number }> = {};
  for (const file of RFP_FILES) {
    try {
      const s = await stat(join(workspacePath, file));
      files[file] = { exists: true, size: s.size };
    } catch {
      files[file] = { exists: false, size: 0 };
    }
  }
  return { files };
}
