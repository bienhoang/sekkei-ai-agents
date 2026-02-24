---
title: "sekkei-preview package with --edit WYSIWYG feature"
description: "Create sekkei-preview npm package from scratch: VitePress preview + Milkdown WYSIWYG editor for Japanese spec docs"
status: complete
priority: P2
effort: 16h
branch: feat/sekkei-preview-edit
tags: [sekkei-preview, vitepress, milkdown, wysiwyg, npm-package]
created: 2026-02-21
---

# sekkei-preview Package + --edit Feature

## Summary

Create `sekkei/packages/sekkei-preview/` npm package providing `npx sekkei-preview` CLI. Default mode = read-only VitePress. `--edit` flag enables Milkdown WYSIWYG in-browser editing with file API endpoints.

## Architecture

```
npx sekkei-preview [--edit] [--docs path] [--port N]
  |
  VitePress Dev Server (single process)
  ├── Custom theme (JP typography, auto-sidebar)
  ├── Vite plugin: /__api/read, /__api/save, /__api/list (edit mode only)
  └── Milkdown WYSIWYG editor (edit mode only, ClientOnly)
  |
  output_dir/ (filesystem = source of truth)
```

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Create sekkei-preview npm package + CLI | 3h | complete | [phase-01](./phase-01-create-sekkei-preview-package.md) |
| 2 | VitePress base theme + JP layout | 2h | complete | [phase-02](./phase-02-vitepress-base-theme.md) |
| 3 | Vite file API plugin | 2.5h | complete | [phase-03](./phase-03-vite-file-api-plugin.md) |
| 4 | Milkdown editor Vue component | 3h | complete | [phase-04](./phase-04-milkdown-editor-component.md) |
| 5 | Layout integration + edit mode toggle | 3h | complete | [phase-05](./phase-05-layout-and-integration.md) |
| 6 | SKILL.md + install.sh updates | 2.5h | complete | [phase-06](./phase-06-skill-and-install-update.md) |

## Key Dependencies

- VitePress latest (check npm, use latest available version)
- Milkdown v7 (@milkdown/kit, @milkdown/vue, @milkdown/theme-nord)
- Node.js 20+ (ESM, matches MCP server)
- sekkei.config.yaml `output.directory` for docs path resolution

## Research Reports

- [Milkdown + VitePress](./research/researcher-01-milkdown-vitepress.md)
- [Vite Plugin API](./research/researcher-02-vite-plugin-api.md)
- [Brainstorm](../reports/brainstorm-260221-2228-sekkei-preview-edit.md)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | VitePress + Vite plugin | No Docker/DB, files = truth |
| Editor | Milkdown v7 | WYSIWYG, ProseMirror, GFM tables, CJK |
| File sync | REST API via configureServer() | Simple, HMR built-in |
| Frontmatter | Strip before editor, re-attach on save | Prevent corruption |
| SSR safety | ClientOnly + defineClientComponent | Milkdown needs DOM |
| Editor UX | Inline replace (not overlay) | Smoother transition, no flash |
| Config location | In docs dir (.vitepress/) | User can see/customize |
| Package install | Direct node path (not npm link) | No permission issues |
| New file creation | Deferred to future | MVP = edit existing only |
| Roundtrip fidelity | Accept minor whitespace changes | Practical for WYSIWYG |
| VitePress version | Use latest available | Check npm, don't pin 1.x |

## Validation Log

### Session 1 — 2026-02-21
**Trigger:** Initial plan validation before implementation
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** Phase 01 generates .vitepress/config.mts dynamically inside the user's docs directory on every run. This creates/overwrites config files in their project. Alternative: generate in a temp dir and pass to VitePress. Which approach?
   - Options: In docs dir (as planned) | Temp dir | In docs dir, skip if exists
   - **Answer:** In docs dir (as planned)
   - **Rationale:** User can see and customize config. Simpler approach. Overwrite is acceptable since config is generated.

2. **[Architecture]** Phase 06 uses `npm link` to make sekkei-preview available via npx. This is fragile. Alternatives?
   - Options: npm link (as planned) | Direct node path | npm workspace
   - **Answer:** Direct node path
   - **Rationale:** Most reliable. No global state, no permission issues. SKILL.md calls `node /path/to/dist/cli.js` directly.

3. **[Scope]** Plan defers 'creating new markdown files' to future scope. Include in MVP?
   - Options: Defer (as planned) | Include basic creation | Include with template picker
   - **Answer:** Defer (as planned)
   - **Rationale:** MVP focus on editing existing files. New files created via sekkei CLI or manually.

4. **[Risk]** Markdown roundtrip fidelity. What's your tolerance for formatting changes?
   - Options: Accept minor changes | Strict: minimal diff | Offer raw markdown fallback
   - **Answer:** Accept minor changes
   - **Rationale:** Whitespace/blank line changes OK. Content must be identical. Practical for WYSIWYG.

5. **[Architecture]** Phase 05 uses overlay pattern. Alternative: inline replace. Which UX?
   - Options: Overlay (as planned) | Inline replace | Side-by-side
   - **Answer:** Inline replace
   - **Rationale:** Smoother UX. No flash risk from HMR timing. Editor replaces content area in-place.

6. **[Architecture]** VitePress version pinning strategy?
   - Options: Pin to 1.x | Use latest available | Pin range ^1.0.0
   - **Answer:** Use latest available
   - **Rationale:** Check npm for latest VitePress version. Don't hardcode 1.x assumption.

#### Confirmed Decisions
- Config in docs dir: as planned — no change
- Direct node path: replaces npm link — Phase 06 updated
- Defer new file creation: as planned — no change
- Minor roundtrip changes: acceptable — document in Phase 04
- Inline replace: replaces overlay — Phase 05 updated
- Latest VitePress: replaces 1.x pin — Phase 01 updated

#### Action Items
- [x] Update Phase 01: VitePress dependency to latest (not pinned 1.x)
- [x] Update Phase 05: Change from overlay to inline replace pattern
- [x] Update Phase 06: Remove npm link, use direct node path

#### Impact on Phases
- Phase 01: Change VitePress dep from `1.x` to latest available version
- Phase 05: Replace overlay architecture with inline replace (editor replaces VitePress content area)
- Phase 06: Remove npm link step, update SKILL.md to use `node <path>/dist/cli.js` instead of `npx sekkei-preview`
