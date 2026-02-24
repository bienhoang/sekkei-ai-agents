# Code Review: Changelog Consistency Fixes

**Date:** 2026-02-24
**Scope:** 7 changed files — changelog preservation, auto-insert, version extraction, post-generation validation
**Build/Lint:** PASS (tsc --noEmit clean)
**Tests:** 47 tests pass (11 new in changelog-manager.test.ts + 6 new in validator.test.ts)

---

## Overall Assessment

The feature is well-structured and functionally correct for the happy path. The `effectiveExistingContent` pattern is the right approach — it cleanly separates "insert before preserving" from the original content. Tests cover all primary scenarios. Two medium-priority bugs and a few low-priority refinements are noted below.

---

## Critical Issues

None.

---

## High Priority

### 1. Double version-increment in global CHANGELOG when `auto_insert_changelog=true`

**File:** `src/tools/generate.ts` lines 328–337 and 413–417

When `auto_insert_changelog=true`, `effectiveExistingContent` already has the new row (e.g., `1.1`) inserted. The global-changelog block at line 416 then calls `extractVersionFromContent(effectiveExistingContent)` — which reads `1.1` — and increments again to `1.2`. The CHANGELOG.md records `1.2` while the in-document row is `1.1`.

**Fix:** Use `existing_content` (pre-insert) for the global changelog version extraction, or capture `newVer` from the auto-insert block and reuse it:

```ts
// In the auto-insert block, capture the version:
let insertedVersion: string | undefined;
if (auto_insert_changelog && existing_content) {
  const oldVer = extractVersionFromContent(existing_content);
  insertedVersion = incrementVersion(oldVer);
  ...
}

// In the global changelog block:
const oldVersion = extractVersionFromContent(existing_content ?? "");
const nextVersion = insertedVersion ?? incrementVersion(oldVersion);
```

---

## Medium Priority

### 2. `incrementVersion` produces `NaN.NaN` on malformed input

**File:** `src/lib/changelog-manager.ts` lines 32–38

`incrementVersion("abc")` → `NaN.NaN`; `incrementVersion("1")` → `1.NaN`. Neither is guarded. These can propagate into markdown table rows and CHANGELOG.md.

Reproduced:
```
NaN test: NaN.NaN
single int: 1.NaN
```

**Fix:** Add input validation before `split`:

```ts
export function incrementVersion(version: string): string {
  if (!version) return "1.0";
  const parts = version.split(".");
  if (parts.length !== 2) return "1.0";
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  if (isNaN(major) || isNaN(minor)) return "1.0";
  const nextMinor = minor + 1;
  if (nextMinor >= 10) return `${major + 1}.0`;
  return `${major}.${nextMinor}`;
}
```

### 3. `insertChangelogRow` misses v-prefix rows — silent no-op

**File:** `src/tools/generate.ts` lines 159–173

`insertChangelogRow` scans for rows matching `^\|\s*\d+\.\d+\s*\|`. A document using `| v1.0 |` format (which `extractVersionFromContent` correctly handles) will yield `lastDataRowIdx = -1` and silently return the content unchanged. The auto-insert silently fails with no log or warning.

**Fix:** Add `v?` prefix to the detection regex, mirroring `extractVersionFromContent`:

```ts
if (inSection && /^\|\s*v?\d+\.\d+\s*\|/.test(lines[i])) {
  lastDataRowIdx = i;
}
```

Or add a warning log on the silent no-op path:

```ts
if (lastDataRowIdx === -1) {
  logger.warn("insertChangelogRow: no 改訂履歴 data row found — row not inserted");
  return content;
}
```

---

## Low Priority

### 4. `validateChangelogPreservation` truncation message always appends `...`

**File:** `src/lib/validator.ts` line 411

```ts
message: `改訂履歴 row missing or modified: ${oldRow.slice(0, 60)}...`,
```

When `oldRow.length <= 60`, the `...` is misleading — nothing was truncated. Minor but adds noise to error messages.

**Fix:**
```ts
const preview = oldRow.length > 60 ? oldRow.slice(0, 60) + "..." : oldRow;
message: `改訂履歴 row missing or modified: ${preview}`,
```

### 5. `parseRevisionDataRows` is exported but only used internally

**File:** `src/lib/validator.ts` line 374

`parseRevisionDataRows` is a pure helper only called by `validateChangelogPreservation` in the same file. Exporting it for skill-layer use is fine if intended for the post-generation validation step described in utilities.md step 11 — but if it remains test-only, consider keeping it unexported to minimize API surface (YAGNI).

### 6. `auto_insert_changelog` without `existing_content` silently does nothing

**File:** `src/tools/generate.ts` lines 329–337, `inputSchema` description line 68

The schema description says "Requires existing_content" but there is no validation error if `auto_insert_changelog=true` and `existing_content` is absent — the insert block is simply skipped. The skill flows rely on this contract. Consider adding a Zod `.refine()` to the schema, or at minimum a `logger.warn` when the combination is detected.

---

## Edge Cases Found

- **v-prefix rows + `insertChangelogRow`**: Silent no-op (issue 3 above)
- **`incrementVersion` with non-semver strings**: Produces `NaN.NaN` garbage in CHANGELOG row (issue 2)
- **`auto_insert_changelog=true` + empty 改訂履歴 table**: `extractVersionFromContent` returns `""`, `incrementVersion("")` returns `"1.0"` correctly, but `insertChangelogRow` still needs a data row to anchor insertion — table with header only but no data rows returns content unchanged (safe)
- **Whitespace normalization in `validateChangelogPreservation`**: Correctly handled by `replace(/\s+/g, " ").trim()` — confirmed by test
- **`validateChangelogPreservation` with `newRows.length === oldRows.length` (no new row)**: The function only warns when `issues.length === 0` at that point. If verbatim checks already flagged errors, the "expected exactly 1 new row" warning is suppressed — acceptable behavior

---

## Positive Observations

- `effectiveExistingContent` pattern is clean: auto-insert mutates a local copy, preserving the original for the global changelog (intent is right, implementation has the off-by-one bug in issue 1)
- `extractVersionFromContent` correctly handles v-prefix and 版数-prefix formats — the dual-regex approach is pragmatic
- `validateChangelogPreservation` uses normalized comparison (whitespace-insensitive) — good defensive choice
- Row-count check + verbatim check + "exactly 1 new row" warning is a well-layered validation strategy
- Global changelog is non-blocking (wrapped in try/catch) — correct for a side-effect path
- All new functions are pure and unit-testable; tests cover meaningful scenarios including edge cases like empty previous content and whitespace differences

---

## Recommended Actions

1. **(High)** Fix double version-increment in global CHANGELOG when `auto_insert_changelog=true` — capture `insertedVersion` in the auto-insert block and reuse it instead of re-extracting from `effectiveExistingContent`
2. **(Medium)** Guard `incrementVersion` against non-semver input (NaN propagation)
3. **(Medium)** Add `v?` to `insertChangelogRow`'s row-detection regex, or add a warn log on silent no-op
4. **(Low)** Fix trailing `...` truncation in `validateChangelogPreservation` error message
5. **(Low)** Add missing `existing_content` guard for `auto_insert_changelog=true` (Zod refine or logger.warn)

---

## Metrics

- Type coverage: 100% (lint clean)
- Test coverage: 11 + 6 new tests, all pass
- Linting issues: 0

---

## Unresolved Questions

- Is `parseRevisionDataRows` intended as a public API for skill-layer callers, or is it exported only for testability? If the latter, unexport it.
- The `版数 X.Y` alternative format in `extractVersionFromContent` is handled but not tested — is this format actually produced by any template or just future-proofing?
