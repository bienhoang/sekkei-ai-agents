import type { TraceNodeData } from './trace-node'

interface TraceSidebarProps {
  completenessScore: number
  brokenLinkCount: number
  selectedNode: TraceNodeData | null
}

export function TraceSidebar({ completenessScore, brokenLinkCount, selectedNode }: TraceSidebarProps) {
  const scoreColor =
    completenessScore >= 80 ? 'text-green-600 dark:text-green-400'
    : completenessScore >= 50 ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="flex flex-col gap-4 w-52 shrink-0">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">Trace Completeness</p>
        <p className={`text-2xl font-bold ${scoreColor}`}>{completenessScore}%</p>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">Broken Links</p>
        <p className={`text-2xl font-bold ${brokenLinkCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {brokenLinkCount}
        </p>
      </div>

      {selectedNode && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Selected Node</p>
          <p className="font-mono font-medium text-sm">{selectedNode.label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Traced</span>
              <span className="font-medium">{selectedNode.tracedPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Orphaned</span>
              <span className={selectedNode.orphanedCount > 0 ? 'text-red-500 font-medium' : 'font-medium'}>
                {selectedNode.orphanedCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Missing</span>
              <span className={selectedNode.missingCount > 0 ? 'text-red-500 font-medium' : 'font-medium'}>
                {selectedNode.missingCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
