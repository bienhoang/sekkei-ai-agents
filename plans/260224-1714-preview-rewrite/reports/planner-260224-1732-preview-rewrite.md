# Planner Report: Preview Package Rewrite

**Date:** 2026-02-24
**Plan:** `plans/260224-1714-preview-rewrite/`
**Effort:** 15h across 6 phases

---

## Summary

Complete rewrite of `packages/preview` from VitePress+Vue+Milkdown to Express+React+Tiptap v3+Tailwind v4. Clean break — all old framework code deleted. Package name and version bump (`@bienhoang/sekkei-preview` → `1.0.0`).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `tiptap-markdown` (community) not `@tiptap/extension-markdown` | Pro/cloud only — not on npm |
| Tailwind v4 CSS-first, no config file | `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` is all that's needed |
| `tsup clean: false` | `vite build` runs first; tsup must not wipe `dist/client/` |
| Default port 4983 (not 5173) | Avoids collision with any Vite dev servers the user may run |
| Bind to `127.0.0.1` only | Security — loopback only, not LAN-exposed |
| `window.confirm` for unsaved-switch dialog | KISS — no modal library dependency |
| `window.prompt` for link URL | KISS — acceptable for internal tool |
| No file watching | KISS — no HMR needed; page reload is sufficient |
| Reuse `safe-path.ts`, `frontmatter-utils.ts`, `resolve-docs-dir.ts` | Logic is correct; move not rewrite |
| No Jest/Playwright for preview | YAGNI — manual E2E checklist is proportionate |

## Files Produced

```
plans/260224-1714-preview-rewrite/
├── plan.md                          ← overview, phase table, decisions, API, reuse map
├── phase-01-package-restructure.md  ← delete old, new package.json + tsup + vite + tsconfigs
├── phase-02-express-server-api.md   ← server utils, routes, app factory, CLI entry
├── phase-03-react-frontend-tree.md  ← hooks, tree components, layout, system bar
├── phase-04-tiptap-editor.md        ← Tiptap + tiptap-markdown, toolbar, save, dirty state
├── phase-05-dual-mode.md            ← verify mode flow, build:guide, smoke tests
└── phase-06-skill-update-e2e.md     ← skill doc update + full E2E curl checklist
```

## New Package Structure (target)

```
packages/preview/
├── package.json          deps: express, react, @tiptap/*, tiptap-markdown, tailwindcss
├── tsconfig.json         server (NodeNext)
├── tsconfig.client.json  client (bundler, react-jsx)
├── tsup.config.ts        → dist/server.js (ESM, clean:false, shebang)
├── vite.config.ts        → dist/client/ (React SPA)
├── index.html            SPA shell + Noto Sans JP font link
├── src/server/
│   ├── index.ts          CLI: parseArgs, get-port, open, createApp
│   ├── app.ts            Express factory: routes + static + SPA catch-all
│   ├── routes/tree.ts    GET /api/tree
│   ├── routes/files.ts   GET/PUT /api/files + GET /api/system
│   └── utils/            safe-path, frontmatter, resolve-docs-dir, tree-scanner
└── src/client/
    ├── main.tsx, App.tsx
    ├── components/       TreeSidebar, TreeNode, TiptapEditor, EditorToolbar, SystemBar, EmptyState
    ├── hooks/            use-tree, use-file, use-save-file, use-system
    └── styles/globals.css
```

## Key Risks Flagged

1. **`tiptap-markdown` peer deps** — may need `--legacy-peer-deps` with Tiptap v3; verify at install time
2. **`guide/` not copied before `--guide` mode** — `npm run build` must run before using guide mode; resolveGuideDir falls back to `docs/user-guide/` in monorepo
3. **Vite dev proxy** — dev workflow requires both `npm run dev:server` (port 4983) and `npm run dev:client` (port 5173 with proxy); documented in Phase 1

## Unresolved Questions

1. Does repo CI `npm test` iterate all workspaces? If yes, add `"test": "echo 'no tests' && exit 0"` to preview `package.json` (Phase 6 covers this).
2. Exact `tiptap-markdown` version compatible with Tiptap v3.20.0 — verify `npm info tiptap-markdown` at implementation time.
3. Should `guide/` be committed to git for the published package, or built only on `npm publish`? Recommendation: keep out of git, add to `.gitignore`, run in `prepublishOnly` script.
4. React 18 vs 19 — research confirms Tiptap v3 works with React 18 in practice; stick with React 18 to avoid any peer dep warnings.
