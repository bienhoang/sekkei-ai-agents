import type { ReactNode } from 'react'
import { AlertTriangle, Info, XCircle } from '../../lib/icons'

const STYLE_MAP = {
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', icon: <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" /> },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', icon: <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> },
  error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', icon: <XCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" /> },
} as const

interface AlertCardProps {
  type: 'warning' | 'info' | 'error'
  message: string
  detail?: string
  action?: ReactNode
}

export function AlertCard({ type, message, detail, action }: AlertCardProps) {
  const style = STYLE_MAP[type]
  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-start gap-2.5">
        {style.icon}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{message}</p>
          {detail && <p className="text-sm text-[var(--color-text-muted)] mt-1">{detail}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  )
}
