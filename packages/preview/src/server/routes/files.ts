import { Router, Request, Response } from 'express'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { safePath } from '../utils/safe-path.js'
import { splitFrontmatter, joinFrontmatter } from '../utils/frontmatter.js'

function getPath(req: Request, res: Response): string | null {
  const p = req.query['path']
  if (typeof p !== 'string' || !p) {
    res.status(400).json({ error: 'Missing path parameter' })
    return null
  }
  return p
}

export function createFilesRouter(docsRoot: string, version: string, mode: 'workspace' | 'guide'): Router {
  const router = Router()

  router.get('/system', (_req, res) => {
    res.json({ version, mode })
  })

  router.get('/files', async (req, res) => {
    const relPath = getPath(req, res)
    if (!relPath) return

    let absPath: string
    try {
      absPath = safePath(relPath, docsRoot)
    } catch {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    let raw: string
    try {
      raw = await readFile(absPath, 'utf8')
    } catch {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const { body } = splitFrontmatter(raw)
    const fileStat = await stat(absPath).catch(() => null)
    res.json({
      content: body,
      path: relPath,
      modified: fileStat?.mtime?.toISOString() ?? null,
    })
  })

  router.put('/files', async (req, res) => {
    if (mode === 'guide') {
      res.status(403).json({ error: 'Read-only in guide mode' })
      return
    }

    const relPath = getPath(req, res)
    if (!relPath) return

    let absPath: string
    try {
      absPath = safePath(relPath, docsRoot)
    } catch {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const body = req.body as { content?: string }
    if (typeof body?.content !== 'string') {
      res.status(400).json({ error: 'Missing content' })
      return
    }

    let existingFm = ''
    try {
      const existing = await readFile(absPath, 'utf8')
      existingFm = splitFrontmatter(existing).fm
    } catch { /* new file — no frontmatter */ }

    const { body: cleanBody } = splitFrontmatter(body.content)
    const merged = joinFrontmatter(existingFm, cleanBody)

    try {
      await writeFile(absPath, merged, 'utf8')
    } catch {
      res.status(500).json({ error: 'Write failed' })
      return
    }

    res.json({ path: relPath, saved: true })
  })

  return router
}
