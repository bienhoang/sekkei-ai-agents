---
title: "Sekkei Plan Orchestrator Sub-Skill"
description: "Add sekkei:plan and sekkei:implement sub-commands with auto-trigger for large document generation"
status: completed
priority: P2
effort: 2h
branch: main
tags: [skill, sekkei, planning, orchestration]
created: 2026-02-21
---

# Sekkei Plan Orchestrator Sub-Skill

## Overview

Add plan orchestration capability to Sekkei skill for large document generation in split mode. Creates generation plans before executing, with user survey and per-phase tracking.

Brainstorm report: [brainstorm-260221-2142-sekkei-plan-orchestrator.md](../reports/brainstorm-260221-2142-sekkei-plan-orchestrator.md)

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Create plan-orchestrator.md reference | [x] Complete | 1h | [phase-01](./phase-01-create-plan-orchestrator-reference.md) |
| 2 | Update SKILL.md with sub-commands and auto-trigger | [x] Complete | 1h | [phase-02](./phase-02-update-skill-md.md) |

## Dependencies

- Existing SKILL.md (460 lines, 16 sub-commands)
- Existing references: doc-standards.md, v-model-guide.md
- Split mode config in sekkei.config.yaml

## Key Constraints

- Complement split mode, don't replace
- sekkei:implement delegates to existing sub-commands
- Plans in sekkei-docs/plans/ (user project dir)
- Heavy logic in reference file, SKILL.md stays concise
