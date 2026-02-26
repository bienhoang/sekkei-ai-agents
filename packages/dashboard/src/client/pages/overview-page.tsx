import { useApi } from '../hooks/use-api'
import { StatCard } from '../components/cards/stat-card'
import { AlertCard } from '../components/cards/alert-card'
import { CompletionDonut } from '../components/charts/completion-donut'
import { VModelPipeline } from '../components/charts/v-model-pipeline'
import { PageSkeleton } from '../components/loading/page-skeleton'
import { FileCheck, CheckCircle2, AlertTriangle, RotateCcw } from '../lib/icons'

interface OverviewData {
  project: { name: string; type: string }
  totalDocs: number
  completionPct: number
  completed: number
  inProgress: number
  pending: number
  staleCount: number
  activeCRs: number
  chainEntries: { docType: string; status: string }[]
  recentChangelog: { date: string; docType: string; version: string; changes: string }[]
}

export function OverviewPage() {
  const { data, loading, error } = useApi<OverviewData>('/api/overview')

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load overview" detail={error} />
  if (!data) return null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{data.project.name}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Documents" value={data.totalDocs} icon={<FileCheck size={24} strokeWidth={1.5} />} color="blue" />
        <StatCard label="Completion" value={`${data.completionPct}%`} icon={<CheckCircle2 size={24} strokeWidth={1.5} />} color="green" />
        <StatCard label="Stale Alerts" value={data.staleCount} icon={<AlertTriangle size={24} strokeWidth={1.5} />} color="yellow" />
        <StatCard label="Active CRs" value={data.activeCRs} icon={<RotateCcw size={24} strokeWidth={1.5} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompletionDonut completed={data.completed} inProgress={data.inProgress} pending={data.pending} />
        <VModelPipeline entries={data.chainEntries} />
      </div>

      {data.recentChangelog.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Recent Changes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Document</th>
                  <th className="pb-2 pr-4">Version</th>
                  <th className="pb-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {data.recentChangelog.map((entry, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-150">
                    <td className="py-2 pr-4 whitespace-nowrap">{entry.date}</td>
                    <td className="py-2 pr-4">{entry.docType}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{entry.version}</td>
                    <td className="py-2 truncate max-w-xs">{entry.changes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
