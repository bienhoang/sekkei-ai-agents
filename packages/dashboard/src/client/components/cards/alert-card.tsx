const STYLE_MAP = {
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', icon: '⚠️' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', icon: 'ℹ️' },
  error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', icon: '❌' },
} as const

interface AlertCardProps {
  type: 'warning' | 'info' | 'error'
  message: string
  detail?: string
}

export function AlertCard({ type, message, detail }: AlertCardProps) {
  const style = STYLE_MAP[type]
  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-start gap-2">
        <span>{style.icon}</span>
        <div>
          <p className="font-medium">{message}</p>
          {detail && <p className="text-sm text-[var(--color-text-muted)] mt-1">{detail}</p>}
        </div>
      </div>
    </div>
  )
}
