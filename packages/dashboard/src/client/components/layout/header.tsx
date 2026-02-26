import { useRefresh } from '../../hooks/use-refresh'
import { useTheme } from '../../hooks/use-theme'
import { useApi } from '../../hooks/use-api'

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
      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm rounded-md border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
          title="Refresh data"
        >
          ↻ Refresh
        </button>
        <button
          onClick={toggle}
          className="px-2 py-1 text-sm rounded-md border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  )
}
