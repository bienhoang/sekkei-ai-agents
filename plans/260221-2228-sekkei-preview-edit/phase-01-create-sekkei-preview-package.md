# Phase 01 — Create sekkei-preview npm Package + CLI

## Context Links

- Parent: [plan.md](./plan.md)
- Dependencies: None (first phase)
- Docs: [code-standards.md](/docs/code-standards.md), [sekkei.config.example.yaml](/sekkei/sekkei.config.example.yaml)
- Research: [brainstorm](../reports/brainstorm-260221-2228-sekkei-preview-edit.md)

## Overview

- **Date**: 2026-02-21
- **Priority**: P1 (blocks all other phases)
- **Status**: pending
- **Effort**: 3h
- **Description**: Create the `@sekkei/preview` npm package under `sekkei/packages/sekkei-preview/`. CLI entry point (`bin/sekkei-preview.js`) that resolves docs dir, generates VitePress config, and launches dev/build/serve.

## Key Insights

- `sekkei/packages/` exists but is empty — new package goes here
- MCP server uses ESM + NodeNext + TS target ES2022 — match these
- VitePress version: use latest available from npm (don't pin to 1.x) — validated in Session 1
<!-- Updated: Validation Session 1 - VitePress version to latest available -->
- `sekkei.config.yaml` has `output.directory` (default `./docs/`)
- Config example shows numbered structure: `01-overview.md`, `03-system/`, `05-features/`
- SKILL.md expects `npx sekkei-preview` CLI with `--docs`, `--port` flags
- Index.md auto-generation from `_index.yaml` needed when missing

## Requirements

### Functional
- FR-01: `npx sekkei-preview` starts VitePress dev server at localhost:5173
- FR-02: `npx sekkei-preview build` builds static site
- FR-03: `npx sekkei-preview serve` serves built static site
- FR-04: `--docs <path>` overrides docs directory
- FR-05: `--port <N>` overrides dev server port
- FR-06: `--edit` flag stored in env var for downstream plugins/theme
- FR-07: Auto-resolve docs dir: `--docs` flag > `sekkei-docs/` in CWD > `sekkei.config.yaml output.directory`
- FR-08: Auto-generate `index.md` homepage from `_index.yaml` if missing
- FR-09: Generate `.vitepress/config.mts` programmatically (not copied from templates)

### Non-Functional
- NFR-01: ESM package (`"type": "module"`)
- NFR-02: Node 20+ required
- NFR-03: Startup < 3s (VitePress cold start excluded)
- NFR-04: Zero global installs — all deps in package.json

## Architecture

```
sekkei/packages/sekkei-preview/
├── package.json           # @sekkei/preview, bin: sekkei-preview
├── tsconfig.json          # ES2022, NodeNext
├── src/
│   ├── cli.ts             # CLI entry — arg parsing, config resolution
│   ├── resolve-docs-dir.ts # Docs dir resolution logic
│   ├── generate-config.ts  # VitePress config generation
│   └── generate-index.ts   # Auto-generate index.md from _index.yaml
├── theme/                  # VitePress theme (Vue SFCs, NOT compiled by tsc)
│   └── (phase-02)
├── plugins/                # Vite plugins (phase-03)
│   └── (phase-03)
└── dist/                   # tsc output (only src/)
    └── cli.js              # Compiled CLI entry
```

### CLI Flow

```
1. Parse args: command (dev|build|serve), --docs, --port, --edit
2. Resolve docs dir via resolve-docs-dir.ts
3. Validate docs dir exists + has .md files
4. Generate .vitepress/config.mts in temp dir (or docs dir)
5. Set SEKKEI_EDIT=1 env var if --edit flag
6. Spawn: vitepress dev|build|serve <docsDir> --port <port>
```

### Config Resolution (resolve-docs-dir.ts)

```
Priority:
  1. --docs CLI flag
  2. ./sekkei-docs/ in CWD (convention)
  3. sekkei.config.yaml → output.directory
  4. Error: "No docs directory found"
```

## Related Code Files

### Create
- `sekkei/packages/sekkei-preview/package.json`
- `sekkei/packages/sekkei-preview/tsconfig.json`
- `sekkei/packages/sekkei-preview/src/cli.ts`
- `sekkei/packages/sekkei-preview/src/resolve-docs-dir.ts`
- `sekkei/packages/sekkei-preview/src/generate-config.ts`
- `sekkei/packages/sekkei-preview/src/generate-index.ts`

### Modify
- None in this phase

### Delete
- None

## Implementation Steps

1. Create `sekkei/packages/sekkei-preview/` directory structure
2. Create `package.json` with:
   - name: `@sekkei/preview` (or `sekkei-preview` for npx)
   - type: `module`
   - bin: `{ "sekkei-preview": "./dist/cli.js" }`
   - dependencies: `vitepress` (latest from npm), `vue`, `yaml`
   - devDependencies: `typescript`, `@types/node`
   - engines: `{ "node": ">=20.0.0" }`
   - scripts: build, lint
3. Create `tsconfig.json` matching MCP server conventions (ES2022, NodeNext, strict)
   - rootDir: `src`
   - outDir: `dist`
   - exclude: `theme/`, `plugins/` (Vue SFCs handled by Vite, not tsc)
4. Implement `src/resolve-docs-dir.ts`:
   - Export `resolveDocsDir(cliDocsFlag?: string): string`
   - Check priority: CLI flag > `./sekkei-docs/` > config yaml
   - Use `fs.existsSync` for directory checks
   - Parse `sekkei.config.yaml` with `yaml` package if needed
   - Throw descriptive error if no dir found
5. Implement `src/generate-index.ts`:
   - Export `generateIndexIfMissing(docsDir: string): Promise<void>`
   - Skip if `index.md` already exists in docsDir
   - If `_index.yaml` exists, parse it and generate sidebar-style index.md
   - If no `_index.yaml`, generate minimal index.md with project name from config
6. Implement `src/generate-config.ts`:
   - Export `generateVitePressConfig(docsDir, options): string`
   - Options: `{ edit: boolean, port: number }`
   - Return VitePress config as string (written to `.vitepress/config.mts`)
   - Include: title, sidebar from dir structure, vite plugins (if edit mode)
   - Import theme from package path
   - Import file-api plugin from package path (if edit mode)
7. Implement `src/cli.ts`:
   - Hashbang: `#!/usr/bin/env node`
   - Parse process.argv: positional command, `--docs`, `--port`, `--edit`
   - Use minimal arg parser (no external dep — parseArgs from `node:util`)
   - Call resolveDocsDir, generateIndexIfMissing, generateVitePressConfig
   - Write config to `<docsDir>/.vitepress/config.mts`
   - Set `SEKKEI_EDIT` env var if `--edit`
   - Spawn `vitepress` process with `child_process.spawn`
   - Forward stdout/stderr, handle SIGINT
8. Run `npm run build` to verify tsc compiles clean

## Todo List

- [ ] Create directory structure
- [ ] Create package.json
- [ ] Create tsconfig.json
- [ ] Implement resolve-docs-dir.ts
- [ ] Implement generate-index.ts
- [ ] Implement generate-config.ts
- [ ] Implement cli.ts with arg parsing + process spawn
- [ ] Verify tsc compiles without errors
- [ ] Test CLI manually: `node dist/cli.js --docs ./test-docs`

## Success Criteria

- `npm run build` compiles clean in `sekkei/packages/sekkei-preview/`
- `node dist/cli.js --help` prints usage (or `node dist/cli.js` with no docs dir prints error)
- Docs dir resolution works for all 3 priority levels
- VitePress config generated correctly with proper imports

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| VitePress config path resolution | Medium | Use absolute paths in generated config, test with symlinks |
| _index.yaml format mismatch | Low | Validate against manifest schema, fallback to dir listing |
| tsc excludes Vue SFCs incorrectly | Low | theme/ + plugins/ excluded from tsconfig, handled by Vite |

## Security Considerations

- CLI validates docs dir path exists before proceeding
- No user input reaches filesystem without validation
- VitePress dev server binds to localhost by default

## Next Steps

- Phase 02: Create VitePress theme that this config references
- Phase 03: Create Vite file-api plugin that config imports in edit mode
