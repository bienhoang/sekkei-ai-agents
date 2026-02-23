/**
 * Change request action handlers — implements all 9 CR actions.
 */
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createCR, readCR, writeCR, transitionCR, listCRs,
  getCRDir, isValidCRId,
} from "../lib/cr-state-machine.js";
import { computePropagationOrder } from "../lib/cr-propagation.js";
import { generateBackfillSuggestions } from "../lib/cr-backfill.js";
import { detectConflicts } from "../lib/cr-conflict-detector.js";
import { loadChainDocs } from "../lib/cross-ref-linker.js";
import { findAffectedSections, buildImpactReport } from "../lib/impact-analyzer.js";
import { validateChain } from "../lib/cross-ref-linker.js";
import { logger } from "../lib/logger.js";
import type { ChangeRequestArgs, ToolResult } from "./change-request.js";
import { ok, err } from "./change-request.js";

const execFileAsync = promisify(execFile);

function crFilePath(workspacePath: string, crId: string): string {
  return join(getCRDir(workspacePath), `${crId}.md`);
}

function requireCrId(args: ChangeRequestArgs): string {
  if (!args.cr_id) throw new Error("cr_id required for this action");
  if (!isValidCRId(args.cr_id)) throw new Error(`Invalid CR ID format: ${args.cr_id}`);
  return args.cr_id;
}

function requireConfigPath(args: ChangeRequestArgs): string {
  if (!args.config_path) throw new Error("config_path required for this action");
  return args.config_path;
}

// --- Action Handlers ---

async function handleCreate(args: ChangeRequestArgs): Promise<ToolResult> {
  if (!args.origin_doc) return err("origin_doc required for create action");
  if (!args.description) return err("description required for create action");

  let changedIds = args.changed_ids ?? [];

  // Auto-detect changed IDs from old/new content diff
  if (changedIds.length === 0 && args.old_content && args.new_content) {
    const idPattern = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG)-(\d{1,4})\b/g;
    const oldIds = new Set([...args.old_content.matchAll(idPattern)].map(m => m[0]));
    const newIds = new Set([...args.new_content.matchAll(idPattern)].map(m => m[0]));
    // IDs in new but not in old = added; IDs in both but content differs = changed
    changedIds = [...newIds].filter(id => !oldIds.has(id));
    // Also detect IDs present in both (potential updates) by checking surrounding context
    for (const id of newIds) {
      if (oldIds.has(id) && !changedIds.includes(id)) {
        // Simple heuristic: if the line containing the ID changed, it's modified
        const oldLine = args.old_content.split("\n").find(l => l.includes(id)) ?? "";
        const newLine = args.new_content.split("\n").find(l => l.includes(id)) ?? "";
        if (oldLine !== newLine) changedIds.push(id);
      }
    }
  }

  if (changedIds.length === 0) return err("changed_ids required (provide explicitly or via old_content/new_content)");

  const cr = await createCR(args.workspace_path, args.origin_doc, args.description, changedIds);
  return ok(JSON.stringify({ success: true, cr_id: cr.id, status: cr.status, changed_ids: cr.changed_ids }));
}

async function handleAnalyze(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const configPath = requireConfigPath(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "INITIATED") return err(`analyze requires INITIATED status, got ${cr.status}`);

  // Transition to ANALYZING
  await transitionCR(filePath, "ANALYZING");

  // Load chain docs and run impact analysis
  const docs = await loadChainDocs(configPath);
  const entries = findAffectedSections(cr.changed_ids, docs);
  const report = buildImpactReport(cr.changed_ids, entries);

  // Compute propagation order
  const steps = computePropagationOrder(cr.origin_doc);

  // Generate backfill suggestions (upstream docs)
  const upstreamDocs = new Map<string, string>();
  for (const step of steps) {
    if (step.direction === "upstream") {
      const content = docs.get(step.doc_type);
      if (content) upstreamDocs.set(step.doc_type, content);
    }
  }
  const originContent = docs.get(cr.origin_doc) ?? "";
  const backfill = generateBackfillSuggestions(cr.origin_doc, "", originContent, upstreamDocs);

  // Update CR with results
  const updated = await readCR(filePath);
  updated.impact_summary = `${report.total_affected_sections} affected sections across ${new Set(entries.map(e => e.doc_type)).size} documents`;
  updated.propagation_steps = steps;
  await writeCR(filePath, updated);

  // Transition to IMPACT_ANALYZED
  await transitionCR(filePath, "IMPACT_ANALYZED", "Impact analysis complete");

  return ok(JSON.stringify({
    success: true,
    impact: {
      total_affected_sections: report.total_affected_sections,
      affected_docs: report.affected_docs,
      dependency_graph: report.dependency_graph,
      suggested_actions: report.suggested_actions,
    },
    propagation_steps: steps,
    backfill_suggestions: backfill,
  }));
}

async function handleApprove(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "IMPACT_ANALYZED") return err(`approve requires IMPACT_ANALYZED status, got ${cr.status}`);

  // Detect conflicts with active CRs
  const allCRs = await listCRs(args.workspace_path);
  const conflicts = detectConflicts(cr, allCRs);

  // Save warnings (non-blocking)
  if (conflicts.length > 0) {
    const updated = await readCR(filePath);
    updated.conflict_warnings = conflicts.map(c =>
      `${c.overlap_type} overlap with ${c.cr_id}: ${c.overlapping.join(", ")}`
    );
    await writeCR(filePath, updated);
  }

  await transitionCR(filePath, "APPROVED", "Approved for propagation");
  return ok(JSON.stringify({ success: true, conflicts }));
}

async function handlePropagateNext(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "APPROVED" && cr.status !== "PROPAGATING") {
    return err(`propagate_next requires APPROVED or PROPAGATING status, got ${cr.status}`);
  }

  // Git checkpoint on first propagation call
  if (cr.status === "APPROVED") {
    try {
      await execFileAsync("git", [
        "-C", args.workspace_path, "add", "-A",
      ]);
      await execFileAsync("git", [
        "-C", args.workspace_path, "commit",
        "-m", `chore: pre-${crId} checkpoint`,
        "--allow-empty",
      ]);
      logger.info({ crId }, "Git checkpoint created before propagation");
    } catch {
      logger.warn({ crId }, "Git checkpoint skipped (not a git repo or no changes)");
    }
    await transitionCR(filePath, "PROPAGATING", "Starting propagation");
  }

  // Re-read after potential transition
  const current = await readCR(filePath);
  const idx = current.propagation_index;

  if (idx >= current.propagation_steps.length) {
    return ok(JSON.stringify({ all_steps_complete: true, total: current.propagation_steps.length }));
  }

  const step = current.propagation_steps[idx];

  // Build instruction based on direction
  let instruction: string;
  if (step.direction === "upstream") {
    instruction = `UPSTREAM SUGGESTION: Review and update ${step.doc_type} to include/update IDs referenced in the change. This is a non-destructive suggestion.`;
  } else {
    instruction = `DOWNSTREAM CASCADE: Regenerate ${step.doc_type} document to reflect the upstream changes. Use generate_document tool with updated upstream content.`;
  }

  // Mark step done and advance index
  current.propagation_steps[idx] = { ...step, status: "done", note: args.note };
  current.propagation_index = idx + 1;
  current.updated = new Date().toISOString().slice(0, 10);
  await writeCR(filePath, current);

  return ok(JSON.stringify({
    step: idx + 1,
    total: current.propagation_steps.length,
    direction: step.direction,
    doc_type: step.doc_type,
    instruction,
    all_steps_complete: idx + 1 >= current.propagation_steps.length,
  }));
}

async function handleValidate(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const configPath = requireConfigPath(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") return err(`validate requires PROPAGATING status, got ${cr.status}`);

  // Check all steps are done or skipped
  const incomplete = cr.propagation_steps.filter(s => s.status === "pending");
  if (incomplete.length > 0) {
    return err(`${incomplete.length} propagation steps still pending: ${incomplete.map(s => s.doc_type).join(", ")}`);
  }

  // Validate chain cross-references
  const chainReport = await validateChain(configPath);
  const issues = chainReport.orphaned_ids.length + chainReport.missing_ids.length;

  await transitionCR(filePath, "VALIDATED", `Chain validation: ${issues} issues`);

  return ok(JSON.stringify({
    success: true,
    chain_issues: issues,
    orphaned_ids: chainReport.orphaned_ids,
    missing_ids: chainReport.missing_ids,
    suggestions: chainReport.suggestions,
  }));
}

async function handleComplete(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "VALIDATED") return err(`complete requires VALIDATED status, got ${cr.status}`);

  await transitionCR(filePath, "COMPLETED", "Change request completed");
  return ok(JSON.stringify({ success: true, cr_id: crId }));
}

async function handleStatus(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);
  const cr = await readCR(filePath);
  return ok(JSON.stringify(cr));
}

async function handleList(args: ChangeRequestArgs): Promise<ToolResult> {
  const crs = await listCRs(args.workspace_path);
  let filtered = crs;
  if (args.status_filter) {
    filtered = crs.filter(cr => cr.status === args.status_filter);
  }
  const summaries = filtered.map(cr => ({
    id: cr.id, status: cr.status, origin_doc: cr.origin_doc,
    changed_ids: cr.changed_ids, updated: cr.updated,
  }));
  return ok(JSON.stringify(summaries));
}

async function handleCancel(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);
  await transitionCR(filePath, "CANCELLED", args.reason ?? "Cancelled by user");
  return ok(JSON.stringify({ success: true, cr_id: crId }));
}

// --- Dispatch ---

export async function handleCRAction(args: ChangeRequestArgs): Promise<ToolResult> {
  switch (args.action) {
    case "create": return handleCreate(args);
    case "analyze": return handleAnalyze(args);
    case "approve": return handleApprove(args);
    case "propagate_next": return handlePropagateNext(args);
    case "validate": return handleValidate(args);
    case "complete": return handleComplete(args);
    case "status": return handleStatus(args);
    case "list": return handleList(args);
    case "cancel": return handleCancel(args);
    default: return err(`Unknown action: ${args.action}`);
  }
}
