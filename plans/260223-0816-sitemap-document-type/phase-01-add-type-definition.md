# Phase 1: Add Sitemap to Type System

## Context

- [Plan](./plan.md)
- File: `sekkei/packages/mcp-server/src/types/documents.ts`

## Overview

- **Priority**: High (blocks all other phases)
- **Status**: pending
- **Description**: Add `"sitemap"` to `DOC_TYPES` array. TypeScript compiler will then enforce all `Record<DocType, ...>` are updated.

## Key Insights

- `DOC_TYPES` is `as const` array on line 6 — adding value here auto-extends `DocType` union
- `GENERATION_INSTRUCTIONS` and `KEIGO_MAP` are typed `Record<DocType, ...>` — TS will error until they're updated (Phase 3)
- No chain entry needed — sitemap is auxiliary, not in V-model chain
- No split support needed — sitemap is always single-file

## Requirements

### Functional
- Add `"sitemap"` to `DOC_TYPES` array
- No changes to `ProjectConfig.chain` (auxiliary doc)

### Non-functional
- Must compile with `npm run lint`

## Related Code Files

- **Modify**: `sekkei/packages/mcp-server/src/types/documents.ts` (line 6)

## Implementation Steps

1. Open `src/types/documents.ts`
2. Add `"sitemap"` to end of `DOC_TYPES` array (line 6), after `"migration-design"`
3. Run `npm run lint` — expect TS errors in `generation-instructions.ts` (Phase 3 will fix)

## Todo List

- [ ] Add `"sitemap"` to `DOC_TYPES` array
- [ ] Verify `DocType` union includes `"sitemap"`

## Success Criteria

- `"sitemap"` exists in `DOC_TYPES`
- TypeScript correctly infers `"sitemap"` as valid `DocType`

## Risk Assessment

- **Low risk**: Pure additive change to const array
- TS will report errors in downstream `Record<DocType, ...>` until Phase 3 completes

## Next Steps

- Phase 2: Create template
- Phase 3: Add generation instructions + keigo map (fixes TS errors)
