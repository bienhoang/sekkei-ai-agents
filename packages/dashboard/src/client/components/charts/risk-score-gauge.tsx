import { ScoreGauge } from './score-gauge'

export interface RiskScoreGaugeProps {
  overall: number
  grade: 'green' | 'yellow' | 'red'
  breakdown: {
    traceCompleteness: number
    nfrCoverage: number
    testCoverage: number
    freshness: number
    structuralHealth: number
  }
}

const GRADE_COLOR: Record<'green' | 'yellow' | 'red', string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

const BREAKDOWN_LABELS: Record<string, string> = {
  traceCompleteness: 'Trace',
  nfrCoverage: 'NFR',
  testCoverage: 'Test',
  freshness: 'Freshness',
  structuralHealth: 'Health',
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  )
}

export function RiskScoreGauge({ overall, grade, breakdown }: RiskScoreGaugeProps) {
  const color = GRADE_COLOR[grade]

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-4">Risk Score</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Gauge — delegates SVG arc rendering to shared ScoreGauge */}
        <div className="shrink-0">
          <ScoreGauge score={overall} label="/ 100" />
        </div>

        {/* Breakdown list */}
        <div className="flex-1 space-y-2 w-full">
          {Object.entries(breakdown).map(([key, val]) => (
            <BreakdownRow
              key={key}
              label={BREAKDOWN_LABELS[key] ?? key}
              value={val}
              color={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
