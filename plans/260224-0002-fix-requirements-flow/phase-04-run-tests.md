# Phase 4: Run Tests

## Context

- Parent: [plan.md](./plan.md)
- Depends on: Phase 1, Phase 2, Phase 3

## Overview

- Priority: P1
- Status: complete
- Description: Verify all changes pass tests, no regressions

## Implementation Steps

### Step 1: TypeScript compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

### Step 2: Run full test suite

```bash
cd sekkei/packages/mcp-server && npm test
```

### Step 3: Check for test failures related to changes

If any tests fail, check:
- Tests referencing `F-\d{3}` in requirements context → update to `REQ-\d{3}`
- Tests checking completeness rules for requirements → update assertions
- Tests validating template column count → update expected column count (10→9)

### Step 4: Grep for remaining F-xxx references in requirements context

```bash
# Ensure no stale F-xxx references remain in requirements-related code
grep -r "F-xxx" --include="*.ts" --include="*.md" | grep -i "requirements"
```

## Todo

- [x] TypeScript compile check passes
- [x] Full test suite passes
- [x] No stale F-xxx references in requirements context
- [x] Grep verification clean

## Success Criteria

- `npm run lint` passes with 0 errors
- `npm test` passes with 0 failures
- No F-xxx referenced in requirements-related files

## Risk Assessment

- **Low risk** — read-only verification phase
- If tests fail, fix in Phase 1 context (not new phase)
