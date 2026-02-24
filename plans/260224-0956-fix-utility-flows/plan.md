---
title: "Fix Sekkei utility flow issues"
description: "Fix 3 critical + 5 medium issues in preview, version, uninstall, rebuild flows"
status: complete
priority: P1
effort: 2h
branch: main
tags: [sekkei, cli, bugfix, utility-flows]
created: 2026-02-24
---

# Fix Sekkei Utility Flow Issues

## Context

Brainstorm review identified 8 issues across 4 utility flows (`/sekkei:preview`, `/sekkei:version`, `/sekkei:uninstall`, `/sekkei:rebuild`). See `plans/reports/brainstorm-260224-0956-utility-flows-review.md`.

## Issues Summary

| ID | Severity | Issue | File |
|----|----------|-------|------|
| R1 | Critical | `/sekkei:rebuild` has no stub — not detected as valid command | update.ts |
| R2 | Critical | SUBCMD_DEFS missing 5 commands (rfp, change, plan, implement, rebuild) | update.ts |
| V1 | Critical | EXPECTED_SUBCMD_COUNT=20 but SUBCMD_DEFS will have 32 entries | health-check.ts |
| R3 | Medium | Stale stubs not cleaned on rebuild (e.g., test-spec.md lingers) | update.ts |
| R4 | Medium | Installed stubs outdated (20 vs 32) — resolved by running rebuild after fix | — |
| P1 | Medium | Preview creates node_modules symlink in docs dir, never cleaned | preview/cli.ts |
| P2 | Medium | Preview generates .vitepress/ files, never cleaned | preview/cli.ts |
| U1 | Medium | Uninstall prints no note about preview artifacts left behind | uninstall.ts |

## Phases

| Phase | Description | Status | Issues Fixed |
|-------|-------------|--------|--------------|
| 01 | [MCP Server CLI fixes](phase-01-mcp-server-cli-fixes.md) | complete | R1, R2, V1, R3, R4, U1 |
| 02 | [Preview cleanup on exit](phase-02-preview-cleanup.md) | complete | P1, P2 |

## Build & Test

```bash
# MCP Server (phase 1)
cd sekkei/packages/mcp-server && npm run build && npm test

# Preview (phase 2)
cd sekkei/packages/preview && npm run build
```

## Success Criteria

- [ ] All 32 SKILL.md commands have matching stubs in SUBCMD_DEFS
- [ ] Health check EXPECTED_SUBCMD_COUNT matches SUBCMD_DEFS.length
- [ ] Rebuild cleans stale stubs before regenerating
- [ ] Preview cleans symlink + .vitepress/ on exit
- [ ] `npm run build` passes for both packages
- [ ] `npm test` passes for mcp-server
