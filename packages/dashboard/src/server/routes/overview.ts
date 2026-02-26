import { Router } from 'express'
import type { ServiceContext, OverviewData } from '../types.js'
import { getChainEntries, getChainStats } from '../services/config-reader.js'

export function createOverviewRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/overview', async (_req, res) => {
    try {
      const config = await ctx.configReader.readConfig(ctx.configPath)
      const chainEntries = getChainEntries(config)
      const stats = getChainStats(chainEntries)

      const changelog = await ctx.changelogParser.parseChangelog(ctx.docsRoot)
      const recentChangelog = changelog.slice(0, 10)

      let activeCRs = 0
      const sekkeiDir = ctx.workspaceScanner.findSekkeiDir(ctx.docsRoot)
      if (sekkeiDir) {
        const crs = await ctx.workspaceScanner.scanChangeRequests(sekkeiDir)
        activeCRs = crs.filter(cr => cr.status !== 'COMPLETED' && cr.status !== 'REJECTED').length
      }

      // Simple staleness: count docs where upstream was updated after downstream
      const staleCount = computeStaleCount(chainEntries)

      const data: OverviewData = {
        project: config.project,
        totalDocs: stats.total,
        completionPct: stats.completionPct,
        completed: stats.completed,
        inProgress: stats.inProgress,
        pending: stats.pending,
        staleCount,
        activeCRs,
        chainEntries,
        recentChangelog,
        splitMode: config.split_mode ?? false,
      }

      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}

function computeStaleCount(entries: { lastModified: string | null; status: string }[]): number {
  // Completed docs not updated in 7+ days may be stale relative to upstream
  let count = 0
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  for (const entry of entries) {
    if (entry.status === 'complete' && entry.lastModified) {
      const age = now - new Date(entry.lastModified).getTime()
      if (age > sevenDays) count++
    }
  }
  return count
}
