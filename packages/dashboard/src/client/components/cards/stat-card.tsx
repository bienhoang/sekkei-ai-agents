import type { ReactNode } from 'react'

const COLOR_MAP = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
  red: 'border-l-red-500',
} as const

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  color?: keyof typeof COLOR_MAP
}

export function StatCard({ label, value, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${COLOR_MAP[color]} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        </div>
        {icon && <span className="text-[var(--color-text-muted)]">{icon}</span>}
      </div>
    </div>
  )
}
