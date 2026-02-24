import type { TocItem } from '../hooks/use-toc.js'

interface Props {
  items: TocItem[]
  activeIndex: number
  onScrollTo: (index: number) => void
}

export function TocSidebar({ items, activeIndex, onScrollTo }: Props) {
  if (items.length === 0) return null

  return (
    <aside className="w-56 shrink-0 border-l border-[var(--c-divider)] overflow-y-auto hidden xl:block">
      <nav className="px-4 py-6">
        <h4 className="text-xs font-semibold text-[var(--c-text-2)] uppercase tracking-wider mb-3">
          On this page
        </h4>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => onScrollTo(i)}
                className={`block w-full text-left text-[13px] py-1 rounded-sm transition-colors ${
                  item.level === 3 ? 'pl-3' : 'pl-0'
                } ${
                  i === activeIndex
                    ? 'text-indigo-400 font-medium'
                    : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
                }`}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
