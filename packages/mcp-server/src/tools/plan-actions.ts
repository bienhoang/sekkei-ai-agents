/**
 * Generation plan action handlers — dispatch + real implementations.
 * Persistence delegates to lib/plan-state.ts (YAML layer).
 */
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { PlanArgs, ToolResult } from "./plan.js";
import { ok, err } from "./plan.js";
import {
  getPlanDir,
  generatePlanId,
  readPlan,
  readPhase,
  writePlan,
  writePhaseFile,
  listPlans,
  findActivePlan,
  updatePhaseStatus,
  assembleUpstream,
} from "../lib/plan-state.js";
import { SekkeiError } from "../lib/errors.js";
import { resolveOutputPath } from "../lib/resolve-output-path.js";
import type { GenerationPlan, PlanPhase, PlanFeature } from "../types/plan.js";
import type { DocType } from "../types/documents.js";

// --- Constants ---

const VALID_DOC_TYPES = ["basic-design", "detail-design", "test-spec"] as const;
type ValidDocType = (typeof VALID_DOC_TYPES)[number];

/** Shared sections by doc-type */
const SHARED_SECTIONS: Record<string, string[]> = {
  "basic-design": [
    "system-architecture",
    "database-design",
    "external-interface",
    "non-functional-design",
    "technology-rationale",
  ],
  "detail-design": ["system-architecture", "database-design"],
};

/** Per-feature sections by doc-type */
const FEATURE_SECTIONS: Record<string, string[]> = {
  "basic-design": ["basic-design.md", "screen-design.md"],
  "detail-design": ["module-design", "class-design", "api-detail", "processing-flow"],
  "test-spec": ["unit-test", "integration-test", "system-test", "acceptance-test"],
};

// --- Config Helper ---

async function readSplitConfig(
  configPath: string,
  docType: string,
): Promise<Record<string, string[]>> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    throw new SekkeiError("PLAN_ERROR", `Config file not found: ${configPath}`);
  }

  const config = parse(raw) as Record<string, unknown>;
  const split = (config.split ?? {}) as Record<string, unknown>;
  const docConfig = split[docType];

  if (!docConfig) {
    throw new SekkeiError("PLAN_ERROR", `Split mode not configured for ${docType}`);
  }

  // Return a normalized split config map
  const shared = SHARED_SECTIONS[docType] ?? [];
  const featureSections = FEATURE_SECTIONS[docType] ?? [];
  return { shared, feature: featureSections };
}

// --- Phase Builder ---

function buildPhases(docType: ValidDocType, features: PlanFeature[]): PlanPhase[] {
  const phases: PlanPhase[] = [];
  const hasShared = docType !== "test-spec";

  if (hasShared) {
    phases.push({
      number: 1,
      name: "Shared Sections",
      type: "shared",
      status: "pending",
      file: "phase-01-shared-sections.md",
    });
  }

  const sorted = [...features].sort((a, b) => a.priority - b.priority);
  for (const [i, feature] of sorted.entries()) {
    const num = hasShared ? i + 2 : i + 1;
    const numStr = String(num).padStart(2, "0");
    phases.push({
      number: num,
      name: feature.name,
      type: "per-feature",
      feature_id: feature.id,
      status: "pending",
      file: `phase-${numStr}-${feature.id}.md`,
    });
  }

  const finalNum = phases.length + 1;
  phases.push({
    number: finalNum,
    name: "Validation",
    type: "validation",
    status: "pending",
    file: "phase-final-validation.md",
  });

  return phases;
}

// --- Action Handlers ---

async function handleCreate(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, config_path, doc_type, features, survey_data } = args;

  if (!doc_type || !VALID_DOC_TYPES.includes(doc_type as ValidDocType)) {
    return err(`doc_type must be one of: ${VALID_DOC_TYPES.join(", ")}`);
  }
  if (!config_path) {
    return err("config_path is required for create");
  }
  if (!features || features.length === 0) {
    return err("features array is required for create");
  }

  const splitConfig = await readSplitConfig(config_path, doc_type);

  const active = await findActivePlan(workspace_path, doc_type);
  if (active) {
    return err(`Active plan already exists for ${doc_type}. Complete or cancel it first.`);
  }

  const planId = generatePlanId(doc_type);
  const plansDir = getPlanDir(workspace_path);
  const planDir = join(plansDir, planId);
  await mkdir(planDir, { recursive: true });

  const planFeatures: PlanFeature[] = features.map(f => ({
    id: f.id,
    name: f.name,
    complexity: f.complexity,
    priority: f.priority,
  }));

  const phases = buildPhases(doc_type as ValidDocType, planFeatures);
  const now = new Date().toISOString().slice(0, 10);

  const plan: GenerationPlan = {
    plan_id: planId,
    title: `${doc_type} Generation Plan`,
    doc_type,
    status: "pending",
    features: planFeatures,
    feature_count: planFeatures.length,
    split_mode: true,
    created: now,
    updated: now,
    phases,
    survey: survey_data,
  };

  await writePlan(planDir, plan);

  // Build per-feature lookup for writePhaseFile
  const featureMap = new Map(planFeatures.map(f => [f.id, f]));

  for (const phase of phases) {
    const feature = phase.feature_id ? featureMap.get(phase.feature_id) : undefined;
    await writePhaseFile(planDir, phase, doc_type, splitConfig, feature);
  }

  return ok(JSON.stringify({
    success: true,
    plan_id: planId,
    plan_path: join(planDir, "plan.md"),
    phases: phases.map(p => ({ number: p.number, name: p.name, type: p.type, file: p.file })),
  }, null, 2));
}

async function handleStatus(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, plan_id } = args;
  if (!plan_id) return err("plan_id is required for status");

  const plansDir = getPlanDir(workspace_path);
  const planFile = join(plansDir, plan_id, "plan.md");

  try {
    const plan = await readPlan(planFile);
    return ok(JSON.stringify(plan, null, 2));
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Failed to read plan: ${plan_id}`;
    return err(msg);
  }
}

async function handleList(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path } = args;
  const plans = await listPlans(workspace_path);

  const summary = plans.map(p => {
    const completed = p.phases.filter(ph => ph.status === "completed" || ph.status === "skipped").length;
    return {
      plan_id: p.plan_id ?? "unknown",
      doc_type: p.doc_type,
      status: p.status,
      feature_count: p.feature_count,
      phases_completed: completed,
      created: p.created,
    };
  });

  return ok(JSON.stringify(summary, null, 2));
}

async function handleDetect(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, config_path, doc_type } = args;
  if (!doc_type) return err("doc_type is required for detect");
  if (!config_path) return err("config_path is required for detect");

  // 1. Check split config
  let hasSplitConfig = false;
  try {
    await readSplitConfig(config_path, doc_type);
    hasSplitConfig = true;
  } catch {
    hasSplitConfig = false;
  }

  if (!hasSplitConfig) {
    return ok(JSON.stringify({
      should_trigger: false,
      reason: `Split mode not configured for ${doc_type}`,
      feature_count: 0,
      has_active_plan: false,
    }, null, 2));
  }

  // 2. Count 大分類 features in functions-list.md
  let featureCount = 0;
  try {
    const functionsListPath = join(workspace_path, "sekkei-docs", "functions-list.md");
    const content = await readFile(functionsListPath, "utf-8");
    const matches = content.match(/^## .+/gm);
    featureCount = matches ? matches.length : 0;
  } catch {
    featureCount = 0;
  }

  // 3. Check active plan
  const activePlan = await findActivePlan(workspace_path, doc_type);
  const hasActivePlan = activePlan !== null;

  const shouldTrigger = hasSplitConfig && featureCount >= 3 && !hasActivePlan;
  const reason = !hasSplitConfig
    ? `Split mode not configured for ${doc_type}`
    : featureCount < 3
      ? `Feature count (${featureCount}) below threshold of 3`
      : hasActivePlan
        ? "Active plan already exists"
        : `${featureCount} features detected — split mode recommended`;

  return ok(JSON.stringify({
    should_trigger: shouldTrigger,
    reason,
    feature_count: featureCount,
    has_active_plan: hasActivePlan,
  }, null, 2));
}

async function handleUpdate(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, plan_id, phase_number, phase_status } = args;
  if (!plan_id) return err("plan_id is required for update");
  if (phase_number == null) return err("phase_number is required for update");
  if (!phase_status) return err("phase_status is required for update");

  const plansDir = getPlanDir(workspace_path);
  const planDir = join(plansDir, plan_id);

  try {
    await updatePhaseStatus(planDir, phase_number, phase_status);
    const plan = await readPlan(join(planDir, "plan.md"));
    return ok(JSON.stringify({
      plan_id,
      status: plan.status,
      phases: plan.phases.map(p => ({ number: p.number, name: p.name, status: p.status })),
    }, null, 2));
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Failed to update phase ${phase_number}`;
    return err(msg);
  }
}

async function handleExecute(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, plan_id, phase_number } = args;
  if (!plan_id) return err("plan_id is required for execute");
  if (phase_number == null) return err("phase_number is required for execute");

  const plansDir = getPlanDir(workspace_path);
  const planDir = join(plansDir, plan_id);
  const planFile = join(planDir, "plan.md");

  let plan: GenerationPlan;
  try {
    plan = await readPlan(planFile);
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Failed to read plan: ${plan_id}`;
    return err(msg);
  }

  if (plan.status !== "pending" && plan.status !== "in_progress") {
    return err(`Plan ${plan_id} is ${plan.status} — cannot execute phases`);
  }

  // Transition pending → in_progress
  if (plan.status === "pending") {
    plan.status = "in_progress";
    plan.updated = new Date().toISOString().slice(0, 10);
    await writePlan(planDir, plan);
  }

  const phaseEntry = plan.phases.find(p => p.number === phase_number);
  if (!phaseEntry) {
    return err(`Phase ${phase_number} not found in plan ${plan_id}`);
  }

  if (phaseEntry.status === "completed" || phaseEntry.status === "skipped") {
    return ok(JSON.stringify({ already_done: true, status: phaseEntry.status }, null, 2));
  }

  // Read full phase file for survey data
  const phaseFilePath = join(planDir, phaseEntry.file);
  let phaseDetail: PlanPhase;
  try {
    phaseDetail = await readPhase(phaseFilePath);
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Failed to read phase file: ${phaseEntry.file}`;
    return err(msg);
  }

  // Mark phase as in_progress
  await updatePhaseStatus(planDir, phase_number, "in_progress");

  const completed = plan.phases.filter(p => p.status === "completed" || p.status === "skipped").length;
  const phaseInfo = {
    number: phaseEntry.number,
    name: phaseEntry.name,
    type: phaseEntry.type,
    feature_id: phaseEntry.feature_id ?? null,
  };

  // Validation phase: return validate_document command
  if (phaseDetail.type === "validation") {
    const manifestPath = join(workspace_path, "sekkei-docs", "manifest.yaml");
    return ok(JSON.stringify({
      phase: phaseInfo,
      command: {
        tool: "validate_document",
        args: { manifest_path: manifestPath },
      },
      total_phases: plan.phases.length,
      completed_phases: completed,
    }, null, 2));
  }

  // Assemble upstream content
  const upstream = await assembleUpstream(
    workspace_path,
    plan.doc_type,
    phaseDetail.type,
    phaseEntry.feature_id,
  );

  // Build generate_document command args
  const scope = phaseDetail.type === "shared" ? "shared" : "feature";
  const featureName = phaseEntry.feature_id ?? undefined;

  // Resolve output path relative to sekkei-docs
  const relPath = resolveOutputPath(plan.doc_type as DocType, scope, featureName);
  const outputPath = relPath ? join(workspace_path, "sekkei-docs", relPath) : undefined;

  return ok(JSON.stringify({
    phase: phaseInfo,
    command: {
      tool: "generate_document",
      args: {
        doc_type: plan.doc_type,
        scope,
        feature_name: featureName ?? null,
        upstream_content: upstream,
      },
    },
    output_path: outputPath,
    survey_data: plan.survey ?? null,
    total_phases: plan.phases.length,
    completed_phases: completed,
  }, null, 2));
}

async function handleCancel(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, plan_id } = args;
  if (!plan_id) return err("plan_id is required for cancel");

  const plansDir = getPlanDir(workspace_path);
  const planDir = join(plansDir, plan_id);
  const planFile = join(planDir, "plan.md");

  let plan: GenerationPlan;
  try {
    plan = await readPlan(planFile);
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Plan not found: ${plan_id}`;
    return err(msg);
  }

  if (plan.status === "completed") {
    return err(`Cannot cancel a completed plan: ${plan_id}`);
  }
  if (plan.status === "cancelled") {
    return err(`Plan already cancelled: ${plan_id}`);
  }

  plan.status = "cancelled";
  plan.updated = new Date().toISOString().slice(0, 10);
  await writePlan(planDir, plan);

  return ok(JSON.stringify({ plan_id, status: "cancelled" }, null, 2));
}

// --- Dispatch ---

export async function handlePlanAction(args: PlanArgs): Promise<ToolResult> {
  switch (args.action) {
    case "create":  return handleCreate(args);
    case "status":  return handleStatus(args);
    case "list":    return handleList(args);
    case "execute": return handleExecute(args);
    case "update":  return handleUpdate(args);
    case "detect":  return handleDetect(args);
    case "cancel":  return handleCancel(args);
    default:        return err(`Unknown action: ${args.action}`);
  }
}
