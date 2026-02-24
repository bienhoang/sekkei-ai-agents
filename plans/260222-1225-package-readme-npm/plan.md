---
title: "Package READMEs for npm + Ecosystem Guide"
description: "Create/update README files for all sekkei monorepo packages and add cross-package usage guides"
status: complete
priority: P2
effort: 2h
branch: main
tags: [documentation, npm, readme, monorepo]
created: 2026-02-22
---

# Package READMEs for npm + Ecosystem Guide

## Objective

Make all 3 sekkei npm packages show useful README pages on npm. Add cross-package usage guides. Fix broken repo URLs.

## Packages

| Package | npm name | Current README | Status |
|---------|----------|---------------|--------|
| packages/mcp-server | sekkei-mcp-server | None | Create |
| packages/preview | sekkei-preview | None | Create |
| packages/skills (NEW) | sekkei-skills | None | Create + move |
| Root | sekkei-monorepo (private) | Exists | Update |

## Phase Overview

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](phase-01-package-infrastructure.md) | Move skills, fix package.json files | 20min | Complete |
| [Phase 2](phase-02-package-readmes.md) | Create 3 package READMEs | 60min | Complete |
| [Phase 3](phase-03-root-readme-update.md) | Update root README with ecosystem guide | 30min | Complete |
| [Phase 4](phase-04-verification.md) | Cross-check links, formatting, npm rendering | 10min | Complete |

## Key Dependencies

- Phase 2 depends on Phase 1 (skills package must exist before writing its README)
- Phase 3 depends on Phase 2 (root ecosystem section links to package READMEs)
- Phase 2 READMEs (mcp-server, preview, skills) can be written in parallel

## Reference

- Brainstorm report: `plans/reports/brainstorm-260222-1225-package-readme-npm.md`
- GitHub repo: https://github.com/bienhoang/sekkei-ai-agents
