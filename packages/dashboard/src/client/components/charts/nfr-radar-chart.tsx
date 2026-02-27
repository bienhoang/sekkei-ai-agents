import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { EmptyState } from '../empty/empty-state'
import { BarChart3 } from '../../lib/icons'

export interface NfrRadarChartProps {
  categories: {
    category: string
    categoryEn: string
    nfrIds: string[]
    coverage: number
  }[]
}

interface CustomTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  categories: NfrRadarChartProps['categories']
}

function CustomAngleTick({ x = 0, y = 0, payload, categories }: CustomTickProps) {
  const label = payload?.value ?? ''
  const cat = categories.find(c => c.categoryEn === label)
  const isZero = cat ? cat.coverage === 0 : false

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fill={isZero ? '#ef4444' : 'var(--color-text-muted)'}
    >
      {label}
    </text>
  )
}

function NfrTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NfrRadarChartProps['categories'][number]

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-3 text-sm shadow-md">
      <p className="font-medium mb-1">{d.category}</p>
      <p className="text-[var(--color-text-muted)] mb-1">Coverage: <strong>{d.coverage}%</strong></p>
      {d.nfrIds.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {d.nfrIds.slice(0, 10).map(id => (
            <span key={id} className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 rounded font-mono">
              {id}
            </span>
          ))}
          {d.nfrIds.length > 10 && (
            <span className="text-xs text-[var(--color-text-muted)]">+{d.nfrIds.length - 10} more</span>
          )}
        </div>
      )}
    </div>
  )
}

export function NfrRadarChart({ categories }: NfrRadarChartProps) {
  if (categories.length === 0) {
    return (
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="font-medium mb-4">NFR Coverage Radar</h3>
        <EmptyState
          icon={<BarChart3 size={40} strokeWidth={1.5} />}
          title="No NFR data"
          description="Generate an NFR document to see coverage across requirement categories."
        />
      </section>
    )
  }

  const chartData = categories.map(c => ({
    category: c.categoryEn,
    coverage: c.coverage,
    // keep original for tooltip
    categoryJa: c.category,
    nfrIds: c.nfrIds,
  }))

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="font-medium mb-1">NFR Coverage Radar</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        Red axis labels indicate 0% coverage for that category.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={chartData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="category"
            tick={(props) => (
              <CustomAngleTick
                {...props}
                categories={categories}
              />
            )}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
            tickCount={4}
          />
          <Radar
            name="Coverage"
            dataKey="coverage"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.25}
            dot={{ r: 3, fill: '#2563eb' }}
          />
          <Tooltip content={<NfrTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </section>
  )
}
