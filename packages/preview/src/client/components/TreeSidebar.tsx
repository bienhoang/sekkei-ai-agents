import { TreeNode } from './TreeNode.js'
import type { TreeNode as TreeNodeType } from '../hooks/use-tree.js'

interface Props {
  tree: TreeNodeType[]
  loading: boolean
  error: string | null
  activePath: string | null
  onSelect: (path: string) => void
  searchQuery: string
}

function filterTree(nodes: TreeNodeType[], query: string): TreeNodeType[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  return nodes.reduce<TreeNodeType[]>((acc, node) => {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) acc.push(node)
    } else {
      const filteredChildren = filterTree(node.children || [], query)
      if (filteredChildren.length > 0) acc.push({ ...node, children: filteredChildren })
    }
    return acc
  }, [])
}

export function TreeSidebar({ tree, loading, error, activePath, onSelect, searchQuery }: Props) {
  const filtered = filterTree(tree, searchQuery)

  return (
    <aside className="flex flex-col w-72 shrink-0 bg-[var(--c-bg-soft)] border-r border-[var(--c-divider)] overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--c-divider)]">
        <svg className="w-4 h-4 text-[var(--c-text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="text-xs font-semibold text-[var(--c-text-2)] uppercase tracking-wider">Documents</span>
      </div>
      <div className="flex-1 py-1.5 px-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--c-text-3)]">
            <span className="animate-pulse">Loading…</span>
          </div>
        )}
        {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-[var(--c-text-4)] text-center">
            {searchQuery ? 'No matches found' : 'No .md files found'}
          </p>
        )}
        {filtered.map(node => (
          <TreeNode key={node.path} node={node} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}
