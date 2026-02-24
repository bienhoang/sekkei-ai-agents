# Research Report: SKILL.md Workflows & Template System
**Date:** 2026-02-21 | **Scope:** Numbered doc structure refactor

---

## 1. SKILL.md Structure & Sub-Command Flows

**Location:** `sekkei/mcp-server/adapters/claude-code/SKILL.md`
Command files delegate to SKILL.md via: `SKILL file: .../sekkei/skills/sekkei/SKILL.md`

### Sub-commands (12 total)
`init`, `functions-list`, `requirements`, `basic-design`, `detail-design`, `test-spec`, `validate`, `status`, `export`, `translate`, `glossary`, `update`

### Hardcoded Output Paths in SKILL.md

| Sub-command | Hardcoded output path |
|---|---|
| `functions-list` | `./sekkei-docs/functions-list.md` |
| `requirements` | `./sekkei-docs/requirements.md` |
| `basic-design` | `./sekkei-docs/basic-design.md` |
| `detail-design` | `./sekkei-docs/detail-design.md` |
| `test-spec` | `./sekkei-docs/test-spec.md` |
| `export` | `./sekkei-docs/{doc-type}.{format}` |
| `translate` | `./sekkei-docs/{doc-type}.{target_lang}.md` |
| `glossary` | `sekkei-docs/glossary.yaml` |

All output paths use flat `./sekkei-docs/` — no numbered prefix, no feature subdirs.

### init workflow
Creates `sekkei.config.yaml` + `./sekkei-docs/` directory. No numbered structure created.

### basic-design workflow
Step 5 references `SPLIT MODE` comment in template: "per-screen specs generated separately in `features/{feature-id}/screen-design.md`" — split mode path is `features/` not numbered.

---

## 2. Template Format

**Location:** `sekkei/templates/ja/`

**Available templates:**
`basic-design.md`, `crud-matrix.md`, `detail-design.md`, `functions-list.md`, `migration-design.md`, `operation-design.md`, `requirements.md`, `screen-design.md`, `test-spec.md`, `traceability-matrix.md`

**Missing templates (needed for refactor):** `overview.md`, `feature-index.md`, `section-index.md`

### YAML Frontmatter Pattern (consistent across all templates)
```yaml
---
doc_type: basic-design          # kebab-case doc type
version: "1.0"
language: ja
sections:                       # list of section slugs for validation
  - revision-history
  - approval
  - distribution
  - glossary
  - overview
  - system-architecture
  ...
---
```

### AI Instruction Comment Patterns
- `<!-- AI: instruction -->` — inline field instructions
- `<!-- AI: multi-line\n     Rules:\n     - rule1 -->` — multi-line generation rules
- `<!-- AI SPLIT MODE: ... -->` — conditional instructions for split mode
- Keigo instruction always first: `<!-- AI: Keigo: Use ですます調 throughout. -->`

### basic-design.md Split Mode Comment (§5.3)
```
<!-- AI SPLIT MODE: When generating in split mode (scope: "feature"), do NOT generate
     per-screen detail specs in this file. Per-screen specs (画面項目定義, バリデーション,
     イベント, 画面遷移, 権限) are generated separately in features/{feature-id}/screen-design.md.
     In split mode, section 5 should contain ONLY the 画面一覧 table and 画面遷移図 Mermaid diagram.
     Reference: "詳細は features/{feature-id}/screen-design.md を参照" -->
```
This `features/{feature-id}/` path needs updating to the numbered structure.

---

## 3. Config Example Structure (`sekkei.config.example.yaml`)

```yaml
project:
  name / type / stack / team_size / language / keigo / industry

output:
  directory: ./sekkei-docs/       # ← hardcoded, needs to support numbered structure
  format: markdown

chain:
  rfp: ""
  functions_list: {status, output}
  requirements:   {status, input, output}
  basic_design:   {status, input, output}
  # operation_design / migration_design commented out

# split: (commented out block)
#   basic-design:
#     shared: [system-architecture, database-design, external-interface,
#              non-functional-design, technology-rationale]
#     per_feature: [overview, business-flow, screen-design, report-design, functions-list]
#   detail-design:
#     shared: [system-architecture, database-design]
#     per_feature: [overview, module-design, class-design, api-detail, processing-flow]
#   test-spec:
#     shared: []
#     per_feature: [unit-test, integration-test, system-test, acceptance-test]
```

**Key finding:** The `split:` block already models `shared/` vs `per_feature/` but uses keyword names (`shared`, `per_feature`) not numbered dirs. The refactor target is numbered dirs like `01-shared/`, `02-feature-{name}/`.

---

## 4. Command File Patterns

**Location:** `.claude/commands/sekkei/`

**Files:** `basic-design.md`, `detail-design.md`, `diff-visual.md`, `export.md`, `functions-list.md`, `glossary.md`, `init.md`, `matrix.md`, `migration-design.md`, `operation-design.md`, `preview.md`, `requirements.md`, `status.md`, `test-spec.md`, `translate.md`, `update.md`, `validate.md`

**Pattern** (all commands follow this): Thin wrapper — just sets frontmatter and delegates to SKILL.md.
```markdown
---
description: "Initialize Sekkei project config (sekkei.config.yaml)"
argument-hint:
---
Load and follow the full Sekkei SKILL.md workflow for the `/sekkei:init` sub-command.
SKILL file: /Users/bienhoang/.../sekkei/skills/sekkei/SKILL.md
```

No path logic in command files — all logic in SKILL.md. Command files are static delegation; no changes needed there for output path refactor (changes only in SKILL.md and config).

---

## 5. All Hardcoded Paths Needing Updates

### In SKILL.md
| Location | Current | New (numbered) |
|---|---|---|
| `init` step 4 | `./sekkei-docs/` | `./sekkei-docs/` (root stays same) |
| `functions-list` step 6 | `./sekkei-docs/functions-list.md` | `./sekkei-docs/functions-list.md` (top-level, unchanged) |
| `requirements` step 6 | `./sekkei-docs/requirements.md` | `./sekkei-docs/requirements.md` |
| `basic-design` step 6 | `./sekkei-docs/basic-design.md` | `./sekkei-docs/basic-design/00-overview.md` OR per config |
| `detail-design` step 6 | `./sekkei-docs/detail-design.md` | `./sekkei-docs/detail-design/00-overview.md` |
| `test-spec` step 6 | `./sekkei-docs/test-spec.md` | `./sekkei-docs/test-spec/00-overview.md` |
| `export` step 3 | `./sekkei-docs/{doc-type}.{format}` | needs path resolution |
| `translate` step 6 | `./sekkei-docs/{doc-type}.{target_lang}.md` | needs path resolution |
| `glossary` step 1 | `sekkei-docs/glossary.yaml` | unchanged (top-level) |

### In `basic-design.md` template
- `features/{feature-id}/screen-design.md` → `02-feature-{id}/screen-design.md` (or numbered equivalent)

### In `sekkei.config.example.yaml`
- `split:` block keyword `shared` → `01-shared`, `per_feature` → `02-feature-{name}`
- `output.directory` stays `./sekkei-docs/`

---

## 6. New Templates Required

| Template | Purpose | Notes |
|---|---|---|
| `overview.md` | Top-level index per doc phase | Lists shared + feature sections, chain status |
| `feature-index.md` | Per-feature landing page | Links to sub-docs within that feature dir |
| `section-index.md` | Per-shared-section landing | For shared sections covering all features |

These need same frontmatter pattern + `<!-- AI: ... -->` instruction style.

---

## Unresolved Questions

1. **Numbering scheme:** Is `01-shared/`, `02-feature-{name}/` confirmed, or `00-shared/`, `01-feature-{name}/`? (0-based vs 1-based)
2. **functions-list and requirements:** Do they stay as flat files in `./sekkei-docs/` or also get split into numbered dirs?
3. **chain status tracking:** `sekkei.config.yaml` `chain.basic_design.output` currently holds a single path — how to represent multiple output files for split docs?
4. **SKILL.md path resolution:** Should SKILL.md read `split:` config to decide output paths dynamically, or should there be new sub-commands (e.g., `/sekkei:basic-design --split`)?
5. **Absolute SKILL.md path** in command files is user-local (`/Users/bienhoang/...`) — this is a pre-existing issue, not refactor scope.
