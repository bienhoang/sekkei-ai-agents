// Shared SVG semicircle gauge — used by RiskScoreGauge and DocHealthPanel

export interface ScoreGaugeProps {
  score: number   // 0-100
  label: string
  size?: 'sm' | 'md'
}

export function getGaugeColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return '#ef4444'
}

// Arc helpers — 180° sweep, left (-180°) to right (0°)
const CX = 100
const CY = 100
const R = 80
const STROKE = 14

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arcPath(startDeg: number, endDeg: number, r: number): string {
  const s = polarToXY(startDeg, r)
  const e = polarToXY(endDeg, r)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

function filledArcPath(score: number, r: number): string {
  const clamp = Math.max(0, Math.min(100, score))
  if (clamp <= 0) return ''
  const endDeg = -180 + (clamp / 100) * 180
  return arcPath(-180, endDeg, r)
}

export function ScoreGauge({ score, label, size = 'md' }: ScoreGaugeProps) {
  const color = getGaugeColor(score)
  const trackPath = arcPath(-180, 0, R)
  const fillPath = filledArcPath(score, R)

  const width = size === 'sm' ? 140 : 200
  const height = size === 'sm' ? 77 : 110
  const scoreFontSize = size === 'sm' ? '20' : '28'
  const labelFontSize = size === 'sm' ? '9' : '11'
  const labelY = size === 'sm' ? CY + 10 : CY + 14
  const scoreY = size === 'sm' ? CY - 6 : CY - 8

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 110"
      aria-label={`${label} score ${score}`}
    >
      <path
        d={trackPath}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
      )}
      <text
        x={CX}
        y={scoreY}
        textAnchor="middle"
        fontSize={scoreFontSize}
        fontWeight="700"
        fill="currentColor"
      >
        {score}
      </text>
      <text
        x={CX}
        y={labelY}
        textAnchor="middle"
        fontSize={labelFontSize}
        fill="var(--color-text-muted)"
      >
        {label}
      </text>
    </svg>
  )
}
