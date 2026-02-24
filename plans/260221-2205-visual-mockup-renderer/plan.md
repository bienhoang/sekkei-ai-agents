---
title: "Visual Mockup Renderer for Screen Specs"
description: "Replace ASCII wireframes with PNG mockup images + numbered annotations via HTML/Playwright"
status: complete
priority: P2
effort: 6h
branch: main
tags: [screen-design, mockup, playwright, wireframe, png]
created: 2026-02-21
---

# Visual Mockup Renderer — Implementation Plan

## Overview

Replace ASCII wireframes in `screen-design.md` section 1 (画面レイアウト) with **PNG mockup images** containing **red circled number annotations ①②③** at component positions. Numbers map to `画面項目定義` table via `#` column.

**Architecture:** AI generates structured YAML → Handlebars renders HTML wireframe → CSS blueprint styling → Playwright screenshots → PNG embedded in Markdown.

## Brainstorm Report

- [brainstorm-260221-2205-visual-mockup-renderer.md](../reports/brainstorm-260221-2205-visual-mockup-renderer.md)

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Schema & YAML Parser](./phase-01-mockup-schema-and-parser.md) | pending | 1h | 2 new |
| 2 | [Wireframe Templates (HTML/CSS)](./phase-02-wireframe-templates.md) | pending | 1.5h | 4 new |
| 3 | [Playwright Renderer](./phase-03-playwright-renderer.md) | pending | 1.5h | 1 new, 1 mod |
| 4 | [Integration & Instruction Update](./phase-04-integration.md) | pending | 1.5h | 4 mod |
| 5 | [Testing](./phase-05-testing.md) | pending | 0.5h | 2 new |

## Dependencies

```
Phase 1 (Schema) → Phase 2 (Templates) → Phase 3 (Renderer)
                                              ↓
Phase 4 (Integration) ← depends on Phase 1 + 3
Phase 5 (Testing) ← depends on all above
```

## Key Decisions

- **Playwright** over Puppeteer — better auto browser management
- **Handlebars** for HTML templates — already in project deps (root package.json)
- **Structured YAML** replaces ASCII — single source of truth for image + table
- **Post-generation auto-render** — seamless workflow, no manual step
- **Form layout first** — most common, expand incrementally
