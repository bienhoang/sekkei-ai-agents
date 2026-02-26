import express from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOverviewRouter } from './routes/overview.js'
import { createChainRouter } from './routes/chain.js'
import { createAnalyticsRouter } from './routes/analytics.js'
import { createChangesRouter } from './routes/changes.js'
import { createFeaturesRouter } from './routes/features.js'
import type { ServiceContext, StatusData } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface AppOptions {
  docsRoot: string
  configPath: string
  version: string
  services: ServiceContext
}

export function createApp(options: AppOptions): express.Express {
  const { services, version } = options
  const app = express()

  app.use(express.json({ limit: '10mb' }))

  // API routes
  app.use('/api', createOverviewRouter(services))
  app.use('/api', createChainRouter(services))
  app.use('/api', createAnalyticsRouter(services))
  app.use('/api', createChangesRouter(services))
  app.use('/api', createFeaturesRouter(services))

  // Status endpoint
  app.get('/api/status', (_req, res) => {
    const data: StatusData = {
      mcpConnected: services.mcpClient?.isConnected() ?? false,
      version,
    }
    res.json(data)
  })

  // API 404
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Static client files
  const clientDir = join(__dirname, 'client')
  app.use(express.static(clientDir))
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDir, 'index.html'))
  })

  return app
}
