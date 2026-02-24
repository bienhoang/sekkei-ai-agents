import { useState } from 'react'
import type { TreeNode as TreeNodeType } from '../hooks/use-tree.js'

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

/** Strip numeric prefix "01-" → display as-is */
function formatName(name: string): string {
  return name.replace(/^\d+-/, '')
}
