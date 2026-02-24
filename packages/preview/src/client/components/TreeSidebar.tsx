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
