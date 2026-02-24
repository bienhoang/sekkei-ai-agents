---
title: "Sekkei Locale Injection"
description: "Inject locale directive into SKILL.md and reference docs to force output language matching sekkei.config.yaml"
status: completed
priority: P2
effort: 1h
branch: main
tags: [i18n, locale, skill, dx]
created: 2026-02-24
completed: 2026-02-24
---

# Sekkei Locale Injection

**Brainstorm:** `plans/reports/brainstorm-260224-1817-sekkei-locale-injection.md`

## Problem

`sekkei.config.yaml → project.language` is set (e.g., `vi`) but all skill outputs default to English because prompts are English.

## Solution

Approach A — Language Injection. Keep prompts English, force OUTPUT language via directives.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [SKILL.md Locale Directive](./phase-01-skill-locale-directive.md) | completed | 40min |
| 2 | [Reference Docs Locale Hints](./phase-02-reference-locale-hints.md) | completed | 20min |

## Key Decisions

- Prompts stay English (best Claude comprehension)
- Output language forced via directive + reinforcement
- MCP i18n deferred (Claude translates at presentation layer)
- Preserve: Japanese doc names, ID patterns, section headings
