# Phase 02 — Init Scaffold

## Context Links

- Parent plan: [plan.md](./plan.md)
- Spec: [refactor-1.md](../../refactor-1.md) §1 (Required Top-Level Structure)
- Research: [researcher-02-skill-and-templates.md](./research/researcher-02-skill-and-templates.md)
- Depends on: [Phase 01](./phase-01-config-and-types.md)
- Files to modify:
  - `sekkei/mcp-server/adapters/claude-code/SKILL.md` (init sub-command section only)
  - `sekkei/templates/shared/section-index.md` (NEW)

## Overview

- **Date:** 2026-02-21
- **Priority:** P1
- **Status:** ✅ complete
- **Effort:** 2h
- **Description:** Update the `/sekkei:init` workflow in SKILL.md to create the full 10-section numbered scaffold in a user-named output directory. Create the `section-index.md` placeholder template used for folder `index.md` files.
- **Completed:** 2026-02-21

## Key Insights

- Current `init` workflow (SKILL.md L31-37) creates `sekkei.config.yaml` + `./sekkei-docs/` directory — no scaffold inside. The refactor makes init create the full numbered tree immediately so users see the structure before generating any docs.
- Init must ask for the output directory name (default `docs/`). This replaces `sekkei-docs/` hardcoded in current config.
- Init must also ask for an initial features list (names + display labels) — these seed the `features:` array in `sekkei.config.yaml` and create `05-features/{name}/index.md` placeholders.
- The SKILL layer (Claude) creates files directly; no new MCP tool is needed. Init is a pure orchestration workflow.
- `section-index.md` template is a minimal Markdown file with a `<!-- AI: ... -->` instruction telling Claude how to populate it when the section is generated. No frontmatter `doc_type` needed (it's a navigation aid, not a specification document).
- Full scaffold consists of: 7 top-level items (4 `.md` files + 3 placeholder dirs) + 6 folder `index.md` files (03, 05, 06, 07, 08, 09) = 13 files total at init time.

## Requirements

### Functional
- `init` asks: project name, type, stack, team size, language, keigo, output directory name, feature list
- `init` writes `sekkei.config.yaml` using new numbered chain schema (from Phase 1)
- `init` creates all 10 top-level scaffold entries in `{output-dir}/`
- Placeholder `.md` files (01, 02, 04, 10) contain minimal YAML frontmatter + `<!-- pending -->` body
- Folder `index.md` files (03, 05, 06, 07, 08, 09) use `section-index.md` template
- Feature folders created under `05-features/` with `index.md` for each feature provided at init
- `sekkei.config.yaml` `features:` array populated from user input

### Non-functional
- Init produces human-readable confirmation listing all created files
- If output dir already exists, warn user and ask to confirm overwrite
- Scaffold creation is idempotent — skip files that already exist (don't overwrite generated content)

## Architecture

```
/sekkei:init workflow (in SKILL.md)
  │
  ├─ Interview user (name, type, stack, team, lang, keigo, output-dir, features)
  ├─ Write sekkei.config.yaml
  └─ Create scaffold:
       {output-dir}/
         01-overview.md           ← placeholder
         02-requirements.md       ← placeholder
         03-system/
           index.md               ← section-index.md template content
         04-functions-list.md     ← placeholder
         05-features/
           index.md               ← section-index.md template content
           {feature-name}/
             index.md             ← feature-index content (Phase 3)
         06-data/index.md
         07-operations/index.md
         08-test/index.md
         09-ui/index.md
         10-glossary.md           ← placeholder
```

Note: `feature-index.md` (per-feature index content) is defined in Phase 3 alongside the `overview` sub-command. At init time, a minimal placeholder is written; Phase 3 adds the full auto-generation.

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `sekkei/mcp-server/adapters/claude-code/SKILL.md` | Modify | Replace `/sekkei:init` section (L31-37) |
| `sekkei/templates/shared/section-index.md` | Create | Placeholder index template |
| `sekkei/sekkei.config.example.yaml` | Already done in Phase 1 | — |

## Implementation Steps

### Step 1 — Create `sekkei/templates/shared/section-index.md`

```markdown
# {Section Title}

<!-- AI: When generating content for this section, replace this placeholder with the
     section index. List all documents in this folder with brief descriptions.
     Use a Markdown table or bullet list. Keigo: Use ですます調. -->

> このセクションはまだ生成されていません。

| ファイル | 内容 |
|--------|------|
| (生成後に自動更新されます) | — |
```

No YAML frontmatter — this is a nav aid, not a spec doc. The `<!-- AI: -->` instruction tells Claude how to fill it when the real content is generated.

### Step 2 — Rewrite `/sekkei:init` section in SKILL.md

Replace the current init section (L31-37) with:

```markdown
### `/sekkei:init`

**Interview (ask all before writing anything):**
1. Project name?
2. Project type? (web / mobile / api / desktop / lp / internal-system / saas / batch)
3. Tech stack? (comma-separated, e.g. TypeScript, React, PostgreSQL)
4. Team size? (number)
5. Output language? (ja / en / vi — default: ja)
6. Keigo preference? (丁寧語 / 謙譲語 / simple — default: 丁寧語)
7. Output directory name? (default: docs/)
8. Initial feature list? (comma-separated display names, e.g. 販売管理, ユーザー管理)
   — For each: confirm or edit the auto-derived kebab-case folder name

**Steps:**

1. Auto-derive kebab names for each feature:
   - Strip non-ASCII, lowercase, replace spaces/underscores with `-`
   - Example: "販売管理" → ask user to provide ASCII name → "sales-management"
   - Assign short mnemonic ID (SAL, USR, etc.) — 2-5 uppercase letters, derived from display name initials or ask user

2. Write `sekkei.config.yaml` in project root using the numbered chain schema:
   - Set `output.directory` to the user's chosen directory (prefix `./` if relative)
   - Populate `features:` array with id, name, display for each feature
   - All chain entries set to `status: pending`

3. Create output directory if it does not exist

4. Create scaffold files (skip any that already exist):

   **Top-level single-file placeholders:**
   - `{output-dir}/01-overview.md` — content: `# Overview\n\n<!-- pending: run /sekkei:overview -->`
   - `{output-dir}/02-requirements.md` — content: `# 要件定義書\n\n<!-- pending: run /sekkei:requirements -->`
   - `{output-dir}/04-functions-list.md` — content: `# 機能一覧\n\n<!-- pending: run /sekkei:functions-list -->`
   - `{output-dir}/10-glossary.md` — content: `# 用語集\n\n<!-- pending: run /sekkei:glossary -->`

   **Folder index files:**
   - `{output-dir}/03-system/index.md` — use section-index.md template, title "システム設計"
   - `{output-dir}/05-features/index.md` — use section-index.md template, title "機能設計"
   - `{output-dir}/06-data/index.md` — use section-index.md template, title "データ設計"
   - `{output-dir}/07-operations/index.md` — use section-index.md template, title "運用設計"
   - `{output-dir}/08-test/index.md` — use section-index.md template, title "テスト計画"
   - `{output-dir}/09-ui/index.md` — use section-index.md template, title "UI/UXガイドライン"

   **Feature folder placeholders** (for each feature in the list):
   - Create `{output-dir}/05-features/{feature-name}/` directory
   - Write `{output-dir}/05-features/{feature-name}/index.md`:
     ```
     # {display name}
     <!-- pending: run /sekkei:basic-design to generate feature documentation -->
     | ドキュメント | ステータス |
     |------------|----------|
     | basic-design.md | ⏳ 未生成 |
     | detail-design.md | ⏳ 未生成 |
     | test-spec.md | ⏳ 未生成 |
     ```

5. Print confirmation:
   - Config written: `sekkei.config.yaml`
   - Output directory: `{output-dir}/`
   - Files created: list all 13+ files
   - Features registered: list name + display
   - Next step: "Run `/sekkei:functions-list @{rfp-file}` to begin"
```

### Step 3 — Verify kebab derivation logic is described clearly

The SKILL.md init section must note:
- Kebab names must match `^[a-z][a-z0-9-]{1,49}$`
- If user provides Japanese display names only, prompt for ASCII kebab equivalent
- No two features may share the same `name` (kebab key)
- Mnemonic IDs must be unique, 2-5 uppercase ASCII letters

## Todo

- [ ] Create `sekkei/templates/shared/section-index.md`
- [ ] Rewrite `/sekkei:init` section in `SKILL.md` (lines 31-37 + surrounding context)
- [ ] Verify SKILL.md line count stays manageable (split if > 300 lines after edit)
- [ ] Confirm `05-features/{name}/index.md` placeholder table format matches Phase 3 auto-gen format

## Success Criteria

- Running `/sekkei:init` creates exactly the 13 expected scaffold files
- `sekkei.config.yaml` has `features:` array + numbered chain entries
- Existing files are not overwritten during re-init
- `section-index.md` template exists and contains `<!-- AI: ... -->` instruction
- Feature folders use kebab-case names matching the `features[].name` values in config

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Japanese display names → kebab derivation is ambiguous | Medium | Always prompt user to confirm/edit the derived kebab name |
| Feature index.md format diverges from Phase 3 auto-gen | Low | Define format here; Phase 3 uses same format when regenerating |
| Init run on existing project overwrites in-progress docs | High | Skip existing files; warn user explicitly |

## Security Considerations

- Output directory name validated by SKILL layer: must not contain `..` or absolute path components
- Feature kebab name validated by regex before writing to filesystem
- No MCP tool involved — SKILL layer (Claude) does filesystem writes directly

## Next Steps

- Phase 3 (Generate Path Routing) adds the `overview` sub-command and auto-generates feature `index.md` after each feature generation
- Phase 6 updates remaining SKILL.md sub-commands to use new paths
