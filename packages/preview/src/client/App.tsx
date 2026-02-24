import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { AppHeader } from './components/app-header.js'
import { TreeSidebar } from './components/TreeSidebar.js'
import { TiptapEditor } from './components/TiptapEditor.js'
import { TocSidebar } from './components/toc-sidebar.js'
import { SystemBar } from './components/SystemBar.js'
import { EmptyState } from './components/EmptyState.js'
import { useFile } from './hooks/use-file.js'
import { useSystem } from './hooks/use-system.js'
import { useTree } from './hooks/use-tree.js'
import { useTheme } from './hooks/use-theme.js'
import { useFlatTree } from './hooks/use-flat-tree.js'
import { useToc } from './hooks/use-toc.js'
import { useUrlSync } from './hooks/use-url-sync.js'

export function App() {
  const [activePath, setActivePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)

  const { file, loading } = useFile(activePath)
  const system = useSystem()
  const { tree, loading: treeLoading, error: treeError } = useTree()
  const { theme, toggle: toggleTheme } = useTheme()
  const flatTree = useFlatTree(tree)
  const { items: tocItems, activeIndex: tocActiveIndex, scrollTo: tocScrollTo } = useToc(editorInstance, scrollContainer)

  const readonly = system?.mode === 'guide'

  const handleNavigate = useCallback((path: string) => {
    if (dirty && path !== activePath) {
      if (!window.confirm('You have unsaved changes. Switch files anyway?')) return
    }
    setDirty(false)
    setActivePath(path)
    setEditorInstance(null)
    setScrollContainer(null)
  }, [dirty, activePath])

  useUrlSync({
    activePath,
    tree,
    treeLoading,
    onInitialResolve: setActivePath,
    onNavigate: handleNavigate,
  })

  const handleEditorReady = useCallback((editor: Editor, container: HTMLElement | null) => {
    setEditorInstance(editor)
    setScrollContainer(container)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[var(--c-bg)] text-[var(--c-text-1)] font-sans">
      {!fullscreen && (
        <AppHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {!fullscreen && (
          <TreeSidebar
            tree={tree}
            loading={treeLoading}
            error={treeError}
            activePath={activePath}
            onSelect={handleNavigate}
            searchQuery={searchQuery}
          />
        )}
        <main className="flex flex-col flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-[var(--c-text-3)] animate-pulse">Loading…</span>
            </div>
          )}
          {!loading && !file && <EmptyState />}
          {!loading && file && (
            <TiptapEditor
              key={file.path}
              path={file.path}
              content={file.content}
              readonly={readonly}
              onDirty={setDirty}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen(f => !f)}
              flatTree={flatTree}
              onSelect={handleNavigate}
              onEditorReady={handleEditorReady}
            />
          )}
        </main>
        {!fullscreen && file && editorInstance && (
          <TocSidebar items={tocItems} activeIndex={tocActiveIndex} onScrollTo={tocScrollTo} />
        )}
      </div>
      {!fullscreen && <SystemBar info={system} />}
    </div>
  )
}
