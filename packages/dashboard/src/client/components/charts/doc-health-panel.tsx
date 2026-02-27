import { ScoreGauge, getGaugeColor } from './score-gauge'

export interface DocHealthPanelProps {
  overall: number
  perDoc: { docType: string; score: number; topIssues: string[] }[]
}

interface StatusBadgeProps {
  score: number
}

function StatusBadge({ score }: StatusBadgeProps) {
  if (score >= 80) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Good
      </span>
    )
  }
  if (score >= 60) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Warning
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Critical
    </span>
  )
}

export function DocHealthPanel({ overall, perDoc }: DocHealthPanelProps) {
  const sorted = [...perDoc].sort((a, b) => a.score - b.score)

  const allIssues = perDoc
    .flatMap(d => d.topIssues)
    .slice(0, 10)

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="font-medium mb-4">Document Health</h3>

      {/* Overall gauge */}
      <div className="flex items-center gap-4 mb-6">
        <ScoreGauge score={overall} label="/ 100" size="md" />
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">Overall Health Score</p>
          <p
            className="text-2xl font-bold mt-0.5"
            style={{ color: getGaugeColor(overall) }}
          >
            {overall >= 80 ? 'Good' : overall >= 60 ? 'Warning' : 'Critical'}
          </p>
        </div>
      </div>

      {/* Per-doc table */}
      {sorted.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Per Document
          </p>
          <div className="overflow-y-auto max-h-64 rounded border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface-hover)] text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-[var(--color-text-muted)]">Document</th>
                  <th className="px-3 py-2 font-medium text-[var(--color-text-muted)] w-16 text-right">Score</th>
                  <th className="px-3 py-2 font-medium text-[var(--color-text-muted)] w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {sorted.map(doc => (
                  <tr key={doc.docType} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="px-3 py-2 font-mono text-xs">{doc.docType}</td>
                    <td
                      className="px-3 py-2 text-right font-medium"
                      style={{ color: getGaugeColor(doc.score) }}
                    >
                      {doc.score}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge score={doc.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top structural issues */}
      {allIssues.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Top Issues
          </p>
          <ul className="space-y-1">
            {allIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-[var(--color-text-muted)]">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
