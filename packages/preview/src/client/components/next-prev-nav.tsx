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
    <nav className="flex items-center justify-between px-8 py-6 border-t border-[var(--c-divider)] mt-8">
      {prev ? (
        <button
          onClick={() => onSelect(prev.path)}
          className="group flex items-center gap-2 text-sm transition-colors"
        >
          <span className="text-lg text-[var(--c-text-3)]">←</span>
          <div className="text-left">
            <span className="block text-[11px] uppercase tracking-wide text-[var(--c-text-4)]">Previous</span>
            <span className="text-[var(--c-brand)] group-hover:opacity-80 transition-opacity">{formatName(prev.name)}</span>
          </div>
        </button>
      ) : <div />}
      {next ? (
        <button
          onClick={() => onSelect(next.path)}
          className="group flex items-center gap-2 text-sm transition-colors text-right"
        >
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-[var(--c-text-4)]">Next</span>
            <span className="text-[var(--c-brand)] group-hover:opacity-80 transition-opacity">{formatName(next.name)}</span>
          </div>
          <span className="text-lg text-[var(--c-text-3)]">→</span>
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
