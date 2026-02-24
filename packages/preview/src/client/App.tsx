import { useState } from 'react'
import { TreeSidebar } from './components/TreeSidebar.js'
import { TiptapEditor } from './components/TiptapEditor.js'
import { SystemBar } from './components/SystemBar.js'
import { EmptyState } from './components/EmptyState.js'
import { useFile } from './hooks/use-file.js'
import { useSystem } from './hooks/use-system.js'

export function App() {
  const [activePath, setActivePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const { file, loading } = useFile(activePath)
  const system = useSystem()

  const readonly = system?.mode === 'guide'

  function handleSelect(path: string) {
    if (dirty && path !== activePath) {
      if (!window.confirm('You have unsaved changes. Switch files anyway?')) return
    }
    setDirty(false)
    setActivePath(path)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="flex flex-1 overflow-hidden">
        <TreeSidebar activePath={activePath} onSelect={handleSelect} />
        <main className="flex flex-col flex-1 overflow-hidden">
          {loading && <div className="p-8 text-xs text-zinc-500">Loading…</div>}
          {!loading && !file && <EmptyState />}
          {!loading && file && (
            <TiptapEditor
              key={file.path}
              path={file.path}
              content={file.content}
              readonly={readonly}
              onDirty={setDirty}
            />
          )}
        </main>
      </div>
      <SystemBar info={system} />
    </div>
  )
}
