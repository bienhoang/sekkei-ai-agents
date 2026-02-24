import express from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTreeRouter } from './routes/tree.js'
import { createFilesRouter } from './routes/files.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface AppOptions {
  docsRoot: string
  version: string
  mode: 'workspace' | 'guide'
}

export function createApp(options: AppOptions): express.Application {
  const { docsRoot, version, mode } = options
  const app = express()

  app.use(express.json({ limit: '10mb' }))

  app.use('/api', createTreeRouter(docsRoot))
  app.use('/api', createFilesRouter(docsRoot, version, mode))

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Serve images/assets from docsRoot (for markdown image references)
  app.use('/docs-assets', express.static(docsRoot, {
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'],
    dotfiles: 'ignore',
  }))

  const clientDir = join(__dirname, 'client')
  app.use(express.static(clientDir))

  app.get('*', (_req, res) => {
    res.sendFile(join(clientDir, 'index.html'))
  })

  return app
}
