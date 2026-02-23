# Code Review — RFP Workflow Improvement
**Report:** code-reviewer-260224-0006-rfp-workflow-improve.md
**Date:** 2026-02-24
**Branch:** main

---

## Scope

- Files reviewed: `src/types/documents.ts`, `src/lib/rfp-state-machine.ts`, `src/tools/rfp-workspace.ts` (TS — thorough), templates 4–12 (Markdown — quick scan)
- LOC delta: ~786 additions / 678 deletions across 22 files
- All 44 RFP tests pass; TypeScript compiles clean

---

## Overall Assessment

Solid feature addition. The backward transition design is intentional and well-bounded (only 3 edges). The hand-rolled YAML parser is acceptable for this narrow shape. Security posture is adequate with `..` guard on `workspace_path` and a strict project-name regex. The main concerns are correctness/data-integrity edge cases rather than security vulnerabilities.

---

## Critical Issues

None.

---

## High Priority

### H1 — `blocking_issues` / `assumptions` list items not sanitized before YAML serialization

**File:** `src/lib/rfp-state-machine.ts` lines 197–199

`sanitizeYamlScalar` strips newlines for scalar fields (`project`, `next_action`) but the array items in `blocking_issues` and `assumptions` are emitted raw:

```ts
...status.blocking_issues.map(i => `  - ${i}`),
```

If an item contains a literal `\n` (e.g., a multi-line answer pasted by an LLM), the written YAML becomes malformed and `parseStatusYaml` silently drops the remainder. Worse, a crafted value like `"\nphase: SCOPE_FREEZE"` would inject a new top-level key into the document.

**Fix — apply sanitizer to array items:**

```ts
...status.blocking_issues.map(i => `  - ${sanitizeYamlScalar(i)}`),
...status.assumptions.map(a  => `  - ${sanitizeYamlScalar(a)}`),
```

Also apply the sanitizer to `phase_history` reason fields:

```ts
...status.phase_history.map(e =>
  `  - ${e.phase}|${e.entered}${e.reason ? `|${sanitizeYamlScalar(e.reason)}` : ""}`
),
```

### H2 — `phase_history` entry reason not sanitized; pipe `|` in reason breaks parse

**File:** `src/lib/rfp-state-machine.ts` lines 163–170

The pipe character is used as the internal separator for phase_history entries (`phase|date|reason`). If `reason` contains `|`, `parts[2]` will include everything after the second pipe and `parts[3+]` are silently ignored — but more critically, if reason is `"SCOPE_FREEZE|2026-03-01"`, `parts[0]` of a later iteration could be misread as a phase.

The issue is low-probability in normal use but can be triggered by a reason string typed by an operator.

**Fix — strip/escape `|` in reason before writing:**

```ts
function sanitizeYamlScalar(v: string): string {
  return v.replace(/[\r\n|]/g, " ");
}
```

Or use a different multi-field separator that cannot appear in free text, e.g., `\t` or a multi-char sequence `@@`.

---

## Medium Priority

### M1 — `back` action does NOT validate backward-transition guard (force flag)

**File:** `src/tools/rfp-workspace.ts` lines 107–129

The `back` action conveniently navigates to the previous phase. It calls `validateTransition` (correct) but **never checks `isBackwardTransition` and never requires `force: true`**, even though the `transition` action does:

```ts
// transition action — has guard:
if (isBackwardTransition(current.phase, args.phase) && !args.force) {
  return err(`Backward transition ${current.phase} → ${args.phase} requires force: true`);
}

// back action — guard is ABSENT
```

Since `back` always navigates backward (by definition), every `back` call on a backward-transition edge bypasses the intentional "explicit intent" requirement. An AI agent that discovers `back` can use it to skip the `force` flag entirely.

**Fix:**

```ts
case "back": {
  const prev = await getPreviousPhase(args.workspace_path);
  if (!prev) return err("No previous phase to go back to");
  const cur = await readStatus(args.workspace_path);
  if (!validateTransition(cur.phase, prev)) {
    return err(`Cannot go back: ${cur.phase} → ${prev} is not a valid transition`);
  }
  // Apply same guard as transition action
  if (isBackwardTransition(cur.phase, prev) && !args.force) {
    return err(`Backward navigation ${cur.phase} → ${prev} requires force: true`);
  }
  // ... rest unchanged
```

### M2 — `generateConfigFromWorkspace` injects feature fields into YAML without sanitization

**File:** `src/lib/rfp-state-machine.ts` lines 383–387

Feature `id`, `name`, and `display` values are read directly from proposal markdown table cells and embedded into the generated YAML:

```ts
features.map(f =>
  `  - id: ${f.id}\n    name: ${f.name}\n    display: "${f.display}"`
)
```

A proposal table row like `| USR | user-management | ユーザー管理\n  - id: injected | ...` would corrupt the output YAML. The generated config is labeled "review and edit before proceeding" which reduces risk, but the injection still creates a confusing/broken file.

**Fix:** strip newlines from extracted cell values in `extractFeatureSeeds`:

```ts
const cols = line.split("|").map(c => c.trim().replace(/[\r\n]/g, " ")).filter(Boolean);
```

### M3 — `extractFeatureSeeds` section detection is fragile

**File:** `src/lib/rfp-state-machine.ts` lines 348–368

`if (line.includes("Feature Seed"))` will also match lines like `# Extended Feature Seed Table` or `<!-- Feature Seed placeholder -->`, and the section ends on the first blank line after table data. A double blank line between table header and first row (`foundTableRows` is still false) would stop parsing early due to no check.

Actually the current logic skips blank lines only before `foundTableRows` is true. Once a data row is parsed and then a blank line appears, it breaks — which is correct. But the header detection catches any line with "Feature Seed" (including comments or sub-headings), potentially starting parsing mid-document incorrectly.

**Fix:** tighten the match to `## Feature Seed` (exact heading):

```ts
if (line.match(/^##\s+Feature Seed/)) { inFeatureSection = true; foundTableRows = false; continue; }
```

### M4 — `back` action increments `qna_round` only when navigating to `QNA_GENERATION`; `transition` does too — double-increment possible

**File:** `src/tools/rfp-workspace.ts` lines 83–84 and 117

If an operator calls `back` to return to `QNA_GENERATION` and then immediately calls `transition` to `QNA_GENERATION` again (e.g., after realizing it was wrong), `qna_round` would be incremented twice. The `back` action should probably not increment `qna_round` since it's a navigation aid, not a fresh Q&A round. Alternatively, the field should be named `qna_generation_count` and documented as "incremented on every entry to `QNA_GENERATION`" so the double-count is explicit.

This is a design ambiguity rather than a bug, but it affects auditability of Q&A round history.

---

## Low Priority

### L1 — `next_action` key in YAML parser regex is overly broad

**File:** `src/lib/rfp-state-machine.ts` line 134

The KV regex `^(\w+):\s*(.*)$` matches keys composed only of word characters (`[a-zA-Z0-9_]`). This correctly excludes YAML list items and Markdown headings. No issue in practice, just noting the regex would fail to parse any multi-word key — which is fine since the schema has no such keys.

### L2 — `routing.md` says `BACK` requires `force` but `back` action does not enforce it (see M1)

The documentation in `routing.md` line 21 states `BACK` "requires force". This is currently misleading because the `back` action skips the force check. After fixing M1, this doc becomes accurate.

### L3 — `parseStatusYaml` does not validate `PhaseEntry.phase` against `RFP_PHASES`

**File:** `src/lib/rfp-state-machine.ts` lines 163–170

Phase history entries cast `parts[0]` directly to `RfpPhase` without validation. A corrupted status file with an invalid phase in history would silently produce an invalid `PhaseEntry` rather than throwing. Low risk since the field is only read for display/navigation, but worth a runtime check:

```ts
const ph = parts[0] as string;
if (!RFP_PHASES.includes(ph as RfpPhase)) return null; // skip invalid entries
```

### L4 — Template `flow-analyze.md` section 8 references `glossaries/{industry}.yaml` but no such path or loader exists in codebase

Section 8 says: "load glossary from `glossaries/{industry}.yaml`". This is template instruction prose, not code, so it's not a runtime error — but it will mislead an AI agent trying to find that file. Either add a note that this is a manual step, or remove if not yet implemented.

---

## Edge Cases Found (scouting)

1. **Concurrent writes to `00_status.md`:** Two simultaneous `transition` actions on the same workspace will both read the current status, then both write, with the second write silently overwriting the first. No file locking exists. Acceptable for single-agent use but worth a comment.

2. **`recoverPhase` vs `phase_history`:** Phase recovery (file-based heuristic) can disagree with `phase_history` (event log). The `status` action returns both `recovered_phase` and `phase` — an operator querying status could see `recovered_phase: DRAFTING` while `phase: ANALYZING` (after a backward transition). This is by design but could confuse consumers. No action needed; just noting for doc purposes.

3. **`back` when `phase_history` has repeated entries:** If `phase_history` = `[RFP_RECEIVED, ANALYZING, QNA_GENERATION, ANALYZING]` (looped backward), `getPreviousPhase` returns `QNA_GENERATION` as "previous", which is technically the last entry before current, not necessarily the phase before the current arrival. This is correct semantically (last visited) but might surprise operators expecting "go back one logical step in the workflow".

4. **Feature Seed table with no data rows:** `extractFeatureSeeds` correctly returns `[]`, and `generateConfigFromWorkspace` falls back to the comment `# No features detected`. Handled.

5. **`createWorkspace` on existing path:** `mkdir({ recursive: true })` succeeds silently, then status is overwritten and all workspace files reset to empty. An existing workspace is silently destroyed. Should guard with an existence check:

```ts
// proposed guard
try {
  await stat(wsPath);
  throw new SekkeiError("RFP_WORKSPACE_ERROR", `Workspace already exists: ${wsPath}`);
} catch (e) { if (e instanceof SekkeiError) throw e; /* ENOENT → ok */ }
```

---

## Security Assessment

- **Path traversal:** `workspace_path` is validated with `.includes("..")` in Zod schema. Adequate for this tool. Note: `join(basePath, "sekkei-docs", "01-rfp", projectName)` additionally hard-codes the intermediate path, preventing arbitrary write locations.
- **Project name injection:** `PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/` — correct, no shell-special chars.
- **YAML injection via array items:** See H1/H2. Partially mitigated by the custom parser not using `eval`/`yaml.load`, but malformed output can silently drop fields.
- **Content field:** `z.string().max(500_000)` — enforced by Zod, no further sanitization needed for STDIO transport.
- **No secrets exposed** in the generated config YAML.

---

## Positive Observations

- `BACKWARD_TRANSITIONS` as a `Set<string>` with `"FROM->TO"` strings is clean and efficient.
- `PhaseEntry` interface is minimal and typed correctly. `entered` is ISO date (not datetime), which is consistent with `last_update`.
- Backward compat defaults (`qna_round: 0`, `phase_history: []`) are correctly applied on parse and verified with the compat test.
- `appendDecision` uses `readFile` + `writeFile` with explicit separator logic — no accidental clobbering of existing log entries.
- `generateConfigFromWorkspace` is gated at the tool layer to `SCOPE_FREEZE | PROPOSAL_UPDATE` — prevents premature config generation.
- All new inputs use Zod validation; `force` and `reason` are optional with correct types.
- 44 tests all pass; test coverage is good for the happy path and the key error paths.

---

## Recommended Actions (Prioritized)

1. **(H1)** Apply `sanitizeYamlScalar` to `blocking_issues` and `assumptions` array items and `phase_history` reason field in `serializeStatusYaml`.
2. **(H2)** Strip `|` from `reason` in `sanitizeYamlScalar` to prevent pipe-injection in phase history entries.
3. **(M1)** Add `isBackwardTransition` + `force` guard to the `back` action, mirroring the `transition` action.
4. **(M2)** Strip newlines from feature table cell values in `extractFeatureSeeds`.
5. **(M3)** Tighten `Feature Seed` section header match to `^##\s+Feature Seed`.
6. **(Edge)** Add an existence guard in `createWorkspace` to prevent silent workspace overwrite.
7. **(L3)** Validate `PhaseEntry.phase` against `RFP_PHASES` when parsing history entries.

---

## Metrics

- Type Coverage: 100% (tsc --noEmit clean)
- Test Coverage: 44/44 pass; new features well-covered; backward-transition paths tested
- Linting Issues: 0

---

## Unresolved Questions

1. **`qna_round` double-increment (M4):** Should `back` to `QNA_GENERATION` count as a new Q&A round? Clarify intent — if "back" is pure navigation (not a fresh round), remove the increment from the `back` action.
2. **Concurrent workspace access:** Is single-agent access guaranteed by the calling environment, or does the MCP server need file-based locking for `00_status.md`?
3. **`glossaries/{industry}.yaml` in `flow-analyze.md` section 8:** Is this a planned feature or a stale instruction? If planned, add a tracking issue.
