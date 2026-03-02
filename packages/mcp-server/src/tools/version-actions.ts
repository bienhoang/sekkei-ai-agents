/**
 * Version action dispatch — handles bump, query, release, history actions.
 */
import type { VersionArgs, ToolResult } from "./version.js";
import { ok, err } from "./version.js";
import { bumpDocVersion, queryVersions, readReleases, createRelease } from "../lib/version-manager.js";

export async function handleVersionAction(args: VersionArgs): Promise<ToolResult> {
  switch (args.action) {
    case "bump": return handleBump(args);
    case "query": return handleQuery(args);
    case "release": return handleRelease(args);
    case "history": return handleHistory(args);
    default: return err(`Unknown action: ${args.action}`);
  }
}

async function handleBump(args: VersionArgs): Promise<ToolResult> {
  if (!args.doc_type) return err("doc_type is required for bump");
  if (!args.bump_type) return err("bump_type is required for bump");
  if (!args.reason) return err("reason is required for bump");

  const result = await bumpDocVersion(
    args.workspace_path, args.doc_type, args.bump_type, args.reason,
  );

  return ok(JSON.stringify({
    action: "bump",
    doc_type: args.doc_type,
    bump_type: args.bump_type,
    old_version: result.old,
    new_version: result.new,
    reason: args.reason,
  }, null, 2));
}

async function handleQuery(args: VersionArgs): Promise<ToolResult> {
  const result = await queryVersions(args.workspace_path, args.doc_type);

  const lines: string[] = ["## Document Versions", ""];
  lines.push("| Document | Tracked | Actual | Match |");
  lines.push("|----------|---------|--------|-------|");

  for (const [dt, info] of Object.entries(result.versions)) {
    const icon = info.match ? "✓" : "⚠";
    lines.push(`| ${dt} | ${info.tracked} | ${info.actual} | ${icon} |`);
  }

  if (result.mismatches.length > 0) {
    lines.push("");
    lines.push(`**Mismatches:** ${result.mismatches.join(", ")}`);
    lines.push("Run `bump` to sync, or manually update doc frontmatter.");
  }

  return ok(lines.join("\n"));
}

async function handleRelease(args: VersionArgs): Promise<ToolResult> {
  if (!args.tag) return err("tag is required for release");

  const result = await createRelease(
    args.workspace_path, args.tag, args.description ?? "",
  );

  return ok(JSON.stringify({
    action: "release",
    tag: result.tag,
    snapshot: result.snapshot,
    notes_file: result.notes_file,
    git_tagged: result.git_tagged,
  }, null, 2));
}

async function handleHistory(args: VersionArgs): Promise<ToolResult> {
  const releases = await readReleases(args.workspace_path);

  let timeline = releases.releases.map(r => ({
    tag: r.tag,
    date: r.date,
    description: r.description,
    docs: r.snapshot,
  }));

  if (args.doc_type) {
    timeline = timeline.filter(r => args.doc_type! in r.docs);
  }

  return ok(JSON.stringify({
    current: releases.current,
    releases: timeline,
  }, null, 2));
}
