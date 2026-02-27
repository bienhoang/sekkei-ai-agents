import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useApi } from '../hooks/use-api'
import { AlertCard } from '../components/cards/alert-card'
import { StatCard } from '../components/cards/stat-card'
import { PageSkeleton } from '../components/loading/page-skeleton'
import { EmptyState } from '../components/empty/empty-state'
import { NfrRadarChart } from '../components/charts/nfr-radar-chart'
import { DocHealthPanel } from '../components/charts/doc-health-panel'
import { TrendLineChart } from '../components/charts/trend-line-chart'
import { Link2, BarChart3, AlertTriangle } from '../lib/icons'
import type { QualityMetricsBundle, SnapshotMetrics } from '../types'

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
  const { data: quality } = useApi<QualityMetricsBundle>('/api/quality-metrics')
  const { data: snapshots } = useApi<SnapshotMetrics[]>('/api/snapshots')

  const healthTrend = (snapshots ?? []).map(s => ({ date: s.timestamp.slice(0, 10), value: s.health.overall }))

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load analytics" detail={error} />
  if (!data) return null

  const cr = data.crossRef
  const hasCrossRefData = cr.coverageByType.length > 0

  const crossRefData = cr.coverageByType.map(c => ({
    name: c.idType,
    defined: c.defined,
    referenced: c.referenced,
  }))

  const qualityData = data.quality.map(q => ({
    name: q.docType,
    completeness: q.sectionCompleteness,
  }))

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
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={crossRefData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={50} />
              <Tooltip />
              <Legend />
              <Bar dataKey="defined" fill="#2563eb" name="Defined" />
              <Bar dataKey="referenced" fill="#16a34a" name="Referenced" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={<Link2 size={40} strokeWidth={1.5} />} title="No cross-references found" description="Generate documents to see cross-reference analysis." />
        )}
        {cr.missing.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-[var(--color-danger)]">Missing IDs ({cr.missing.length})</p>
            <div className="flex flex-wrap gap-1 mt-1">{cr.missing.slice(0, 20).map(id => <span key={id} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 rounded font-mono">{id}</span>)}</div>
          </div>
        )}
        {cr.orphaned.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-[var(--color-warning)]">Orphaned IDs ({cr.orphaned.length})</p>
            <div className="flex flex-wrap gap-1 mt-1">{cr.orphaned.slice(0, 20).map(id => <span key={id} className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 rounded font-mono">{id}</span>)}</div>
          </div>
        )}
      </section>

      {/* Staleness Warnings */}
      {data.staleness.warnings.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="font-medium mb-3">Staleness Warnings</h3>
          <div className="space-y-2">
            {data.staleness.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <AlertTriangle size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
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
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={qualityData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" width={70} />
              <Tooltip />
              <Bar dataKey="completeness" fill="#2563eb" name="Completeness %" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={<BarChart3 size={40} strokeWidth={1.5} />} title="No quality data" description="Generate and validate documents to see quality scores." />
        )}
      </section>

      {/* NFR Coverage Radar */}
      {quality?.nfr && <NfrRadarChart categories={quality.nfr} />}

      {/* Document Health */}
      {quality?.health && (
        <DocHealthPanel overall={quality.health.overall} perDoc={quality.health.perDoc} />
      )}

      {/* Health Trend */}
      <TrendLineChart data={healthTrend} label="Health Score" />
    </div>
  )
}
