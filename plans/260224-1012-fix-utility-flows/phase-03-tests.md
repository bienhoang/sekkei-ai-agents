# Phase 3: Tests

## Context

- Parent: [plan.md](plan.md)
- Depends on: Phase 2 (backend fixes must be complete first)
- Covers: B8 (Python ID regex), B9 (staleness per-feature)

## Overview

- **Priority:** Medium
- **Status:** complete
- **Description:** Add/update tests for Python ID regex change and staleness per-feature fix.

## Related Code Files

**Modify:**
- `sekkei/packages/mcp-server/tests/unit/staleness-detector.test.ts` — update existing + add per-feature test
- `sekkei/packages/mcp-server/python/nlp/diff_analyzer.py` — add inline test or verify via existing test

**Reference:**
- `sekkei/packages/mcp-server/tests/unit/staleness-formatter.test.ts` — pattern reference

## Implementation Steps

### S1: Test Python ID regex (B8 verification)

Add test cases to verify `extract_ids()` only matches whitelisted prefixes.

**Option A:** Add Python unit test (if test infrastructure exists).
**Option B:** Test via TS integration — call `analyze_update` with content containing non-standard IDs, verify they don't appear in `changed_ids`.

Test cases:
```
Input: "REQ-001 AWS-123 F-002 JP-001 SCR-010 UI-05"
Expected: {"REQ-001", "F-002", "SCR-010"}
NOT expected: {"AWS-123", "JP-001", "UI-05"}
```

### S2: Test staleness per-feature doc paths (B9 verification)

Update `staleness-detector.test.ts`:

**Existing test pattern** likely mocks `simple-git`. Add test case:
- Config with 2 features mapping to different file globs
- Mock git.raw for `log -1 --format=%aI --` to return different dates per path set
- Verify: feature A has `lastDocUpdate` = date1, feature B has `lastDocUpdate` = date2
- Previously: both would have the same date (bug)

### S3: Run full test suite

```bash
cd sekkei/packages/mcp-server && npm test
```

Verify all existing tests pass + new tests pass.

## Todo

- [x] S1: Test Python ID regex whitelist
- [x] S2: Test staleness per-feature differentiation
- [x] S3: Run full test suite — all green

## Success Criteria

- New test proves Python regex rejects non-whitelisted prefixes
- New test proves staleness gives different dates per feature
- Full suite: all tests pass, no regressions
- Build + lint clean: `npm run lint && npm run build`
