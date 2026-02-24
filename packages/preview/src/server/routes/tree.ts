import { Router } from 'express'
import { scanTree } from '../utils/tree-scanner.js'

export function createTreeRouter(docsRoot: string): Router {
  const router = Router()

  router.get('/tree', async (_req, res) => {
    try {
      const tree = await scanTree(docsRoot)
      res.json(tree)
    } catch {
      res.status(500).json({ error: 'Failed to scan tree' })
    }
  })

  return router
}
