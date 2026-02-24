# Phase 1: Skill Flow Rewrites

## Context

- Parent: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260224-1012-validate-glossary-update-flows.md`
- Bugs: B1 (no output dir guidance), B2 (upstream not auto-loaded), B3 (validate vs validate_chain), B4 (seed ghost), B5 (finalize ghost), B7 (no config glossary path), B10 (no git show guidance)
- Improvements: IMP-V1, IMP-V2, IMP-V3, IMP-G1, IMP-G2, IMP-U1

## Overview

- **Priority:** High
- **Status:** complete
- **Description:** Rewrite 3 utility command flows in `utilities.md` to add config-aware input resolution, auto upstream loading, and concrete git instructions. Mirror changes to adapter `SKILL.md`.

## Key Insights

- Phase flows (basic-design, detail-design) already use prerequisite guard pattern: read config → resolve paths → auto-load upstream
- `validate_chain` tool already uses `config_path` + `loadChainDocs()` — validate skill flow should leverage this
- `CHAIN_PAIRS` in `cross-ref-linker.ts` defines upstream→downstream map; `UPSTREAM_ID_TYPES` in `validator.ts` defines expected ID types per doc
- Glossary `seed`/`finalize` never implemented — skill doc describes phantom features

## Related Code Files

**Modify:**
- `sekkei/packages/skills/content/references/utilities.md` — main skill flows
- `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md` — adapter mirror (L681-770)

**Reference (read-only):**
- `sekkei/packages/skills/content/references/phase-design.md` — pattern for prerequisite guards
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — CHAIN_PAIRS for upstream map
- `sekkei/packages/mcp-server/src/lib/validator.ts` — UPSTREAM_ID_TYPES L120-143

## Implementation Steps

### S1: Rewrite `/sekkei:validate` flow in utilities.md (B1, B2, B3, IMP-V1/V2/V3)

Replace L6-22 with 2-tier flow:

```markdown
## `/sekkei:validate @doc`

### If `@doc` specified (single document validation):

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory` (default: `sekkei-docs`)
2. **Resolve doc path**: `{output.directory}/{doc-type-dir}/{doc-type}.md`
   - Check for split mode: look for `_index.yaml` in `{output.directory}/{doc-type-dir}/`
3. **Determine upstream doc type** from V-model chain:
   - requirements → (no upstream, skip cross-ref)
   - functions-list → requirements
   - basic-design → requirements + functions-list
   - detail-design → basic-design
   - test-plan → requirements + basic-design
   - ut-spec → detail-design
   - it-spec → basic-design
   - st-spec → basic-design + functions-list
   - uat-spec → requirements
4. **Auto-load upstream**: Read upstream doc(s) from `{output.directory}/` → concatenate as `upstream_content`
5. **If split mode (manifest exists):**
   a. Call `validate_document` with `manifest_path` + `upstream_content`
   b. Display per-file validation + aggregate cross-ref report
6. **If monolithic:**
   a. Read doc content
   b. Call `validate_document` with `content`, `doc_type`, `upstream_content`
7. Display: section completeness, cross-ref coverage %, missing/orphaned IDs, missing columns
8. Suggest fixes for issues found

### If no `@doc` (full chain validation):

1. Load `sekkei.config.yaml` → get `config_path`
2. Call MCP tool `validate_chain` with `config_path`
3. Display chain-wide cross-reference report
4. Highlight broken links and orphaned IDs across all documents
```

### S2: Rewrite `/sekkei:glossary` flow in utilities.md (B4, B5, B7, IMP-G1/G2)

Replace L77-86 with:

```markdown
## `/sekkei:glossary [add|list|find|export|import]`

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory`
2. **Resolve glossary path**: `{output.directory}/glossary.yaml` (create if not exists)
3. For `add`: ask JP term, EN term, VI term, context → call `manage_glossary` with action "add", `project_path`
4. For `list`: call `manage_glossary` with action "list", `project_path` → display all terms
5. For `find`: ask search query → call with action "find", `project_path`
6. For `export`: call with action "export", `project_path` → display Markdown table (ja/en/vi/context)
7. For `import`: ask for industry → call with action "import", `project_path`, `industry` → display imported/skipped counts
```

Key changes:
- Remove `seed` (B4) — Claude can manually extract terms from docs and call `add` multiple times
- Remove `finalize` (B5) — not needed, Claude can set config status manually if required
- Add config-based path resolution (B7, IMP-G2)

### S3: Rewrite `/sekkei:update` flow in utilities.md (B10, IMP-U1)

Replace L88-95 with:

```markdown
## `/sekkei:update @doc`

### Standard mode (diff analysis):

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory`
2. **Determine doc pair**: `@doc` = downstream doc → identify upstream doc type from V-model chain
3. **Read current upstream**: `{output.directory}/{upstream-dir}/{upstream-type}.md`
4. **Read previous upstream from git**:
   ```bash
   git show HEAD~1:{output.directory}/{upstream-dir}/{upstream-type}.md
   ```
   - If user provides `--since <ref>`: use `git show {ref}:{path}` instead
   - If git show fails (file didn't exist): report "No previous version found"
5. **Read downstream doc**: `{output.directory}/{downstream-dir}/{doc-type}.md`
6. Call MCP tool `analyze_update` with `upstream_old`, `upstream_new`, `downstream_content`
7. Display: changed sections, changed IDs, impacted downstream sections
8. Ask user: regenerate affected sections? → if yes, call generate for impacted parts

### Staleness mode:

1. Call MCP tool `analyze_update` with `check_staleness: true`, `config_path`
2. Display per-feature staleness scores and affected doc types
```

### S4: Mirror changes to adapter SKILL.md

Update corresponding sections in `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md`:
- L681-698: validate flow → mirror S1
- L752-762: glossary flow → mirror S2
- L763-770: update flow → mirror S3

## Todo

- [x] S1: Rewrite validate flow in utilities.md
- [x] S2: Rewrite glossary flow in utilities.md
- [x] S3: Rewrite update flow in utilities.md
- [x] S4: Mirror all changes to adapter SKILL.md

## Success Criteria

- Validate flow has config-aware path resolution + auto upstream loading
- Validate flow branches: `@doc` → single, no arg → chain
- Glossary flow has no `seed`/`finalize` references, uses config-based path
- Update flow has concrete `git show` instructions
- Adapter SKILL.md matches utilities.md for all 3 flows

## Risk Assessment

- **Low risk:** All changes are to skill flow docs (markdown), not to TS/Python code
- Adapter SKILL.md must stay in sync — verify both files match after changes

## Next Steps

- Phase 2: Backend fixes (staleness per-feature, Python ID regex)
