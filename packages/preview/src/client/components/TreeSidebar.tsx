import { useTree } from '../hooks/use-tree.js'
import { TreeNode } from './TreeNode.js'

interface Props {
  activePath: string | null
  onSelect: (path: string) => void
}

export function TreeSidebar({ activePath, onSelect }: Props) {
  const { tree, loading, error } = useTree()

  return (
    <aside className="flex flex-col w-72 shrink-0 bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-800/60 overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Documents</span>
      </div>
      <div className="flex-1 py-1.5 px-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
            <span className="animate-pulse">Loading…</span>
          </div>
        )}
        {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}
        {!loading && !error && tree.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-600 text-center">No .md files found</p>
        )}
        {tree.map(node => (
          <TreeNode key={node.path} node={node} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}
