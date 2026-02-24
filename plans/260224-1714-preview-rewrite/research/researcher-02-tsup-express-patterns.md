# researcher-02-tsup-express-patterns.md

Date: 2026-02-24

---

## Topic 1: tsup ESM bin entry with shebang banner

### Findings

- tsup auto-detects `#!/usr/bin/env node` shebangs in source files and makes output executable (chmod automatically)
- Explicit `banner` option works for adding shebang when source doesn't have one
- `format: ['esm']` produces `.js` (or `.mjs` if `splitting` triggers it); ESM output works fine for CLI bins
- `clean: false` — keeps previous dist artifacts; use when incremental or avoiding race conditions; default is `true` (wipes dist before build)
- For bin entry: set `entry` to the CLI file + set `package.json#bin` to built output path

### Config snippet

```ts
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  outDir: 'dist',
  banner: { js: '#!/usr/bin/env node' },  // only needed if src lacks shebang
  clean: true,
  shims: true,  // adds __dirname/__filename shims for ESM
})
```

```json
// package.json
{
  "type": "module",
  "bin": { "sekkei-preview": "./dist/cli.js" }
}
```

### Notes

- If `src/cli.ts` already starts with `#!/usr/bin/env node`, tsup propagates it automatically — no `banner` needed
- `clean: false` is safe but avoid it unless you have a specific reason; stale artifacts cause confusion
- `format: ['esm']` + `"type": "module"` in package.json = output files as `.js` with ESM semantics
- Multi-arg shebang: `#!/usr/bin/env -S node --experimental-vm-modules` uses `-S` flag

---

## Topic 2: Express + React SPA serving pattern

### Findings

Standard two-step pattern — order matters critically:

1. Mount API routes first (before static)
2. `express.static` for built Vite assets
3. Catch-all `*` returns `index.html` for client-side routing

### Pattern

```ts
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 1. API routes (must come BEFORE static)
app.use('/api', apiRouter)

// 2. Serve Vite build output
const distPath = path.join(__dirname, '../dist/client')
app.use(express.static(distPath))

// 3. SPA fallback — serve index.html for all unmatched GET routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(port)
```

### Notes

- `express.static` serves exact file matches (assets, chunks, etc.)
- Catch-all only fires when no static file matched — no perf cost for assets
- Avoid `app.use('*', ...)` — use `app.get('*', ...)` to avoid catching POST/PUT
- For Vite: `dist/` default output dir; adjust `distPath` to match `vite.config.ts#build.outDir`
- Path issue with ESM: must reconstruct `__dirname` via `fileURLToPath(import.meta.url)`

---

## Topic 3: get-port v7 + open v10/v11

### get-port

- Latest: **v7.1.0** — ESM-only (no CJS export)
- Breaking from v5/v6: dropped CJS; must use `import` or dynamic `import()`

```ts
import getPort, { portNumbers } from 'get-port'

const port = await getPort({ port: 3000 })           // try 3000, fallback to random
const port2 = await getPort({ port: portNumbers(3000, 3100) }) // range scan
```

- Locking: returned ports are "locked" for 15-30s to prevent race conditions in parallel processes
- `clearLockedPorts()` available to reset cache

### open

- Latest: **v11.0.0** — ESM-only (same pattern as get-port)
- Breaking from older: dropped CJS; explicit ESM-only stance, maintainer won't fix CJS compat issues

```ts
import open, { openApp, apps } from 'open'

await open('http://localhost:3000')                  // opens in default browser
await open('https://example.com', { app: { name: 'google-chrome' } })
await open('file.txt', { wait: true })               // waits for app to close
```

- Cross-platform: uses `open` (macOS), `start` (Windows), `xdg-open` (Linux)
- WSL aware: routes to Windows browser from Linux subsystem

### Integration note

Both packages are ESM-only. If the preview server uses `"type": "module"` (which it should, given tsup ESM output), these import cleanly with no adapter needed.

---

## Summary table

| Concern | Solution |
|---|---|
| Shebang in tsup | `banner: { js: '#!/usr/bin/env node' }` or put it in source |
| ESM bin output | `format: ['esm']` + `"type": "module"` in pkg.json |
| `clean` default | `true` (wipes dist); `false` = keep artifacts |
| SPA fallback order | API routes → `express.static` → `app.get('*')` |
| `__dirname` in ESM | `path.dirname(fileURLToPath(import.meta.url))` |
| get-port import | `import getPort, { portNumbers } from 'get-port'` |
| open import | `import open from 'open'` |

---

## Unresolved questions

- None blocking. `open` is at v11.0.0 (not v10 as task assumed) — v11 API identical to v10 for basic URL opening.

---

## Sources

- [tsup docs](https://tsup.egoist.dev/)
- [Building ESM+CJS npm package 2024 - DEV Community](https://dev.to/snyk/building-an-npm-package-compatible-with-esm-and-cjs-in-2024-88m)
- [Serving SPA with Express Router - DEV Community](https://dev.to/iamscottcab/serving-a-spa-with-express-server-router-552n)
- [get-port README - GitHub](https://github.com/sindresorhus/get-port/blob/main/readme.md)
- [open README - GitHub](https://github.com/sindresorhus/open/blob/main/readme.md)
- [SPA fallback routes - Vite discussions](https://github.com/vitejs/vite/discussions/6038)
