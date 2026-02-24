---
title: "Rewrite packages/preview — Express + React + Tiptap v3 + Tailwind v4"
description: "Replace VitePress/Vue/Milkdown with Express+React SPA, dual build (vite+tsup), tiptap-markdown, Tailwind v4 prose"
status: pending
priority: P1
effort: 15h
branch: main
tags: [preview, express, react, tiptap, tailwind, rewrite]
created: 2026-02-24
---

# Preview Package Rewrite

Replace `packages/preview` (VitePress + Vue + Milkdown) with a standalone Express + React SPA using Tiptap v3 + Tailwind v4.

## Phases

| # | Phase | Effort | Status | Depends |
|---|-------|--------|--------|---------|
| 1 | [Package Restructure + Build Pipeline](./phase-01-package-restructure.md) | 2h | pending | — |
| 2 | [Express Server + API](./phase-02-express-server-api.md) | 3h | pending | Phase 1 |
| 3 | [React Frontend + Tree Sidebar](./phase-03-react-frontend-tree.md) | 4h | pending | Phase 1 |
| 4 | [Tiptap Editor + Toolbar](./phase-04-tiptap-editor.md) | 3h | pending | Phase 3 |
| 5 | [Dual Mode — Workspace + Guide](./phase-05-dual-mode.md) | 2h | pending | Phase 2,4 |
| 6 | [Skill Update + E2E Tests](./phase-06-skill-update-e2e.md) | 1h | pending | Phase 5 |

**Total: 15h**

## Key Decisions

- Clean break: delete ALL VitePress/Vue/Milkdown code
- Keep package name `@bienhoang/sekkei-preview`, bump to `1.0.0`
- Dual build: `vite build` → `dist/client/`, `tsup` → `dist/server.js` (ESM, `clean: false`)
- `tiptap-markdown` community pkg (NOT `@tiptap/extension-markdown` — pro-only)
- Tailwind v4 CSS-first — no config file, `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"`
- Reuse logic: `safe-path.ts`, `frontmatter-utils.ts`, `resolve-docs-dir.ts` (move to `src/server/utils/`)
- Custom `TreeNode` component (~50 LOC), numeric prefix sort, collapsed by default
- Skip `.yaml`, `.yml`, hidden files in tree
- Guide mode: Tiptap `editable: false`, no save button, no toolbar
- Default port: 4983, bind to 127.0.0.1 only

## API

```
GET  /api/tree                  → nested tree { name, type, children, path }
GET  /api/files?path=<rel>      → { content, path, modified }
PUT  /api/files?path=<rel>      → body: { content } → { path, saved: true }
GET  /api/system                → { version, mode: 'workspace'|'guide' }
```

## Reuse Map

| Old path | New path | Action |
|----------|----------|--------|
| `plugins/safe-path.ts` | `src/server/utils/safe-path.ts` | move |
| `plugins/frontmatter-utils.ts` | `src/server/utils/frontmatter.ts` | move |
| `src/resolve-docs-dir.ts` | `src/server/utils/resolve-docs-dir.ts` | move |
| `plugins/file-api-plugin.ts` | `src/server/routes/files.ts` | replace |
| `src/generate-config.ts` | — | delete |
| `src/generate-index.ts` | — | delete |
| `theme/` (all) | — | delete |

## Validation Log

### Session 1 — 2026-02-24
**Trigger:** Initial plan creation validation
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Phase 1 puts Tiptap + React in `dependencies` (not `devDependencies`). Since Vite bundles them into `dist/client/`, they don't need to be installed at runtime. The sales-iq dashboard plan correctly put them in `devDependencies`. Should we fix this?
   - Options: Move to devDependencies (Recommended) | Keep in dependencies
   - **Answer:** Move to devDependencies
   - **Rationale:** Tiptap/React/Tailwind are bundled by Vite into dist/client/. Only Express/get-port/open/yaml needed at runtime. Reduces install size ~130MB for server-only consumers.

2. **[Scope]** Plan bumps version from 0.4.0 to 1.0.0 (breaking change: VitePress → Express, --edit flag removed). The --edit flag removal means existing skill docs that reference --edit will break. Is 1.0.0 the right version?
   - Options: 1.0.0 (Recommended) | 0.5.0 | 2.0.0
   - **Answer:** 1.0.0
   - **Rationale:** Clean break deserves a major version. Signals breaking change clearly to consumers.

3. **[Architecture]** Phase 1 build script is `"build": "vite build && tsup"` but Phase 5 says `build:guide` should be part of the build. Should `build:guide` run automatically in the main build?
   - Options: Include in build (Recommended) | Separate prepublish step
   - **Answer:** Include in build
   - **Rationale:** Guide always bundled. Build script becomes `vite build && tsup && npm run build:guide`.

4. **[Risk]** Research found `tiptap-markdown` community package (v0.8.x) may have compatibility issues with Tiptap v3.20.0 (it targets v2). If install fails or has peer dep warnings, what's the fallback?
   - Options: Try tiptap-markdown, fallback to raw textarea (Recommended) | Skip WYSIWYG entirely | Use Tiptap HTML mode
   - **Answer:** Try tiptap-markdown, fallback to raw textarea
   - **Rationale:** Install with --legacy-peer-deps if needed. If broken at runtime, degrade to raw markdown textarea with basic preview.

#### Confirmed Decisions
- **Deps location:** Tiptap/React/Tailwind → devDependencies; Express/get-port/open/yaml → dependencies
- **Version:** 1.0.0 — breaking change, clean break
- **Build script:** `vite build && tsup && npm run build:guide`
- **Markdown fallback:** Try tiptap-markdown first; textarea fallback if incompatible with Tiptap v3

#### Action Items
- [ ] Update Phase 1: Move Tiptap/React/Tailwind to devDependencies in package.json
- [ ] Update Phase 1: Change build script to include build:guide
- [ ] Update Phase 4: Add fallback strategy note for tiptap-markdown v3 compat

#### Impact on Phases
- Phase 1: package.json deps restructured (Tiptap/React/Tailwind → devDeps), build script updated to include build:guide
- Phase 4: Add note about tiptap-markdown v3 compat risk + textarea fallback strategy
- Phase 5: build:guide already in main build — no separate step needed
