# Brainstorm: Preview --guide Flag & User-Guide Restructure

## Problem

`sekkei-preview` currently only serves V-model spec docs. Need `--guide` flag to serve `docs/user-guide/` (Vietnamese user documentation) via same VitePress preview system. Also restructure user-guide directory for proper sidebar ordering.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Flag design | New `--guide` boolean flag; keep `--docs <path>` unchanged |
| Path resolution | Dual: dev → monorepo path, published → bundled in package |
| Sidebar ordering | Numbered prefixes on ALL files and directories |
| File naming | Number everything (01-introduction.md, 04-workflow/, etc.) |

## Solution Overview

### 1. CLI Changes (`packages/preview/src/cli.ts`)

Add `--guide` boolean flag:
- `sekkei-preview` → spec docs (unchanged)
- `sekkei-preview --guide` → user-guide
- `sekkei-preview --guide --edit` → user-guide with WYSIWYG
- `sekkei-preview --guide --port 3001` → custom port

When `--guide`:
- Title = "Sekkei User Guide" (vs "Sekkei Docs")
- Description = "Hướng dẫn sử dụng Sekkei"
- Resolve guide dir instead of docs dir

### 2. Guide Directory Resolution

New function `resolveGuideDir()`:
```
Priority 1: <packageDir>/guide/       (bundled in published package)
Priority 2: <monorepoRoot>/docs/user-guide/  (dev mode)
```

Detection: from `packageDir`, walk up to find `docs/user-guide/` or check bundled `guide/` directory.

### 3. Restructure `docs/user-guide/`

**Before → After:**

```
docs/user-guide/
  index.md                          → index.md (unchanged)
  introduction.md                   → 01-introduction.md
  v-model-and-documents.md          → 02-v-model-and-documents.md
  quick-start.md                    → 03-quick-start.md
  workflow/                         → 04-workflow/
    index.md                          index.md
    requirements.md                   01-requirements.md
    design.md                         02-design.md
    testing.md                        03-testing.md
    supplementary.md                  04-supplementary.md
    change-request.md                 05-change-request.md
  roles/                            → 05-roles/
    pm.md                             01-pm.md
    ba.md                             02-ba.md
    dev-lead.md                       03-dev-lead.md
    qa.md                             04-qa.md
    sales.md                          05-sales.md
  team-playbook/                    → 06-team-playbook/
    index.md                          index.md
    scenarios.md                      01-scenarios.md
    checklists.md                     02-checklists.md
    review-and-approval.md            03-review-and-approval.md
  reference/                        → 07-reference/
    commands.md                       01-commands.md
    configuration.md                  02-configuration.md
    glossary.md                       03-glossary.md
```

**All internal links** updated to match (e.g., `./introduction.md` → `./01-introduction.md`).

### 4. Bundle Strategy

- **Build script**: Copy `docs/user-guide/` → `packages/preview/guide/` during `npm run build`
- **package.json**: Add `"guide/"` to `files` array
- **.gitignore**: Add `packages/preview/guide/` (generated, not committed)

### 5. Skill & SKILL.md Updates

Update `/sekkei:preview` documentation:
```
- `sekkei-preview --guide` — open user guide
- `sekkei-preview --guide --edit` — open user guide with editing
```

## Implementation Phases

| # | Phase | Files | Effort |
|---|-------|-------|--------|
| 1 | Rename user-guide files + update links | 22 .md files | Medium |
| 2 | Add `--guide` flag + resolution logic | cli.ts, resolve-docs-dir.ts | Small |
| 3 | Config generation for guide mode | generate-config.ts | Small |
| 4 | Bundle build step | package.json, build script | Small |
| 5 | Update SKILL.md + skill references | 2-3 files | Small |

## Risks

- **Internal link breakage**: All cross-references in 22 files must be updated. Miss one → broken links in preview.
- **VitePress index.md**: Directories with `index.md` (workflow, team-playbook) — VitePress treats these as the directory's landing page. Should continue to work.
- **URL changes**: Old bookmarks to `/introduction` become `/01-introduction`. Acceptable for internal docs.

## Alternatives Considered

1. **Custom sidebar config** instead of numbered prefixes — rejected: adds maintenance burden, auto-generation is simpler
2. **Frontmatter `order` field** — rejected: requires modifying sidebar builder, numbered prefixes are standard VitePress convention
3. **Move user-guide into packages/preview/** — rejected: docs/ is the natural location for project documentation
