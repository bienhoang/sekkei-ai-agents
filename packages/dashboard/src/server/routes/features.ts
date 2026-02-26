import { Router } from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SPLIT_DOC_TYPES } from '../types.js'
import type { ServiceContext, FeaturesData } from '../types.js'

export function createFeaturesRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/features', async (_req, res) => {
    try {
      const config = await ctx.configReader.readConfig(ctx.configPath)

      // Check split mode
      const featuresDir = join(ctx.docsRoot, '05-features')
      const indexFile = join(ctx.docsRoot, '_index.yaml')
      const splitMode = config.split_mode ?? (existsSync(featuresDir) || existsSync(indexFile))

      if (!splitMode) {
        return res.json({ splitMode: false, features: [], docTypes: [] } satisfies FeaturesData)
      }

      const features = await ctx.workspaceScanner.scanFeatures(ctx.docsRoot, config)

      const data: FeaturesData = {
        splitMode: true,
        features,
        docTypes: [...SPLIT_DOC_TYPES],
      }

      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
