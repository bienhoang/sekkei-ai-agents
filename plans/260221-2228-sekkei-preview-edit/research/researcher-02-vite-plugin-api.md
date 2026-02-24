# Vite Plugin API — configureServer & VitePress Integration

Date: 2026-02-21 | Scope: Custom middleware, POST body parsing, path safety, VitePress HMR

---

## 1. configureServer() — Plugin Skeleton

```ts
// .vitepress/plugins/sekkei-api.ts
import type { Plugin } from 'vite'

export function sekkeiApiPlugin(): Plugin {
  return {
    name: 'sekkei-api',
    configureServer(server) {
      // Runs BEFORE Vite's internal middlewares
      server.middlewares.use('/__api', apiRouter)
    }
  }
}
```

To run **after** internal middlewares (e.g., to let Vite handle its own routes first):
```ts
configureServer(server) {
  return () => {
    server.middlewares.use('/__api', apiRouter)
  }
}
```

`server.middlewares` is a **connect** app instance. Handler signature: `(req, res, next) => void`.

---

## 2. POST Body Parsing — Raw Node.js (no express)

Connect middleware exposes the raw `IncomingMessage`. Body must be collected manually:

```ts
import type { IncomingMessage, ServerResponse } from 'node:http'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function apiRouter(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'POST' && url.pathname === '/__api/save') {
    const raw = await readBody(req)
    const { path: filePath, content } = JSON.parse(raw)
    // ... handle save
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (req.method === 'GET' && url.pathname === '/__api/read') {
    // ... handle read
    return
  }

  next()
}
```

---

## 3. Path Traversal Protection

Never trust client-supplied paths directly. Canonicalize and assert the resolved path stays inside the allowed root:

```ts
import { resolve, normalize } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const DOCS_ROOT = resolve(process.cwd(), 'docs') // or sekkei/templates

function safePath(userPath: string): string {
  // Strip leading slash, normalize, resolve relative to root
  const rel = normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const abs = resolve(DOCS_ROOT, rel)
  if (!abs.startsWith(DOCS_ROOT + '/') && abs !== DOCS_ROOT) {
    throw new Error('Path traversal detected')
  }
  return abs
}

// Usage in handler:
try {
  const abs = safePath(filePath)
  const content = await readFile(abs, 'utf8')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ content }))
} catch (e) {
  res.writeHead(403)
  res.end(JSON.stringify({ error: String(e) }))
}
```

Key rules:
- `normalize()` collapses `../` sequences
- `resolve()` produces absolute path
- Check `startsWith(DOCS_ROOT + '/')` — the trailing `/` prevents `DOCS_ROOT + 'evil'` false positives

---

## 4. VitePress Plugin Loading

In `.vitepress/config.mts`, the `vite` key accepts a full Vite config including `plugins`:

```ts
// .vitepress/config.mts
import { defineConfig } from 'vitepress'
import { sekkeiApiPlugin } from './plugins/sekkei-api'

export default defineConfig({
  vite: {
    plugins: [sekkeiApiPlugin()]
  }
})
```

VitePress merges this config with its own internal Vite config via `mergeConfig()`. The plugin's `configureServer` hook is called during `vite dev` startup. It is **not** called during `vite build` — guard accordingly.

---

## 5. VitePress HMR — File Change Mechanism

VitePress uses Vite's `handleHotUpdate` (or newer `hotUpdate`) hook internally for `.md` files. When a markdown file changes:

1. Vite's watcher fires `change` event on the file
2. VitePress's internal plugin calls `server.ws.send({ type: 'full-reload' })` for page-level changes
3. For data-only changes, it may send a custom WS event

To trigger HMR from a save API (after writing a file):

```ts
// After fs.writeFile succeeds, notify Vite's HMR system:
server.watcher.emit('change', absPath)
// VitePress will pick this up and reload the page automatically
```

Or send a targeted full-reload:
```ts
server.ws.send({ type: 'full-reload', path: '*' })
```

Accessing `server` in the middleware handler — store it at plugin scope:

```ts
export function sekkeiApiPlugin(): Plugin {
  let viteServer: ViteDevServer

  return {
    name: 'sekkei-api',
    configureServer(server) {
      viteServer = server
      server.middlewares.use('/__api', async (req, res, next) => {
        // ... handle request, then after save:
        viteServer.watcher.emit('change', absPath)
      })
    }
  }
}
```

---

## Summary — /__api/read & /__api/save Pattern

```
GET  /__api/read?path=<relative>  → safePath() → readFile → JSON {content}
POST /__api/save                  → readBody() → JSON.parse → safePath() → writeFile
                                  → viteServer.watcher.emit('change', abs)
                                  → JSON {ok: true}
```

Both endpoints share `safePath()`. Error responses use HTTP 4xx/5xx with `{error: string}`.

---

## Sources

- [Vite Plugin API — configureServer](https://vite.dev/guide/api-plugin)
- [Vite HMR hotUpdate hook](https://vite.dev/changes/hotupdate-hook)
- [VitePress Site Config — vite option](https://vitepress.dev/reference/site-config)

## Unresolved Questions

- VitePress version in this project — `handleHotUpdate` vs `hotUpdate` depends on Vite 5+ (hotUpdate is preferred in Vite 6)
- Whether VitePress's internal watcher already watches the templates dir or if `server.watcher.add(DOCS_ROOT)` is needed
- Content-Security-Policy headers needed for browser fetch to `/__api`? (likely fine in dev, irrelevant in prod)
