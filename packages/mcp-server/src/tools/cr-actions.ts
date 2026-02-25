/**
 * Change request action handlers — create, approve, complete, status, list, cancel, rollback.
 * Propagation-heavy handlers (analyze, propagate_next, validate) live in cr-propagation-actions.ts.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  createCR, readCR, writeCR, transitionCR, listCRs,
  getCRDir, isValidCRId,
} from "../lib/cr-state-machine.js";

const execFileAsync = promisify(execFile);
import { detectConflicts } from "../lib/cr-conflict-detector.js";
import { appendGlobalChangelog, getLastChangelogVersion } from "../lib/changelog-manager.js";
import type { ChangeRequestArgs, ToolResult } from "./change-request.js";
import { ok, err } from "./change-request.js";
import {
  handleAnalyze, handlePropagateNext, handleValidate,
  handlePropagateConfirm, handleSimulate,
} from "./cr-propagation-actions.js";

export function crFilePath(workspacePath: string, crId: string): string {
  return join(getCRDir(workspacePath), `${crId}.md`);
}

export function requireCrId(args: ChangeRequestArgs): string {
  if (!args.cr_id) throw new Error("cr_id required for this action");
  if (!isValidCRId(args.cr_id)) throw new Error(`Invalid CR ID format: ${args.cr_id}`);
  return args.cr_id;
}

export function requireConfigPath(args: ChangeRequestArgs): string {
  if (!args.config_path) throw new Error("config_path required for this action");
  return args.config_path;
}

// --- Action Handlers ---

async function handleCreate(args: ChangeRequestArgs): Promise<ToolResult> {
  if (!args.origin_doc) return err("origin_doc required for create action");
  if (!args.description) return err("description required for create action");

  let changedIds = args.changed_ids ?? [];

  /**
   * C3 LIMITATION — Auto-detect uses line-by-line comparison and first-occurrence ID lookup.
   * Structural changes (e.g. table reshuffling, section reorders) where the same ID appears
   * in a different context may not be flagged as changed. When in doubt, pass changed_ids
   * explicitly rather than relying on auto-detect.
   */
  // Auto-detect changed IDs from old/new content diff
  if (changedIds.length === 0 && args.old_content && args.new_content) {
    const idPattern = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;
    const oldIds = new Set([...args.old_content.matchAll(idPattern)].map(m => m[0]));
    const newIds = new Set([...args.new_content.matchAll(idPattern)].map(m => m[0]));
    // IDs in new but not in old = added; IDs in both but content differs = changed
    changedIds = [...newIds].filter(id => !oldIds.has(id));
    // Also detect IDs present in both (potential updates) by checking surrounding context
    const oldLines = args.old_content.split("\n");
    const newLines = args.new_content.split("\n");
    for (const id of newIds) {
      if (oldIds.has(id) && !changedIds.includes(id)) {
        // Compare ALL lines containing each ID, not just first match
        const oldMatches = oldLines.filter(l => l.includes(id)).sort();
        const newMatches = newLines.filter(l => l.includes(id)).sort();
        // Changed if line count differs or any line content differs
        if (oldMatches.length !== newMatches.length || oldMatches.some((line, i) => line !== newMatches[i])) {
          changedIds.push(id);
        }
      }
    }
  }

  if (changedIds.length === 0) return err("changed_ids required (provide explicitly or via old_content/new_content)");

  const cr = await createCR(args.workspace_path, args.origin_doc, args.description, changedIds);
  return ok(JSON.stringify({ success: true, cr_id: cr.id, status: cr.status, changed_ids: cr.changed_ids }));
}

/**
 * C7 ADVISORY CONFLICTS — Conflict detection is non-blocking by design.
 * When multiple CRs overlap on the same IDs, conflicts are recorded as warnings
 * in `conflict_warnings` but do NOT prevent approval or propagation. This avoids
 * deadlocks when parallel workstreams legitimately touch the same areas.
 * Agents/users should review conflict_warnings in the status response and
 * coordinate manually if destructive overlap is detected.
 */
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

async function handleComplete(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "VALIDATED") return err(`complete requires VALIDATED status, got ${cr.status}`);

  await transitionCR(filePath, "COMPLETED", "Change request completed");

  // Log origin + propagated docs to global changelog with version extraction
  try {
    let docPaths: Map<string, string> | null = null;
    let extractVersion: ((content: string) => string) | null = null;
    let fsReadFile: ((p: string, e: BufferEncoding) => Promise<string>) | null = null;

    if (args.config_path) {
      try {
        const { loadChainDocPaths } = await import("../lib/doc-staleness.js");
        const { extractVersionFromContent } = await import("../lib/changelog-manager.js");
        const { readFile } = await import("node:fs/promises");
        docPaths = await loadChainDocPaths(args.config_path);
        extractVersion = extractVersionFromContent;
        fsReadFile = readFile;
      } catch { /* import/load non-blocking */ }
    }

    // Helper: extract version from a doc file, fallback to last CHANGELOG entry (IMP-4)
    async function getVersion(docType: string): Promise<string> {
      if (!docPaths || !extractVersion || !fsReadFile) return "";
      const path = docPaths.get(docType);
      if (!path) return "";
      try {
        const content = await fsReadFile(path, "utf-8");
        const version = extractVersion(content);
        if (version) return version;
      } catch { /* fall through */ }
      // IMP-4: fallback to last version from global changelog
      return getLastChangelogVersion(args.workspace_path, docType);
    }

    // Log origin doc
    const originVersion = await getVersion(cr.origin_doc);
    await appendGlobalChangelog(args.workspace_path, {
      date: new Date().toISOString().slice(0, 10),
      docType: cr.origin_doc,
      version: originVersion,
      changes: cr.description,
      author: "",
      crId: cr.id,
    });

    // Log all propagated docs
    for (const step of cr.propagation_steps) {
      if (step.status !== "done" || step.doc_type === cr.origin_doc) continue;
      const version = await getVersion(step.doc_type);
      await appendGlobalChangelog(args.workspace_path, {
        date: new Date().toISOString().slice(0, 10),
        docType: step.doc_type,
        version,
        changes: `Propagated from ${cr.origin_doc}: ${cr.description}`,
        author: "",
        crId: cr.id,
      });
    }
  } catch { /* non-blocking */ }

  return ok(JSON.stringify({ success: true, cr_id: crId }));
}

async function handleStatus(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);
  const cr = await readCR(filePath);

  // IMP-5: include propagation progress summary
  const progress = {
    total_steps: cr.propagation_steps.length,
    done: cr.propagation_steps.filter(s => s.status === "done").length,
    instructed: cr.propagation_steps.filter(s => s.status === "instructed").length,
    pending: cr.propagation_steps.filter(s => s.status === "pending").length,
    skipped: cr.propagation_steps.filter(s => s.status === "skipped").length,
    upstream_done: cr.propagation_steps.filter(s => s.direction === "upstream" && s.status === "done").length,
    upstream_total: cr.propagation_steps.filter(s => s.direction === "upstream").length,
    downstream_done: cr.propagation_steps.filter(s => s.direction === "downstream" && s.status === "done").length,
    downstream_total: cr.propagation_steps.filter(s => s.direction === "downstream").length,
  };

  return ok(JSON.stringify({ ...cr, progress }));
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

async function handleRollback(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") {
    return err(`rollback requires PROPAGATING status, got ${cr.status}`);
  }

  // Find checkpoint commit
  let logOutput: string;
  try {
    const result = await execFileAsync("git", [
      "-C", args.workspace_path, "log", "--oneline", "-50",
    ]);
    logOutput = result.stdout;
  } catch {
    return err("git log failed — workspace may not be a git repository");
  }

  const expectedMsg = `chore: pre-${crId} checkpoint`;
  const checkpointLine = logOutput.split("\n").find(line => line.includes(expectedMsg));
  if (!checkpointLine) {
    return err(`No checkpoint found for ${crId} in recent 50 commits`);
  }
  const sha = checkpointLine.trim().split(" ")[0];

  // Safe rollback: stash uncommitted changes, then revert to checkpoint on a new branch
  try {
    // Stash any uncommitted work first
    await execFileAsync("git", ["-C", args.workspace_path, "stash", "push", "-m", `pre-rollback-${crId}`]).catch(() => {});
    // Create rollback branch from checkpoint
    const branchName = `rollback/${crId}`;
    await execFileAsync("git", ["-C", args.workspace_path, "checkout", "-b", branchName, sha]);
  } catch (e) {
    return err(`Rollback failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  await transitionCR(filePath, "APPROVED", `Rolled back to checkpoint ${sha} (branch: rollback/${crId})`);

  return ok(JSON.stringify({ success: true, reverted_to: sha, branch: `rollback/${crId}`, stashed: true }));
}

// --- Dispatch ---

export async function handleCRAction(args: ChangeRequestArgs): Promise<ToolResult> {
  switch (args.action) {
    case "create":            return handleCreate(args);
    case "analyze":           return handleAnalyze(args);
    case "approve":           return handleApprove(args);
    case "propagate_next":    return handlePropagateNext(args);
    case "propagate_confirm": return handlePropagateConfirm(args);
    case "simulate":          return handleSimulate(args);
    case "validate":          return handleValidate(args);
    case "complete":          return handleComplete(args);
    case "status":            return handleStatus(args);
    case "list":              return handleList(args);
    case "cancel":            return handleCancel(args);
    case "rollback":          return handleRollback(args);
    default:                  return err(`Unknown action: ${args.action}`);
  }
}
