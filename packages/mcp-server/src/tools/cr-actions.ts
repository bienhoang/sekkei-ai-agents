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
import { appendGlobalChangelog } from "../lib/changelog-manager.js";
import type { ChangeRequestArgs, ToolResult } from "./change-request.js";
import { ok, err } from "./change-request.js";
import {
  handleAnalyze, handlePropagateNext, handleValidate,
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
        // Simple heuristic: if the line containing the ID changed, it's modified
        const oldLine = oldLines.find(l => l.includes(id)) ?? "";
        const newLine = newLines.find(l => l.includes(id)) ?? "";
        if (oldLine !== newLine) changedIds.push(id);
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

  // Append to global changelog on CR completion
  try {
    await appendGlobalChangelog(args.workspace_path, {
      date: new Date().toISOString().slice(0, 10),
      docType: cr.origin_doc,
      version: "",
      changes: cr.description,
      author: "",
      crId: cr.id,
    });
  } catch { /* non-blocking */ }

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

async function handleRollback(args: ChangeRequestArgs): Promise<ToolResult> {
  const crId = requireCrId(args);
  const filePath = crFilePath(args.workspace_path, crId);

  const cr = await readCR(filePath);
  if (cr.status !== "PROPAGATING") {
    return err(`rollback requires PROPAGATING status, got ${cr.status}`);
  }

  // Find the pre-propagation checkpoint commit
  let logOutput: string;
  try {
    const result = await execFileAsync("git", [
      "-C", args.workspace_path, "log", "--oneline", "-20",
    ]);
    logOutput = result.stdout;
  } catch {
    return err("git log failed — workspace may not be a git repository");
  }

  const expectedMsg = `chore: pre-${crId} checkpoint`;
  const checkpointLine = logOutput.split("\n").find(line => line.includes(expectedMsg));

  if (!checkpointLine) {
    return err(`No checkpoint found for ${crId} in recent 20 commits`);
  }

  const sha = checkpointLine.trim().split(" ")[0];

  try {
    await execFileAsync("git", ["-C", args.workspace_path, "reset", "--hard", sha]);
  } catch {
    return err(`git reset --hard ${sha} failed`);
  }

  await transitionCR(filePath, "APPROVED", `Rolled back to checkpoint ${sha}`);

  return ok(JSON.stringify({ success: true, reverted_to: sha }));
}

// --- Dispatch ---

export async function handleCRAction(args: ChangeRequestArgs): Promise<ToolResult> {
  switch (args.action) {
    case "create":         return handleCreate(args);
    case "analyze":        return handleAnalyze(args);
    case "approve":        return handleApprove(args);
    case "propagate_next": return handlePropagateNext(args);
    case "validate":       return handleValidate(args);
    case "complete":       return handleComplete(args);
    case "status":         return handleStatus(args);
    case "list":           return handleList(args);
    case "cancel":         return handleCancel(args);
    case "rollback":       return handleRollback(args);
    default:               return err(`Unknown action: ${args.action}`);
  }
}
