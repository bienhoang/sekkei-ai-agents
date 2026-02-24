import type { SystemInfo } from '../hooks/use-system.js'

interface Props {
  info: SystemInfo | null
}

export function SystemBar({ info }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900 text-zinc-400 text-xs border-t border-zinc-800 select-none">
      <span className="font-mono">sekkei-preview</span>
      {info && <span className="text-zinc-600">v{info.version}</span>}
      {info && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
          info.mode === 'guide'
            ? 'bg-blue-900/50 text-blue-400'
            : 'bg-emerald-900/50 text-emerald-400'
        }`}>
          {info.mode}
        </span>
      )}
    </div>
  )
}
