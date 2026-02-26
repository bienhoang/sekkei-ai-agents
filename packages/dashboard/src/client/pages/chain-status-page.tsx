import { useState } from 'react'
import { useApi } from '../hooks/use-api'
import { AlertCard } from '../components/cards/alert-card'
import { VModelPipeline } from '../components/charts/v-model-pipeline'
import { PageSkeleton } from '../components/loading/page-skeleton'

interface ChainGroup {
  phase: string
  label: string
  entries: { docType: string; status: string; lifecycle: string | null; version: string | null; output: string | null; lastModified: string | null }[]
}

interface ChainData {
  project: { name: string }
  groups: ChainGroup[]
  splitMode: boolean
}

const STATUS_BADGE: Record<string, string> = {
  complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function ChainStatusPage() {
  const { data, loading, error } = useApi<ChainData>('/api/chain')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [filterPhase, setFilterPhase] = useState<string>('all')

  if (loading) return <PageSkeleton />
  if (error) return <AlertCard type="error" message="Failed to load chain status" detail={error} />
  if (!data) return null

  const allEntries = data.groups.flatMap(g => g.entries)
  const filteredGroups = filterPhase === 'all'
    ? data.groups
    : data.groups.filter(g => g.phase === filterPhase)

  const selectedEntry = selectedDoc ? allEntries.find(e => e.docType === selectedDoc) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Chain Status</h2>
        <select
          value={filterPhase}
          onChange={e => setFilterPhase(e.target.value)}
          className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1.5 bg-[var(--color-surface)] cursor-pointer"
        >
          <option value="all">All Phases</option>
          {data.groups.map(g => <option key={g.phase} value={g.phase}>{g.label}</option>)}
        </select>
      </div>

      <VModelPipeline entries={allEntries} onNodeClick={setSelectedDoc} />

      {selectedEntry && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium font-mono text-sm">{selectedEntry.docType}</h3>
            <button onClick={() => setSelectedDoc(null)} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors duration-150">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--color-text-muted)]">Status:</span> <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[selectedEntry.status] ?? ''}`}>{selectedEntry.status}</span></div>
            <div><span className="text-[var(--color-text-muted)]">Version:</span> <span className="font-mono">{selectedEntry.version ?? '--'}</span></div>
            <div><span className="text-[var(--color-text-muted)]">Output:</span> <span className="font-mono text-xs">{selectedEntry.output ?? '--'}</span></div>
            <div><span className="text-[var(--color-text-muted)]">Last Modified:</span> {selectedEntry.lastModified ? new Date(selectedEntry.lastModified).toLocaleDateString() : '--'}</div>
          </div>
        </div>
      )}

      {filteredGroups.map(group => (
        <div key={group.phase} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-medium text-sm">{group.label}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)]">
                <th className="px-4 py-2">Document</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Version</th>
                <th className="px-4 py-2">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map(entry => (
                <tr key={entry.docType} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors duration-150" onClick={() => setSelectedDoc(entry.docType)}>
                  <td className="px-4 py-2 font-medium font-mono text-sm">{entry.docType}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[entry.status] ?? ''}`}>{entry.status}</span></td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.version ?? '--'}</td>
                  <td className="px-4 py-2">{entry.lastModified ? new Date(entry.lastModified).toLocaleDateString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
