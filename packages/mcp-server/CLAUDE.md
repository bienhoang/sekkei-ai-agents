# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm run dev          # Run with tsx (hot reload)
npm run lint         # Type check only (tsc --noEmit)
npm test             # Run all tests (Jest + ESM)
npm run test:unit    # Unit tests only
npm run test:integration
# Single test file:
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs tests/unit/validator.test.ts
```

Jest requires `--experimental-vm-modules` flag for ESM support. Tests use `ts-jest/presets/default-esm`. Import paths in test files must use `.js` extensions (ESM convention).

## Architecture

Sekkei is an MCP server that generates Japanese software specification documents (設計書) following the V-model. It uses STDIO transport — **only JSON-RPC may go to stdout; all logging goes to stderr (fd 2) via pino**.

### Data Flow

```
MCP Client (Claude/Cursor/Copilot)
  → STDIO transport
    → McpServer (server.ts)
      → Tools (15 handlers in tools/index.ts)
      → Resources (template URIs + RFP instructions in resources/)
        → Template Loader (lib/template-loader.ts)
          → Template Resolver (lib/template-resolver.ts) — override dir → default fallback
        → Export: Node-native (default) or Python Bridge (fallback)
```

### Key Invariants

- **Stdout is sacred**: Logger writes to fd 2 only. Never `console.log` in server code.
- **Dual export engine**: `SEKKEI_EXPORT_ENGINE` controls which engine is used (`"node"` default, `"python"` fallback). Node uses ExcelJS, Playwright PDF, docx package. Python uses `execFile` (not `exec`) with `SEKKEI_INPUT` env var.
- **Template override**: `resolveTemplatePath()` checks override dir first with path containment validation, falls back to default `templates/{lang}/{doc-type}.md`.
- **Zod schemas on all tool inputs**: Enums constrain `doc_type` and `language` to valid values. All paths validated with regex refinements.
- **SekkeiError**: 18 typed error codes in `lib/errors.ts` — `toClientMessage()` for client-safe output (no stack traces leaked).

### Document Chain (V-Model)

```
RFP → requirements → nfr/functions-list/project-plan
  → basic-design → security-design/detail-design
  → test-plan → ut-spec/it-spec/st-spec/uat-spec
```

Each document type has: a Markdown template (`templates/ja/`, 22 templates), generation instructions (in `generate.ts`), validation rules (in `validator.ts`), and cross-reference ID patterns (in `id-extractor.ts`).

### Key Subsystems

- **Change Requests** (`tools/change-request.ts`, `tools/cr-actions.ts`, `lib/cr-state-machine.ts`, `lib/cr-propagation.ts`, `lib/cr-conflict-detector.ts`) — track and propagate spec changes across the chain
- **Plan Management** (`tools/plan.ts`, `tools/plan-actions.ts`, `lib/plan-state.ts`) — orchestrate multi-phase document generation
- **Staleness Detection** (`lib/staleness-detector.ts`, `lib/doc-staleness.ts`, `lib/staleness-formatter.ts`) — detect outdated downstream docs
- **Changelog** (`lib/changelog-manager.ts`) — global changelog with version extraction and propagation logging
- **Mockup System** (`lib/mockup-parser.ts`, `lib/mockup-renderer.ts`, `lib/mockup-html-builder.ts`, `lib/mockup-schema.ts`) — wireframe/screen design rendering
- **Code Analysis** (`lib/code-analyzer.ts`, `lib/code-context-formatter.ts`) — analyze source code for detail-design generation

### Config

Environment variables (see `src/config.ts`):
- `SEKKEI_TEMPLATE_DIR` — template directory (default: `../templates` relative to dist)
- `SEKKEI_TEMPLATE_OVERRIDE_DIR` — company-specific template overrides
- `SEKKEI_EXPORT_ENGINE` — `"node"` (default) or `"python"`
- `SEKKEI_PYTHON` — Python executable path (default: `.venv/bin/python3`)
- `LOG_LEVEL` — pino log level

### Testing Pattern

Tools are tested by accessing internal handlers: `(server as any)._registeredTools[name].handler(args, {})`. Test tmp files go in `tests/tmp/` and are cleaned up in `afterAll`. Use `dirname(fileURLToPath(import.meta.url))` for `__dirname` equivalent in ESM tests. Test directories: `tests/unit/`, `tests/integration/`, `tests/fixtures/`.

### Python Layer (Fallback Export)

Located at `python/` relative to this package. Entry point: `cli.py` dispatches to `export/excel_exporter.py`, `export/pdf_exporter.py`, `nlp/glossary.py`, `nlp/diff_analyzer.py`. Requires `openpyxl`, `weasyprint`, `mistune`, `pyyaml` (see `requirements.txt`). Only used when `SEKKEI_EXPORT_ENGINE=python`.
