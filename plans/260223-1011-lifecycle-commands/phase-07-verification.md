# Phase 7: Build + Test Verification

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: All phases 1-6

## Overview
- **Priority**: High
- **Status**: pending
- **Description**: Verify all new code compiles, existing tests pass, and new commands work correctly.

## Requirements

### Functional
- `npm run lint` (tsc --noEmit) passes with 0 errors
- `npm run build` compiles all new files
- `npm test` — all existing tests pass (no regressions)
- Manual verification: `sekkei version` outputs health check
- Manual verification: install.sh still runs without errors

### Non-functional
- No new TypeScript errors introduced
- No broken imports (ESM .js extensions correct)

## Implementation Steps

1. Run `npm run lint` in `packages/mcp-server/` — fix any type errors
2. Run `npm run build` — verify all new .ts files compile to dist/
3. Run `npm test` — verify 306+ tests still pass
4. Test CLI: `node packages/mcp-server/dist/cli/main.js version`
5. Verify install.sh: run `bash -n sekkei/install.sh` (syntax check)
6. Verify SKILL.md: check sub-command count matches install.sh stubs

## Todo List
- [ ] npm run lint passes
- [ ] npm run build succeeds
- [ ] npm test — all tests pass
- [ ] `sekkei version` command works
- [ ] install.sh syntax valid
- [ ] SKILL.md sub-command count = install.sh stub count

## Success Criteria
- Zero compile errors
- Zero test regressions
- New commands produce expected output
- install.sh backward compatible

## Next Steps
- Ready for commit + PR
