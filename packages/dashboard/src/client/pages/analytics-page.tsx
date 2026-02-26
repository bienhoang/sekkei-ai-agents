import { Bar } from 'react-chartjs-2'
import { useApi } from '../hooks/use-api'
import { AlertCard } from '../components/cards/alert-card'
import { StatCard } from '../components/cards/stat-card'
import { PageSkeleton } from '../components/loading/page-skeleton'
import { EmptyState } from '../components/empty/empty-state'

interface CrossRefAnalysis {
  totalDefined: number
  totalReferenced: number
  missing: string[]
  orphaned: string[]
  coverageByType: { idType: string; defined: number; referenced: number; coverage: number }[]
}

interface StalenessData {
  overallScore: number
  staleCount: number
  totalDocs: number
  warnings: { upstream: string; downstream: string; message: string }[]
}

interface QualityData {
  docType: string
  sectionCompleteness: number
  crossRefCoverage: number
  errorCount: number
  warningCount: number
}

interface AnalyticsData {
  crossRef: CrossRefAnalysis
  staleness: StalenessData
  quality: QualityData[]
}

export function AnalyticsPage() {
  const { data, loading, error } = useApi<AnalyticsData>('/api/analytics')

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load analytics" detail={error} />
  if (!data) return null

  const cr = data.crossRef
  const hasCrossRefData = cr.coverageByType.length > 0

  const crossRefChartData = {
    labels: cr.coverageByType.map(c => c.idType),
    datasets: [
      { label: 'Defined', data: cr.coverageByType.map(c => c.defined), backgroundColor: '#2563eb' },
      { label: 'Referenced', data: cr.coverageByType.map(c => c.referenced), backgroundColor: '#16a34a' },
    ],
  }

  const qualityChartData = {
    labels: data.quality.map(q => q.docType),
    datasets: [
      { label: 'Completeness %', data: data.quality.map(q => q.sectionCompleteness), backgroundColor: '#2563eb' },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { position: 'bottom' as const } },
    scales: { x: { beginAtZero: true } },
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="IDs Defined" value={cr.totalDefined} color="blue" />
        <StatCard label="IDs Referenced" value={cr.totalReferenced} color="green" />
        <StatCard label="Freshness Score" value={`${data.staleness.overallScore}%`} color={data.staleness.overallScore >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Stale Docs" value={data.staleness.staleCount} color={data.staleness.staleCount > 0 ? 'red' : 'green'} />
      </div>

      {/* Cross-Reference Analysis */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="font-medium mb-4">Cross-Reference Analysis</h3>
        {hasCrossRefData ? (
          <div className="h-64"><Bar data={crossRefChartData} options={chartOptions} /></div>
        ) : (
          <EmptyState icon="🔗" title="No cross-references found" description="Generate documents to see cross-reference analysis." />
        )}
        {cr.missing.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-[var(--color-danger)]">Missing IDs ({cr.missing.length})</p>
            <div className="flex flex-wrap gap-1 mt-1">{cr.missing.slice(0, 20).map(id => <span key={id} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 rounded">{id}</span>)}</div>
          </div>
        )}
        {cr.orphaned.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-[var(--color-warning)]">Orphaned IDs ({cr.orphaned.length})</p>
            <div className="flex flex-wrap gap-1 mt-1">{cr.orphaned.slice(0, 20).map(id => <span key={id} className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 rounded">{id}</span>)}</div>
          </div>
        )}
      </section>

      {/* Staleness Warnings */}
      {data.staleness.warnings.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="font-medium mb-3">Staleness Warnings</h3>
          <div className="space-y-2">
            {data.staleness.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span>⚠️</span>
                <span><strong>{w.downstream}</strong> may be stale — upstream <strong>{w.upstream}</strong> was modified more recently</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quality Scores */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="font-medium mb-4">Document Quality</h3>
        {data.quality.length > 0 ? (
          <div className="h-64"><Bar data={qualityChartData} options={chartOptions} /></div>
        ) : (
          <EmptyState icon="📊" title="No quality data" description="Generate and validate documents to see quality scores." />
        )}
      </section>
    </div>
  )
}
