import { Router } from 'express'
import type { ServiceContext, ChangesData, TimelinePoint } from '../types.js'

export function createChangesRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/changes', async (req, res) => {
    try {
      const changelog = await ctx.changelogParser.parseChangelog(ctx.docsRoot)

      // Apply filters
      const docType = req.query.docType as string | undefined
      const from = req.query.from as string | undefined
      const to = req.query.to as string | undefined

      let filtered = changelog
      if (docType) {
        const types = docType.split(',')
        filtered = filtered.filter(e => types.includes(e.docType))
      }
      if (from) filtered = filtered.filter(e => e.date >= from)
      if (to) filtered = filtered.filter(e => e.date <= to)

      // Scan CRs
      let changeRequests: Awaited<ReturnType<typeof ctx.workspaceScanner.scanChangeRequests>> = []
      const sekkeiDir = ctx.workspaceScanner.findSekkeiDir(ctx.docsRoot)
      if (sekkeiDir) {
        changeRequests = await ctx.workspaceScanner.scanChangeRequests(sekkeiDir)
      }

      // Build timeline (group by month)
      const timeline = buildTimeline(filtered)

      const data: ChangesData = { changelog: filtered, changeRequests, timeline }
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}

function buildTimeline(entries: { date: string; docType: string }[]): TimelinePoint[] {
  const byMonth = new Map<string, { count: number; docTypes: Set<string> }>()

  for (const entry of entries) {
    const month = entry.date.slice(0, 7) // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, { count: 0, docTypes: new Set() })
    const bucket = byMonth.get(month)!
    bucket.count++
    bucket.docTypes.add(entry.docType)
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { count, docTypes }]) => ({ date, count, docTypes: [...docTypes] }))
}
