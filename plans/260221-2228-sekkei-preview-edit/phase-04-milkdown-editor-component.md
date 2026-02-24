# Phase 04 — Milkdown WYSIWYG Editor Vue Component

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-02](./phase-02-vitepress-base-theme.md) (theme), [phase-03](./phase-03-vite-file-api-plugin.md) (file API)
- Research: [Milkdown + VitePress](./research/researcher-01-milkdown-vitepress.md)
- Docs: [code-standards.md](/docs/code-standards.md)

## Overview

- **Date**: 2026-02-21
- **Priority**: P1 (core editing feature)
- **Status**: pending
- **Effort**: 3h
- **Description**: Create Milkdown v7 WYSIWYG editor as Vue 3 component. Wrapped in `ClientOnly` for SSR safety. Loads markdown via `/__api/read`, saves via `/__api/save`. Supports GFM tables, headings, lists, code blocks — essential for Japanese spec docs (設計書).

## Key Insights

- Milkdown v7 unified package: `@milkdown/kit` bundles commonmark + gfm + listener + history
- `useEditor` from `@milkdown/vue` — must be inside `MilkdownProvider`
- `useEditor` runs once on mount — editor is uncontrolled after init
- `listenerCtx.markdownUpdated` for reactive serialization
- `editor.getMarkdown()` for imperative serialization (save button)
- GFM preset includes tables — critical for 設計書 tables
- `@milkdown/theme-nord` injects CSS globally — load client-side only
- `ClientOnly` wrapper prevents SSR crashes (Milkdown accesses DOM)
- `defineClientComponent` alternative for cleaner SSR isolation
- `gfm` may re-export `commonmark` nodes — test if both needed or just `gfm`

## Requirements

### Functional
- FR-01: WYSIWYG markdown editing with live preview
- FR-02: GFM table support (create, edit, add/remove rows/columns)
- FR-03: Headings (H1-H6), bold, italic, strikethrough
- FR-04: Ordered/unordered lists, task lists (checkboxes)
- FR-05: Code blocks with syntax highlighting
- FR-06: Load content from `/__api/read` on mount
- FR-07: Serialize content to markdown string on demand (save)
- FR-08: v-model compatible: emit `update:modelValue` on change
- FR-09: Japanese IME input works correctly

### Non-Functional
- NFR-01: Renders only client-side (no SSR)
- NFR-02: < 200ms to initialize editor with typical doc
- NFR-03: No layout shift on mount (reserve editor height)

## Architecture

```
theme/components/
├── MilkdownEditor.vue     # Main editor — useEditor + presets
├── MilkdownWrapper.vue    # ClientOnly wrapper + loading state
└── composables/
    └── use-file-api.ts    # fetch/save via /__api endpoints
```

### Component Hierarchy

```
MilkdownWrapper.vue (SSR-safe entry point)
  └── <ClientOnly>
        └── <MilkdownProvider>
              └── <EditorInner />    ← calls useEditor()
```

### Data Flow

```
Mount → useFileApi().read(path)
  → API returns { content, frontmatter }
  → Store frontmatter separately (not edited)
  → Pass content to MilkdownEditor as initial value

Edit → User types in WYSIWYG
  → listenerCtx.markdownUpdated fires
  → Internal state updated (no v-model re-init)

Save → Parent calls getMarkdown()
  → useFileApi().save(path, markdown)
  → API re-attaches frontmatter, writes file
  → VitePress HMR reloads page
```

## Related Code Files

### Create
- `sekkei/packages/sekkei-preview/theme/components/MilkdownEditor.vue`
- `sekkei/packages/sekkei-preview/theme/components/MilkdownWrapper.vue`
- `sekkei/packages/sekkei-preview/theme/composables/use-file-api.ts`

### Modify
- `sekkei/packages/sekkei-preview/package.json` (add milkdown deps)
- `sekkei/packages/sekkei-preview/theme/index.ts` (register components)

### Delete
- None

## Implementation Steps

1. Add Milkdown dependencies to `package.json`:
   ```json
   {
     "@milkdown/kit": "^7.x",
     "@milkdown/vue": "^7.x",
     "@milkdown/theme-nord": "^7.x"
   }
   ```
   Note: `@milkdown/kit` includes commonmark + gfm + listener + history.
   No separate table plugin needed — `gfm` preset covers GFM tables.

2. Create `theme/composables/use-file-api.ts`:
   - Export `useFileApi()` composable
   - `read(path: string)` → `fetch('/__api/read?path=' + encodeURIComponent(path))` → parse JSON → return `{ content, frontmatter }`
   - `save(path: string, content: string)` → `fetch('/__api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, content }) })`
   - `list()` → `fetch('/__api/list')` → parse JSON → return file tree
   - Error handling: throw on non-200, include response status in message

3. Create `theme/components/MilkdownEditor.vue`:
   ```vue
   <script setup lang="ts">
   import { MilkdownProvider, Milkdown, useEditor, useInstance } from '@milkdown/vue'
   import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
   import { gfm } from '@milkdown/kit/preset/gfm'
   import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
   import '@milkdown/theme-nord/style.css'

   const props = defineProps<{ initialValue: string }>()
   const emit = defineEmits<{ change: [markdown: string] }>()

   // Inner component calls useEditor — must be child of MilkdownProvider
   // Expose getMarkdown for imperative save
   </script>
   ```
   - Use `useEditor` to create editor instance with:
     - `gfm` preset (includes commonmark + tables)
     - `listener` plugin → `markdownUpdated` callback emits `change`
     - `defaultValueCtx` set to `props.initialValue`
   - Expose `getMarkdown()` via `useInstance()` + `defineExpose`
   - Apply `@milkdown/theme-nord` styles

4. Create `theme/components/MilkdownWrapper.vue`:
   - Wrap `MilkdownEditor` in `<ClientOnly>` (VitePress built-in)
   - Props: `filePath: string`
   - On mount: call `useFileApi().read(filePath)` → pass result to editor
   - Show loading skeleton while fetching
   - Expose `save()` method: call `editorRef.getMarkdown()` → `useFileApi().save()`
   - Store frontmatter from read response (passed back on save)
   - Template:
     ```vue
     <ClientOnly>
       <template #fallback><div class="editor-loading">Loading editor...</div></template>
       <MilkdownEditor :initial-value="content" @change="onEditorChange" ref="editorRef" />
     </ClientOnly>
     ```

5. Update `theme/index.ts`:
   - Import and globally register `MilkdownWrapper` component
   - Use `enhanceApp` hook:
     ```typescript
     enhanceApp({ app }) {
       app.component('MilkdownWrapper', MilkdownWrapper)
     }
     ```

6. Test editor:
   - Load a sample spec doc with tables, headings, lists
   - Verify table editing works (add row, edit cell)
   - Verify Japanese IME input
   - Verify markdown roundtrip: load → no edit → save → diff should be minimal
   - Verify `getMarkdown()` returns valid GFM

## Todo List

- [ ] Add milkdown dependencies to package.json
- [ ] Implement use-file-api.ts composable
- [ ] Create MilkdownEditor.vue with gfm preset
- [ ] Create MilkdownWrapper.vue with ClientOnly + loading
- [ ] Register component in theme/index.ts
- [ ] Test GFM table editing
- [ ] Test Japanese IME input
- [ ] Test markdown roundtrip fidelity
- [ ] Verify no SSR errors during vitepress build

## Success Criteria

- Editor renders markdown content in WYSIWYG mode
- Tables are editable (add/remove rows, edit cells)
- Japanese text input with IME works without issues
- `getMarkdown()` returns valid GFM markdown
- No "document is not defined" errors during SSR/build
- Frontmatter preserved across read-edit-save cycle

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Markdown roundtrip alters formatting | Low (accepted) | Minor whitespace/blank line changes OK per validation. Content must be identical. |
<!-- Updated: Validation Session 1 - Roundtrip fidelity: minor changes accepted -->
| GFM table fidelity | Medium | Test complex tables (wide cells, JP content), fallback: raw mode |
| Milkdown + VitePress version conflict | Low | Pin milkdown version, test with VitePress 1.x |
| Theme CSS conflicts | Low | Scope milkdown styles, use CSS layers |
| gfm re-exports commonmark issue | Low | Test: import only gfm, verify headings/lists work |

## Security Considerations

- Editor content sanitized by Milkdown/ProseMirror (no raw HTML injection)
- File API calls go to localhost only
- No eval or dynamic script execution

## Next Steps

- Phase 05: Integrate editor into Layout with edit/save/cancel buttons
