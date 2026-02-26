import { useState, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApi } from '../hooks/use-api'
import { AlertCard } from '../components/cards/alert-card'
import { PageSkeleton } from '../components/loading/page-skeleton'
import { EmptyState } from '../components/empty/empty-state'
import { FileText } from '../lib/icons'

interface ChangelogEntry {
  date: string
  docType: string
  version: string
  changes: string
  author: string
  crId: string | null
}

interface CRSummary {
  id: string
  status: string
  originDoc: string
  description: string
  changedIds: string[]
  created: string
  updated: string
  propagationSteps: { target: string; status: string }[]
}

interface TimelinePoint {
  date: string
  count: number
  docTypes: string[]
}

interface ChangesData {
  changelog: ChangelogEntry[]
  changeRequests: CRSummary[]
  timeline: TimelinePoint[]
}

const CR_STEPS = ['INITIATED', 'ANALYZING', 'IMPACT_ANALYZED', 'APPROVED', 'PROPAGATING', 'VALIDATED', 'COMPLETED']

export function ChangeHistoryPage() {
  const { data, loading, error } = useApi<ChangesData>('/api/changes')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    if (!data) return { changelog: [], timeline: [] }
    let entries = data.changelog
    if (docTypeFilter) entries = entries.filter(e => e.docType === docTypeFilter)
    if (dateFrom) entries = entries.filter(e => e.date >= dateFrom)
    if (dateTo) entries = entries.filter(e => e.date <= dateTo)
    return { changelog: entries, timeline: data.timeline }
  }, [data, docTypeFilter, dateFrom, dateTo])

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load changes" detail={error} />
  if (!data) return null

  const docTypes = [...new Set(data.changelog.map(e => e.docType))]

  const timelineChartData = {
    labels: data.timeline.map(t => t.date),
    datasets: [{
      label: 'Changes',
      data: data.timeline.map(t => t.count),
      backgroundColor: '#2563eb',
    }],
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Change History</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Document Type</label>
          <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)} className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1.5 bg-[var(--color-surface)] cursor-pointer">
            <option value="">All</option>
            {docTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1.5 bg-[var(--color-surface)]" />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1.5 bg-[var(--color-surface)]" />
        </div>
        {(docTypeFilter || dateFrom || dateTo) && (
          <button onClick={() => { setDocTypeFilter(''); setDateFrom(''); setDateTo('') }} className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline cursor-pointer transition-colors duration-150">Reset</button>
        )}
      </div>

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Changes Over Time</h3>
          <div className="h-48">
            <Bar data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      )}

      {/* Change Requests */}
      {data.changeRequests.length > 0 && (
        <section>
          <h3 className="font-medium mb-3">Change Requests</h3>
          <div className="space-y-3">
            {data.changeRequests.map(cr => (
              <div key={cr.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium font-mono text-sm">{cr.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{cr.status}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-2">{cr.description || cr.originDoc}</p>
                {/* State machine progress */}
                <div className="flex gap-1 items-center">
                  {CR_STEPS.map((step, i) => {
                    const stepIdx = CR_STEPS.indexOf(cr.status)
                    const done = i <= stepIdx
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={step} />
                        {i < CR_STEPS.length - 1 && <div className={`w-4 h-0.5 transition-colors duration-200 ${done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Changelog Table */}
      {filtered.changelog.length > 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Document</th>
                <th className="px-4 py-2">Version</th>
                <th className="px-4 py-2">Changes</th>
                <th className="px-4 py-2">Author</th>
                <th className="px-4 py-2">CR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.changelog.map((entry, i) => (
                <tr key={i} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150">
                  <td className="px-4 py-2 whitespace-nowrap">{entry.date}</td>
                  <td className="px-4 py-2">{entry.docType}</td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.version}</td>
                  <td className="px-4 py-2 truncate max-w-xs">{entry.changes}</td>
                  <td className="px-4 py-2">{entry.author}</td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.crId ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<FileText size={40} strokeWidth={1.5} />} title="No changelog entries" description="Generate documents to start tracking changes." />
      )}
    </div>
  )
}
