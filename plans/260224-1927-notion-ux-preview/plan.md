---
title: "Notion-style UX for Sekkei Preview"
description: "Add slash menu, bubble menu, block highlight, toolbar toggle to TipTap editor"
status: complete
priority: P2
effort: 7.5h
branch: main
tags: [preview, ux, tiptap, notion]
created: 2026-02-24
---

# Notion-style UX for Sekkei Preview

Add 3 Notion-like interaction patterns to TipTap editor: slash command menu, floating bubble toolbar, and toolbar refactoring with block highlight CSS.

## Dependencies to Install

```
@tiptap/suggestion                        # slash menu utility (free)
tippy.js                                  # popup positioning for slash menu
```

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Slash Menu (/ command) | 3h | complete | [phase-01](./phase-01-slash-menu.md) |
| 2 | Bubble Menu (floating toolbar) | 2.5h | complete | [phase-02](./phase-02-bubble-menu.md) |
| 3 | Toolbar Refactor + Block Highlight + Polish | 2h | complete | [phase-03-toolbar-refactor.md](./phase-03-toolbar-refactor.md) |

~~Phase 3 (Drag Handle)~~ — Removed during validation. Community package too risky for TipTap v3.

## New Files

- `packages/preview/src/client/components/slash-menu.tsx` -- extension + popup component
- `packages/preview/src/client/components/slash-menu-items.ts` -- item definitions + commands
- `packages/preview/src/client/components/bubble-toolbar.tsx` -- BubbleMenu wrapper
- `packages/preview/src/client/styles/notion-blocks.css` -- block highlight CSS

## Modified Files

- `packages/preview/src/client/components/TiptapEditor.tsx` -- add extensions, layout
- `packages/preview/src/client/components/EditorToolbar.tsx` -- toggle capability
- `packages/preview/package.json` -- new deps

## Constraints

- Files under 200 lines; existing dark theme (zinc/indigo); no save/load changes
- No Mermaid/table/code block behavior changes
- Markdown-first: no formatting that can't survive markdown serialization
- BubbleMenu from `@tiptap/react` (already installed, no extra dep)
- English labels (matches existing toolbar)

## Validation Log

### Session 1 — 2026-02-24
**Trigger:** Initial plan creation validation
**Questions asked:** 6

#### Questions & Answers

1. **[Risk]** Community drag handle package (`tiptap-extension-global-drag-handle`) has HIGH risk — may not work with TipTap v3 or be unmaintained. What's your preferred strategy?
   - Options: Try community first, fallback custom | Skip drag handle entirely | Build custom from scratch
   - **Answer:** Skip drag handle entirely
   - **Rationale:** Eliminates highest-risk phase. Drag handle is nice-to-have; slash menu + bubble menu deliver 80% of Notion UX.

2. **[Assumption]** Plan assumes toolbar HIDDEN by default (Notion-like clean look). This changes existing behavior. Confirm?
   - Options: Hidden by default | Visible by default | Hidden only when both bubble+slash ready
   - **Answer:** Hidden by default
   - **Rationale:** Confirms Notion-like clean look as primary goal. Users discover formatting via bubble + slash.

3. **[Architecture]** Slash menu popup positioning: tippy.js (external dep) or Floating UI (already used internally by TipTap v3)?
   - Options: tippy.js | Floating UI | CSS-only positioning
   - **Answer:** tippy.js
   - **Rationale:** Well-documented, battle-tested. Most TipTap examples use it.

4. **[Scope]** Context menu on drag handle includes 'Turn Into' submenu. Keep for MVP or simplify?
   - Options: Full context menu | Minimal: Delete + Duplicate only | No context menu
   - **Answer:** Full context menu
   - **Rationale:** Moot — drag handle skipped in Q1. Recorded for future reference if drag handle added later.

5. **[Scope]** Scope reduction confirmation: 3 phases (7.5h) instead of 4 (10h)?
   - Options: 3 phases only | Keep block highlight CSS only | Reconsider, keep drag handle
   - **Answer:** Keep block highlight CSS only
   - **Rationale:** Block highlight is pure CSS (~10 lines), zero risk. Adds visual polish without drag handle complexity.

6. **[UX]** Slash menu and Bubble Menu UI text language?
   - Options: English | Japanese
   - **Answer:** English (matches existing toolbar)
   - **Rationale:** Consistency with existing toolbar labels (all English/Unicode symbols).

#### Confirmed Decisions
- Drag handle: SKIPPED (too risky for community package + v3)
- Block highlight CSS: KEPT (pure CSS, no deps)
- Toolbar: hidden by default, toggle via Cmd+Shift+T
- Popup lib: tippy.js
- UI language: English
- Total effort: 7.5h across 3 phases

#### Action Items
- [x] Remove Phase 3 (drag handle) from plan
- [x] Move block highlight CSS to Phase 3 (toolbar refactor)
- [x] Remove `tiptap-extension-global-drag-handle` from deps
- [x] Remove `drag-handle-menu.tsx` from new files
- [x] Renumber Phase 4 → Phase 3

#### Impact on Phases
- Phase 3 (Drag Handle): REMOVED entirely
- Phase 4 → Phase 3 (Toolbar Refactor): Absorbs block highlight CSS (~10 lines in notion-blocks.css)
