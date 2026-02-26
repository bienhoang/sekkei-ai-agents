import { readdir, readFile, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { SPLIT_DOC_TYPES } from '../types.js'
import type { CRSummary, PlanSummary, FeatureProgress, ProjectConfig } from '../types.js'

export function findSekkeiDir(docsRoot: string): string | null {
  // Check .sekkei/ relative to docs parent (project root)
  const candidates = [
    join(docsRoot, '..', '.sekkei'),
    join(docsRoot, '.sekkei'),
    join(process.cwd(), '.sekkei'),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return null
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  try {
    return parseYaml(match[1]) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function scanChangeRequests(sekkeiDir: string): Promise<CRSummary[]> {
  const crDir = join(sekkeiDir, 'change-requests')
  if (!existsSync(crDir)) return []

  try {
    const files = await readdir(crDir)
    const crFiles = files.filter(f => f.startsWith('CR-') && f.endsWith('.md'))
    const results: CRSummary[] = []

    for (const file of crFiles) {
      try {
        const content = await readFile(join(crDir, file), 'utf8')
        const fm = parseFrontmatter(content)
        results.push({
          id: (fm.id as string) ?? basename(file, '.md'),
          status: (fm.status as string) ?? 'unknown',
          originDoc: (fm.origin_doc as string) ?? '',
          description: (fm.description as string) ?? '',
          changedIds: (fm.changed_ids as string[]) ?? [],
          created: (fm.created as string) ?? '',
          updated: (fm.updated as string) ?? '',
          propagationSteps: (fm.propagation as { target: string; status: string }[]) ?? [],
        })
      } catch {
        // Skip unreadable files
      }
    }

    return results.sort((a, b) => b.updated.localeCompare(a.updated))
  } catch {
    return []
  }
}

export async function scanPlans(sekkeiDir: string): Promise<PlanSummary[]> {
  const plansDir = join(sekkeiDir, 'plans')
  if (!existsSync(plansDir)) return []

  try {
    const dirs = await readdir(plansDir, { withFileTypes: true })
    const results: PlanSummary[] = []

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue
      const planFile = join(plansDir, dir.name, 'plan.md')
      if (!existsSync(planFile)) continue

      try {
        const content = await readFile(planFile, 'utf8')
        const fm = parseFrontmatter(content)
        results.push({
          planId: dir.name,
          title: (fm.title as string) ?? dir.name,
          docType: (fm.doc_type as string) ?? '',
          status: (fm.status as string) ?? 'pending',
          featureCount: (fm.feature_count as number) ?? 0,
          phases: (fm.phases as { name: string; status: string }[]) ?? [],
        })
      } catch {
        // Skip unreadable plans
      }
    }

    return results
  } catch {
    return []
  }
}

export async function scanFeatures(docsRoot: string, config: ProjectConfig): Promise<FeatureProgress[]> {
  const featuresDir = join(docsRoot, '05-features')
  if (!existsSync(featuresDir)) return []

  try {
    const dirs = await readdir(featuresDir, { withFileTypes: true })
    const results: FeatureProgress[] = []

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue
      const featureDir = join(featuresDir, dir.name)
      const docs: FeatureProgress['docs'] = []
      let completedCount = 0

      for (const docType of SPLIT_DOC_TYPES) {
        const docFile = join(featureDir, `${docType}.md`)
        if (existsSync(docFile)) {
          try {
            const content = await readFile(docFile, 'utf8')
            const fm = parseFrontmatter(content)
            const status = (fm.status as string) ?? 'pending'
            const mapped = status === 'complete' ? 'complete'
              : status === 'in-progress' ? 'in-progress'
              : 'pending'
            docs.push({ docType, status: mapped })
            if (mapped === 'complete') completedCount++
          } catch {
            docs.push({ docType, status: 'pending' })
          }
        } else {
          docs.push({ docType, status: 'not-applicable' })
        }
      }

      const applicableDocs = docs.filter(d => d.status !== 'not-applicable').length
      const completion = applicableDocs > 0 ? Math.round((completedCount / applicableDocs) * 100) : 0

      results.push({
        id: dir.name,
        name: dir.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        completion,
        docs,
      })
    }

    return results
  } catch {
    return []
  }
}

export async function getDocLastModified(filePath: string): Promise<string | null> {
  try {
    const s = await stat(filePath)
    return s.mtime.toISOString()
  } catch {
    return null
  }
}
