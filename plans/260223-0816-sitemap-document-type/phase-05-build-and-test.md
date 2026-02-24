# Phase 5: Build & Test

## Context

- [Plan](./plan.md)
- MCP server root: `sekkei/packages/mcp-server/`

## Overview

- **Priority**: High
- **Status**: pending
- **Description**: Verify all changes compile and pass tests. Run type check, build, and existing test suite.

## Requirements

### Functional
- `npm run lint` passes (type check)
- `npm run build` succeeds
- `npm test` passes (all existing tests)
- Template loads correctly for `doc_type: "sitemap"`

### Non-functional
- No regressions in existing functionality

## Related Code Files

- All files modified in Phases 1-4
- Test files in `sekkei/packages/mcp-server/tests/`

## Implementation Steps

1. `cd sekkei/packages/mcp-server`
2. Run `npm run lint` — verify zero TS errors
3. Run `npm run build` — verify clean compile
4. Run `npm test` — verify all existing tests pass
5. If any test references `DOC_TYPES` length or iterates over all doc types, verify it handles `"sitemap"` correctly
6. Optional: add quick smoke test for sitemap template loading

## Todo List

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` all pass
- [ ] No regressions

## Success Criteria

- All 3 commands pass with zero errors
- Existing tests unaffected
- `"sitemap"` recognized as valid `DocType` throughout system

## Risk Assessment

- **Low risk**: Purely additive changes
- Watch for tests that hard-code `DOC_TYPES.length` or snapshot doc type lists

## Next Steps

- Implementation complete — ready for commit
