/**
 * Propagation-related CR action handlers: analyze, propagate_next, validate.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readCR, writeCR, transitionCR } from "../lib/cr-state-machine.js";
import { computePropagationOrder } from "../lib/cr-propagation.js";
import { generateBackfillSuggestions } from "../lib/cr-backfill.js";
import { loadChainDocs, validateChain } from "../lib/cross-ref-linker.js";
import { findAffectedSections, buildImpactReport } from "../lib/impact-analyzer.js";
import { logger } from "../lib/logger.js";
import type { ChangeRequestArgs, ToolResult } from "./change-request.js";
import { ok, err } from "./change-request.js";
import { crFilePath, requireCrId, requireConfigPath } from "./cr-actions.js";

const execFileAsync = promisify(execFile);

export async function handleAnalyze(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const configPath = requireConfigPath(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "INITIATED") return err(`analyze requires INITIATED status, got ${cr.status}`);

  await transitionCR(filePath, "ANALYZING");

  const docs = await loadChainDocs(configPath);
  const entries = findAffectedSections(cr.changed_ids, docs);
  const report = buildImpactReport(cr.changed_ids, entries);

  const steps = computePropagationOrder(cr.origin_doc);

  const upstreamDocs = new Map<string, string>();
  for (const step of steps) {
    if (step.direction === "upstream") {
      const content = docs.get(step.doc_type);
      if (content) upstreamDocs.set(step.doc_type, content);
    }
  }
  const originContent = docs.get(cr.origin_doc) ?? "";
  const backfill = generateBackfillSuggestions(cr.origin_doc, "", originContent, upstreamDocs);

  const updated = await readCR(filePath);
  updated.impact_summary = `${report.total_affected_sections} affected sections across ${new Set(entries.map(e => e.doc_type)).size} documents`;
  updated.propagation_steps = steps;
  await writeCR(filePath, updated);

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

export async function handlePropagateNext(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "APPROVED" && cr.status !== "PROPAGATING") {
    return err(`propagate_next requires APPROVED or PROPAGATING status, got ${cr.status}`);
  }

  if (cr.status === "APPROVED") {
    try {
      await execFileAsync("git", [
        "-C", args.workspace_path, "add", "sekkei-docs/",
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

  const current = await readCR(filePath);
  const idx = current.propagation_index;

  if (idx >= current.propagation_steps.length) {
    return ok(JSON.stringify({ all_steps_complete: true, total: current.propagation_steps.length }));
  }

  const step = current.propagation_steps[idx];

  let instruction: string;
  if (step.direction === "upstream") {
    instruction = `UPSTREAM SUGGESTION: Review and update ${step.doc_type} to include/update IDs referenced in the change. This is a non-destructive suggestion.`;
  } else {
    instruction = `DOWNSTREAM CASCADE: Regenerate ${step.doc_type} document to reflect the upstream changes. Use generate_document tool with updated upstream content.`;
  }

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

export async function handleValidate(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const configPath = requireConfigPath(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") return err(`validate requires PROPAGATING status, got ${cr.status}`);

  const incomplete = cr.propagation_steps.filter(s => s.status === "pending");
  if (incomplete.length > 0) {
    return err(`${incomplete.length} propagation steps still pending: ${incomplete.map(s => s.doc_type).join(", ")}`);
  }

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
