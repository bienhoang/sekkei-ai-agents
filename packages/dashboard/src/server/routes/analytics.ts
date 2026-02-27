import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { ServiceContext, AnalyticsData, CrossRefAnalysis, StalenessData, QualityData } from '../types.js'
import { getChainEntries } from '../services/config-reader.js'
import { ID_PATTERN, computeStaleness } from '../lib/chain-helpers.js'

export function createAnalyticsRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/analytics', async (req, res) => {
    try {
      const refresh = req.query.refresh === 'true'

      if (refresh) {
        ctx.cachedMcp?.invalidate()
      }

      const config = await ctx.configReader.readConfig(ctx.configPath)
      const chainEntries = getChainEntries(config)

      const crossRef = await scanCrossRefs(ctx.docsRoot, chainEntries)
      const staleness = computeAnalyticsStaleness(ctx.docsRoot, chainEntries)
      const quality = computeQuality(chainEntries, crossRef)

      const data: AnalyticsData = { crossRef, staleness, quality }
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}

async function scanCrossRefs(docsRoot: string, entries: { docType: string; output: string | null }[]): Promise<CrossRefAnalysis> {
  const defined = new Map<string, Set<string>>()
  const referenced = new Map<string, Set<string>>()

  for (const entry of entries) {
    if (!entry.output) continue
    const filePath = join(docsRoot, entry.output)
    if (!existsSync(filePath)) continue

    try {
      const content = await readFile(filePath, 'utf8')
      const ids = [...content.matchAll(ID_PATTERN)]

      for (const match of ids) {
        const id = match[0]
        const type = match[1]
        if (match.index === undefined) continue

        // IDs in headings/definitions are "defined"
        const lineIdx = content.lastIndexOf('\n', match.index) + 1
        const line = content.slice(lineIdx, content.indexOf('\n', match.index))
        const isDef = line.includes('#') || (line.includes('|') && line.indexOf(id) < line.length / 3)

        const map = isDef ? defined : referenced
        if (!map.has(type)) map.set(type, new Set())
        map.get(type)!.add(id)
      }
    } catch {
      // Skip unreadable files
    }
  }

  const allDefined = new Set([...defined.values()].flatMap(s => [...s]))
  const allReferenced = new Set([...referenced.values()].flatMap(s => [...s]))

  const missing = [...allReferenced].filter(id => !allDefined.has(id))
  const orphaned = [...allDefined].filter(id => !allReferenced.has(id))

  const types = new Set([...defined.keys(), ...referenced.keys()])
  const coverageByType = [...types].map(idType => {
    const def = defined.get(idType)?.size ?? 0
    const ref = referenced.get(idType)?.size ?? 0
    return { idType, defined: def, referenced: ref, coverage: def > 0 ? Math.round((ref / def) * 100) : 0 }
  })

  return {
    totalDefined: allDefined.size,
    totalReferenced: allReferenced.size,
    missing,
    orphaned,
    coverageByType,
  }
}

function computeAnalyticsStaleness(docsRoot: string, entries: { docType: string; lastModified: string | null; status: string }[]): StalenessData {
  void docsRoot
  return computeStaleness(entries)
}

function computeQuality(entries: { docType: string; status: string }[], crossRef: CrossRefAnalysis): QualityData[] {
  return entries.map(entry => ({
    docType: entry.docType,
    valid: entry.status === 'complete',
    issueCount: 0,
    errorCount: 0,
    warningCount: entry.status === 'pending' ? 1 : 0,
    crossRefCoverage: crossRef.coverageByType.find(c => c.idType === entry.docType.toUpperCase())?.coverage ?? 0,
    sectionCompleteness: entry.status === 'complete' ? 100 : entry.status === 'in-progress' ? 50 : 0,
  }))
}
