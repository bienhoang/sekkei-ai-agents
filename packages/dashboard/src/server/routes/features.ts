import { Router } from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PER_FEATURE_DOC_TYPES } from '../types.js'
import type { ServiceContext, FeaturesData } from '../types.js'

export function createFeaturesRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/features', async (_req, res) => {
    try {
      const config = await ctx.configReader.readConfig(ctx.configPath)

      // Check per-feature mode (auto-detected from features dir or index file)
      const featuresDir = join(ctx.docsRoot, '05-features')
      const indexFile = join(ctx.docsRoot, '_index.yaml')
      const perFeatureMode = existsSync(featuresDir) || existsSync(indexFile)

      if (!perFeatureMode) {
        return res.json({ perFeatureMode: false, features: [], docTypes: [] } satisfies FeaturesData)
      }

      const features = await ctx.workspaceScanner.scanFeatures(ctx.docsRoot, config)

      const data: FeaturesData = {
        perFeatureMode: true,
        features,
        docTypes: [...PER_FEATURE_DOC_TYPES],
      }

      res.json(data)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
