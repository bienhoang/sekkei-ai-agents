/**
 * Generation plan YAML persistence layer.
 * Mirrors cr-state-machine.ts patterns: readFile → parse frontmatter → writeFile.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml"; // stringify used in writePlan body
import { SekkeiError } from "./errors.js";
import { renderPhaseFile } from "./plan-phase-template.js";
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";
import { filterByFeature } from "./upstream-filter.js";
import type { GenerationPlan, PlanPhase, PhaseStatus, PlanFeature, PhaseType, SectionStatus, PhaseCheckpoint } from "../types/plan.js";
import { PLAN_STATUSES } from "../types/plan.js";

// --- Path Helpers ---

export function getPlanDir(basePath: string): string {
  return join(basePath, DEFAULT_WORKSPACE_DIR, "plans");
}

export function generatePlanId(docType: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${docType}-generation`;
}

// --- YAML Persistence ---

export async function readPlan(planFilePath: string): Promise<GenerationPlan> {
  let raw: string;
  try {
    raw = await readFile(planFilePath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Plan file not found: ${planFilePath}`);
  }

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new SekkeiError("PLAN_ERROR", "Invalid plan file: missing YAML frontmatter");
  }

  const data = parse(fmMatch[1]) as Record<string, unknown>;
  const status = data.status as string;
  if (!PLAN_STATUSES.includes(status as GenerationPlan["status"])) {
    throw new SekkeiError("PLAN_ERROR", `Invalid plan status: "${status}"`);
  }

  return {
    plan_id: (data.plan_id as string) ?? undefined,
    title: (data.title as string) ?? "",
    doc_type: (data.doc_type as string) ?? "",
    status: status as GenerationPlan["status"],
    features: (data.features as PlanFeature[]) ?? [],
    feature_count: (data.feature_count as number) ?? 0,
    split_mode: (data.split_mode as boolean) ?? true,
    created: (data.created as string) ?? "",
    updated: (data.updated as string) ?? "",
    phases: (data.phases as PlanPhase[]) ?? [],
    survey: (data.survey as Record<string, unknown>) ?? undefined,
  };
}

export async function writePlan(planDir: string, plan: GenerationPlan): Promise<void> {
  const frontmatter = stringify({
    plan_id: plan.plan_id ?? null,
    title: plan.title,
    doc_type: plan.doc_type,
    status: plan.status,
    features: plan.features,
    feature_count: plan.feature_count,
    split_mode: plan.split_mode,
    created: plan.created,
    updated: plan.updated,
    phases: plan.phases,
    survey: plan.survey ?? null,
  });

  const phaseRows = plan.phases.map(p => {
    const featureId = p.feature_id ?? "—";
    const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
    return `| ${p.number} | ${p.name} | ${featureId} | ${statusLabel} | [phase-${String(p.number).padStart(2, "0")}](./${p.file}) |`;
  });

  const body = [
    `# ${plan.title}`,
    "",
    "## Overview",
    `- **Doc type:** ${plan.doc_type}`,
    `- **Features:** ${plan.feature_count} selected`,
    "- **Split mode:** enabled",
    `- **Created:** ${plan.created}`,
    "",
    "## Phases",
    "",
    "| # | Phase | Feature | Status | File |",
    "|---|-------|---------|--------|------|",
    ...phaseRows,
    "",
    "## Dependencies",
    "- functions-list.md (upstream)",
    "- requirements.md (upstream)",
    "- sekkei.config.yaml (split config)",
  ].join("\n");

  await writeFile(join(planDir, "plan.md"), `---\n${frontmatter}---\n\n${body}\n`, "utf-8");
}

export async function readPhase(phaseFilePath: string): Promise<PlanPhase> {
  let raw: string;
  try {
    raw = await readFile(phaseFilePath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Phase file not found: ${phaseFilePath}`);
  }

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new SekkeiError("PLAN_ERROR", "Invalid phase file: missing YAML frontmatter");
  }

  const data = parse(fmMatch[1]) as Record<string, unknown>;
  return {
    number: (data.phase as number) ?? 0,
    name: (data.name as string) ?? "",
    type: (data.type as PlanPhase["type"]) ?? "per-feature",
    feature_id: (data.feature_id as string) ?? undefined,
    status: (data.status as PhaseStatus) ?? "pending",
    file: "",
  };
}

export async function writePhaseFile(
  planDir: string,
  phase: PlanPhase,
  docType: string,
  splitConfig: Record<string, string[]>,
  feature?: PlanFeature,
): Promise<void> {
  const content = renderPhaseFile(phase, docType, splitConfig, feature);
  await writeFile(join(planDir, phase.file), content, "utf-8");
}

// --- Query ---

export async function listPlans(basePath: string): Promise<GenerationPlan[]> {
  const plansDir = getPlanDir(basePath);
  let entries: string[];
  try {
    entries = await readdir(plansDir);
  } catch {
    return [];
  }

  const plans: GenerationPlan[] = [];
  for (const entry of entries) {
    const planFile = join(plansDir, entry, "plan.md");
    try {
      const plan = await readPlan(planFile);
      plans.push(plan);
    } catch {
      // skip unreadable plan files
    }
  }

  return plans.sort((a, b) => a.created.localeCompare(b.created));
}

export async function findActivePlan(
  basePath: string,
  docType: string,
): Promise<GenerationPlan | null> {
  const plansDir = getPlanDir(basePath);
  let entries: string[];
  try {
    entries = await readdir(plansDir);
  } catch {
    return null;
  }

  const suffix = `-${docType}-generation`;
  for (const entry of entries) {
    if (!entry.endsWith(suffix)) continue;
    const planFile = join(plansDir, entry, "plan.md");
    try {
      const plan = await readPlan(planFile);
      if (plan.status === "pending" || plan.status === "in_progress") {
        return plan;
      }
    } catch {
      // skip
    }
  }
  return null;
}

export async function updatePhaseStatus(
  planDir: string,
  phaseNumber: number,
  status: PhaseStatus,
): Promise<void> {
  const planFile = join(planDir, "plan.md");
  const plan = await readPlan(planFile);

  const phase = plan.phases.find(p => p.number === phaseNumber);
  if (!phase) {
    throw new SekkeiError("PLAN_ERROR", `Phase ${phaseNumber} not found in plan`);
  }
  phase.status = status;

  const allDone = plan.phases.every(p => p.status === "completed" || p.status === "skipped");
  if (allDone) plan.status = "completed";
  plan.updated = new Date().toISOString().slice(0, 10);

  await writePlan(planDir, plan);

  // Also update phase file frontmatter
  const phaseFilePath = join(planDir, phase.file);
  try {
    const raw = await readFile(phaseFilePath, "utf-8");
    const updated = raw.replace(
      /^(---\n[\s\S]*?\nstatus:\s*)\S+(\n[\s\S]*?---)/m,
      `$1${status}$2`,
    );
    await writeFile(phaseFilePath, updated, "utf-8");
  } catch {
    // phase file update is best-effort
  }
}

// --- Section & Checkpoint Persistence ---

/** Parse YAML frontmatter from a phase file, returning data and body */
function parsePhaseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { data: {}, body: raw };
  }
  const data = parse(fmMatch[1]) as Record<string, unknown>;
  return { data, body: fmMatch[2] };
}

/** Write updated frontmatter back to a phase file, preserving body */
function rebuildPhaseFile(data: Record<string, unknown>, body: string): string {
  const fm = stringify(data);
  return `---\n${fm}---\n${body}`;
}

/**
 * Update or create a section status entry in a phase file's YAML frontmatter.
 * Upserts by sectionId — last write wins.
 */
export async function updateSectionStatus(
  planDir: string,
  phaseNumber: number,
  sectionId: string,
  status: PhaseStatus,
  metadata?: { name?: string; last_id?: string },
): Promise<SectionStatus[]> {
  // Find phase file by reading plan
  const plan = await readPlan(join(planDir, "plan.md"));
  const phaseEntry = plan.phases.find(p => p.number === phaseNumber);
  if (!phaseEntry) {
    throw new SekkeiError("PLAN_ERROR", `Phase ${phaseNumber} not found in plan`);
  }

  const phaseFilePath = join(planDir, phaseEntry.file);
  let raw: string;
  try {
    raw = await readFile(phaseFilePath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Phase file not found: ${phaseEntry.file}`);
  }

  const { data, body } = parsePhaseFrontmatter(raw);
  const sections = (data.sections as SectionStatus[] | undefined) ?? [];

  // Upsert section by id
  const existing = sections.find(s => s.id === sectionId);
  if (existing) {
    existing.status = status;
    if (metadata?.name) existing.name = metadata.name;
    if (metadata?.last_id) existing.last_id = metadata.last_id;
    if (status === "completed") existing.completed_at = new Date().toISOString();
  } else {
    const newSection: SectionStatus = {
      id: sectionId,
      name: metadata?.name ?? sectionId,
      status,
      ...(metadata?.last_id ? { last_id: metadata.last_id } : {}),
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    };
    sections.push(newSection);
  }

  data.sections = sections;
  await writeFile(phaseFilePath, rebuildPhaseFile(data, body), "utf-8");
  return sections;
}

/**
 * Save checkpoint data to a phase file's YAML frontmatter.
 * Deep-merges — does not overwrite existing fields unless explicitly provided.
 */
export async function saveCheckpoint(
  planDir: string,
  phaseNumber: number,
  checkpoint: Partial<PhaseCheckpoint>,
): Promise<PhaseCheckpoint> {
  const plan = await readPlan(join(planDir, "plan.md"));
  const phaseEntry = plan.phases.find(p => p.number === phaseNumber);
  if (!phaseEntry) {
    throw new SekkeiError("PLAN_ERROR", `Phase ${phaseNumber} not found in plan`);
  }

  const phaseFilePath = join(planDir, phaseEntry.file);
  let raw: string;
  try {
    raw = await readFile(phaseFilePath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Phase file not found: ${phaseEntry.file}`);
  }

  const { data, body } = parsePhaseFrontmatter(raw);
  const existing = (data.checkpoint as PhaseCheckpoint | undefined) ?? {
    last_assigned_ids: {},
  };

  // Deep-merge
  const merged: PhaseCheckpoint = {
    last_assigned_ids: { ...existing.last_assigned_ids, ...checkpoint.last_assigned_ids },
    ...(checkpoint.tokens_used != null ? { tokens_used: checkpoint.tokens_used } : existing.tokens_used != null ? { tokens_used: existing.tokens_used } : {}),
    decisions: checkpoint.decisions
      ? [...(existing.decisions ?? []), ...checkpoint.decisions].slice(-50)
      : existing.decisions,
  };

  data.checkpoint = merged;
  await writeFile(phaseFilePath, rebuildPhaseFile(data, body), "utf-8");
  return merged;
}

/**
 * Read checkpoint data from a phase file's YAML frontmatter.
 * Returns null if no checkpoint has been saved.
 */
export async function getCheckpoint(
  planDir: string,
  phaseNumber: number,
): Promise<PhaseCheckpoint | null> {
  const plan = await readPlan(join(planDir, "plan.md"));
  const phaseEntry = plan.phases.find(p => p.number === phaseNumber);
  if (!phaseEntry) {
    throw new SekkeiError("PLAN_ERROR", `Phase ${phaseNumber} not found in plan`);
  }

  const phaseFilePath = join(planDir, phaseEntry.file);
  let raw: string;
  try {
    raw = await readFile(phaseFilePath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Phase file not found: ${phaseEntry.file}`);
  }

  const { data } = parsePhaseFrontmatter(raw);
  return (data.checkpoint as PhaseCheckpoint | undefined) ?? null;
}

// --- Upstream Assembly ---

/** Read a file and return its content, or a NOT FOUND marker on failure. */
async function tryReadFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return `[FILE NOT FOUND: ${filePath}]`;
  }
}

/** Read all .md files in a directory, concatenated. Skips unreadable entries. */
async function readDirMarkdown(dirPath: string): Promise<string> {
  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return `[DIR NOT FOUND: ${dirPath}]`;
  }

  const parts: string[] = [];
  for (const entry of entries.filter(e => e.endsWith(".md"))) {
    try {
      const content = await readFile(join(dirPath, entry), "utf-8");
      parts.push(content);
    } catch {
      parts.push(`[FILE NOT FOUND: ${join(dirPath, entry)}]`);
    }
  }
  return parts.join("\n\n");
}

/**
 * Assemble upstream context content for a phase.
 * Reads workspace-docs/ files relative to workspacePath.
 */
export async function assembleUpstream(
  workspacePath: string,
  docType: string,
  phaseType: PhaseType,
  featureId?: string,
  featureName?: string,
): Promise<string> {
  if (phaseType === "validation") return "";

  const docsBase = join(workspacePath, DEFAULT_WORKSPACE_DIR);
  const requirementsPath = join(docsBase, "requirements.md");
  const functionsListPath = join(docsBase, "functions-list.md");

  let requirements = await tryReadFile(requirementsPath);
  let functionsList = await tryReadFile(functionsListPath);

  // Phase 1: Filter upstream by feature for per-feature phases
  if (phaseType === "per-feature" && featureId) {
    requirements = filterByFeature(requirements, featureId, featureName);
    functionsList = filterByFeature(functionsList, featureId, featureName);
  }

  const baseUpstream = `${requirements}\n\n${functionsList}`;

  if (phaseType === "shared") {
    return baseUpstream;
  }

  // per-feature: base + shared dir + feature-specific docs
  const sharedContent = await readDirMarkdown(join(docsBase, "shared"));
  const parts: string[] = [baseUpstream, sharedContent];

  if (featureId) {
    const featureDir = join(docsBase, "features", featureId);
    if (docType === "detail-design") {
      parts.push(await tryReadFile(join(featureDir, "basic-design.md")));
      parts.push(await tryReadFile(join(featureDir, "screen-design.md")));
    } else if (docType === "test-spec") {
      parts.push(await tryReadFile(join(featureDir, "detail-design.md")));
      parts.push(await tryReadFile(join(featureDir, "basic-design.md")));
    }
  }

  return parts.filter(Boolean).join("\n\n");
}
