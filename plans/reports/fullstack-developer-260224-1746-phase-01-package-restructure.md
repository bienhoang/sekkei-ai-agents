# Phase Implementation Report

## Executed Phase
- Phase: Phase 1 — Package restructure + build pipeline
- Plan: plans/260224-1714-preview-rewrite/
- Status: completed

## Files Modified / Created

| File | Action | Notes |
|------|--------|-------|
| `packages/preview/package.json` | rewritten | v0.4.1→v1.0.0, VitePress/Milkdown→Express+React+Tiptap |
| `packages/preview/tsconfig.json` | rewritten | rootDir changed to `src/server` |
| `packages/preview/tsconfig.client.json` | created | client-side tsconfig with `bundler` resolution, react-jsx |
| `packages/preview/tsup.config.ts` | created | ESM build, entry `{ server: 'src/server/index.ts' }` → `dist/server.js` |
| `packages/preview/vite.config.ts` | created | React + Tailwind v4, proxy `/api` → port 4983 |
| `packages/preview/index.html` | created | Noto Sans JP, `<div id="root">`, `src/client/main.tsx` |
| `packages/preview/src/server/index.ts` | created | placeholder |
| `packages/preview/src/client/main.tsx` | created | placeholder React root |
| `packages/preview/theme/` | deleted | old VitePress theme |
| `packages/preview/plugins/file-api-plugin.ts` | deleted | old plugin |
| `packages/preview/src/generate-config.ts` | deleted | old VitePress gen |
| `packages/preview/src/generate-index.ts` | deleted | old VitePress gen |
| `packages/preview/src/cli.ts` | deleted | old CLI entry |
| `package.json` (root) | modified | added `vite@^6.4.1` devDep to fix monorepo hoisting |

Preserved for Phase 2: `plugins/safe-path.ts`, `plugins/frontmatter-utils.ts`, `src/resolve-docs-dir.ts`

## Tasks Completed

- [x] Delete old artifacts (theme/, file-api-plugin, generate-config, generate-index, cli)
- [x] Rewrite package.json (Express+React+Tiptap stack)
- [x] Create tsconfig.json (server)
- [x] Create tsconfig.client.json (client/bundler)
- [x] Create tsup.config.ts (ESM node20, entry named `server`)
- [x] Create vite.config.ts (React + Tailwind v4, dev proxy)
- [x] Create index.html
- [x] Create src/server/index.ts (placeholder)
- [x] Create src/client/main.tsx (placeholder)
- [x] npm install --legacy-peer-deps (156 packages, 0 vulnerabilities)
- [x] npm run build — pass (vite + tsup + guide copy)
- [x] tsc --noEmit — pass

## Tests Status
- Type check: pass (zero errors after removing `tsup.config.ts` from tsconfig include)
- Unit tests: N/A (no tests for preview package per spec)
- Build artifacts: `dist/server.js` + `dist/client/index.html` confirmed

## Issues Encountered

1. **Monorepo hoisting conflict**: `@vitejs/plugin-react` was hoisted to root `node_modules` but `vite` was only in the package's local `node_modules`. Root-level plugin-react could not resolve `vite`.
   - Fix: installed `vite@^6.4.1` as a root devDependency so the hoisted plugin can resolve it.

2. **tsup output name**: Default tsup output for `src/server/index.ts` was `dist/index.js`, not `dist/server.js` as required by `package.json` bin field.
   - Fix: Changed entry to `{ server: 'src/server/index.ts' }` in tsup.config.ts.

3. **tsconfig rootDir conflict**: `tsup.config.ts` was included in tsconfig but outside `rootDir: src/server`.
   - Fix: Removed `tsup.config.ts` from tsconfig include array.

4. **Old dist artifacts**: Previous build artifacts remained after `clean: false` in tsup.
   - Fix: Added `rm -rf dist &&` prefix to build script.

## Next Steps
- Phase 2 unblocked: Express server + API routes (`src/server/index.ts` full impl)
- Phase 2 should move `plugins/safe-path.ts`, `plugins/frontmatter-utils.ts`, `src/resolve-docs-dir.ts` into new locations
