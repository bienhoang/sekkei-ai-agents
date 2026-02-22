import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile, writeFile, readdir, realpath } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { safePath } from './safe-path.js'
import { splitFrontmatter, joinFrontmatter } from './frontmatter-utils.js'

type NextFn = () => void

const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10 MB

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        req.destroy()
        reject(new Error('Request body too large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/**
 * Extract title from first few lines of a markdown file content.
 */
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n')
  // Check frontmatter
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < Math.min(lines.length, 20); i++) {
      if (lines[i]?.trim() === '---') break
      const match = lines[i]?.match(/^title:\s*["']?(.+?)["']?\s*$/)
      if (match) return match[1]
    }
  }
  // Check first H1
  for (const line of lines.slice(0, 30)) {
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) return h1[1]
  }
  return ''
}

/**
 * Vite plugin that adds REST endpoints for file read/save/list.
 * Only active when SEKKEI_EDIT=1 env var is set.
 */
export function sekkeiFileApiPlugin(docsRoot: string): Plugin {
  let viteServer: ViteDevServer
  let resolvedRoot = docsRoot

  return {
    name: 'sekkei-file-api',

    async configureServer(server) {
      if (process.env.SEKKEI_EDIT !== '1') return

      // Resolve symlinks (macOS /tmp → /private/tmp)
      try { resolvedRoot = await realpath(docsRoot) } catch { /* keep original */ }

      viteServer = server

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: NextFn) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        const pathname = url.pathname

        if (!pathname.startsWith('/__api/')) {
          return next()
        }

        try {
          if (req.method === 'GET' && pathname === '/__api/read') {
            await handleRead(url, res, resolvedRoot)
          } else if (req.method === 'POST' && pathname === '/__api/save') {
            await handleSave(req, res, resolvedRoot, viteServer)
          } else if (req.method === 'GET' && pathname === '/__api/list') {
            await handleList(res, resolvedRoot)
          } else {
            next()
          }
        } catch (err) {
          const msg = (err as Error).message
          if (msg === 'Path traversal detected') {
            json(res, 403, { error: 'Forbidden' })
          } else {
            json(res, 500, { error: 'Internal error' })
          }
        }
      })
    },
  }
}

async function handleRead(url: URL, res: ServerResponse, docsRoot: string): Promise<void> {
  const filePath = url.searchParams.get('path')
  if (!filePath) {
    json(res, 400, { error: 'Missing path parameter' })
    return
  }

  const absPath = safePath(filePath, docsRoot)
  let raw: string
  try {
    raw = await readFile(absPath, 'utf8')
  } catch {
    json(res, 404, { error: 'Not found' })
    return
  }

  const { fm, body } = splitFrontmatter(raw)
  json(res, 200, { content: body, frontmatter: fm, path: filePath })
}

async function handleSave(
  req: IncomingMessage,
  res: ServerResponse,
  docsRoot: string,
  server: ViteDevServer
): Promise<void> {
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.includes('application/json')) {
    json(res, 400, { error: 'Content-Type must be application/json' })
    return
  }

  let body: { path?: string; content?: string }
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    json(res, 400, { error: 'Invalid JSON' })
    return
  }

  if (!body.path || typeof body.content !== 'string') {
    json(res, 400, { error: 'Missing path or content' })
    return
  }

  const absPath = safePath(body.path, docsRoot)

  // Read existing file to preserve frontmatter
  let existingFm = ''
  try {
    const existing = await readFile(absPath, 'utf8')
    existingFm = splitFrontmatter(existing).fm
  } catch {
    // New content without existing frontmatter is OK
  }

  const merged = joinFrontmatter(existingFm, body.content)
  await writeFile(absPath, merged, 'utf8')

  // Trigger HMR
  server.watcher.emit('change', absPath)

  json(res, 200, { ok: true })
}

async function handleList(res: ServerResponse, docsRoot: string): Promise<void> {
  const files: Array<{ path: string; title: string }> = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        const relPath = relative(docsRoot, fullPath)
        try {
          const content = await readFile(fullPath, 'utf8')
          const title = extractTitleFromContent(content) || relPath
          files.push({ path: relPath, title })
        } catch {
          files.push({ path: relPath, title: relPath })
        }
      }
    }
  }

  await walk(docsRoot)
  files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
  json(res, 200, { files })
}
