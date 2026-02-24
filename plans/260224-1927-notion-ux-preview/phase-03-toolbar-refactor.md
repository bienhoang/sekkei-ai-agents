# Phase 3: Toolbar Refactor + Block Highlight + Polish
<!-- Updated: Validation Session 1 - Renumbered from Phase 4; absorbed block highlight CSS from removed Phase 3 (drag handle) -->

## Context Links

- [TiptapEditor.tsx](../../packages/preview/src/client/components/TiptapEditor.tsx)
- [EditorToolbar.tsx](../../packages/preview/src/client/components/EditorToolbar.tsx)
- [App.tsx](../../packages/preview/src/client/App.tsx)
- [plan.md](./plan.md)

## Overview

- **Priority:** Medium
- **Status:** pending
- **Effort:** 2h
- **Description:** Refactor toolbar to be toggleable (hidden by default), add block highlight on hover (CSS-only), keyboard shortcut, mobile detection, polish animations and integration of Phases 1-2.

## Key Insights

- With BubbleMenu (Phase 2), most inline formatting is covered. Toolbar still needed for: headings, alignment, lists, table ops, insert ops
- Slash menu (Phase 1) covers block insertion. Combined with BubbleMenu, toolbar becomes secondary
- Default: toolbar hidden (cleaner Notion-like look). Toggle via Cmd+Shift+T
- Mobile (< 768px): always show toolbar (no hover/selection precision)
- Save button and dirty indicator must remain visible regardless of toolbar state
- Persist toggle state in localStorage

## Requirements

### Functional
- Toolbar hidden by default when BubbleMenu + SlashMenu are active
- Keyboard shortcut `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Win) toggles toolbar
- Toolbar toggle state persisted in `localStorage` key `sekkei-toolbar-visible`
- Mobile (width < 768px): toolbar always visible, ignore toggle state
- Save button + dirty indicator always visible (extracted to mini bar when toolbar hidden)
- Smooth slide-down/up animation for toolbar show/hide

### Non-Functional
- No CLS (cumulative layout shift) from toolbar toggle
- Toggle feels instant (< 150ms animation)
- Under 200 lines per file

## Architecture

```
TiptapEditor.tsx (modified)
  |
  | State: toolbarVisible (localStorage + useState)
  | Shortcut: Cmd+Shift+T handler
  | Media query: useMediaQuery(768)
  |
  +-- if toolbarVisible || isMobile:
  |     <EditorToolbar ... />
  |
  +-- else:
  |     <MiniBar dirty={dirty} saving={saving} onSave={handleSave} onToggle={...} />
  |
  +-- <EditorContent ... />
  +-- <BubbleToolbar ... />

EditorToolbar.tsx (modified)
  |
  | Add toggle button (collapse icon) at far right
  | Add transition classes for animation
```

### MiniBar Component
When toolbar hidden, show minimal bar with: toggle button + dirty dot + save button + char count.
~30 lines, inline in TiptapEditor or extract to small component.

## Related Code Files

### Create
- None (all modifications to existing files)

### Modify
- `packages/preview/src/client/components/TiptapEditor.tsx` -- toolbar toggle logic, shortcut, mini bar
- `packages/preview/src/client/components/EditorToolbar.tsx` -- add collapse button, animation classes
- `packages/preview/src/client/styles/notion-blocks.css` -- animation + transition styles

## Implementation Steps

### Step 1: Add toolbar toggle state to TiptapEditor.tsx

```ts
const [toolbarVisible, setToolbarVisible] = useState(() => {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('sekkei-toolbar-visible') !== 'false'
})

const isMobile = useMediaQuery(768)
const showToolbar = isMobile || toolbarVisible
```

Simple `useMediaQuery` hook (inline or in hooks dir):
```ts
function useMediaQuery(maxWidth: number) {
  const [matches, setMatches] = useState(window.innerWidth < maxWidth)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [maxWidth])
  return matches
}
```

### Step 2: Add Cmd+Shift+T shortcut

In the existing keydown handler (which already handles Cmd+S), add:
```ts
if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
  e.preventDefault()
  setToolbarVisible(v => {
    const next = !v
    localStorage.setItem('sekkei-toolbar-visible', String(next))
    return next
  })
}
```

### Step 3: Create MiniBar inline component

```tsx
function MiniBar({ dirty, saving, onSave, onToggle, chars, words }: {
  dirty: boolean; saving: boolean; onSave: () => void; onToggle: () => void
  chars: number; words: number
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm">
      <button onClick={onToggle} title="Show toolbar (Cmd+Shift+T)"
        className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-1 rounded-md hover:bg-zinc-700/50 transition-all">
        ☰
      </button>
      <div className="flex-1" />
      <span className="text-[10px] text-zinc-600 hidden sm:inline tabular-nums">{words}w / {chars}c</span>
      {dirty && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      <button onClick={onSave} disabled={!dirty || saving}
        className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
```

### Step 4: Update TiptapEditor.tsx layout

```tsx
return (
  <div className="flex flex-col h-full">
    {!readonly && showToolbar && (
      <EditorToolbar
        editor={editor}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        fullscreen={fullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onToggleToolbar={() => toggleToolbar()}
        chars={chars}
        words={words}
      />
    )}
    {!readonly && !showToolbar && (
      <MiniBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onToggle={() => toggleToolbar()}
        chars={chars}
        words={words}
      />
    )}
    <div className="flex-1 overflow-y-auto">
      <EditorContent ... />
      {!readonly && <BubbleToolbar editor={editor} />}
    </div>
  </div>
)
```

### Step 5: Add collapse button to EditorToolbar.tsx

Add a collapse icon button before the fullscreen button:
```tsx
{onToggleToolbar && (
  <Btn label="▲" title="Hide toolbar (Cmd+Shift+T)" action={onToggleToolbar} />
)}
```

Update Props interface to include `onToggleToolbar?: () => void`.

### Step 6: Add block highlight on hover in notion-blocks.css
<!-- Updated: Validation Session 1 - Moved from removed drag handle phase -->

```css
/* Block hover highlight (subtle, Notion-like) */
.ProseMirror > *:hover {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  transition: background 0.15s ease;
}

/* Toolbar slide animation */
.toolbar-enter {
  animation: slideDown 0.15s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### Step 7: Integration testing

Test all features together:
- Slash menu opens on `/`, doesn't conflict with bubble menu
- Bubble menu appears on text selection, not on empty selection
- Block highlight on hover is subtle, doesn't distract
- Toolbar toggle works, mini bar shows save
- Cmd+S saves, Cmd+Shift+T toggles toolbar
- Fullscreen mode: all features work
- Mobile: toolbar always visible

## Todo List

- [ ] Add toolbar toggle state with localStorage persistence
- [ ] Implement useMediaQuery hook for mobile detection
- [ ] Add Cmd+Shift+T keyboard shortcut
- [ ] Create MiniBar component (save + dirty + toggle + char count)
- [ ] Update TiptapEditor layout (conditional toolbar/minibar)
- [ ] Add collapse button to EditorToolbar
- [ ] Add block highlight on hover CSS
- [ ] Add animation CSS
- [ ] Test toolbar toggle works correctly
- [ ] Test mobile always shows toolbar
- [ ] Test localStorage persistence across page reloads
- [ ] Integration test: all 3 phases working together
- [ ] Test fullscreen mode compatibility
- [ ] Test readonly mode (no Notion features shown)

## Success Criteria

- Toolbar hidden by default; BubbleMenu + SlashMenu primary interaction
- Cmd+Shift+T toggles toolbar instantly with smooth animation
- Toggle state persists across sessions
- Mobile always shows toolbar
- Save button always accessible regardless of toolbar state
- All 3 phases (slash, bubble, toolbar) coexist without conflicts
- Block highlight on hover subtle and non-distracting

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| CLS from toolbar hide/show | Low | Use min-height on container or animation that doesn't shift |
| localStorage not available (SSR/incognito) | Low | try/catch with fallback to true |
| Multiple keyboard shortcut conflicts | Low | Cmd+Shift+T is uncommon; check browser defaults |

## Security Considerations

- No new user input or external data in this phase
- localStorage stores only a boolean string ('true'/'false')

## Next Steps

- After all phases: comprehensive manual QA pass
- Consider future: block-level menus (more "Turn Into" options), drag handle for nested lists
- Consider: keyboard shortcuts cheat sheet popup (Cmd+/)
