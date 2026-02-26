import { useApi } from '../hooks/use-api'
import { AlertCard } from '../components/cards/alert-card'
import { StatCard } from '../components/cards/stat-card'
import { PageSkeleton } from '../components/loading/page-skeleton'
import { Puzzle, BarChart3, CheckCircle2 } from '../lib/icons'

interface FeatureProgress {
  id: string
  name: string
  completion: number
  docs: { docType: string; status: 'complete' | 'in-progress' | 'pending' | 'not-applicable' }[]
}

interface FeaturesData {
  splitMode: boolean
  features: FeatureProgress[]
  docTypes: string[]
}

const STATUS_CELL: Record<string, { bg: string; label: string }> = {
  complete: { bg: 'bg-green-500', label: 'ok' },
  'in-progress': { bg: 'bg-blue-500', label: '..' },
  pending: { bg: 'bg-gray-300 dark:bg-gray-600', label: '--' },
  'not-applicable': { bg: 'bg-transparent', label: '--' },
}

export function FeatureProgressPage() {
  const { data, loading, error } = useApi<FeaturesData>('/api/features')

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load features" detail={error} />
  if (!data) return null

  if (!data.splitMode) {
    return (
      <AlertCard
        type="info"
        message="Feature progress is only available in split mode."
        detail="Create features via /sekkei:plan to enable split mode."
      />
    )
  }

  const avgCompletion = data.features.length > 0
    ? Math.round(data.features.reduce((s, f) => s + f.completion, 0) / data.features.length)
    : 0
  const fullyComplete = data.features.filter(f => f.completion === 100).length

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Feature Progress</h2>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Features" value={data.features.length} icon={<Puzzle size={24} strokeWidth={1.5} />} color="blue" />
        <StatCard label="Avg Completion" value={`${avgCompletion}%`} icon={<BarChart3 size={24} strokeWidth={1.5} />} color="green" />
        <StatCard label="Fully Complete" value={fullyComplete} icon={<CheckCircle2 size={24} strokeWidth={1.5} />} color="green" />
      </div>

      {/* Feature x Doc matrix */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-2 sticky left-0 bg-[var(--color-surface)]">Feature</th>
              {data.docTypes.map(dt => <th key={dt} className="px-3 py-2 text-center font-mono text-xs">{dt}</th>)}
              <th className="px-4 py-2">Completion</th>
            </tr>
          </thead>
          <tbody>
            {data.features.map(feature => (
              <tr key={feature.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150">
                <td className="px-4 py-2 font-medium sticky left-0 bg-[var(--color-surface)]">{feature.name}</td>
                {feature.docs.map(doc => {
                  const cell = STATUS_CELL[doc.status] ?? STATUS_CELL.pending
                  return (
                    <td key={doc.docType} className="px-3 py-2 text-center">
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded text-xs text-white font-mono ${cell.bg}`} title={doc.status}>
                        {cell.label}
                      </span>
                    </td>
                  )
                })}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${feature.completion}%` }} />
                    </div>
                    <span className="text-xs w-8 text-right font-mono">{feature.completion}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
