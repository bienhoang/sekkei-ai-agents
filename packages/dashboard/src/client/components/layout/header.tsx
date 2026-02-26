import { useRefresh } from '../../hooks/use-refresh'
import { useTheme } from '../../hooks/use-theme'
import { useApi } from '../../hooks/use-api'
import { RefreshCw, Moon, Sun } from '../../lib/icons'

interface StatusResponse {
  mcpConnected: boolean
  version: string
}

export function Header() {
  const { refresh } = useRefresh()
  const { theme, toggle } = useTheme()
  const { data: status } = useApi<StatusResponse>('/api/status')

  return (
    <header className="h-12 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${status?.mcpConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={status?.mcpConnected ? 'MCP Connected' : 'MCP Disconnected'}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          {status?.mcpConnected ? 'MCP' : 'Filesystem only'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors duration-200 cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={toggle}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors duration-200 cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </header>
  )
}
