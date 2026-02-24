# Brainstorm: Sekkei Locale Injection

**Date:** 2026-02-24 18:17 GMT+7
**Status:** Agreed
**Approach:** A — Language Injection (Pragmatic)

## Problem

User config `sekkei.config.yaml` has `project.language: vi` but skill outputs (Claude responses, status messages) default to English because all prompts are written in English.

## Scope

- **Target:** Sekkei skills only (`/sekkei:*` commands)
- **Not:** Global Claude Code locale, MCP i18n (deferred)
- **Config source:** `sekkei.config.yaml → project.language`

## Agreed Solution

### Change 1: SKILL.md Locale Directive (90% impact)

Add locale section to SKILL.md header that:
1. Reads `sekkei.config.yaml → project.language`
2. Forces ALL user-facing output in configured language
3. Preserves: Japanese doc type names (要件定義書), ID patterns (REQ-xxx), section headings

**Location:** Top of SKILL.md, before any command definitions
**Reinforcement:** Each sub-command section also reminds "respond in project.language"

### Change 3: Reference Docs Locale Hint (2% impact)

Add header line to each reference doc in `packages/skills/content/references/`:
```
> ⚠️ Output all user-facing text in `sekkei.config.yaml → project.language`
```

### Deferred: MCP Server i18n

MCP returns JSON to Claude (not directly to user). Claude formats/presents. With SKILL.md directive, Claude will naturally translate MCP output. Add i18n module only if English leaks persist after Change 1+3.

## Rationale

| Factor | Decision |
|--------|----------|
| Prompt language | Keep English — Claude comprehends best |
| Output language | Force via directive — user sees native language |
| Maintenance | Zero additional translation files |
| MCP messages | Claude translates at presentation layer |
| Technical terms | Explicit preserve list in directive |

## Risks

- Claude may "forget" directive in long contexts → mitigate with reinforcement at multiple points
- Technical term boundary unclear → explicit preserve list needed
- Error stack traces / file paths always English → acceptable

## Implementation

Two files to modify:
1. `packages/mcp-server/adapters/claude-code/SKILL.md` — add locale directive section + per-command hints
2. `packages/skills/content/references/*.md` — add locale header to each file

**Estimated effort:** ~1 hour total
