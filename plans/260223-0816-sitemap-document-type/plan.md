---
title: "Add Sitemap Document Type to Sekkei"
description: "Add sitemap as auxiliary doc type showing system functional structure/page hierarchy"
status: complete
priority: P2
effort: 2h
branch: main
tags: [mcp-server, document-type, sitemap, auxiliary]
created: 2026-02-23
---

# Add Sitemap Document Type to Sekkei

## Overview

Add `sitemap` as a new auxiliary document type (like `crud-matrix`, `traceability-matrix`) that generates a functional structure map of the target system. Shows page/screen/function hierarchy in Markdown format with hybrid input sources.

## Brainstorm Report

- [Brainstorm Report](../reports/brainstorm-260223-0816-sitemap-document-type.md)

## Implementation Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Add sitemap to type system](./phase-01-add-type-definition.md) | complete | 15m | `src/types/documents.ts` |
| 2 | [Create Japanese template](./phase-02-create-template.md) | complete | 30m | `templates/ja/sitemap.md` |
| 3 | [Add generation instructions](./phase-03-add-generation-instructions.md) | complete | 30m | `src/lib/generation-instructions.ts` |
| 4 | [Add SKILL.md sub-command](./phase-04-add-skill-subcommand.md) | complete | 30m | `packages/skills/content/SKILL.md` |
| 5 | [Build & test](./phase-05-build-and-test.md) | complete | 15m | Tests + type check |

## Key Decisions

- **Position**: Auxiliary document, NOT in V-model chain (no chain dependency)
- **Pattern**: Same as `crud-matrix`/`traceability-matrix` — reuse `generate_document` tool
- **Input**: Hybrid — user description + functions-list F-xxx IDs + code analysis
- **Output**: Markdown with hierarchical tree/nested list
- **Keigo**: `simple` (である調) — consistent with other auxiliary docs
- **No new MCP tool needed** — reuses existing `generate_document` with `doc_type: "sitemap"`

## Dependencies

- None — purely additive change, no breaking changes
