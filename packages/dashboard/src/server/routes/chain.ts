import { Router } from 'express'
import type { ServiceContext, ChainData, ChainGroup } from '../types.js'
import { getChainEntries } from '../services/config-reader.js'

const PHASE_GROUPS: { phase: string; label: string; docTypes: string[] }[] = [
  { phase: 'requirements', label: 'Requirements', docTypes: ['requirements', 'functions-list', 'nfr', 'project-plan'] },
  { phase: 'design', label: 'Design', docTypes: ['basic-design', 'security-design', 'detail-design'] },
  { phase: 'test', label: 'Testing', docTypes: ['test-plan', 'ut-spec', 'it-spec', 'st-spec', 'uat-spec'] },
  { phase: 'supplementary', label: 'Supplementary', docTypes: ['sitemap', 'operation-design', 'migration-design'] },
]

export function createChainRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/chain', async (_req, res) => {
    try {
      const config = await ctx.configReader.readConfig(ctx.configPath)
      const allEntries = getChainEntries(config)

      const groups: ChainGroup[] = PHASE_GROUPS.map(pg => ({
        phase: pg.phase,
        label: pg.label,
        entries: allEntries.filter(e => pg.docTypes.includes(e.docType)),
      }))

      // Add ungrouped entries to supplementary
      const grouped = new Set(PHASE_GROUPS.flatMap(pg => pg.docTypes))
      const ungrouped = allEntries.filter(e => !grouped.has(e.docType))
      if (ungrouped.length > 0) {
        const suppGroup = groups.find(g => g.phase === 'supplementary')
        if (suppGroup) suppGroup.entries.push(...ungrouped)
      }

      let features: Awaited<ReturnType<typeof ctx.workspaceScanner.scanFeatures>> = []
      if (config.split_mode) {
        features = await ctx.workspaceScanner.scanFeatures(ctx.docsRoot, config)
      }

      const data: ChainData = {
        project: config.project,
        rfp: config.rfp ?? null,
        groups,
        features: features.flatMap(f => f.docs.map(d => ({
          featureId: f.id,
          featureName: f.name,
          status: d.status,
        }))),
        splitMode: config.split_mode ?? false,
      }

      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
