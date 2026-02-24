# Phase 4: Server & Verification

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 3](./phase-03-app-integration.md)
- Server: `packages/preview/src/server/app.ts`

## Overview

- **Priority**: Medium
- **Status**: Completed
- **Description**: Verify server catch-all works for document URLs, test both modes, build check

## Key Insights

- Express route order in `app.ts`: `/api/*` → `/docs-assets/*` → static client → `*` catch-all
- Catch-all at line 37-39: `app.get('*')` serves `index.html` — already correct for SPA routing
- `/api/*` has its own 404 handler — won't conflict
- `/docs-assets/*` only serves image extensions — won't match `.md` URLs
- Static client middleware only matches actual built files (js/css/html in dist)
- **No server changes needed** — current setup already supports History API routing

## Requirements

### Functional
- `GET /docs/basic-design/01-overview.md` → serves index.html (SPA takes over)
- `GET /api/tree` → still returns JSON tree (not index.html)
- `GET /docs-assets/image.png` → still serves the image
- Both `workspace` and `guide` modes work identically

### Non-Functional
- No server code changes unless issue found during verification

## Related Code Files

| File | Action |
|------|--------|
| `src/server/app.ts` | **Verify** (read-only, change only if issue found) |
| `src/server/index.ts` | **Verify** server startup |

## Implementation Steps

1. Read `app.ts` — confirm route order is: API → assets → static → catch-all ✅ (already verified)
2. Build the preview package: `npm run build` from `packages/preview/`
3. Start server, test these URLs manually or via curl:
   - `GET /` → should serve index.html
   - `GET /docs/some-file.md` → should serve index.html
   - `GET /api/tree` → should return JSON
   - `GET /docs-assets/test.png` → should serve image (if exists)
4. Test workspace mode: start with `--mode workspace` or default
5. Test guide mode: start with `--mode guide`
6. Verify browser behavior: open URL, navigate, reload, back/forward

## Todo

- [ ] Build preview package
- [ ] Verify catch-all serves index.html for document URLs
- [ ] Verify API routes unaffected
- [ ] Verify static assets unaffected
- [ ] Test workspace mode
- [ ] Test guide mode
- [ ] Verify reload on document URL works

## Success Criteria

- All 4 URL types (root, document, API, asset) handled correctly
- No server code changes needed (expected outcome)
- Both modes functional with URL routing

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Static middleware matching .md files | Very Low | Express static only serves files that exist in client dist |
| Asset path collision | Very Low | Different URL prefix /docs-assets/ vs document paths |

## Next Steps

→ Plan complete. Ready for implementation.
