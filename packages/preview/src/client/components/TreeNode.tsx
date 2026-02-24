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
  const indent = depth * 14

  if (node.type === 'directory') {
    const hasActiveChild = activePath?.startsWith(node.path + '/') ?? false
    const isOpen = open || hasActiveChild

    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors group"
          style={{ paddingLeft: `${8 + indent}px` }}
        >
          <span className={`text-[10px] w-3 shrink-0 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'} text-zinc-500 group-hover:text-zinc-400`}>▾</span>
          <span className="truncate font-medium">{formatDirName(node.name)}</span>
        </button>
        {isOpen && node.children?.map(child => (
          <TreeNode key={child.path} node={child} activePath={activePath} onSelect={onSelect} depth={depth + 1} />
        ))}
      </div>
    )
  }

  const isActive = node.path === activePath
  const { title, raw } = formatFileName(node.name)

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-[13px] rounded-md transition-colors group ${
        isActive
          ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
      style={{ paddingLeft: `${20 + indent}px` }}
      title={node.name}
    >
      <span className="truncate">
        <span className={isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'}>{title}</span>
        <span className="text-zinc-600 text-[11px] ml-1">({raw})</span>
      </span>
    </button>
  )
}

/** Format file name: "2-qa.md" → { title: "2. QA", raw: "2-qa.md" } */
function formatFileName(name: string): { title: string; raw: string } {
  const base = name.replace(/\.md$/, '')
  const match = base.match(/^(\d+)-(.+)$/)

  if (match) {
    const num = parseInt(match[1], 10)
    const rest = match[2]
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return { title: `${num}. ${rest}`, raw: name }
  }

  const title = base.charAt(0).toUpperCase() + base.slice(1)
  return { title, raw: name }
}

/** Format dir name: "01-overview" → "1. Overview" */
function formatDirName(name: string): string {
  const match = name.match(/^(\d+)-(.+)$/)
  if (match) {
    const num = parseInt(match[1], 10)
    const rest = match[2]
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return `${num}. ${rest}`
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}
