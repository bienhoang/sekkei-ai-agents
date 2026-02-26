import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { ChangelogEntry } from '../types.js'

export async function parseChangelog(docsRoot: string): Promise<ChangelogEntry[]> {
  // Check CHANGELOG.md in docs root and parent directory
  const candidates = [
    join(docsRoot, 'CHANGELOG.md'),
    join(docsRoot, '..', 'CHANGELOG.md'),
  ]

  let content: string | null = null
  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        content = await readFile(path, 'utf8')
        break
      } catch {
        continue
      }
    }
  }

  if (!content) return []

  const entries: ChangelogEntry[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Match markdown table rows: | date | doc | version | changes | author | cr-id |
    const trimmed = line.trim()
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue

    const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 5) continue

    // Skip header and separator rows
    if (cells[0] === '日付' || cells[0] === 'Date' || cells[0].startsWith('-')) continue
    if (/^[-:]+$/.test(cells[0])) continue

    entries.push({
      date: cells[0],
      docType: cells[1],
      version: cells[2],
      changes: cells[3],
      author: cells[4],
      crId: cells.length > 5 ? cells[5] || null : null,
    })
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}
