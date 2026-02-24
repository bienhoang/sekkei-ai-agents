# Phase 3: Config Generation for Guide Mode

## Context
- Parent: [plan.md](./plan.md)
- Depends on: Phase 2 (--guide flag wired)
- Config generator: `packages/preview/src/generate-config.ts` (163 lines)

## Overview
- **Priority:** Medium
- **Status:** complete
- **Description:** Pass guide-mode metadata to VitePress config generation — title, description

## Key Insights
- `ConfigOptions` interface already has optional `title?: string` field
- `generateVitePressConfig()` already uses `options.title ?? 'Sekkei Docs'` — just need to pass correct title from CLI
- Description field is currently hardcoded to `'Japanese specification documents'` — needs to be configurable

## Related Code Files
- **Modify:** `packages/preview/src/generate-config.ts`

## Implementation Steps

1. Add `description?: string` to `ConfigOptions` interface
2. In config template string, replace hardcoded description:
   ```
   description: ${JSON.stringify(options.description ?? 'Japanese specification documents')},
   ```
3. In `cli.ts` (Phase 2), pass description when guide mode:
   ```
   options.description = 'Hướng dẫn sử dụng Sekkei'
   ```

## Todo
- [x] Add `description?: string` to ConfigOptions
- [x] Use `options.description` in config template
- [x] Verify title + description render in VitePress HTML head

## Success Criteria
- `--guide` mode: title = "Sekkei User Guide", description = "Hướng dẫn sử dụng Sekkei"
- Default mode: title = "Sekkei Docs", description = "Japanese specification documents"
- No regression in existing preview behavior
