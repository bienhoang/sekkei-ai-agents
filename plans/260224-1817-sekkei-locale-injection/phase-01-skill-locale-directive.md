# Phase 1: SKILL.md Locale Directive

**Parent:** [plan.md](./plan.md)
**Status:** completed
**Priority:** P1
**Effort:** 40min
**Completed:** 2026-02-24

## Overview

Add locale configuration section to SKILL.md that forces Claude to respond in the user's configured language. Add reinforcement hints in each sub-command section.

## Key Insights

- SKILL.md has 30 sub-command sections (### `/sekkei:*`)
- Language config at `sekkei.config.yaml → project.language` (ja/en/vi)
- Claude responds in language of context by default → needs explicit directive to override
- Long contexts cause Claude to "forget" directives → reinforcement at multiple points critical

## Requirements

### Functional
- Locale directive section before command definitions (between line 8 "Generate Japanese..." and line 10 "## Document Generation Commands")
- Directive must read `sekkei.config.yaml → project.language`
- Force ALL user-facing output in configured language
- Preserve list: Japanese doc type names, ID patterns, section headings in generated docs

### Non-functional
- Must not break existing SKILL.md structure or command parsing
- Reinforcement hints must be minimal (1 line) to avoid bloat
- Total SKILL.md size increase < 5%

## Related Code Files

### Modify
- `packages/mcp-server/adapters/claude-code/SKILL.md` — main skill file

## Implementation Steps

### Step 1: Add Locale Directive Section

Insert after line 8 (`Generate Japanese software specification...`), before `## Document Generation Commands`:

```markdown
## Output Language

**MANDATORY:** Read `sekkei.config.yaml` → `project.language` field.
ALL user-facing output (responses, explanations, status messages, error descriptions, interview questions) MUST be written in the configured language.

- `ja` → Japanese (日本語)
- `en` → English
- `vi` → Vietnamese (Tiếng Việt)

**Always preserve regardless of output language:**
- Japanese document type names: 要件定義書, 基本設計書, 詳細設計書, etc.
- Cross-reference ID patterns: REQ-xxx, F-xxx, SCR-xxx, TBL-xxx, API-xxx, CLS-xxx, NFR-xxx
- Markdown section headings inside generated documents (these follow template language, not output language)
- Technical terms that have no standard translation (MCP, V-model, CRUD)

**Default:** If `sekkei.config.yaml` not found or `project.language` not set, default to `ja`.
```

### Step 2: Add Reinforcement Hints to Sub-Commands

For each of the 30 `### /sekkei:*` sections, add a one-liner after the heading:

```markdown
> 📌 Respond in `project.language` from `sekkei.config.yaml` (see §Output Language)
```

**Placement:** Immediately after the `### /sekkei:*` heading line, before any content.

**Exception:** For commands that have "Interview questions" block right after heading, place the hint BEFORE the interview questions block.

### Step 3: Verify no structural breaks

- Ensure all `###` headings still parse correctly
- Ensure no duplicate sections created
- Frontmatter intact

## Todo

- [x] Insert `## Output Language` section after header
- [x] Add reinforcement hint to all 30 sub-command sections
- [x] Verify SKILL.md structure integrity

## Success Criteria

- `## Output Language` section present between header and first command group
- All 30 sub-commands have locale reinforcement hint
- SKILL.md frontmatter and structure unchanged
- Existing command instructions unmodified

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude ignores directive in long context | Medium | Reinforcement at every sub-command |
| Blockquote hint misinterpreted as content | Low | Use consistent format with § reference |
| SKILL.md parser breaks on new section | Low | Section follows existing ## pattern |

## Next Steps

→ Phase 2: Reference docs locale hints
