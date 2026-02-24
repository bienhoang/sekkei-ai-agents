# Brainstorm: Notion-Style UX for Sekkei Preview

**Date:** 2026-02-24
**Status:** Agreed
**Decision:** Add Notion UX features to existing TipTap editor (NOT migrate to Novel)

## Problem Statement

Team frequently uses Notion and wants similar UX in Sekkei Preview editor. Evaluated Novel.sh as alternative but found it would be a downgrade.

## Why NOT Novel

- Novel is built ON TOP of TipTap (same engine, extra abstraction layer)
- Missing: Tables, Mermaid diagrams, YAML frontmatter handling
- Limited custom extension support
- Would require rebuilding toolbar, file tree, backend integration
- More dependency layers: ProseMirror → TipTap → Novel

## Agreed Solution: Notion UX on TipTap

Add 4 features to existing TipTap v3 editor:

### 1. Slash Menu (`/` command)
- **Package:** `@tiptap/suggestion` + custom React UI
- **Cost:** Free (MIT)
- **Items:** h1-h3, bullet/numbered/task lists, table, code, mermaid, image, quote, divider
- **Trigger:** `/` at start of empty line or after space

### 2. Drag Handle
- **Package:** `@tiptap/extension-drag-handle-react`
- **Cost:** Free (MIT)
- **Behavior:** Show on block hover (left side), drag to reorder
- **Context menu:** Duplicate, delete, turn into (heading/paragraph/etc)
- **Note:** Disable inside table nodes to avoid conflict

### 3. Block Highlight on Hover
- **Implementation:** CSS-only (no extension needed)
- **Behavior:** Subtle background highlight on block hover
- **Pairs with:** Drag handle visibility

### 4. Floating Toolbar (Bubble Menu)
- **Package:** `@tiptap/extension-bubble-menu`
- **Cost:** Free (MIT)
- **Replace:** Fixed toolbar → hidden by default (toggle option for power users)
- **Content:** Bold, italic, underline, strike, link, highlight, color, code
- **Trigger:** Text selection

## Toolbar Strategy

| Context | UI |
|---|---|
| No selection, no `/` | Clean editor, drag handles on hover |
| Text selected | Bubble menu with formatting |
| Type `/` | Slash command dropdown |
| Toggle shortcut | Show/hide fixed toolbar |
| Mobile | Fixed toolbar always visible |

## Packages to Add

```
@tiptap/suggestion          # Slash command infrastructure
@tiptap/extension-bubble-menu  # Floating toolbar
@tiptap/extension-drag-handle-react  # Drag handle
```

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Lost toolbar discoverability | Low | Keep toggle option, show on mobile |
| Drag handle vs table drag | Medium | Disable drag handle in table nodes |
| Slash menu vs markdown `/` | Low | Only trigger at block start or after space |
| Mobile drag UX | Medium | Fallback to long-press or hide |

## Zero Breaking Changes

All features are additive:
- No modification to existing extensions
- No change to save/load workflow
- No impact on YAML frontmatter handling
- No change to Mermaid/table/code block behavior

## Success Criteria

- [ ] Slash menu shows on `/` with all block types
- [ ] Drag handle appears on hover, enables reorder
- [ ] Bubble menu appears on text selection
- [ ] Fixed toolbar hidden by default, toggleable
- [ ] All existing features (tables, mermaid, code, frontmatter) unchanged
- [ ] Mobile-friendly fallbacks

## Sources

- [TipTap Notion-like Template](https://tiptap.dev/docs/ui-components/templates/notion-like-editor)
- [TipTap DragHandle React](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react)
- [TipTap BubbleMenu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)
- [TipTap Suggestion](https://tiptap.dev/docs/editor/api/utilities/suggestion)
- [Novel vs TipTap](https://tiptap.dev/alternatives/novel-vs-tiptap)
- [@harshtalks/slash-tiptap](https://github.com/harshtalks/tiptap-plugins)
