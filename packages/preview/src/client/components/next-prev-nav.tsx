import type { FlatFile } from '../hooks/use-flat-tree.js'

interface Props {
  flatTree: FlatFile[]
  currentPath: string
  onSelect: (path: string) => void
}

export function NextPrevNav({ flatTree, currentPath, onSelect }: Props) {
  const currentIndex = flatTree.findIndex(f => f.path === currentPath)
  if (currentIndex === -1) return null

  const prev = currentIndex > 0 ? flatTree[currentIndex - 1] : null
  const next = currentIndex < flatTree.length - 1 ? flatTree[currentIndex + 1] : null

  if (!prev && !next) return null

  return (
    <nav className="grid grid-cols-2 gap-4 px-8 py-8 mt-4">
      {prev ? (
        <button
          onClick={() => onSelect(prev.path)}
          className="group flex flex-col items-start gap-1 px-5 py-4 rounded-xl border border-[var(--c-divider)] hover:border-[var(--c-brand)] bg-[var(--c-bg)] cursor-pointer transition-colors text-left"
        >
          <span className="text-xs font-medium text-[var(--c-text-3)]">Previous page</span>
          <span className="text-sm font-medium text-[var(--c-brand)] group-hover:opacity-80 transition-opacity">{formatName(prev.name)}</span>
        </button>
      ) : <div />}
      {next ? (
        <button
          onClick={() => onSelect(next.path)}
          className="group flex flex-col items-end gap-1 px-5 py-4 rounded-xl border border-[var(--c-divider)] hover:border-[var(--c-brand)] bg-[var(--c-bg)] cursor-pointer transition-colors text-right"
        >
          <span className="text-xs font-medium text-[var(--c-text-3)]">Next page</span>
          <span className="text-sm font-medium text-[var(--c-brand)] group-hover:opacity-80 transition-opacity">{formatName(next.name)}</span>
        </button>
      ) : <div />}
    </nav>
  )
}

function formatName(name: string): string {
  const base = name.replace(/\.md$/, '')
  const match = base.match(/^(\d+)-(.+)$/)
  if (match) {
    const rest = match[2].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return `${parseInt(match[1], 10)}. ${rest}`
  }
  return base.charAt(0).toUpperCase() + base.slice(1)
}
