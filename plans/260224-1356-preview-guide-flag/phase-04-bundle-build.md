# Phase 4: Bundle Build Step

## Context
- Parent: [plan.md](./plan.md)
- Depends on: Phase 1 (renamed user-guide exists)
- Package: `packages/preview/package.json`

## Overview
- **Priority:** Medium
- **Status:** complete
- **Description:** Add build step to copy `docs/user-guide/` → `packages/preview/guide/` for published package. Add to .gitignore.

## Key Insights
- Current build: just `tsc` (TypeScript compile)
- Need pre-publish step: copy guide into package so `resolveGuideDir()` finds it
- `guide/` should NOT be committed — generated artifact, like `dist/`
- package.json `files` array controls what gets published to npm

## Related Code Files
- **Modify:** `packages/preview/package.json`
- **Modify:** `packages/preview/.gitignore`

## Implementation Steps

1. **package.json** — add `"guide/"` to `files` array:
   ```json
   "files": ["dist/", "theme/", "plugins/", "guide/"]
   ```

2. **package.json** — add `build:guide` script + update `build`:
   ```json
   "scripts": {
     "build": "tsc && npm run build:guide",
     "build:guide": "node -e \"const {cpSync}=require('fs');cpSync('../../docs/user-guide','./guide',{recursive:true})\"",
     "lint": "tsc --noEmit"
   }
   ```
   Note: Using Node.js one-liner for cross-platform compat (no `cp -r` on Windows).

3. **.gitignore** — add `guide/` entry:
   ```
   # Bundled user guide (generated during build)
   guide/
   ```

## Todo
- [x] Add `guide/` to package.json `files`
- [x] Add `build:guide` script
- [x] Update `build` to chain `build:guide`
- [x] Add `guide/` to .gitignore

## Success Criteria
- `npm run build` produces both `dist/` and `guide/`
- `guide/` directory contains all numbered user-guide files
- `guide/` not tracked by git
- `npm pack` includes `guide/` in published tarball

## Risk
- Relative path `../../docs/user-guide` assumes monorepo structure. If preview is published standalone, the build:guide step will fail — acceptable since it's only needed for publishing from monorepo.
