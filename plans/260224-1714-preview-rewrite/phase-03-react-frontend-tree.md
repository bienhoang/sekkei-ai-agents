# Phase 3: React Frontend + Tree Sidebar

## Context Links
- Plan: [plan.md](./plan.md)
- Phase 1: [phase-01-package-restructure.md](./phase-01-package-restructure.md)
- Phase 2 API contract: `GET /api/tree`, `GET /api/files`, `GET /api/system`
- Research: [researcher-01-tiptap-tailwind.md](./research/researcher-01-tiptap-tailwind.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 4h
- **Depends on:** Phase 1 (build pipeline), Phase 2 (API, concurrent dev)

Build the complete React SPA shell: global CSS with Tailwind v4, data-fetching hooks, recursive tree sidebar, layout, system bar, and empty state. Tiptap editor slot left as placeholder — Phase 4 fills it.

## Key Insights
- Tailwind v4 CSS-first: `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` — no `tailwind.config.ts`
- JP typography: add `@theme { --font-sans: 'Noto Sans JP', sans-serif; --leading-relaxed: 1.8; }` in CSS
- Google Fonts loaded via `<link>` in `index.html` (no npm package needed)
- `use-tree` / `use-file` / `use-system` hooks: plain `fetch` + `useState` / `useEffect` — no library
- `key={filePath}` on TiptapEditor ensures remount on file switch (avoids stale editor state)
- Tree collapsed by default at directory level; toggle state local to each `TreeNode`
- Numeric sort already done server-side; client renders in received order
- Vite dev proxy `/api → http://localhost:4983` — no CORS issues in dev

## Requirements

### Functional
- Sidebar shows nested file tree; directories collapsible (collapsed by default)
- Clicking a `.md` file loads it into the editor area
- Active file highlighted in sidebar
- System bar shows version + mode badge
- Empty state shown when no file selected
- Loading / error states for tree and file fetch
- Dirty indicator (unsaved changes dot) in sidebar or toolbar area — Phase 4 wires save; Phase 3 renders the slot

### Non-functional
- Noto Sans JP loaded, line-height 1.8 for document body
- Tailwind v4 `prose` class on editor container for markdown typography
- Responsive: sidebar fixed-width (260px), main area fills rest
- No external state library (useState/useEffect only)

## Architecture

```
src/client/
├── main.tsx                  ← React root mount
├── App.tsx                   ← Layout: sidebar + main + systembar
├── components/
│   ├── TreeSidebar.tsx       ← container: calls use-tree, renders TreeNode list
│   ├── TreeNode.tsx          ← recursive: file/dir item + expand/collapse
│   ├── TiptapEditor.tsx      ← placeholder div (Phase 4 fills)
│   ├── EditorToolbar.tsx     ← placeholder (Phase 4 fills)
│   ├── SystemBar.tsx         ← version + mode badge
│   └── EmptyState.tsx        ← no-file-selected screen
├── hooks/
│   ├── use-tree.ts           ← GET /api/tree
│   ├── use-file.ts           ← GET /api/files?path=
│   ├── use-save-file.ts      ← PUT /api/files?path= (Phase 4 uses)
│   └── use-system.ts         ← GET /api/system
└── styles/
    └── globals.css           ← Tailwind v4 imports + JP theme
```

## Files to Create

All new — no existing client files to reuse.

- `src/client/styles/globals.css`
- `src/client/hooks/use-system.ts`
- `src/client/hooks/use-tree.ts`
- `src/client/hooks/use-file.ts`
- `src/client/hooks/use-save-file.ts`
- `src/client/components/SystemBar.tsx`
- `src/client/components/EmptyState.tsx`
- `src/client/components/TreeNode.tsx`
- `src/client/components/TreeSidebar.tsx`
- `src/client/components/TiptapEditor.tsx` (placeholder)
- `src/client/components/EditorToolbar.tsx` (placeholder)
- `src/client/App.tsx`
- `src/client/main.tsx` (replace placeholder)

## Implementation Steps

### 1. Update index.html — add Noto Sans JP
```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sekkei Preview</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

### 2. Create src/client/styles/globals.css
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --font-sans: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --leading-relaxed: 1.8;
}

/* Scrollbar */
* { scrollbar-width: thin; scrollbar-color: theme(colors.zinc.300) transparent; }

/* Prose overrides for JP documents */
.prose { line-height: var(--leading-relaxed); }
```

### 3. Create src/client/hooks/use-system.ts
```typescript
import { useState, useEffect } from 'react'

export interface SystemInfo {
  version: string
  mode: 'workspace' | 'guide'
}

export function useSystem(): SystemInfo | null {
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    fetch('/api/system')
      .then(r => r.json())
      .then((data: SystemInfo) => setInfo(data))
      .catch(() => setInfo({ version: '?', mode: 'workspace' }))
  }, [])

  return info
}
```

### 4. Create src/client/hooks/use-tree.ts
```typescript
import { useState, useEffect } from 'react'

export interface TreeNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: TreeNode[]
}

export function useTree(): { tree: TreeNode[]; loading: boolean; error: string | null } {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tree')
      .then(r => { if (!r.ok) throw new Error('Failed to load tree'); return r.json() })
      .then((data: TreeNode[]) => setTree(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return { tree, loading, error }
}
```

### 5. Create src/client/hooks/use-file.ts
```typescript
import { useState, useEffect } from 'react'

export interface FileData {
  content: string
  path: string
  modified: string | null
}

export function useFile(path: string | null): { file: FileData | null; loading: boolean; error: string | null } {
  const [file, setFile] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setFile(null); return }
    setLoading(true)
    setError(null)
    fetch(`/api/files?path=${encodeURIComponent(path)}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load file'); return r.json() })
      .then((data: FileData) => setFile(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [path])

  return { file, loading, error }
}
```

### 6. Create src/client/hooks/use-save-file.ts
```typescript
import { useState, useCallback } from 'react'

export function useSaveFile(): {
  save: (path: string, content: string) => Promise<boolean>
  saving: boolean
  error: string | null
} {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (path: string, content: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Save failed')
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { save, saving, error }
}
```

### 7. Create src/client/components/SystemBar.tsx
```tsx
import React from 'react'
import { SystemInfo } from '../hooks/use-system.js'

interface Props {
  info: SystemInfo | null
}

export function SystemBar({ info }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900 text-zinc-400 text-xs border-t border-zinc-800 select-none">
      <span className="font-mono">sekkei-preview</span>
      {info && <span className="text-zinc-600">v{info.version}</span>}
      {info && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
          info.mode === 'guide'
            ? 'bg-blue-900/50 text-blue-400'
            : 'bg-emerald-900/50 text-emerald-400'
        }`}>
          {info.mode}
        </span>
      )}
    </div>
  )
}
```

### 8. Create src/client/components/EmptyState.tsx
```tsx
import React from 'react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 select-none gap-3">
      <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm">ファイルを選択してください</p>
    </div>
  )
}
```

### 9. Create src/client/components/TreeNode.tsx
```tsx
import React, { useState } from 'react'
import { TreeNode as TreeNodeType } from '../hooks/use-tree.js'

interface Props {
  node: TreeNodeType
  activePath: string | null
  onSelect: (path: string) => void
  depth?: number
}

export function TreeNode({ node, activePath, onSelect, depth = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const indent = depth * 12

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 w-full px-2 py-1 text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-colors"
          style={{ paddingLeft: `${8 + indent}px` }}
        >
          <span className="text-[10px] text-zinc-600 w-3 shrink-0">{open ? '▾' : '▸'}</span>
          <span className="truncate font-medium">{formatName(node.name)}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNode key={child.path} node={child} activePath={activePath} onSelect={onSelect} depth={depth + 1} />
        ))}
      </div>
    )
  }

  const isActive = node.path === activePath
  const displayName = node.name.replace(/\.md$/, '')

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center w-full px-2 py-1 text-left text-xs rounded transition-colors truncate ${
        isActive
          ? 'bg-zinc-700 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
      style={{ paddingLeft: `${20 + indent}px` }}
      title={node.name}
    >
      {formatName(displayName)}
    </button>
  )
}

/** Strip numeric prefix "01-" → display as-is (preserve Japanese chars) */
function formatName(name: string): string {
  return name.replace(/^\d+-/, '')
}
```

### 10. Create src/client/components/TreeSidebar.tsx
```tsx
import React from 'react'
import { useTree } from '../hooks/use-tree.js'
import { TreeNode } from './TreeNode.js'

interface Props {
  activePath: string | null
  onSelect: (path: string) => void
}

export function TreeSidebar({ activePath, onSelect }: Props) {
  const { tree, loading, error } = useTree()

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Files</span>
      </div>
      <div className="flex-1 py-1 overflow-y-auto">
        {loading && <p className="px-3 py-2 text-xs text-zinc-600">Loading…</p>}
        {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}
        {!loading && !error && tree.length === 0 && (
          <p className="px-3 py-2 text-xs text-zinc-600">No .md files found</p>
        )}
        {tree.map(node => (
          <TreeNode key={node.path} node={node} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}
```

### 11. Create placeholder src/client/components/TiptapEditor.tsx
```tsx
import React from 'react'

interface Props {
  path: string
  content: string
  readonly?: boolean
  onDirty?: (dirty: boolean) => void
}

// Phase 4 replaces this with Tiptap implementation
export function TiptapEditor({ content }: Props) {
  return (
    <div className="prose prose-invert max-w-none p-8 text-zinc-300">
      <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    </div>
  )
}
```

### 12. Create placeholder src/client/components/EditorToolbar.tsx
```tsx
import React from 'react'

// Phase 4 replaces this with full toolbar
export function EditorToolbar() {
  return <div className="h-10 border-b border-zinc-800 bg-zinc-900" />
}
```

### 13. Create src/client/App.tsx
```tsx
import React, { useState } from 'react'
import { TreeSidebar } from './components/TreeSidebar.js'
import { TiptapEditor } from './components/TiptapEditor.js'
import { EditorToolbar } from './components/EditorToolbar.js'
import { SystemBar } from './components/SystemBar.js'
import { EmptyState } from './components/EmptyState.js'
import { useFile } from './hooks/use-file.js'
import { useSystem } from './hooks/use-system.js'

export function App() {
  const [activePath, setActivePath] = useState<string | null>(null)
  const { file, loading } = useFile(activePath)
  const system = useSystem()

  const readonly = system?.mode === 'guide'

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="flex flex-1 overflow-hidden">
        <TreeSidebar activePath={activePath} onSelect={setActivePath} />
        <main className="flex flex-col flex-1 overflow-hidden">
          <EditorToolbar />
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-8 text-xs text-zinc-500">Loading…</div>}
            {!loading && !file && <EmptyState />}
            {!loading && file && (
              <TiptapEditor
                key={file.path}
                path={file.path}
                content={file.content}
                readonly={readonly}
              />
            )}
          </div>
        </main>
      </div>
      <SystemBar info={system} />
    </div>
  )
}
```

### 14. Update src/client/main.tsx
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.js'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### 15. Verify build + visual check
```bash
npm run build
node dist/server.js --docs <some-docs-dir> --no-open
# Open http://localhost:4983 — verify tree sidebar, file click loads content
```

## Todo List
- [ ] Update index.html with Noto Sans JP font link
- [ ] Create src/client/styles/globals.css
- [ ] Create src/client/hooks/use-system.ts
- [ ] Create src/client/hooks/use-tree.ts
- [ ] Create src/client/hooks/use-file.ts
- [ ] Create src/client/hooks/use-save-file.ts
- [ ] Create src/client/components/SystemBar.tsx
- [ ] Create src/client/components/EmptyState.tsx
- [ ] Create src/client/components/TreeNode.tsx
- [ ] Create src/client/components/TreeSidebar.tsx
- [ ] Create src/client/components/TiptapEditor.tsx (placeholder)
- [ ] Create src/client/components/EditorToolbar.tsx (placeholder)
- [ ] Create src/client/App.tsx
- [ ] Update src/client/main.tsx
- [ ] `npm run build` — zero errors
- [ ] Manual: tree renders, file click loads content, active state highlights

## Success Criteria
- Tree sidebar renders with collapse/expand working
- Clicking a file populates the main area with file content
- Active file highlighted in sidebar
- SystemBar shows version + mode badge
- EmptyState renders when no file selected
- Noto Sans JP applied to body text, line-height 1.8
- No TypeScript errors in client build

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tailwind v4 `@plugin` not recognized by `@tailwindcss/vite` | Low | High | Use `@tailwindcss/vite` plugin in vite.config.ts; v4 plugin registered via CSS |
| Google Fonts blocked in offline env | Low | Low | Fonts degrade gracefully to system fallbacks |
| Tree too deep → performance lag | Very Low | Low | Dirs collapsed by default; lazy expansion is sufficient |
| `prose-invert` color contrast insufficient | Low | Low | Customize via `prose-zinc` modifier if needed |

## Security Considerations
- No user input rendered as raw HTML in tree sidebar
- File paths are encoded via `encodeURIComponent` before sending to API
- Content rendered by Tiptap (Phase 4) — not `dangerouslySetInnerHTML`

## Next Steps
- Phase 4: Replace TiptapEditor placeholder with real Tiptap + tiptap-markdown + toolbar
- Phase 5: Guide mode wires `readonly` prop through system info
