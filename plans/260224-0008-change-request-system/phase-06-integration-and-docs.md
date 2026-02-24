# Phase 6: Integration & Docs

## Context Links

- `docs/codebase-summary.md` — module inventory
- `docs/code-standards.md` — coding conventions

## Overview

- **Priority:** P3
- **Status:** pending
- **Description:** Verify full build, update documentation to reflect new CR module

## Key Insights

- `npm run build` must pass (tsc compile)
- `npm run lint` must pass (tsc --noEmit type check)
- `npm test` must pass (all tests including new CR tests)
- Docs updates are minimal — add CR module to existing docs

## Requirements

### Functional

1. Build verification: `npm run build` + `npm run lint` + `npm test` all green
2. Update `docs/codebase-summary.md` with CR module listing
3. Update `docs/code-standards.md` if any new conventions introduced

### Non-Functional
- No breaking changes to existing tools
- Existing tests still pass

## Related Code Files

### Files to Edit
- `docs/codebase-summary.md` — add CR module section
- `docs/code-standards.md` — add CR-specific conventions if any

## Implementation Steps

### Step 1: Build verification

```bash
cd sekkei/packages/mcp-server
npm run build
npm run lint
npm test
```

Fix any compilation or test errors.

### Step 2: Update codebase-summary.md

Add section for Change Request module:

```markdown
### Change Request System
- `src/types/change-request.ts` — CR entity types, status enum, propagation types
- `src/lib/cr-state-machine.ts` — YAML persistence, transitions, CR CRUD
- `src/lib/cr-propagation.ts` — Propagation order computation (upstream + downstream)
- `src/lib/cr-backfill.ts` — Upstream suggestion generator
- `src/lib/cr-conflict-detector.ts` — Parallel CR conflict detection
- `src/tools/change-request.ts` — MCP tool handler (manage_change_request)
```

### Step 3: Update code-standards.md (if needed)

Add CR naming convention:
```markdown
### CR File Naming
- CR files: `CR-YYMMDD-NNN.md` (date-prefixed, zero-padded 3-digit counter)
- CR directory: `sekkei-docs/change-requests/`
```

### Step 4: Verify existing tools unaffected

Run full test suite, confirm no regressions in:
- rfp-workspace-tool.test.ts
- cross-ref-linker.test.ts
- All other existing tests

## Todo List

- [ ] Run `npm run build` — verify no compile errors
- [ ] Run `npm run lint` — verify no type errors
- [ ] Run `npm test` — verify all tests pass (old + new)
- [ ] Update docs/codebase-summary.md
- [ ] Update docs/code-standards.md if needed
- [ ] Verify no regressions in existing test suite

## Success Criteria

- `npm run build` exits 0
- `npm run lint` exits 0
- `npm test` exits 0 (all tests pass)
- Docs accurately reflect new CR module
- No existing tests broken

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Build fails due to import issues | Medium | ESM .js extensions, check all imports |
| Existing tests break | Low | CR module is additive, no existing code modified (except errors.ts + cross-ref exports) |

## Security Considerations

- No new security surface in this phase (docs only)

## Next Steps

CR system is complete. Future enhancements (not in scope):
- CR template for pre-formatted change descriptions
- Auto-regeneration integration (propagate_next triggers generate_document)
- CR dashboard in VitePress preview
- Notification hooks for team workflows
