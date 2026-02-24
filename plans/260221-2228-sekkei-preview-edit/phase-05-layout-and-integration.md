# Phase 05 — Layout Integration + Edit Mode Toggle

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-02](./phase-02-vitepress-base-theme.md) (theme), [phase-03](./phase-03-vite-file-api-plugin.md) (file API), [phase-04](./phase-04-milkdown-editor-component.md) (editor)
- Research: [Milkdown + VitePress](./research/researcher-01-milkdown-vitepress.md)

## Overview

- **Date**: 2026-02-21
- **Priority**: P1 (user-facing integration)
- **Status**: pending
- **Effort**: 3h
- **Description**: Create custom VitePress layout that adds edit mode UI. Floating edit button on each page (only when `--edit` active). Clicking toggles view/edit mode. Save/Cancel/Discard buttons in editor toolbar. Ctrl+S keyboard shortcut.

## Key Insights

- VitePress Layout can extend DefaultTheme.Layout via `<slot>` overrides
- `doc-after` slot is ideal for floating edit button placement
- Edit mode flag comes from `SEKKEI_EDIT` env var → exposed via VitePress `themeConfig`
- Current page path available from VitePress `useData()` → `page.value.relativePath`
- Vue `provide/inject` for edit state across components
- **Inline replace pattern**: editor replaces VitePress content area in-place (NOT overlay)
- After save: HMR replaces editor with fresh rendered content — smooth, no flash
<!-- Updated: Validation Session 1 - Changed from overlay to inline replace pattern -->

## Requirements

### Functional
- FR-01: Floating "Edit" button on each page (bottom-right corner)
- FR-02: Edit button only visible when `--edit` flag was passed
- FR-03: Click edit → replace page content with WYSIWYG editor
- FR-04: Editor toolbar: Save, Cancel, Discard buttons
- FR-05: Save writes to file → page reloads with updated content
- FR-06: Cancel returns to view mode without saving
- FR-07: Discard prompts confirmation, then reverts to last saved state
- FR-08: Ctrl+S (Cmd+S on macOS) keyboard shortcut to save
- FR-09: Unsaved changes warning if navigating away
- FR-10: Visual indicator (dot/badge) when unsaved changes exist

### Non-Functional
- NFR-01: Smooth transition between view and edit modes
- NFR-02: Editor takes full content width (no sidebar overlap)
- NFR-03: Mobile-friendly edit button placement

## Architecture

```
theme/
├── Layout.vue             # Custom layout wrapping DefaultTheme.Layout
├── components/
│   ├── EditButton.vue     # Floating edit button (FAB)
│   ├── EditorToolbar.vue  # Save/Cancel/Discard bar
│   ├── MilkdownEditor.vue # (phase-04)
│   └── MilkdownWrapper.vue # (phase-04)
├── composables/
│   ├── use-edit-mode.ts   # Edit state management (provide/inject)
│   ├── use-file-api.ts    # (phase-04)
│   └── use-sidebar.ts     # (phase-02)
└── styles/
    ├── custom.css          # (phase-02)
    └── editor.css          # Edit mode styles
```

### State Machine

```
VIEW mode (default)
  ├── [Edit button click] → LOADING
  │
LOADING
  ├── [API read success] → EDITING
  ├── [API read error] → VIEW (show toast)
  │
EDITING
  ├── [Save click / Ctrl+S] → SAVING
  ├── [Cancel click] → VIEW (discard changes)
  ├── [Discard click + confirm] → VIEW (reload from disk)
  │
SAVING
  ├── [Save success] → VIEW (HMR reloads page)
  ├── [Save error] → EDITING (show error toast)
```

### Edit Mode Detection

```typescript
// In generated VitePress config:
themeConfig: {
  editMode: process.env.SEKKEI_EDIT === '1'
}

// In composable:
const { theme } = useData()
const editEnabled = computed(() => theme.value.editMode === true)
```

## Related Code Files

### Create
- `sekkei/packages/sekkei-preview/theme/Layout.vue`
- `sekkei/packages/sekkei-preview/theme/components/EditButton.vue`
- `sekkei/packages/sekkei-preview/theme/components/EditorToolbar.vue`
- `sekkei/packages/sekkei-preview/theme/composables/use-edit-mode.ts`
- `sekkei/packages/sekkei-preview/theme/styles/editor.css`

### Modify
- `sekkei/packages/sekkei-preview/theme/index.ts` (use Layout.vue)
- `sekkei/packages/sekkei-preview/src/generate-config.ts` (add editMode to themeConfig)

### Delete
- None

## Implementation Steps

1. Create `theme/composables/use-edit-mode.ts`:
   - Use Vue `ref` for edit state: `'view' | 'loading' | 'editing' | 'saving'`
   - `provide('editMode', state)` in Layout
   - `inject('editMode')` in child components
   - Export `useEditMode()` → `{ state, isEditing, startEdit, cancelEdit, isDirty }`
   - Track `isDirty` flag (set by editor change event, cleared on save/cancel)

2. Create `theme/components/EditButton.vue`:
   - Floating action button (bottom-right, fixed position)
   - Shows pencil icon + "Edit" text
   - Only renders when `editEnabled` is true AND `state === 'view'`
   - Click handler: call `startEdit()` from composable
   - CSS: z-index above content, subtle shadow, hover effect
   - Unsaved indicator: small dot when `isDirty`

3. Create `theme/components/EditorToolbar.vue`:
   - Fixed toolbar at top of editor area
   - Buttons: Save (primary), Cancel (secondary), Discard (danger, with confirm)
   - Save: calls `save()` from MilkdownWrapper → transitions to SAVING → VIEW
   - Cancel: transitions to VIEW, discards in-memory changes
   - Discard: `window.confirm('Discard all changes?')` → reload from API
   - Show saving spinner during SAVING state
   - Keyboard binding: `Ctrl+S` / `Cmd+S` → save

4. Create `theme/Layout.vue`:
   - Extend DefaultTheme Layout
   - **Inline replace pattern** (NOT overlay): editor replaces content area
   - Template:
     ```vue
     <template>
       <DefaultTheme.Layout>
         <template #doc-before>
           <EditorToolbar v-if="isEditing" @save="save" @cancel="cancel" />
         </template>
         <template #doc-top>
           <!-- In edit mode: hide rendered content, show editor inline -->
           <MilkdownWrapper v-if="isEditing" :file-path="currentPath" ref="editorRef" />
         </template>
         <template #doc-after>
           <EditButton v-if="editEnabled && !isEditing" @edit="startEdit" />
         </template>
       </DefaultTheme.Layout>
     </template>
     ```
   - When `isEditing`: hide `.vp-doc` content via CSS (`display: none`), show editor in its place
   - Provide edit mode state
   - Compute `currentPath` from VitePress `useData().page.relativePath`
   - Handle `beforeunload` event when `isDirty` (warn unsaved changes)
   <!-- Updated: Validation Session 1 - Inline replace instead of overlay -->

5. Create `theme/styles/editor.css`:
   - `.sekkei-editing .vp-doc > div:not(.sekkei-editor)`: `display: none` (hide rendered content)
   - `.sekkei-editor`: full content area width, white background
   - Toolbar sticky at top
   - Edit button FAB styling
   - Transition animations (fade in/out)
   - Save button: green, Cancel: gray, Discard: red outline

6. Update `theme/index.ts`:
   - Replace `...DefaultTheme` with custom Layout:
     ```typescript
     import Layout from './Layout.vue'
     export default {
       extends: DefaultTheme,
       Layout
     }
     ```

7. Update `src/generate-config.ts`:
   - Add `editMode` to `themeConfig` based on options.edit flag
   - Pass as string `'true'` or `'false'` (env var → config)

8. Add `beforeunload` handler:
   ```typescript
   onMounted(() => {
     window.addEventListener('beforeunload', (e) => {
       if (isDirty.value) {
         e.preventDefault()
         e.returnValue = ''
       }
     })
   })
   ```

9. Add keyboard shortcut:
   ```typescript
   onMounted(() => {
     document.addEventListener('keydown', (e) => {
       if ((e.ctrlKey || e.metaKey) && e.key === 's') {
         e.preventDefault()
         if (isEditing.value) save()
       }
     })
   })
   ```

## Todo List

- [ ] Create use-edit-mode.ts composable
- [ ] Create EditButton.vue (FAB)
- [ ] Create EditorToolbar.vue (Save/Cancel/Discard)
- [ ] Create Layout.vue extending DefaultTheme
- [ ] Create editor.css styles
- [ ] Update theme/index.ts to use custom Layout
- [ ] Update generate-config.ts with editMode flag
- [ ] Implement Ctrl+S keyboard shortcut
- [ ] Implement beforeunload unsaved warning
- [ ] Test: view → edit → save → view cycle
- [ ] Test: edit → cancel preserves original
- [ ] Test: navigate away with unsaved changes shows warning

## Success Criteria

- Edit button appears only when `--edit` flag passed
- Click edit → WYSIWYG editor loads with page content
- Save writes to file, page reloads with updated content
- Cancel returns to view mode without changes
- Ctrl+S triggers save
- Navigating away with unsaved changes triggers browser warning
- No visual glitches during view/edit transition

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Layout slot conflicts with DefaultTheme | Medium | Test slot names against VitePress version, use doc-after/doc-before |
| Editor overlay z-index conflicts | Low | Use high z-index, test with VitePress search overlay |
| Keyboard shortcut conflicts | Low | Only active when isEditing, preventDefault |
| HMR after save causes editor flash | Low | Inline replace: HMR replaces content naturally, no overlay timing issue |

## Security Considerations

- Edit mode only enabled via explicit CLI flag
- No server-side state — all state in browser memory
- beforeunload prevents accidental data loss

## Next Steps

- Phase 06: Update SKILL.md and install.sh to document and build the package
