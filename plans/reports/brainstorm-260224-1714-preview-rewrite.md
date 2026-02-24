# Brainstorm: Replace VitePress Preview with Express+React+Tiptap

**Date:** 2026-02-24
**Status:** Agreed
**Reference:** sales-iq dashboard plan at `sales-iq/plans/260224-1536-siq-dashboard/`

---

## Problem Statement

Current `packages/preview` uses VitePress + Vue + Milkdown — heavy (~50MB node_modules), Vue-based (rest of monorepo is TS/Node), flat file list (no tree), and the WYSIWYG editor (Milkdown) has limited markdown fidelity.

**Goal:** Replace with Express + React + Tiptap v3 + Tailwind v4 — same stack as sales-iq dashboard, but adapted for sekkei's two modes:
- `/sekkei:preview` → workspace-docs with Tiptap editing (CRUD)
- `/sekkei:preview --guide` → user guide readonly (no CRUD)

New requirement: file browser must be a **tree** (nested folders), not flat list.

---

## Evaluated Approaches

### Option A: Adapt sales-iq dashboard code directly
**Pros:** Proven, already built
**Cons:** Different domain model (flat categories vs nested dirs), tight coupling to sales-iq concepts (workspace/, brand-context.md)
**Verdict:** Good reference, but can't copy-paste. Adapt patterns only.

### Option B: Keep VitePress, add React sidebar
**Pros:** Keep VitePress rendering quality
**Cons:** Two frameworks (Vue+React), worse DX, VitePress still heavy
**Verdict:** Rejected — defeats the purpose.

### Option C: Clean break — Express+React+Tiptap (CHOSEN)
**Pros:** One stack (React), lighter, full control over UI, tree view easy to build, proven patterns from sales-iq
**Cons:** Lose VitePress HMR, need to build rendering from scratch
**Verdict:** Best overall. KISS. User confirmed no file watching needed.

---

## Final Recommended Solution

### Architecture

```
sekkei-preview [options]
  → Express (127.0.0.1:<port>) serves dist/client/ + REST API
  → API reads/writes workspace-docs/ files under CWD (or --docs path)
  → React SPA with tree sidebar + Tiptap WYSIWYG editor
  → --guide mode: serve bundled user-guide/ as readonly
```

### Dual Build Pipeline
```
vite build → dist/client/     (React SPA)
tsup       → dist/server.js   (Express server, ESM, clean: false)
```

### Package Strategy
- **In-place replacement:** Keep `@bienhoang/sekkei-preview` package name
- **Clean break:** Remove ALL VitePress/Vue/Milkdown dependencies
- **New deps:** express, get-port, open, react, react-dom, @tiptap/*, tailwindcss v4

### Two Modes

| Feature | Default (workspace) | `--guide` |
|---------|-------------------|-----------|
| Source | workspace-docs/ (auto-resolved) | Bundled guide/ or docs/user-guide/ |
| Editor | Tiptap WYSIWYG (editable) | Tiptap readonly (editable=false) |
| Save | PUT /api/files | Disabled (no save button, no API) |
| Tree | Full depth, expand/collapse | Full depth, readonly |

### File Tree
- Custom recursive `<TreeNode>` component (~50 LOC)
- Full directory depth, collapsed by default
- Numeric prefix sorting (01-foo before 02-bar before 10-baz)
- `.md` files only, skip hidden files/dirs, skip `node_modules`
- Icons: folder (expanded/collapsed) + file

### Tiptap Editor
- **Tiptap v3** all packages (react, pm, starter-kit, markdown, extension-link)
- `contentType: 'markdown'` for markdown input/output
- `editor.storage.markdown.getMarkdown()` for serialization
- StarterKit + Link extension (skip tables/syntax-highlight for v1)
- `@tailwindcss/typography` for prose styling
- **Frontmatter handling:** Skip YAML files entirely in preview (per user request)
- **Strip/reattach** YAML frontmatter on read/save for `.md` files that contain it

### API Endpoints
```
GET  /api/tree                    → nested file tree structure
GET  /api/files?path=<relative>   → { content, path, modified }
PUT  /api/files?path=<relative>   → { path, saved: true }
GET  /api/system                  → { version }
```

### Japanese Typography
- Tailwind v4 @theme directive in globals.css
- Noto Sans JP font-family, 1.8 line-height
- Spec table styling (borders, padding, hover)

### Security
- 127.0.0.1 binding only
- `safePath()` — path.resolve + startsWith guard
- `dotfiles: 'deny'` on express.static
- No shell execution
- Max body size limit on writes

### CLI Flags (preserve existing interface)
```
sekkei-preview [command] [options]
  Commands: dev (default), build (removed), serve (removed)
  --docs <path>   Docs directory (auto-resolve if omitted)
  --guide          Serve user guide (readonly)
  --port <N>       Port (default: 4983)
  --edit           Enable editing (default in workspace mode)
  --no-open        Don't open browser
  --help
```

Note: `build` and `serve` commands removed — no SSG needed with Express server approach.

### Docs Dir Resolution (keep existing logic)
1. `--docs` CLI flag
2. `./workspace-docs/` in CWD
3. Legacy `./sekkei-docs/` fallback
4. `sekkei.config.yaml` → `output.directory`
5. Error

### Guide Dir Resolution (keep existing logic)
1. `<packageDir>/guide/` (published package)
2. Walk up from packageDir → `docs/user-guide/`
3. Error

---

## Key Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Full tree depth | Spec docs have varying nesting; limiting depth loses info |
| 2 | Tiptap readonly for --guide | Single renderer = less code. Tiptap handles read-only well |
| 3 | Replace in-place | No migration burden for existing users |
| 4 | No file watching | KISS. Users edit in dashboard UI. Manual refresh if needed |
| 5 | Skip YAML files | User preference — don't show YAML in preview at all |
| 6 | Tailwind v4 @theme for JP | CSS-first config, simplest approach |
| 7 | Numeric prefix sort | Sekkei convention (01-foo, 02-bar) must be preserved |
| 8 | Clean break from VitePress | Remove all Vue/VitePress/Milkdown. Fresh React stack |
| 9 | Custom tree component | ~50 LOC, no extra dep. Full styling control |
| 10 | Strip/reattach frontmatter | Proven pattern from current preview. Hide from editor, preserve on save |

---

## Implementation Considerations

### What to keep from current preview
- `resolve-docs-dir.ts` logic (resolveDocsDir, resolveGuideDir) — adapt to new CLI
- `safe-path.ts` utility — reuse directly
- `frontmatter-utils.ts` (splitFrontmatter, joinFrontmatter) — reuse directly
- Japanese typography CSS values (font-family, line-height)

### What to delete
- `theme/` directory (Vue components)
- `plugins/file-api-plugin.ts` (replaced by Express routes)
- `src/generate-config.ts` (VitePress config generator)
- `src/generate-index.ts` (VitePress index generator)
- All VitePress/Vue/Milkdown dependencies

### What to create (new)
- Express server (app.ts, routes/, index.ts)
- React client (App.tsx, components/, hooks/)
- Tiptap editor component + toolbar
- Tree sidebar component
- Tailwind v4 styling with JP typography
- Vite + tsup build pipeline

### Risks
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tiptap v3 beta instability | Medium | Pin exact versions, test thoroughly |
| Markdown round-trip fidelity | Medium | Test with real sekkei docs, preserve frontmatter |
| Bundle size increase (Tiptap ProseMirror ~130KB gzip) | Low | Acceptable for local dev tool |
| Breaking sekkei:preview skill | Low | Keep CLI flag interface compatible |

---

## Success Metrics

1. `sekkei-preview` starts Express server, opens browser with tree sidebar + editor
2. Tree shows full nested directory structure with numeric sorting
3. Clicking .md file opens in Tiptap editor; save writes back preserving frontmatter
4. `--guide` mode shows user guide in readonly Tiptap
5. `npm run build` produces dist/server.js + dist/client/
6. Zero VitePress/Vue/Milkdown dependencies remain
7. Japanese typography renders correctly (Noto Sans JP, 1.8 line-height)

---

## Estimated Phases

| # | Phase | Effort | Description |
|---|-------|--------|-------------|
| 1 | Package restructure | 2h | Replace deps, new build pipeline (vite+tsup), new file structure |
| 2 | Express server + API | 3h | Reuse safe-path/frontmatter, add tree endpoint, file read/write |
| 3 | React frontend + tree | 4h | Tree sidebar, file display, hooks, JP typography |
| 4 | Tiptap editor | 3h | WYSIWYG editor, toolbar, save, readonly mode |
| 5 | Dual mode (workspace/guide) | 2h | --guide flag, mode switching, disable editing in guide |
| 6 | Skill + integration | 1h | Update sekkei:preview skill, test end-to-end |
| **Total** | | **15h** | |

---

## Unresolved Questions

None — all decisions confirmed by user.
