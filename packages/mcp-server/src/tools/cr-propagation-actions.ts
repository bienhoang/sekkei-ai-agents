/**
 * Propagation-related CR action handlers: analyze, propagate_next, propagate_confirm, simulate, validate.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DEFAULT_WORKSPACE_DIR } from "../lib/constants.js";
import { readCR, writeCR, transitionCR } from "../lib/cr-state-machine.js";
import { computePropagationOrder } from "../lib/cr-propagation.js";
import { generateBackfillSuggestions } from "../lib/cr-backfill.js";
import { loadChainDocs, validateChain } from "../lib/cross-ref-linker.js";
import { findAffectedSections, buildImpactReport } from "../lib/impact-analyzer.js";
import { SekkeiError } from "../lib/errors.js";
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

  // IMP-3: pass skip_docs and max_depth options
  const steps = computePropagationOrder(cr.origin_doc, {
    maxDepth: args.max_depth,
    skipDocs: args.skip_docs,
  });

  const upstreamDocs = new Map<string, string>();
  for (const step of steps) {
    if (step.direction === "upstream") {
      const content = docs.get(step.doc_type);
      if (content) upstreamDocs.set(step.doc_type, content);
    }
  }

  // BUG-5: only scan lines containing changed IDs to reduce noise
  const originContent = docs.get(cr.origin_doc) ?? "";
  const changedLines = originContent.split("\n").filter(line =>
    cr.changed_ids.some(id => line.includes(id))
  ).join("\n");
  const backfill = generateBackfillSuggestions(cr.origin_doc, "", changedLines, upstreamDocs);

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

  // C4: track whether git checkpoint succeeded
  let checkpointCreated = false;
  if (cr.status === "APPROVED") {
    try {
      await execFileAsync("git", [
        "-C", args.workspace_path, "add", `${DEFAULT_WORKSPACE_DIR}/`,
      ]);
      await execFileAsync("git", [
        "-C", args.workspace_path, "commit",
        "-m", `chore: pre-${crId} checkpoint`,
        "--allow-empty",
      ]);
      checkpointCreated = true;
      logger.info({ crId }, "Git checkpoint created before propagation");
    } catch {
      logger.warn({ crId }, "Git checkpoint skipped (not a git repo or no changes)");
    }
    await transitionCR(filePath, "PROPAGATING", "Starting propagation");
  }

  const current = await readCR(filePath);

  const MAX_PROPAGATION_STEPS = 20;
  if (current.propagation_steps.length > MAX_PROPAGATION_STEPS) {
    throw new SekkeiError(
      "CHANGE_REQUEST_ERROR",
      `propagation_steps count (${current.propagation_steps.length}) exceeds maximum of ${MAX_PROPAGATION_STEPS}. CR may be corrupted.`
    );
  }

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

  // C1: extract content snippets from origin doc for upstream steps when requested
  let suggestedContent: string | undefined;
  if (step.direction === "upstream" && args.suggest_content) {
    if (!args.config_path) {
      return err("config_path required when suggest_content=true");
    }
    try {
      const docs = await loadChainDocs(args.config_path);
      const originContent = docs.get(current.origin_doc) ?? "";
      if (originContent && current.changed_ids.length > 0) {
        const lines = originContent.split("\n");
        const matchingLines = lines.filter(line =>
          current.changed_ids.some(id => line.includes(id))
        );
        suggestedContent = matchingLines.join("\n") || undefined;
      }
    } catch {
      logger.warn({ crId }, "suggest_content: failed to load chain docs");
    }
  }

  // BUG-1: set status to "instructed" instead of "done" — step gets instructions but isn't confirmed yet
  current.propagation_steps[idx] = { ...step, status: "instructed", note: args.note };

  // IMP-6: track upstream doc content hash for change verification
  if (step.direction === "upstream" && args.config_path) {
    try {
      const docs = await loadChainDocs(args.config_path);
      const targetContent = docs.get(step.doc_type) ?? "";
      const { createHash } = await import("node:crypto");
      const hash = createHash("md5").update(targetContent).digest("hex").slice(0, 8);
      current.propagation_steps[idx] = { ...current.propagation_steps[idx], content_hash: hash };
    } catch { /* non-blocking */ }
  }

  current.propagation_index = idx + 1;
  current.updated = new Date().toISOString().slice(0, 10);
  await writeCR(filePath, current);

  const response: Record<string, unknown> = {
    step: idx + 1,
    total: current.propagation_steps.length,
    direction: step.direction,
    doc_type: step.doc_type,
    instruction,
    all_steps_complete: idx + 1 >= current.propagation_steps.length,
    checkpoint_created: checkpointCreated,
  };

  if (suggestedContent !== undefined) {
    response.suggested_content = suggestedContent;
  }

  return ok(JSON.stringify(response));
}

export async function handlePropagateConfirm(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);
  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") return err(`propagate_confirm requires PROPAGATING status, got ${cr.status}`);

  // Find last instructed step
  const idx = cr.propagation_steps.findIndex(s => s.status === "instructed");
  if (idx === -1) return err("No instructed step to confirm. Call propagate_next first.");

  cr.propagation_steps[idx] = { ...cr.propagation_steps[idx], status: "done", note: args.note ?? cr.propagation_steps[idx].note };
  cr.updated = new Date().toISOString().slice(0, 10);

  // IMP-6: check if upstream doc was actually modified by comparing hash
  let upstream_changed: boolean | undefined;
  if (cr.propagation_steps[idx].direction === "upstream" && cr.propagation_steps[idx].content_hash && args.config_path) {
    try {
      const docs = await loadChainDocs(args.config_path);
      const currentContent = docs.get(cr.propagation_steps[idx].doc_type) ?? "";
      const { createHash } = await import("node:crypto");
      const currentHash = createHash("md5").update(currentContent).digest("hex").slice(0, 8);
      upstream_changed = currentHash !== cr.propagation_steps[idx].content_hash;
    } catch { /* non-blocking */ }
  }

  await writeCR(filePath, cr);

  const result: Record<string, unknown> = {
    confirmed_step: idx + 1,
    doc_type: cr.propagation_steps[idx].doc_type,
    direction: cr.propagation_steps[idx].direction,
    remaining: cr.propagation_steps.filter(s => s.status === "pending").length,
  };

  if (upstream_changed !== undefined) {
    result.upstream_changed = upstream_changed;
  }

  return ok(JSON.stringify(result));
}

export async function handleSimulate(args: ChangeRequestArgs): Promise<ToolResult> {
  if (!args.origin_doc) return err("origin_doc required for simulate");
  if (!args.config_path) return err("config_path required for simulate");
  if (!args.changed_ids?.length && !args.description) return err("changed_ids or description required");

  const changedIds = args.changed_ids ?? [];
  const docs = await loadChainDocs(args.config_path);
  const entries = findAffectedSections(changedIds, docs);
  const report = buildImpactReport(changedIds, entries);

  // IMP-3: apply maxDepth and skipDocs to simulate as well
  const steps = computePropagationOrder(args.origin_doc, {
    maxDepth: args.max_depth,
    skipDocs: args.skip_docs,
  });

  return ok(JSON.stringify({
    dry_run: true,
    origin_doc: args.origin_doc,
    changed_ids: changedIds,
    impact: {
      total_affected_sections: report.total_affected_sections,
      affected_docs: report.affected_docs,
      dependency_graph: report.dependency_graph,
      suggested_actions: report.suggested_actions,
    },
    propagation_steps: steps,
    total_steps: steps.length,
  }));
}

export async function handleValidate(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const configPath = requireConfigPath(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") return err(`validate requires PROPAGATING status, got ${cr.status}`);

  // C6: skip incomplete-steps check when partial=true (mid-propagation validation)
  if (!args.partial) {
    const incomplete = cr.propagation_steps.filter(s => s.status === "pending");
    if (incomplete.length > 0) {
      return err(`${incomplete.length} propagation steps still pending: ${incomplete.map(s => s.doc_type).join(", ")}`);
    }
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
