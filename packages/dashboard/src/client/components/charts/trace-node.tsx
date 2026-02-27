import { Handle, Position, type NodeProps } from '@xyflow/react'

const PHASE_COLORS: Record<string, string> = {
  requirements: '#3b82f6',
  design: '#8b5cf6',
  test: '#22c55e',
  supplementary: '#6b7280',
}

export interface TraceNodeData {
  label: string
  phase: string
  orphanedCount: number
  missingCount: number
  tracedPct: number
}

export function TraceNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TraceNodeData
  const hasIssues = nodeData.orphanedCount > 0 || nodeData.missingCount > 0
  const borderColor = hasIssues ? '#ef4444' : (PHASE_COLORS[nodeData.phase] ?? '#6b7280')

  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-[var(--color-surface)] text-sm ${selected ? 'ring-2 ring-blue-400' : ''}`}
      style={{ borderColor, minWidth: 140 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="font-mono font-medium text-xs">{nodeData.label}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{nodeData.tracedPct}% traced</div>
      {hasIssues && (
        <div className="text-xs text-red-500 mt-0.5">
          {nodeData.orphanedCount + nodeData.missingCount} issues
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
