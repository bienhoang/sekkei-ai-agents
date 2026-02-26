interface ChainEntry {
  docType: string
  status: string
}

interface VModelPipelineProps {
  entries: ChainEntry[]
  onNodeClick?: (docType: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-500 text-white',
  'in-progress': 'bg-blue-500 text-white',
  pending: 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
}

const DOC_LABELS: Record<string, string> = {
  'requirements': 'REQ',
  'functions-list': 'FL',
  'nfr': 'NFR',
  'project-plan': 'PP',
  'basic-design': 'BD',
  'security-design': 'SEC',
  'detail-design': 'DD',
  'test-plan': 'TP',
  'ut-spec': 'UT',
  'it-spec': 'IT',
  'st-spec': 'ST',
  'uat-spec': 'UAT',
  'sitemap': 'SM',
  'operation-design': 'OD',
  'migration-design': 'MD',
}

const ROWS = [
  { label: 'Requirements', types: ['requirements', 'functions-list', 'nfr', 'project-plan'] },
  { label: 'Design', types: ['basic-design', 'security-design', 'detail-design'] },
  { label: 'Testing', types: ['test-plan', 'ut-spec', 'it-spec', 'st-spec', 'uat-spec'] },
  { label: 'Supplementary', types: ['sitemap', 'operation-design', 'migration-design'] },
]

export function VModelPipeline({ entries, onNodeClick }: VModelPipelineProps) {
  const entryMap = new Map(entries.map(e => [e.docType, e]))

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">V-Model Pipeline</h3>
      <div className="space-y-3">
        {ROWS.map(row => (
          <div key={row.label}>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{row.label}</p>
            <div className="flex flex-wrap gap-2">
              {row.types.map(type => {
                const entry = entryMap.get(type)
                const status = entry?.status ?? 'pending'
                const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.pending
                return (
                  <button
                    key={type}
                    onClick={() => onNodeClick?.(type)}
                    className={`${colorClass} px-3 py-1.5 rounded-md text-xs font-medium transition-transform hover:scale-105 cursor-pointer`}
                    title={`${type} — ${status}`}
                  >
                    {DOC_LABELS[type] ?? type}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
