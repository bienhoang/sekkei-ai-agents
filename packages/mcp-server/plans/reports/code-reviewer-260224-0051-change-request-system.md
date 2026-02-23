# Code Review: Change Request System

**Date:** 2026-02-24
**Scope:** 7 new source files, 3 modified files, 5 test files
**LOC:** 804 source + 538 test = 1342 total
**Focus:** Full review of CR entity tracking + propagation feature

## Overall Assessment

**Score: 7.5 / 10**

Solid implementation that follows existing patterns well (rfp-state-machine.ts, rfp-workspace.ts). Clean separation of concerns across 7 focused modules. Good use of YAML frontmatter persistence, Zod input validation, and typed error codes. All 395 tests pass, lint is clean. Several medium-priority issues prevent a higher score.

---

## Critical Issues

None found.

---

## High Priority

### H1. `config_path` missing path traversal validation in Zod schema

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/change-request.ts` line 22-24

`workspace_path` correctly blocks `..` via `.refine()`, but `config_path` only validates the `.yaml/.yml` extension. A malicious `config_path` like `../../etc/shadow.yaml` would pass Zod validation. The downstream `loadChainDocs()` in `cross-ref-linker.ts` does have its own `..` check, but defense-in-depth should catch it at the schema level.

```typescript
// Current (line 22-24):
config_path: z.string().max(500).optional()
  .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })

// Fix:
config_path: z.string().max(500).optional()
  .refine(p => !p || !p.includes(".."), { message: "no path traversal" })
  .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
```

### H2. ID pattern mismatch in auto-detect mode — 5 prefixes missing

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` line 48

The auto-detect `idPattern` in `handleCreate` is missing 5 ID prefixes that exist in the canonical pattern used by `cross-ref-linker.ts`, `id-extractor.ts`, and `cr-backfill.ts`:

- Missing: `EV` (test-evidence), `MTG` (meeting-minutes), `ADR` (decision-record), `IF` (interface-spec), `PG` (sitemap)

This means auto-detect mode silently ignores changes to these ID types. Should import or reference the canonical pattern to avoid drift.

```typescript
// Fix: Import from cross-ref-linker or define once and export
// Or inline the complete pattern:
const idPattern = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;
```

### H3. `cr-actions.ts` exceeds 200 LOC limit (289 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts`

Project convention is < 200 LOC per file. At 289 lines this is a clear violation. `cr-state-machine.ts` at 219 is borderline.

**Suggestion:** Split `cr-actions.ts` into two files:
- `cr-actions-lifecycle.ts` — create, analyze, approve, complete, cancel (lifecycle transitions)
- `cr-actions-propagation.ts` — propagate_next, validate (propagation-specific logic)

Or extract the `handleCreate` auto-detect logic into a helper in `cr-backfill.ts`.

### H4. `git add -A` in `handlePropagateNext` stages everything

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` lines 158-159

The git checkpoint runs `git add -A` which stages ALL files in the workspace including potentially sensitive files (.env, credentials). This conflicts with the project's own development rules ("prefer adding specific files by name").

```typescript
// Current:
await execFileAsync("git", ["-C", args.workspace_path, "add", "-A"]);

// Fix: Only stage sekkei-docs directory
await execFileAsync("git", ["-C", args.workspace_path, "add", "sekkei-docs/"]);
```

---

## Medium Priority

### M1. `handleAnalyze` performs unnecessary double-read

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` lines 75, 101

Line 75 reads the CR into `cr`, transitions to ANALYZING, then line 101 reads the same CR again into `updated`. The second read is unnecessary — the original `cr` object already has the data. Only `status` and `history` changed via `transitionCR`, and the code overwrites `impact_summary` and `propagation_steps` anyway.

```typescript
// Fix: Reuse the cr object after transition
const cr = await readCR(filePath);
// ... analysis ...
cr.status = "ANALYZING"; // or re-read from transitionCR return
cr.impact_summary = `${report.total_affected_sections} affected sections...`;
cr.propagation_steps = steps;
await writeCR(filePath, cr);
await transitionCR(filePath, "IMPACT_ANALYZED", "Impact analysis complete");
```

Better yet, `transitionCR` already returns the updated CR, so chain from its return value.

### M2. `origin_doc` not validated against `DOC_TYPES` enum

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/change-request.ts` line 25

The `origin_doc` field accepts any string up to 50 chars. Invalid doc types (e.g., "foo-bar") will silently create a CR that produces empty propagation steps. Other tools like `generate_document` validate doc_type via Zod enum.

```typescript
// Fix: Use z.enum(DOC_TYPES) or validate in handleCreate
import { DOC_TYPES } from "../types/documents.js";
origin_doc: z.enum(DOC_TYPES).optional()
```

### M3. `backfill` called with empty string as `oldContent` during analyze

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` line 98

```typescript
const backfill = generateBackfillSuggestions(cr.origin_doc, "", originContent, upstreamDocs);
```

Passing `""` as `oldContent` means ALL IDs in the current doc appear as "new", generating false-positive backfill suggestions for IDs that have long existed. The actual old content is not available in the analyze flow because `old_content` is only an optional param on create.

**Suggestion:** Either pass `originContent` for both old/new (producing 0 suggestions, which is more correct), or document that backfill during analyze only works when the CR was created with `old_content`/`new_content` params.

### M4. No concurrency protection on CR file read-modify-write

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cr-state-machine.ts`

`transitionCR`, `handleApprove`, and `handlePropagateNext` all perform read-modify-write cycles on CR files without any locking. If two MCP calls operate on the same CR concurrently, one write may silently overwrite the other's changes (lost update).

This is an acknowledged limitation (same as rfp-state-machine.ts), but worth noting since CRs are more likely to face concurrent access (multiple agents propagating).

**Suggestion:** Consider adding a simple `.lock` file mechanism or document the single-writer assumption.

### M5. DRY: ID_PATTERN regex duplicated 4 times across codebase

The same regex appears in:
1. `cross-ref-linker.ts` line 59
2. `id-extractor.ts` line 18
3. `cr-backfill.ts` line 9
4. `cr-actions.ts` line 48 (incomplete copy)

Should be exported from a single source of truth (e.g., `id-extractor.ts` or a shared constants file).

---

## Low Priority

### L1. `writeCR` overwrites markdown body on every save

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cr-state-machine.ts` lines 122-132

The body section `## Notes` always resets to `(user/agent appends notes here)`. If someone manually added notes to the CR file, they'd be lost on the next state transition. Consider preserving the body section below the frontmatter.

### L2. `status_filter` on list action not validated against `CR_STATUSES`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` line 258

An invalid filter like `status_filter: "FOOBAR"` silently returns empty results instead of warning the user.

### L3. `--allow-empty` flag on git checkpoint commit

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/cr-actions.ts` line 164

Creates empty commits even when there are no actual changes to checkpoint. Minor noise in git history.

---

## Positive Observations

1. **Clean module separation** - Types, state machine, propagation, backfill, conflict detection, tool schema, and action handlers are properly isolated
2. **Consistent patterns** - Follows rfp-state-machine.ts conventions: YAML frontmatter, `SekkeiError` codes, logger usage, tmp dir cleanup in tests
3. **Good Zod schema** - Input size limits, path traversal block on workspace_path, .yaml extension check
4. **BFS propagation** is elegant and correct for the V-model DAG
5. **Non-blocking conflict detection** - Warnings on approve rather than hard blocks, good UX decision
6. **Comprehensive tests** - 5 test files covering all major paths, edge cases for terminal states, round-trip YAML persistence, special characters

---

## Recommended Actions (Priority Order)

1. Add `..` path traversal check to `config_path` Zod refinement (H1)
2. Sync auto-detect ID pattern with canonical 23-prefix version (H2)
3. Split `cr-actions.ts` to comply with 200 LOC limit (H3)
4. Scope git checkpoint to `sekkei-docs/` instead of `-A` (H4)
5. Validate `origin_doc` against `DOC_TYPES` enum (M2)
6. Fix `handleAnalyze` double-read inefficiency (M1)
7. Address false-positive backfill by not passing empty oldContent (M3)
8. Extract ID_PATTERN to single shared constant (M5)

---

## Metrics

- **Type Coverage:** 100% (all params typed, Zod schemas on inputs)
- **Test Coverage:** Good — 5 test files, all pure logic tested; integration test covers create/status/list/cancel flows
- **Linting Issues:** 0 (tsc --noEmit clean)
- **Build Status:** Clean
- **Tests:** 395/395 passing

---

## Unresolved Questions

1. Should `propagate_next` auto-call `generate_document` for downstream steps, or is the current "instruction-only" approach intentional? The instruction tells the agent to call `generate_document` but doesn't enforce it.
2. Is there a plan to register CR-related MCP resources (like `cr://` URIs) similar to `rfp://` resources?
3. The backfill during `analyze` with empty `oldContent` seems like a design gap — is there a plan to store the pre-change snapshot for later comparison?
