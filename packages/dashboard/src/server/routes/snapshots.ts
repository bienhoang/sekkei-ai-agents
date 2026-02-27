import { Router } from 'express'
import { dirname, resolve } from 'node:path'
import type { ServiceContext, SnapshotMetrics } from '../types.js'
import { SnapshotService } from '../services/snapshot-service.js'
import { getChainEntries } from '../services/config-reader.js'
import { CHAIN_ORDER, TEST_DOC_TYPES } from '../lib/chain-helpers.js'

const MIN_SNAPSHOT_INTERVAL = 60_000 // 1 minute between snapshots
let lastSnapshotTime = 0

export function createSnapshotsRouter(ctx: ServiceContext): Router {
  const router = Router()
  // Use the git repo root (parent of docsRoot, or docsRoot itself)
  const repoRoot = resolve(dirname(ctx.docsRoot))
  const service = new SnapshotService(repoRoot)

  router.get('/snapshots', async (_req, res) => {
    try {
      const data = await service.list()
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  router.post('/snapshots', async (_req, res) => {
    if (Date.now() - lastSnapshotTime < MIN_SNAPSHOT_INTERVAL) {
      return res.status(429).json({ error: 'Please wait at least 1 minute between snapshots' })
    }
    lastSnapshotTime = Date.now()
    try {
      const config = await ctx.configReader.readConfig(ctx.configPath)
      const chainEntries = getChainEntries(config)

      // Build simplified metrics without full doc scan
      const completedCount = chainEntries.filter(e => e.status === 'complete').length
      const inProgressCount = chainEntries.filter(e => e.status === 'in-progress').length
      const totalDocs = chainEntries.length

      // Health: same formula as quality-metrics route
      const healthOverall = totalDocs > 0
        ? Math.round(chainEntries.reduce((s, e) => {
            return s + (e.status === 'complete' ? 100 : e.status === 'in-progress' ? 60 : 20)
          }, 0) / totalDocs)
        : 0

      // Staleness: count stale docs
      const entryMap = new Map(chainEntries.map(e => [e.docType, e]))
      let staleCount = 0
      for (let i = 1; i < CHAIN_ORDER.length; i++) {
        const downstream = entryMap.get(CHAIN_ORDER[i])
        if (!downstream?.lastModified || downstream.status === 'pending') continue
        for (let j = i - 1; j >= 0; j--) {
          const upstream = entryMap.get(CHAIN_ORDER[j])
          if (!upstream?.lastModified) continue
          if (new Date(upstream.lastModified).getTime() > new Date(downstream.lastModified).getTime()) {
            staleCount++
          }
          break
        }
      }
      const stalenessOverall = totalDocs > 0
        ? Math.round((1 - staleCount / totalDocs) * 100)
        : 100

      // Coverage: simplified from completion ratio
      const completionPct = totalDocs > 0 ? Math.round(completedCount / totalDocs * 100) : 0
      const testEntries = chainEntries.filter(e => TEST_DOC_TYPES.has(e.docType))
      const testCoverage = testEntries.length > 0
        ? Math.round(testEntries.filter(e => e.status === 'complete').length / testEntries.length * 100)
        : 0

      const coverage = {
        overall: completionPct,
        reqToDesign: completionPct,
        reqToTest: testCoverage,
        fullTrace: Math.round((completionPct + testCoverage) / 2),
      }

      // Risk score
      const riskOverall = Math.round(
        0.30 * completionPct +
        0.20 * completionPct +
        0.20 * testCoverage +
        0.15 * stalenessOverall +
        0.15 * healthOverall
      )
      const grade = riskOverall >= 80 ? 'green' : riskOverall >= 60 ? 'yellow' : 'red'

      const metrics: Omit<SnapshotMetrics, 'tag'> = {
        timestamp: new Date().toISOString(),
        risk: { overall: riskOverall, grade },
        health: { overall: healthOverall },
        coverage,
        staleness: { overallScore: stalenessOverall, staleCount },
      }

      const tag = await service.create(metrics)
      res.json({ tag, metrics: { ...metrics, tag } })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
