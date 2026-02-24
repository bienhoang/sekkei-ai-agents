import type { SystemInfo } from '../hooks/use-system.js'

interface Props {
  info: SystemInfo | null
}

export function SystemBar({ info }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900/80 backdrop-blur-sm text-zinc-500 text-xs border-t border-zinc-800/60 select-none">
      <span className="font-mono text-zinc-400">sekkei-preview</span>
      {info && <span className="text-zinc-600">v{info.version}</span>}
      {info && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
          info.mode === 'guide'
            ? 'bg-blue-900/40 text-blue-400 border border-blue-800/30'
            : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/30'
        }`}>
          {info.mode}
        </span>
      )}
    </div>
  )
}
