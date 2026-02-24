# Phase 1: Package Restructure + Build Pipeline

## Context Links
- Plan: [plan.md](./plan.md)
- Current package.json: `packages/preview/package.json`
- Base tsconfig: `tsconfig.base.json` (root)
- Research: [researcher-02-tsup-express-patterns.md](./research/researcher-02-tsup-express-patterns.md)

## Overview
- **Priority:** P1 — all other phases depend on this
- **Status:** completed
- **Effort:** 2h
- **Depends on:** nothing

Delete all VitePress/Vue/Milkdown artifacts, replace package.json deps, create dual build pipeline (vite + tsup), and wire up placeholder source files that compile cleanly.

## Key Insights
- `tsup clean: false` is mandatory — vite builds `dist/client/` first, tsup must not wipe it
- Server tsconfig: `NodeNext` module, no JSX (extends base)
- Client tsconfig: `bundler` moduleResolution, `react-jsx` for Vite + React
- `index.html` lives at package root — Vite uses it as SPA entry
- `bin` in package.json must point to `dist/server.js` (tsup output)
- `build:guide` script pattern kept — copy `docs/user-guide → guide/`

## Requirements

### Functional
- `npm run build` produces `dist/server.js` (ESM, executable) + `dist/client/` (SPA assets)
- `npm run lint` passes with zero TypeScript errors
- Package exports `sekkei-preview` binary from `dist/server.js`

### Non-functional
- Build completes in < 30s on dev machine
<!-- Updated: Validation Session 1 - Tiptap/React/Tailwind moved to devDependencies, build script includes build:guide -->
- No VitePress/Vue/Milkdown in final `node_modules` (removed from deps)
- Node ≥ 20, ESM throughout

## Architecture

```
packages/preview/
├── package.json          ← rewrite deps
├── tsconfig.json         ← server TS (NodeNext, no JSX)
├── tsconfig.client.json  ← client TS (bundler, react-jsx)
├── tsup.config.ts        ← server bundle → dist/server.js
├── vite.config.ts        ← client bundle → dist/client/
├── index.html            ← SPA shell
└── src/
    ├── server/           ← placeholder index.ts
    └── client/           ← placeholder main.tsx
```

## Files to Create / Modify / Delete

### Delete
- `theme/` (entire directory)
- `plugins/file-api-plugin.ts`
- `src/generate-config.ts`
- `src/generate-index.ts`
- `src/cli.ts` (will be replaced by `src/server/index.ts`)

### Modify
- `packages/preview/package.json` — full rewrite

### Create
- `packages/preview/tsconfig.json` — server TS config
- `packages/preview/tsconfig.client.json` — client TS config
- `packages/preview/tsup.config.ts`
- `packages/preview/vite.config.ts`
- `packages/preview/index.html`
- `packages/preview/src/server/index.ts` — placeholder CLI entry
- `packages/preview/src/client/main.tsx` — placeholder React entry

## Implementation Steps

### 1. Delete old artifacts
```bash
cd packages/preview
rm -rf theme/
rm -f plugins/file-api-plugin.ts
rm -f src/generate-config.ts
rm -f src/generate-index.ts
rm -f src/cli.ts
```
Keep: `plugins/safe-path.ts`, `plugins/frontmatter-utils.ts`, `src/resolve-docs-dir.ts` — Phase 2 moves these.

### 2. Rewrite package.json
```json
{
  "name": "@bienhoang/sekkei-preview",
  "version": "1.0.0",
  "description": "Express+React preview + WYSIWYG editor for Sekkei specification documents",
  "type": "module",
  "bin": {
    "sekkei-preview": "./dist/server.js"
  },
  "main": "dist/server.js",
  "files": ["dist/", "guide/"],
  "scripts": {
    "build": "vite build && tsup && npm run build:guide",
    "build:guide": "node --input-type=commonjs -e \"const {cpSync}=require('fs');cpSync('../../docs/user-guide','./guide',{recursive:true})\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "lint": "tsc --noEmit && tsc -p tsconfig.client.json --noEmit"
  },
  "dependencies": {
    "express": "^4.21.0",
    "get-port": "^7.1.0",
    "open": "^11.0.0",
    "yaml": "^2.7.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.13.0",
    "@types/express": "^5.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@tiptap/react": "^3.0.0",
    "@tiptap/pm": "^3.0.0",
    "@tiptap/starter-kit": "^3.0.0",
    "@tiptap/extension-link": "^3.0.0",
    "tiptap-markdown": "^0.8.10",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tsup": "^8.4.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@tailwindcss/typography": "^0.5.19"
  },
  "engines": { "node": ">=20.0.0" },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "license": "MIT"
}
```

> **Note:** Use exact latest stable versions at install time. Tiptap v3 stable = 3.20.0 at time of research. Verify `npm info @tiptap/react version` before installing.

### 3. Create tsconfig.json (server)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src/server",
    "types": ["node"]
  },
  "include": ["src/server/**/*", "tsup.config.ts"],
  "exclude": ["node_modules", "dist", "src/client"]
}
```

### 4. Create tsconfig.client.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist/client",
    "rootDir": "src/client",
    "noEmit": true
  },
  "include": ["src/client/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Create tsup.config.ts
```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  clean: false,           // vite builds dist/client/ first — don't wipe it
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildOptions(options) {
    options.platform = 'node'
  },
})
```

### 6. Create vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4983',
    },
  },
})
```

### 7. Create index.html
```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sekkei Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

### 8. Create placeholder src/server/index.ts
```typescript
// Placeholder — full implementation in Phase 2
console.log('sekkei-preview server placeholder')
```

### 9. Create placeholder src/client/main.tsx
```tsx
// Placeholder — full implementation in Phase 3
import React from 'react'
import ReactDOM from 'react-dom/client'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><div>Sekkei Preview</div></React.StrictMode>)
```

### 10. Install dependencies
```bash
cd packages/preview
npm install
```

### 11. Verify dual build
```bash
npm run build
# Expect: dist/client/index.html + dist/server.js
ls dist/
ls dist/client/
```

### 12. Verify lint
```bash
npm run lint
# Expect: zero errors
```

## Todo List
- [ ] Delete theme/, plugins/file-api-plugin.ts, src/generate-config.ts, src/generate-index.ts, src/cli.ts
- [ ] Rewrite package.json with new deps
- [ ] Create tsconfig.json (server)
- [ ] Create tsconfig.client.json
- [ ] Create tsup.config.ts
- [ ] Create vite.config.ts
- [ ] Create index.html
- [ ] Create src/server/index.ts (placeholder)
- [ ] Create src/client/main.tsx (placeholder)
- [ ] `npm install` — verify no resolution errors
- [ ] `npm run build` — verify dist/server.js + dist/client/ produced
- [ ] `npm run lint` — verify zero TS errors

## Success Criteria
- `dist/server.js` exists, starts with `#!/usr/bin/env node` shebang
- `dist/client/index.html` exists
- `npm run lint` exits 0
- No VitePress, Vue, or Milkdown packages in `node_modules`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tiptap v3 peer dep conflicts with React 18 | Low | High | Pin exact versions; research confirmed compatible |
| tsup `clean: false` still wipes client assets | Low | Medium | Run `vite build` before tsup in `build` script |
| `@tailwindcss/vite` v4 API differences | Low | Low | Use CSS-first setup, no tailwind.config.ts needed |
| tsconfig path conflicts (server vs client) | Low | Medium | Separate rootDir + noEmit on client config |

## Security Considerations
- No secrets in package.json
- `files` array in package.json excludes `src/`, `plugins/` — only `dist/` + `guide/` published

## Next Steps
- Phase 2: Express server + API (reads utils from Phase 2 move)
- Phase 3: React frontend (reads from vite.config.ts created here)
