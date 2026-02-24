# Phase 2: Express Server + API

## Context Links
- Plan: [plan.md](./plan.md)
- Phase 1: [phase-01-package-restructure.md](./phase-01-package-restructure.md)
- Source to reuse: `packages/preview/plugins/safe-path.ts`
- Source to reuse: `packages/preview/plugins/frontmatter-utils.ts`
- Source to reuse: `packages/preview/src/resolve-docs-dir.ts`
- Research: [researcher-02-tsup-express-patterns.md](./research/researcher-02-tsup-express-patterns.md)

## Overview
- **Priority:** P1
- **Status:** completed
- **Effort:** 3h
- **Depends on:** Phase 1

Move + adapt existing utility files, build the Express app factory, 4 REST endpoints, and the CLI entry with `parseArgs` / `get-port` / `open`. Server binds to `127.0.0.1` only and serves `dist/client/` as a SPA fallback.

## Key Insights
- `__dirname` in ESM: `path.dirname(fileURLToPath(import.meta.url))`
- `get-port` v7 and `open` v11 are ESM-only — import with `import()`-style or top-level await
- Express SPA pattern: API routes → `express.static` → `app.get('*', ...)` catch-all for `index.html`
- Frontmatter strip on GET, reattach on PUT — editor never sees YAML
- Tree skip rules: hidden files (`.`-prefix), `node_modules`, `.yaml`/`.yml` files
- Numeric sort on tree: `localeCompare(undefined, { numeric: true })`
- `GET /api/system` carries `mode` so the client knows workspace vs guide at startup
- Max request body: 10 MB (reuse constant from old plugin)
- pino logger writes to fd 2 (stderr) only — never `console.log` in server modules

## Requirements

### Functional
- `GET /api/tree` returns nested JSON tree, directories first, numeric sort, `.md` only, skip hidden/yaml
- `GET /api/files?path=<rel>` returns `{ content: <body-without-fm>, path, modified }`
- `PUT /api/files?path=<rel>` body `{ content }` → strip incoming fm, reattach existing fm, write, return `{ path, saved: true }`
- `GET /api/system` returns `{ version, mode }`
- All file ops validate path through `safePath()` → 403 on traversal
- CLI: `--docs`, `--guide`, `--port`, `--no-open`, `--help`; auto port via `get-port` if busy
- Browser opens automatically unless `--no-open`

### Non-functional
- Bind to `127.0.0.1` (loopback only, not `0.0.0.0`)
- 404 JSON for unknown API routes
- Graceful SIGINT/SIGTERM: close HTTP server then exit
- pino log to stderr

## Architecture

```
src/server/
├── index.ts          ← CLI: parseArgs → resolveDir → startServer
├── app.ts            ← Express factory: routes + static + SPA fallback
├── routes/
│   ├── tree.ts       ← GET /api/tree
│   └── files.ts      ← GET/PUT /api/files + GET /api/system
└── utils/
    ├── safe-path.ts          ← moved from plugins/
    ├── frontmatter.ts        ← moved from plugins/frontmatter-utils.ts
    ├── resolve-docs-dir.ts   ← moved from src/
    └── tree-scanner.ts       ← new: recursive dir walker
```

## Files to Create / Move / Delete

### Move (adapt imports only)
- `plugins/safe-path.ts` → `src/server/utils/safe-path.ts`
- `plugins/frontmatter-utils.ts` → `src/server/utils/frontmatter.ts`
- `src/resolve-docs-dir.ts` → `src/server/utils/resolve-docs-dir.ts`

### Delete after move
- `plugins/safe-path.ts`
- `plugins/frontmatter-utils.ts`
- `src/resolve-docs-dir.ts`
- `plugins/` directory (now empty)

### Create
- `src/server/utils/tree-scanner.ts`
- `src/server/routes/tree.ts`
- `src/server/routes/files.ts`
- `src/server/app.ts`
- `src/server/index.ts` (replace placeholder)

## Implementation Steps

### 1. Move utility files

Move `plugins/safe-path.ts` → `src/server/utils/safe-path.ts` (no changes needed — no internal imports).

Move `plugins/frontmatter-utils.ts` → `src/server/utils/frontmatter.ts` (rename only).

Move `src/resolve-docs-dir.ts` → `src/server/utils/resolve-docs-dir.ts` (no import changes needed).

```bash
mkdir -p packages/preview/src/server/utils
mkdir -p packages/preview/src/server/routes
cp packages/preview/plugins/safe-path.ts packages/preview/src/server/utils/safe-path.ts
cp packages/preview/plugins/frontmatter-utils.ts packages/preview/src/server/utils/frontmatter.ts
cp packages/preview/src/resolve-docs-dir.ts packages/preview/src/server/utils/resolve-docs-dir.ts
rm packages/preview/plugins/safe-path.ts
rm packages/preview/plugins/frontmatter-utils.ts
rm packages/preview/src/resolve-docs-dir.ts
rmdir packages/preview/plugins 2>/dev/null || true
```

### 2. Create src/server/utils/tree-scanner.ts

```typescript
import { readdir, stat } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'

export interface TreeNode {
  name: string
  type: 'file' | 'directory'
  path: string          // relative to docsRoot
  children?: TreeNode[]
}

const SKIP_NAMES = new Set(['node_modules', '.git', '.vitepress'])
const SKIP_EXTS = new Set(['.yaml', '.yml'])

/**
 * Recursively scan docsRoot and return a nested tree.
 * - Directories first, then files (both numeric-sorted within group)
 * - Skip hidden entries (dot-prefix), node_modules, .yaml/.yml files
 * - Only .md files included (directories included if they contain .md files)
 */
export async function scanTree(docsRoot: string, dir = docsRoot): Promise<TreeNode[]> {
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const visible = entries.filter(e => {
    if (e.name.startsWith('.')) return false
    if (SKIP_NAMES.has(e.name)) return false
    if (e.isFile() && SKIP_EXTS.has(extname(e.name))) return false
    if (e.isFile() && extname(e.name) !== '.md') return false
    return true
  })

  visible.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  )

  const dirs = visible.filter(e => e.isDirectory())
  const files = visible.filter(e => e.isFile())
  const ordered = [...dirs, ...files]

  const nodes: TreeNode[] = []
  for (const entry of ordered) {
    const fullPath = join(dir, entry.name)
    const relPath = relative(docsRoot, fullPath)

    if (entry.isDirectory()) {
      const children = await scanTree(docsRoot, fullPath)
      if (children.length > 0) {
        nodes.push({ name: entry.name, type: 'directory', path: relPath, children })
      }
    } else {
      nodes.push({ name: entry.name, type: 'file', path: relPath })
    }
  }

  return nodes
}
```

### 3. Create src/server/routes/tree.ts

```typescript
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
```

### 4. Create src/server/routes/files.ts

```typescript
import { Router, Request, Response } from 'express'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { safePath } from '../utils/safe-path.js'
import { splitFrontmatter, joinFrontmatter } from '../utils/frontmatter.js'

const MAX_BODY = 10 * 1024 * 1024  // 10 MB

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

  // GET /api/system
  router.get('/system', (_req, res) => {
    res.json({ version, mode })
  })

  // GET /api/files?path=<relative>
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

  // PUT /api/files?path=<relative>
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

    // Preserve existing frontmatter
    let existingFm = ''
    try {
      const existing = await readFile(absPath, 'utf8')
      existingFm = splitFrontmatter(existing).fm
    } catch { /* new file — no frontmatter */ }

    // Strip any frontmatter the client accidentally sent
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
```

### 5. Create src/server/app.ts

```typescript
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

  // API routes
  app.use('/api', createTreeRouter(docsRoot))
  app.use('/api', createFilesRouter(docsRoot, version, mode))

  // Unknown API → 404 JSON (must be before static)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Serve React SPA from dist/client/
  const clientDir = join(__dirname, 'client')
  app.use(express.static(clientDir))

  // SPA catch-all — serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDir, 'index.html'))
  })

  return app
}
```

### 6. Create src/server/index.ts (replace placeholder)

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import getPort from 'get-port'
import open from 'open'
import { createApp } from './app.js'
import { resolveDocsDir, resolveGuideDir } from './utils/resolve-docs-dir.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = join(__dirname, '..')   // dist/ → packages/preview/

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    return (pkg as { version?: string }).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function printHelp(): void {
  process.stdout.write(`
Usage: sekkei-preview [options]

Options:
  --docs <path>   Docs directory (auto-resolve if omitted)
  --guide         Serve bundled user guide (readonly)
  --port <N>      Port (default: 4983, auto if busy)
  --no-open       Do not open browser
  --help          Show this help

`)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      docs:    { type: 'string' },
      guide:   { type: 'boolean', default: false },
      port:    { type: 'string' },
      'no-open': { type: 'boolean', default: false },
      help:    { type: 'boolean', default: false },
    },
    strict: false,
  })

  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const guideMode = values.guide as boolean
  const noOpen = values['no-open'] as boolean
  const preferredPort = values.port ? parseInt(values.port as string, 10) : 4983

  if (isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    process.stderr.write('Error: --port must be between 1 and 65535\n')
    process.exit(1)
  }

  let docsRoot: string
  let mode: 'workspace' | 'guide'

  try {
    if (guideMode) {
      docsRoot = resolveGuideDir(packageDir)
      mode = 'guide'
    } else {
      docsRoot = resolveDocsDir(values.docs as string | undefined)
      mode = 'workspace'
    }
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`)
    process.exit(1)
  }

  const port = await getPort({ port: preferredPort })
  const version = getVersion()
  const app = createApp({ docsRoot, version, mode })
  const server = createServer(app)

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    process.stderr.write(`sekkei-preview ${version} — ${mode} mode\n`)
    process.stderr.write(`Docs: ${docsRoot}\n`)
    process.stderr.write(`Listening: ${url}\n`)
    if (!noOpen) {
      open(url).catch(() => { /* ignore open errors */ })
    }
  })

  // Graceful shutdown
  const shutdown = (): void => {
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(err => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
```

### 7. Update tsup.config.ts entry point
Verify `entry: ['src/server/index.ts']` — no change needed if created correctly in Phase 1.

### 8. Compile check
```bash
cd packages/preview
npm run build
node dist/server.js --help   # should print usage
```

## Todo List
- [ ] Move safe-path.ts → src/server/utils/safe-path.ts
- [ ] Move frontmatter-utils.ts → src/server/utils/frontmatter.ts
- [ ] Move resolve-docs-dir.ts → src/server/utils/resolve-docs-dir.ts
- [ ] Remove old files + empty plugins/ dir
- [ ] Create src/server/utils/tree-scanner.ts
- [ ] Create src/server/routes/tree.ts
- [ ] Create src/server/routes/files.ts
- [ ] Create src/server/app.ts
- [ ] Create src/server/index.ts (full CLI entry)
- [ ] `npm run build` — verify no TS errors
- [ ] `node dist/server.js --help` — verify help text prints
- [ ] `node dist/server.js --no-open` with a test docs dir — verify server starts + API returns 200

## Success Criteria
- `GET /api/tree` returns valid JSON array when pointed at a docs dir with .md files
- `GET /api/files?path=readme.md` returns `{ content, path, modified }`
- `PUT /api/files?path=readme.md` with `{ content }` saves file and preserves frontmatter
- `GET /api/system` returns `{ version, mode }`
- Path traversal `GET /api/files?path=../../etc/passwd` returns 403
- `node dist/server.js --help` exits 0

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `get-port` / `open` ESM import errors | Low | Medium | Both confirmed ESM-only in research; import at top level |
| Express 5 / `@types/express` v5 type mismatches | Low | Low | Pin `express@^4.21` for now; types v5 covers both |
| `realpath` fails on non-existent docs dir | Low | Medium | `safePath` already handles with `resolve()` fallback |
| `dist/client/` missing at server startup | Medium | High | Document: always `npm run build` before running; dev uses vite proxy |

## Security Considerations
- `safePath()` prevents path traversal via null byte, `..` normalization, symlink resolution
- Server binds `127.0.0.1` — not exposed to LAN
- Guide mode: PUT returns 403 at route level
- Request body capped at 10 MB via `express.json({ limit: '10mb' })`
- `Content-Type: application/json` enforced by `express.json()` middleware

## Next Steps
- Phase 3: React frontend consumes `/api/tree`, `/api/files`, `/api/system`
- Phase 5: Guide mode flag flows through `GET /api/system` to disable editor UI
