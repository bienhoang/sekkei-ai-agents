# Phase 3: Add Generation Instructions

## Context

- [Plan](./plan.md)
- File: `sekkei/packages/mcp-server/src/lib/generation-instructions.ts`

## Overview

- **Priority**: High (fixes TS compile errors from Phase 1)
- **Status**: pending
- **Description**: Add sitemap-specific AI generation instructions and keigo map entry.

## Key Insights

- `GENERATION_INSTRUCTIONS` is `Record<DocType, string>` — TS requires entry for every DocType
- `KEIGO_MAP` is `Record<DocType, KeigoLevel>` — also requires entry
- Auxiliary docs use `"simple"` keigo (である調)
- Instructions must guide AI to combine 3 input sources: user description, F-xxx IDs, code analysis

## Requirements

### Functional
- Add `"sitemap"` entry to `GENERATION_INSTRUCTIONS` record
- Add `"sitemap": "simple"` entry to `KEIGO_MAP` record
- Instructions must cover:
  - Hierarchical tree structure generation
  - Page/screen list table format
  - Cross-reference with F-xxx IDs from functions-list
  - Support for different system types (web pages, mobile screens, API endpoints, batch jobs)
  - URL/route path notation

### Non-functional
- Follow same `.join("\n")` pattern as other entries
- Must compile with `npm run lint`

## Related Code Files

- **Modify**: `sekkei/packages/mcp-server/src/lib/generation-instructions.ts`
  - `GENERATION_INSTRUCTIONS` record (after line 107, before closing `}`)
  - `KEIGO_MAP` record (after line 121, before closing `}`)

## Implementation Steps

1. Add to `GENERATION_INSTRUCTIONS` (after `"migration-design"` entry, line ~107):
```typescript
"sitemap": [
  "Generate a サイトマップ (Sitemap / System Structure Map) from the provided input.",
  "Show the functional structure and page/screen hierarchy of the target system.",
  "Output TWO sections:",
  "",
  "### Section 1: サイトマップツリー (Tree Structure)",
  "Use indented markdown list to show parent-child hierarchy:",
  "- トップページ (TOP)",
  "  - ユーザー管理 (F-001)",
  "    - ユーザー一覧",
  "    - ユーザー登録",
  "  - 注文管理 (F-002)",
  "",
  "### Section 2: ページ一覧 (Page/Screen List Table)",
  "Columns: | ページID | ページ名 | URL/ルート | 親ページ | 関連機能 (F-xxx) | 処理概要 |",
  "Every page/screen must have a unique ID (PG-001 format).",
  "Map F-xxx IDs from 機能一覧 to relevant pages where applicable.",
  "For web systems: include URL paths. For mobile: screen names. For API: endpoint groups. For batch: job categories.",
  "Include all user-facing pages AND admin/management pages.",
].join("\n"),
```

2. Add to `KEIGO_MAP` (after `"migration-design"` entry, line ~121):
```typescript
"sitemap": "simple",
```

3. Run `npm run lint` — should compile clean now

## Todo List

- [ ] Add `"sitemap"` to `GENERATION_INSTRUCTIONS`
- [ ] Add `"sitemap": "simple"` to `KEIGO_MAP`
- [ ] Verify `npm run lint` passes

## Success Criteria

- `npm run lint` passes with zero errors
- `GENERATION_INSTRUCTIONS["sitemap"]` returns meaningful instructions
- `KEIGO_MAP["sitemap"]` returns `"simple"`

## Risk Assessment

- **Low risk**: Adding entries to existing records, pattern well-established
- Instructions quality determines AI output quality — may need iteration

## Next Steps

- Phase 4: Add SKILL.md sub-command
