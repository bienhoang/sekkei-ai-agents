# Phase 2: Fix Documentation

## Context

- Parent: [plan.md](./plan.md)
- Depends on: Phase 1 (code fixes inform doc accuracy)

## Overview

- Priority: P1
- Status: complete
- Description: Fix chain order in CLAUDE.md files and verify docs/ references

## Key Insights

- Project `CLAUDE.md` has wrong chain: `RFP → functions-list → requirements`
- MCP Server `CLAUDE.md` chain description needs verification
- `docs/system-architecture.md` already correct (verified in brainstorm)

## Related Code Files

### Modify:
1. `CLAUDE.md` (project root) — fix chain order description
2. `sekkei/packages/mcp-server/CLAUDE.md` — verify/fix chain description

### Verify (no change expected):
3. `docs/system-architecture.md` — already correct
4. `docs/code-standards.md` — check for chain references
5. `docs/codebase-summary.md` — check for chain references

## Implementation Steps

### Step 1: Fix project CLAUDE.md

Find and replace the chain order description:
```diff
- RFP → functions-list (機能一覧) → requirements (要件定義書) → basic-design (基本設計書)
-   → detail-design (詳細設計書) → test-plan + ut-spec/it-spec/st-spec/uat-spec (テスト仕様書)
+ RFP → requirements (要件定義書) → { functions-list (機能一覧), nfr (非機能要件) } → basic-design (基本設計書)
+   → detail-design (詳細設計書) → test-plan + ut-spec/it-spec/st-spec/uat-spec (テスト仕様書)
```

### Step 2: Verify MCP Server CLAUDE.md

Current chain description:
```
RFP → requirements → nfr/functions-list/project-plan
  → basic-design → security-design/detail-design
  → test-plan → ut-spec/it-spec/st-spec/uat-spec
```
This is already correct — requirements comes first. Verify no other inconsistencies.

### Step 3: Scan docs/ for chain references

Use grep to find any remaining "functions-list" before "requirements" patterns in docs/.

## Todo

- [x] Fix CLAUDE.md chain order
- [x] Verify MCP Server CLAUDE.md (likely already correct)
- [x] Scan docs/ for stale chain references
- [x] Fix any found inconsistencies

## Success Criteria

- All CLAUDE.md files show: RFP → requirements → functions-list
- No documentation shows functions-list before requirements
- `docs/system-architecture.md` unchanged (already correct)

## Risk Assessment

- **Very low risk** — documentation-only changes, no code impact
