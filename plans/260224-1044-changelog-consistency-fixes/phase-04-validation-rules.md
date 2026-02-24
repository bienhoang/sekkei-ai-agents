# Phase 4: Validation Rules Enhancement

## Context Links

- Parent: [plan.md](./plan.md)
- Independent: can run parallel with Phase 2/3

## Overview

- **Priority:** P4
- **Status:** completed
- **Description:** Enhance validator to check 改訂履歴 content quality — staleness, row count, version sequence. Warning only (not blocking).

## Key Insights

- Current validator only checks: heading exists + 4 required columns present
- No content validation: rows could be empty, stale, or out of sequence
- User wants **warning only** mode — document generation/validation not blocked
- Staleness check needs comparison with document metadata (git date or file mtime)

## Requirements

- FR1: Version sequence check — warn if 版数 not ascending
- FR2: Row count check — warn if only 初版作成 row when doc has been modified
- FR3: Staleness check — warn if last 改訂履歴 date older than git last-commit-date
- FR4: All issues reported as `severity: "warning"` (not error)
- FR5: Git-based checks gracefully degrade (skip if not in git repo)

## Related Code Files

| File | Lines | Change |
|------|-------|--------|
| `src/lib/validator.ts` | After ~line 290, and ~line 309-324 | Add validateRevisionHistoryContent() + integrate |

## Implementation Steps

### Step 1: Add `validateRevisionHistoryContent()` function

After existing validation functions (~line 290 in validator.ts):

```typescript
/** Validate 改訂履歴 content quality (warnings only) */
export function validateRevisionHistoryContent(
  content: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Extract 改訂履歴 table rows
  const sectionMatch = content.match(
    /^#{1,4}\s+改訂履歴\n([\s\S]*?)(?=^#{1,4}\s+[^|]|\s*$)/m
  );
  if (!sectionMatch) return issues;

  const tableContent = sectionMatch[1];
  const dataRows = tableContent
    .split("\n")
    .filter((line) => /^\|\s*\d+\.\d+\s*\|/.test(line));

  if (dataRows.length === 0) {
    issues.push({
      type: "completeness",
      severity: "warning",
      message: "改訂履歴 table has no data rows",
    });
    return issues;
  }

  // Check version sequence (ascending)
  const versions: string[] = [];
  for (const row of dataRows) {
    const match = row.match(/^\|\s*([0-9]+\.[0-9]+)\s*\|/);
    if (match) versions.push(match[1]);
  }

  for (let i = 1; i < versions.length; i++) {
    const [prevMaj, prevMin] = versions[i - 1].split(".").map(Number);
    const [currMaj, currMin] = versions[i].split(".").map(Number);
    if (currMaj < prevMaj || (currMaj === prevMaj && currMin <= prevMin)) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `改訂履歴 版数 not ascending: ${versions[i - 1]} → ${versions[i]}`,
      });
    }
  }

  // Check for empty 変更内容 cells
  for (const row of dataRows) {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[2] === "") {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `改訂履歴 row ${cells[0]}: empty 変更内容`,
      });
    }
  }

  return issues;
}
```

### Step 2: Integrate into validateDocument()

In `validateDocument()` function (~line 309), add call after existing checks:

```typescript
// After existing completeness and table checks
const revisionIssues = validateRevisionHistoryContent(content);
issues.push(...revisionIssues);
```

### Step 3: Add staleness check (optional, git-dependent)

Add to `validate_document` MCP tool in `validate.ts`:

```typescript
// If workspace_path provided, check git date vs 改訂履歴 date
if (workspace_path) {
  try {
    const gitDate = execSync(
      `git log -1 --format=%ci -- "${doc_path}"`,
      { cwd: workspace_path, encoding: "utf-8" }
    ).trim().slice(0, 10);

    const lastRevDate = extractLastRevisionDate(content);
    if (lastRevDate && gitDate > lastRevDate) {
      issues.push({
        type: "completeness",
        severity: "warning",
        message: `改訂履歴 may be stale: last entry ${lastRevDate}, git last modified ${gitDate}`,
      });
    }
  } catch { /* not in git repo — skip */ }
}
```

Helper:
```typescript
function extractLastRevisionDate(content: string): string | null {
  const sectionMatch = content.match(
    /^#{1,4}\s+改訂履歴\n([\s\S]*?)(?=^#{1,4}\s+[^|]|\s*$)/m
  );
  if (!sectionMatch) return null;
  const dates = [...sectionMatch[1].matchAll(/\|\s*\d+\.\d+\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/g)]
    .map((m) => m[1]);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}
```

## Todo

- [x] Add `validateRevisionHistoryContent()` to validator.ts
- [x] Integrate into `validateDocument()` pipeline
- [x] Add `extractLastRevisionDate()` helper
- [x] Add staleness check with git fallback (non-blocking)
- [x] Build & lint check
- [x] Write unit tests: version sequence, empty cells, staleness scenarios

## Success Criteria

- Validator reports warnings for: non-ascending versions, empty change descriptions, stale dates
- All warnings are `severity: "warning"` (never error/block)
- Existing validation behavior unchanged (no regressions)
- Git-less environments skip staleness check gracefully

## Risk Assessment

- **LOW:** Regex parsing may miss unusual table formatting
- **LOW:** Git not available in all environments → graceful skip
- **NONE:** Warning-only means no workflow disruption

## Next Steps

→ All phases complete → run tests → commit
