export interface VModelCoverageCardsProps {
  reqToDesign: number
  reqToTest: number
  fullTrace: number
  overall: number
}

type BadgeColor = 'green' | 'yellow' | 'red'

function getBadgeColor(pct: number): BadgeColor {
  if (pct >= 80) return 'green'
  if (pct >= 60) return 'yellow'
  return 'red'
}

const BADGE_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const BAR_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

interface CoverageCardProps {
  label: string
  pct: number
  description: string
}

function CoverageCard({ label, pct, description }: CoverageCardProps) {
  const color = getBadgeColor(pct)
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_CLASSES[color]}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_CLASSES[color]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
    </div>
  )
}

export function VModelCoverageCards({ reqToDesign, reqToTest, fullTrace, overall }: VModelCoverageCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <CoverageCard
        label="Req → Design"
        pct={reqToDesign}
        description="Requirements linked to design docs"
      />
      <CoverageCard
        label="Req → Test"
        pct={reqToTest}
        description="Requirements linked to test specs"
      />
      <CoverageCard
        label="Full Trace"
        pct={fullTrace}
        description="Req → Design → Test complete chain"
      />
      <CoverageCard
        label="Overall"
        pct={overall}
        description="All IDs with downstream traces"
      />
    </div>
  )
}
