# Phase 03 — Vite File API Plugin

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-01](./phase-01-create-sekkei-preview-package.md) (package structure)
- Research: [Vite Plugin API](./research/researcher-02-vite-plugin-api.md)
- Docs: [code-standards.md](/docs/code-standards.md)

## Overview

- **Date**: 2026-02-21
- **Priority**: P1 (blocks phase-05 edit functionality)
- **Status**: pending
- **Effort**: 2.5h
- **Description**: Create Vite server plugin (`file-api-plugin.ts`) that adds REST endpoints for reading/saving markdown files. Only active when `--edit` flag is set. Includes path traversal protection and HMR trigger after save.

## Key Insights

- Vite `configureServer()` exposes connect middleware — no Express needed
- POST body must be collected manually from raw `IncomingMessage`
- Path traversal: `resolve()` + `startsWith(root + '/')` pattern
- After `writeFile`, emit `server.watcher.emit('change', absPath)` for VitePress HMR
- Store `ViteDevServer` ref at plugin scope for access in handlers
- Plugin only runs in dev mode (configureServer not called during build)
- YAML frontmatter must be stripped before sending to editor, re-attached on save

## Requirements

### Functional
- FR-01: `GET /__api/read?path=<relative>` — returns `{ content, frontmatter, path }`
- FR-02: `POST /__api/save` with `{ path, content }` — writes file, triggers HMR
- FR-03: `GET /__api/list` — returns `{ files: [{ path, title }] }` tree listing
- FR-04: Plugin disabled when `SEKKEI_EDIT` env var is not set
- FR-05: Frontmatter stripped from content in read response, raw YAML preserved separately
- FR-06: Save re-attaches original frontmatter, updates `updated_at` timestamp
- FR-07: HMR triggers automatically after save — page reloads in browser

### Non-Functional
- NFR-01: Path traversal protection on ALL file operations
- NFR-02: All endpoints return JSON with consistent error format
- NFR-03: < 50ms response time for read/save of typical spec doc (~500 lines)

## Architecture

```
Vite Plugin: sekkei-file-api
├── configureServer(server)
│   └── server.middlewares.use('/__api', router)
│
├── GET  /__api/read?path=requirements.md
│   → safePath(path, docsRoot)
│   → readFile(absPath, 'utf8')
│   → splitFrontmatter(raw)
│   → { content: body, frontmatter: yaml, path }
│
├── POST /__api/save  { path, content }
│   → safePath(path, docsRoot)
│   → readFile(absPath) → extract existing frontmatter
│   → joinFrontmatter(existingFm, newContent)
│   → writeFile(absPath, merged)
│   → server.watcher.emit('change', absPath)
│   → { ok: true }
│
└── GET  /__api/list
    → readdir(docsRoot, recursive)
    → filter .md files
    → extract titles from frontmatter
    → { files: [{ path, title }] }
```

### Key Functions

```typescript
// Path safety — shared by all endpoints
function safePath(userPath: string, root: string): string

// Frontmatter handling
function splitFrontmatter(raw: string): { fm: string; body: string }
function joinFrontmatter(fm: string, body: string): string

// Body parsing for POST
function readBody(req: IncomingMessage): Promise<string>
```

## Related Code Files

### Create
- `sekkei/packages/sekkei-preview/plugins/file-api-plugin.ts`
- `sekkei/packages/sekkei-preview/plugins/frontmatter-utils.ts`
- `sekkei/packages/sekkei-preview/plugins/safe-path.ts`

### Modify
- `sekkei/packages/sekkei-preview/src/generate-config.ts` (import plugin when edit mode)

### Delete
- None

## Implementation Steps

1. Create `plugins/safe-path.ts`:
   - Import `resolve`, `normalize` from `node:path`
   - Export `safePath(userPath: string, root: string): string`
   - Strip leading `/`, normalize, resolve relative to root
   - Assert `abs.startsWith(root + '/')` or `abs === root`
   - Throw `Error('Path traversal detected')` on violation
   - Also check: no null bytes in path (`\0`)

2. Create `plugins/frontmatter-utils.ts`:
   - `FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/`
   - Export `splitFrontmatter(raw)` → `{ fm, body }`
   - Export `joinFrontmatter(fm, body)` → string
   - If `fm` is empty, return body as-is (no frontmatter to re-attach)

3. Create `plugins/file-api-plugin.ts`:
   - Import types: `Plugin` from `vite`, `ViteDevServer`
   - Import: `readFile`, `writeFile`, `readdir`, `stat` from `node:fs/promises`
   - Import: `safePath`, `splitFrontmatter`, `joinFrontmatter`
   - Export `sekkeiFileApiPlugin(docsRoot: string): Plugin`
   - Check `process.env.SEKKEI_EDIT` — if not set, return plugin with no-op `configureServer`
   - In `configureServer`:
     a. Store `viteServer` reference
     b. Add connect middleware at `/__api` prefix
   - Implement `readBody(req)` — collect chunks, resolve string
   - Implement router function:
     - Parse `req.url` with `new URL()`
     - Route: `GET /read` → read handler
     - Route: `POST /save` → save handler
     - Route: `GET /list` → list handler
     - Default: `next()` (pass to Vite)
   - **Read handler**:
     - Get `path` from query string
     - `safePath(path, docsRoot)`
     - `readFile(absPath, 'utf8')`
     - `splitFrontmatter(raw)`
     - Respond 200 JSON `{ content, frontmatter, path }`
   - **Save handler**:
     - `readBody(req)` → `JSON.parse()`
     - `safePath(body.path, docsRoot)`
     - Read existing file → extract frontmatter
     - `joinFrontmatter(existingFm, body.content)`
     - `writeFile(absPath, merged, 'utf8')`
     - `viteServer.watcher.emit('change', absPath)`
     - Respond 200 JSON `{ ok: true }`
   - **List handler**:
     - Recursive `readdir(docsRoot)` with `{ recursive: true }`
     - Filter: `.md` files, skip `.vitepress/`, `node_modules/`
     - For each file, read first 5 lines → extract title from frontmatter or H1
     - Respond 200 JSON `{ files: [{ path: relative, title }] }`
   - **Error handling**: try/catch around each handler
     - Path traversal → 403 `{ error: "Forbidden" }`
     - File not found → 404 `{ error: "Not found" }`
     - Parse error → 400 `{ error: "Invalid request" }`
     - Other → 500 `{ error: "Internal error" }`

4. Update `src/generate-config.ts`:
   - When `options.edit === true`, add plugin import to generated config:
     ```typescript
     import { sekkeiFileApiPlugin } from '<package-path>/plugins/file-api-plugin'
     ```
   - Add to `vite.plugins` array: `sekkeiFileApiPlugin(docsRoot)`

5. Write unit test for `safePath`:
   - Valid: `"requirements.md"` → resolves inside root
   - Invalid: `"../../etc/passwd"` → throws
   - Invalid: `"../../../home/user/.ssh/id_rsa"` → throws
   - Edge: `"05-features/auth/basic-design.md"` → resolves inside root
   - Edge: null bytes → throws

## Todo List

- [ ] Create safe-path.ts with path traversal protection
- [ ] Create frontmatter-utils.ts (split/join)
- [ ] Create file-api-plugin.ts with read/save/list endpoints
- [ ] Add error handling for all endpoints
- [ ] Update generate-config.ts for plugin import
- [ ] Test safePath with traversal attempts
- [ ] Test read endpoint with sample .md file
- [ ] Test save endpoint + verify HMR trigger
- [ ] Test list endpoint returns correct file tree

## Success Criteria

- `GET /__api/read?path=requirements.md` returns content + frontmatter
- `POST /__api/save` writes to disk and triggers VitePress page reload
- `GET /__api/list` returns full file tree with titles
- Path traversal blocked: `../../etc/passwd` returns 403
- Plugin is no-op when `SEKKEI_EDIT` env var is unset
- No compile errors

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Path traversal bypass | High | resolve + startsWith + null byte check, unit tests |
| HMR not triggered after save | Medium | Test watcher.emit vs ws.send, fallback to full-reload |
| Large file slow to read/save | Low | Typical spec doc < 1MB, not an issue |
| Concurrent save race condition | Low | Single-user tool, accept last-write-wins |

## Security Considerations

- **Path traversal**: Triple defense — normalize, resolve, startsWith check
- **Null byte injection**: Reject paths containing `\0`
- **localhost only**: Vite dev server defaults to localhost binding
- **No code execution**: Plugin only reads/writes .md files, no eval
- **Content-Type validation**: Only accept `application/json` on POST

## Next Steps

- Phase 04: Milkdown editor calls these endpoints
- Phase 05: Save button triggers POST to `/__api/save`
