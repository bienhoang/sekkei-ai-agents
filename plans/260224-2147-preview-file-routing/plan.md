---
title: "Preview File-Based URL Routing"
description: "Add History API routing to preview so URLs reflect documents, are shareable, and auto-resolve index pages"
status: completed
priority: P2
effort: 2h
branch: main
tags: [preview, routing, ux]
created: 2026-02-24
---

# Preview File-Based URL Routing

## Summary

Add native History API routing to `packages/preview/` so the URL bar reflects the active document path, URLs are shareable/reloadable, and root/directory URLs auto-resolve to default index pages (like Apache DirectoryIndex).

**Zero new dependencies.** ~80 LOC across 2 new files + minor App.tsx integration.

## Brainstorm Report

- [brainstorm-260224-2147-preview-file-routing.md](../reports/brainstorm-260224-2147-preview-file-routing.md)

## Architecture

```
Browser URL: /docs/basic-design/01-overview.md
                ↕ pushState / popstate
React state: activePath = "docs/basic-design/01-overview.md"
                ↕ useFile hook (existing)
Express API: GET /api/files?path=docs/basic-design/01-overview.md
```

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Default Page Resolver](./phase-01-default-page-resolver.md) | completed | 30m | 1 new |
| 2 | [URL Sync Hook](./phase-02-url-sync-hook.md) | completed | 45m | 1 new |
| 3 | [App Integration](./phase-03-app-integration.md) | completed | 30m | 1 modified |
| 4 | [Server & Verification](./phase-04-server-verification.md) | completed | 15m | 1 verified |

## Dependencies

- Tree data must be loaded before URL resolution runs
- Server catch-all (`*` → index.html) already exists — no new server routes needed

## Key Decisions

- **History API** over React Router (zero deps, simpler, server already has SPA catch-all)
- **Client-side resolution** — tree is already fully loaded on client, no server endpoint needed
- **Index priority**: `index.md` → `home.md` → `front.md` → `README.md` → first numbered → first file
