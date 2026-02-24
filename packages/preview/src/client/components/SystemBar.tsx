import type { SystemInfo } from '../hooks/use-system.js'

interface Props {
  info: SystemInfo | null
}

export function SystemBar({ info }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-[var(--c-bg-soft)] text-[var(--c-text-3)] text-xs border-t border-[var(--c-divider)] select-none shrink-0">
      <span className="font-mono text-[var(--c-text-2)]">sekkei-preview</span>
      {info && <span className="text-[var(--c-text-4)]">v{info.version}</span>}
      {info && (
        <span className={`mode-badge px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
          info.mode === 'guide'
            ? 'mode-badge-guide bg-blue-900/40 text-blue-400 border border-blue-800/30'
            : 'mode-badge-workspace bg-emerald-900/40 text-emerald-400 border border-emerald-800/30'
        }`}>
          {info.mode}
        </span>
      )}
    </div>
  )
}
