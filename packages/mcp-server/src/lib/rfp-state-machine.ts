/**
 * RFP workspace state machine — deterministic phase transitions, file write rules,
 * workspace creation, status persistence, and phase recovery.
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";
import type { RfpPhase, RfpStatus, RfpFileInventory, PhaseEntry } from "../types/documents.js";
import { RFP_PHASES, RFP_FILES } from "../types/documents.js";

// --- Constants ---

const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Terminal phases — can be entered from any active phase; no forward exits except ON_HOLD. */
export const TERMINAL_PHASES = new Set<RfpPhase>(["DECLINED", "ON_HOLD", "CANCELLED"]);

/** Active (non-terminal) phases in order */
const ACTIVE_PHASES: readonly RfpPhase[] = [
  "RFP_RECEIVED", "ANALYZING", "QNA_GENERATION", "WAITING_CLIENT",
  "DRAFTING", "CLIENT_ANSWERED", "PROPOSAL_UPDATE", "SCOPE_FREEZE",
];

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
  // ON_HOLD can reactivate to any active phase
  ["ON_HOLD", ACTIVE_PHASES as RfpPhase[]],
  // DECLINED and CANCELLED are true terminal — no exits
  ["DECLINED", []],
  ["CANCELLED", []],
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
  ["DECLINED", "RFP declined — no further action"],
  ["ON_HOLD", "RFP on hold — resume when client is ready"],
  ["CANCELLED", "RFP cancelled — workspace archived"],
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
  // Any active phase can transition to terminal states
  if (TERMINAL_PHASES.has(to) && !TERMINAL_PHASES.has(from)) return true;
  // ON_HOLD can reactivate to any active phase
  if (from === "ON_HOLD" && !TERMINAL_PHASES.has(to)) return true;
  // Normal transition check
  const allowed = ALLOWED_TRANSITIONS.get(from);
  return allowed ? allowed.includes(to) : false;
}

export function isBackwardTransition(from: RfpPhase, to: RfpPhase): boolean {
  // Terminal transitions are NOT backward (they are final state entries)
  if (TERMINAL_PHASES.has(to) || TERMINAL_PHASES.has(from)) return false;
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
  // Strip frontmatter delimiters, parse inner YAML
  const inner = raw.replace(/^---\s*\n/, "").replace(/\n---\s*$/, "").replace(/\n---\s*\n?$/, "");
  const data = YAML.parse(inner) as Record<string, unknown> ?? {};

  const phase = data.phase as string;
  if (!RFP_PHASES.includes(phase as RfpPhase)) {
    throw new SekkeiError("RFP_PHASE_ERROR", `Invalid phase in status file: "${phase}"`);
  }

  // Parse qna_round (backward compat: default 0)
  const qnaRound = typeof data.qna_round === "number" ? data.qna_round : 0;

  // Parse phase_history — stored as list of pipe-delimited strings "PHASE|date|reason"
  let phaseHistory: PhaseEntry[] = [];
  if (Array.isArray(data.phase_history)) {
    phaseHistory = (data.phase_history as string[]).map(entry => {
      const parts = String(entry).split("|");
      return {
        phase: parts[0] as RfpPhase,
        entered: parts[1] ?? "",
        ...(parts[2] ? { reason: parts[2] } : {}),
      };
    });
  }

  return {
    project: String(data.project ?? ""),
    phase: phase as RfpPhase,
    last_update: String(data.last_update ?? ""),
    next_action: String(data.next_action ?? ""),
    blocking_issues: Array.isArray(data.blocking_issues) ? (data.blocking_issues as string[]) : [],
    assumptions: Array.isArray(data.assumptions) ? (data.assumptions as string[]) : [],
    qna_round: qnaRound,
    phase_history: phaseHistory,
    ...(data.deadline ? { deadline: String(data.deadline) } : {}),
    ...(data.response_due ? { response_due: String(data.response_due) } : {}),
  };
}

function serializeStatusYaml(status: RfpStatus): string {
  // Serialize phase_history entries as pipe-delimited strings before YAML stringification
  const historyStrings = status.phase_history.map(e =>
    `${e.phase}|${e.entered}${e.reason ? `|${e.reason}` : ""}`
  );

  const obj: Record<string, unknown> = {
    project: status.project,
    phase: status.phase,
    last_update: status.last_update,
    next_action: status.next_action,
    blocking_issues: status.blocking_issues,
    assumptions: status.assumptions,
    qna_round: status.qna_round,
    phase_history: historyStrings,
    ...(status.deadline ? { deadline: status.deadline } : {}),
    ...(status.response_due ? { response_due: status.response_due } : {}),
  };

  return `---\n${YAML.stringify(obj)}---\n`;
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

  let existing = "";
  try { existing = await readFile(filePath, "utf-8"); } catch { /* new file */ }

  // Count existing decision entries for unique sequence numbering
  const existingCount = (existing.match(/^## /gm) || []).length;
  const seq = String(existingCount + 1).padStart(3, "0");

  const entry = [
    `## D-${seq} ${now} — Phase: ${from} → ${to}`,
    `- **Decision:** ${reason ?? "Phase progression"}`,
    `- **Impact:** ${isBackwardTransition(from, to) ? "Re-entering earlier phase for revision" : "Forward progression"}`,
    "",
  ].join("\n");

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

const SYSTEM_TYPE_WEIGHTS: Record<string, Array<{ type: string; weight: number }>> = {
  "saas":              [{ type: "saas", weight: 3 }],
  "subscription":      [{ type: "saas", weight: 2 }],
  "multi-tenant":      [{ type: "saas", weight: 3 }],
  "tenant":            [{ type: "saas", weight: 1 }],
  "e-commerce":        [{ type: "web", weight: 3 }],
  "ecommerce":         [{ type: "web", weight: 3 }],
  "shopping cart":     [{ type: "web", weight: 2 }],
  "payment":           [{ type: "web", weight: 1 }],
  "crud tool":         [{ type: "web", weight: 3 }],
  "crud":              [{ type: "web", weight: 2 }],
  "workflow":          [{ type: "internal-system", weight: 3 }],
  "approval":          [{ type: "internal-system", weight: 2 }],
  "internal ops":      [{ type: "internal-system", weight: 3 }],
  "matching platform": [{ type: "web", weight: 3 }],
  "matching":          [{ type: "web", weight: 2 }],
  "mobile app":        [{ type: "mobile", weight: 3 }],
  "ios":               [{ type: "mobile", weight: 2 }],
  "android":           [{ type: "mobile", weight: 2 }],
  "react native":      [{ type: "mobile", weight: 2 }],
  "flutter":           [{ type: "mobile", weight: 2 }],
  "api gateway":       [{ type: "api", weight: 3 }],
  "rest api":          [{ type: "api", weight: 2 }],
  "graphql":           [{ type: "api", weight: 2 }],
  "microservice":      [{ type: "api", weight: 2 }],
  "batch processing":  [{ type: "batch", weight: 3 }],
  "batch":             [{ type: "batch", weight: 3 }],
  "etl":               [{ type: "batch", weight: 2 }],
  "data pipeline":     [{ type: "batch", weight: 2 }],
  "landing page":      [{ type: "lp", weight: 3 }],
  "lp":                [{ type: "lp", weight: 2 }],
  "desktop app":       [{ type: "desktop", weight: 3 }],
  "electron":          [{ type: "desktop", weight: 2 }],
};

function detectSystemType(analysisContent: string): string {
  const lower = analysisContent.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [keyword, entries] of Object.entries(SYSTEM_TYPE_WEIGHTS)) {
    if (lower.includes(keyword)) {
      for (const { type, weight } of entries) {
        scores[type] = (scores[type] ?? 0) + weight;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : "web";
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
    if (/^#{1,3}\s+[Ff]eature\s+[Ss]eeds?/.test(line)) { inFeatureSection = true; foundTableRows = false; continue; }
    if (!inFeatureSection) continue;
    // Skip empty lines before table starts
    if (!foundTableRows && line.trim() === "") continue;
    // Skip header + separator rows (handles English and Japanese headers)
    if (line.startsWith("|") && (line.includes("---") || /\bID\b/i.test(line) || /名前|表示/.test(line))) continue;
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

export async function recoverPhase(workspacePath: string, inventory?: RfpFileInventory): Promise<RfpPhase> {
  const inv = inventory ?? await getFileInventory(workspacePath);
  const has = (f: string) => inv.files[f]?.exists && inv.files[f]?.size > 0;

  if (has("06_scope_freeze.md")) return "SCOPE_FREEZE";
  if (has("05_proposal.md") && has("04_client_answers.md")) return "PROPOSAL_UPDATE";
  if (has("05_proposal.md")) return "DRAFTING";
  if (has("04_client_answers.md")) return "CLIENT_ANSWERED";
  if (has("03_questions.md")) return "QNA_GENERATION";
  if (has("02_analysis.md")) return "ANALYZING";
  return "RFP_RECEIVED";
}

export async function getFileInventory(workspacePath: string): Promise<RfpFileInventory> {
  const entries = await Promise.all(
    RFP_FILES.map(async (file) => {
      try {
        const s = await stat(join(workspacePath, file));
        return [file, { exists: true, size: s.size }] as const;
      } catch {
        return [file, { exists: false, size: 0 }] as const;
      }
    })
  );
  return { files: Object.fromEntries(entries) };
}
