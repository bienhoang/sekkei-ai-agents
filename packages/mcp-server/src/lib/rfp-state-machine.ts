/**
 * RFP workspace state machine — deterministic phase transitions, file write rules,
 * workspace creation, status persistence, and phase recovery.
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";
import type { RfpPhase, RfpStatus, RfpFileInventory, PhaseEntry } from "../types/documents.js";
import { RFP_PHASES, RFP_FILES } from "../types/documents.js";

// --- Constants ---

const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Valid phase transitions (directed graph, includes backward edges) */
export const ALLOWED_TRANSITIONS: ReadonlyMap<RfpPhase, readonly RfpPhase[]> = new Map([
  ["RFP_RECEIVED", ["ANALYZING"]],
  ["ANALYZING", ["QNA_GENERATION", "RFP_RECEIVED"]],
  ["QNA_GENERATION", ["WAITING_CLIENT", "DRAFTING", "ANALYZING"]],
  ["WAITING_CLIENT", ["DRAFTING", "CLIENT_ANSWERED", "QNA_GENERATION"]],
  ["DRAFTING", ["PROPOSAL_UPDATE", "WAITING_CLIENT"]],
  ["CLIENT_ANSWERED", ["PROPOSAL_UPDATE", "ANALYZING", "QNA_GENERATION"]],
  ["PROPOSAL_UPDATE", ["SCOPE_FREEZE", "QNA_GENERATION", "CLIENT_ANSWERED"]],
  ["SCOPE_FREEZE", ["PROPOSAL_UPDATE"]],
]);

/** Backward transition edges — require explicit intent */
export const BACKWARD_TRANSITIONS = new Set<string>([
  "ANALYZING->RFP_RECEIVED",
  "QNA_GENERATION->ANALYZING",
  "WAITING_CLIENT->QNA_GENERATION",
  "DRAFTING->WAITING_CLIENT",
  "CLIENT_ANSWERED->ANALYZING",
  "CLIENT_ANSWERED->QNA_GENERATION",
  "PROPOSAL_UPDATE->QNA_GENERATION",
  "PROPOSAL_UPDATE->CLIENT_ANSWERED",
  "SCOPE_FREEZE->PROPOSAL_UPDATE",
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

/** Default next_action text per phase — auto-set on transition */
export const PHASE_NEXT_ACTION: ReadonlyMap<RfpPhase, string> = new Map([
  ["RFP_RECEIVED", "Paste RFP content into 01_raw_rfp.md"],
  ["ANALYZING", "Run deep analysis on RFP"],
  ["QNA_GENERATION", "Review questions, send to client or BUILD_NOW"],
  ["WAITING_CLIENT", "Paste client answers or BUILD_NOW"],
  ["DRAFTING", "Draft proposal with assumptions"],
  ["CLIENT_ANSWERED", "Analyze client answers impact"],
  ["PROPOSAL_UPDATE", "Generate/update proposal"],
  ["SCOPE_FREEZE", "Review scope freeze checklist"],
]);

/** Required non-empty files before entering a phase (forward only) */
const PHASE_REQUIRED_CONTENT: ReadonlyMap<RfpPhase, readonly string[]> = new Map([
  ["ANALYZING", ["01_raw_rfp.md"]],
  ["QNA_GENERATION", ["02_analysis.md"]],
  ["CLIENT_ANSWERED", ["04_client_answers.md"]],
  ["PROPOSAL_UPDATE", ["02_analysis.md"]],
  ["SCOPE_FREEZE", ["05_proposal.md"]],
]);

export async function validatePhaseContent(
  workspacePath: string, targetPhase: RfpPhase,
): Promise<string | null> {
  const required = PHASE_REQUIRED_CONTENT.get(targetPhase);
  if (!required) return null;
  const inv = await getFileInventory(workspacePath);
  for (const file of required) {
    if (!inv.files[file]?.exists || inv.files[file]?.size === 0) {
      return `Cannot enter ${targetPhase}: ${file} is empty. Write content first.`;
    }
  }
  return null;
}

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

export function isBackwardTransition(from: RfpPhase, to: RfpPhase): boolean {
  return BACKWARD_TRANSITIONS.has(`${from}->${to}`);
}

// --- Workspace Creation ---

export async function createWorkspace(basePath: string, projectName: string): Promise<string> {
  validateProjectName(projectName);
  const wsPath = join(basePath, DEFAULT_WORKSPACE_DIR, "01-rfp");
  await mkdir(wsPath, { recursive: true });

  const now = new Date().toISOString().slice(0, 10);
  const initialStatus: RfpStatus = {
    project: projectName,
    phase: "RFP_RECEIVED",
    last_update: now,
    next_action: "Paste RFP content into 01_raw_rfp.md",
    blocking_issues: [],
    assumptions: [],
    qna_round: 0,
    phase_history: [{ phase: "RFP_RECEIVED", entered: now }],
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

  // Parse qna_round (backward compat: default 0)
  const qnaRound = data.qna_round ? parseInt(data.qna_round as string, 10) : 0;

  // Parse phase_history (backward compat: default [])
  let phaseHistory: PhaseEntry[] = [];
  if (data.phase_history && Array.isArray(data.phase_history)) {
    // phase_history is stored as YAML list of "phase:date:reason" strings
    phaseHistory = (data.phase_history as string[]).map(entry => {
      const parts = entry.split("|");
      return {
        phase: parts[0] as RfpPhase,
        entered: parts[1] ?? "",
        ...(parts[2] ? { reason: parts[2] } : {}),
      };
    });
  }

  return {
    project: (data.project as string) ?? "",
    phase: phase as RfpPhase,
    last_update: (data.last_update as string) ?? "",
    next_action: (data.next_action as string) ?? "",
    blocking_issues: (data.blocking_issues as string[]) ?? [],
    assumptions: (data.assumptions as string[]) ?? [],
    qna_round: qnaRound,
    phase_history: phaseHistory,
  };
}

function sanitizeYamlScalar(v: string): string {
  return v.replace(/[\r\n|]/g, " ");
}

function serializeStatusYaml(status: RfpStatus): string {
  const lines = [
    "---",
    `project: ${sanitizeYamlScalar(status.project)}`,
    `phase: ${status.phase}`,
    `last_update: ${status.last_update}`,
    `next_action: ${sanitizeYamlScalar(status.next_action)}`,
    "blocking_issues:",
    ...status.blocking_issues.map(i => `  - ${sanitizeYamlScalar(i)}`),
    "assumptions:",
    ...status.assumptions.map(a => `  - ${sanitizeYamlScalar(a)}`),
    `qna_round: ${status.qna_round}`,
    "phase_history:",
    ...status.phase_history.map(e =>
      `  - ${e.phase}|${e.entered}${e.reason ? `|${sanitizeYamlScalar(e.reason)}` : ""}`
    ),
    "---",
    "",
  ];
  return lines.join("\n");
}

// --- History & Navigation ---

export async function getPhaseHistory(workspacePath: string): Promise<PhaseEntry[]> {
  const status = await readStatus(workspacePath);
  return status.phase_history;
}

export async function getPreviousPhase(workspacePath: string): Promise<RfpPhase | null> {
  const status = await readStatus(workspacePath);
  if (status.phase_history.length < 2) return null;
  return status.phase_history[status.phase_history.length - 2].phase;
}

// --- Decision Logging ---

export async function appendDecision(
  workspacePath: string,
  from: RfpPhase,
  to: RfpPhase,
  reason?: string,
): Promise<void> {
  const filePath = join(workspacePath, "07_decisions.md");
  const now = new Date().toISOString().slice(0, 10);
  const entry = [
    `## ${now} — Phase: ${from} → ${to}`,
    `- **Decision:** ${reason ?? "Phase progression"}`,
    `- **Impact:** ${isBackwardTransition(from, to) ? "Re-entering earlier phase for revision" : "Forward progression"}`,
    "",
  ].join("\n");

  let existing = "";
  try { existing = await readFile(filePath, "utf-8"); } catch { /* new file */ }
  const separator = existing.trim() ? "\n\n" : "";
  await writeFile(filePath, existing + separator + entry, "utf-8");
  logger.debug({ from, to }, "Decision logged");
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

// --- Config Generation ---

const SYSTEM_TYPE_MAP: Record<string, string> = {
  "crud tool": "web", "crud": "web",
  "workflow system": "internal-system", "workflow": "internal-system",
  "matching platform": "web",
  "internal ops": "internal-system", "internal": "internal-system",
  "saas product": "saas", "saas": "saas",
  "e-commerce": "web", "ecommerce": "web",
  "mobile": "mobile", "api": "api", "desktop": "desktop",
  "lp": "lp", "batch": "batch",
};

function detectSystemType(analysisContent: string): string {
  const lower = analysisContent.toLowerCase();
  for (const [keyword, projectType] of Object.entries(SYSTEM_TYPE_MAP)) {
    if (lower.includes(keyword)) return projectType;
  }
  return "web";
}

interface FeatureSeed {
  id: string;
  name: string;
  display: string;
  priority?: string;
  complexity?: string;
}

function extractFeatureSeeds(proposalContent: string): FeatureSeed[] {
  const features: FeatureSeed[] = [];
  const lines = proposalContent.split("\n");
  let inFeatureSection = false;
  let foundTableRows = false;
  for (const line of lines) {
    if (/^##\s+Feature Seed/.test(line)) { inFeatureSection = true; foundTableRows = false; continue; }
    if (!inFeatureSection) continue;
    // Skip empty lines before table starts
    if (!foundTableRows && line.trim() === "") continue;
    // Skip header + separator rows
    if (line.startsWith("|") && (line.includes("---") || line.includes("ID"))) continue;
    // Data rows
    if (line.startsWith("|")) {
      foundTableRows = true;
      const cols = line.split("|").map(c => c.trim().replace(/[\r\n]/g, " ")).filter(Boolean);
      if (cols.length >= 3) {
        features.push({
          id: cols[0], name: cols[1], display: cols[2],
          ...(cols[3] ? { priority: cols[3] } : {}),
          ...(cols[4] ? { complexity: cols[4] } : {}),
        });
      }
    }
    // Empty line after table data ends section
    if (foundTableRows && line.trim() === "") break;
  }
  return features;
}

export async function generateConfigFromWorkspace(workspacePath: string): Promise<string> {
  const status = await readStatus(workspacePath);

  let analysisContent = "";
  try { analysisContent = await readFile(join(workspacePath, "02_analysis.md"), "utf-8"); } catch { /* ok */ }
  let proposalContent = "";
  try { proposalContent = await readFile(join(workspacePath, "05_proposal.md"), "utf-8"); } catch { /* ok */ }

  const projectType = detectSystemType(analysisContent);
  const features = extractFeatureSeeds(proposalContent);

  const featuresYaml = features.length > 0
    ? features.map(f =>
      `  - id: ${f.id}\n    name: ${f.name}\n    display: "${f.display}"`
    ).join("\n")
    : "  # No features detected — add manually";

  const config = [
    "# Auto-generated from RFP analysis. Review and edit before proceeding.",
    "project:",
    `  name: "${status.project}"`,
    `  type: "${projectType}"`,
    "  stack: []",
    "  team_size: 0",
    "  language: ja",
    "  keigo: 丁寧語",
    "",
    "output:",
    `  directory: ./${DEFAULT_WORKSPACE_DIR}`,
    "",
    "chain:",
    `  rfp: "01-rfp/05_proposal.md"`,
    "  requirements: { status: pending }",
    "  functions_list: { status: pending }",
    "  basic_design: { status: pending }",
    "  detail_design: { status: pending }",
    "",
    "features:",
    featuresYaml,
    "",
  ].join("\n");

  return config;
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
