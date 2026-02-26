import type { ReactNode } from 'react'
import { Inbox } from '../../lib/icons'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-3 text-[var(--color-text-muted)]">
        {icon ?? <Inbox size={40} strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors duration-200 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
