import { NavLink } from 'react-router-dom'
import { useApi } from '../../hooks/use-api'
import { LayoutDashboard, Link2, BarChart3, FileText, Puzzle, type LucideIcon } from '../../lib/icons'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/chain', label: 'Chain Status', icon: Link2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/changes', label: 'Change History', icon: FileText },
]

export function Sidebar() {
  const { data } = useApi<{ splitMode: boolean }>('/api/features')
  const showFeatures = data?.splitMode ?? false

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-bold text-[var(--color-primary)]">Sekkei</h1>
        <p className="text-xs text-[var(--color-text-muted)]">Dashboard</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors duration-200 ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white font-medium'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`
            }
          >
            <item.icon size={16} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
        {showFeatures && (
          <NavLink
            to="/features"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors duration-200 ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white font-medium'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`
            }
          >
            <Puzzle size={16} strokeWidth={2} />
            Features
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
