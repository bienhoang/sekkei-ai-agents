# Scout Report: Sekkei Preview Package & User Guide Structure

**Date:** 2026-02-24 | **Scope:** Preview package architecture, docs structure, skill integration

---

## 1. Preview Package Structure (`packages/preview/`)

### Package Info
- **Name:** `sekkei-preview`
- **Version:** 0.3.0
- **Type:** ESM (ECMAScript modules)
- **Bin Entry:** `sekkei-preview` → `dist/cli.js`
- **Node:** ≥ 20.0.0

### File Structure
```
packages/preview/
├── src/                           # TypeScript sources
│   ├── cli.ts                     # Main CLI entry (dev/build/serve commands)
│   ├── generate-config.ts         # VitePress config generation + sidebar builder
│   ├── generate-index.ts          # Homepage index.md generator (from _index.yaml or minimal)
│   ├── resolve-docs-dir.ts        # Docs dir resolution (CLI flag → sekkei-docs/ → config)
│
├── theme/                         # Custom VitePress theme (Vue 3 + Milkdown)
│   ├── index.ts                   # Theme entry — extends DefaultTheme
│   ├── components/
│   │   ├── Layout.vue             # Main layout wrapper (extends DefaultTheme.Layout)
│   │   ├── EditButton.vue         # Floating edit button (bottom-right)
│   │   ├── EditorToolbar.vue      # Save/Cancel toolbar when editing
│   │   ├── MilkdownEditor.vue     # Milkdown WYSIWYG editor wrapper
│   │   └── MilkdownWrapper.vue    # WYSIWYG wrapper component
│   ├── composables/
│   │   ├── use-edit-mode.ts       # State machine: view → loading → editing → saving → view
│   │   └── use-file-api.ts        # REST API client (/__api/read, /__api/save, /__api/list)
│   └── styles/
│       ├── custom.css             # Theme overrides + Japanese typography
│       └── editor.css             # Milkdown editor styling
│
├── plugins/
│   ├── file-api-plugin.ts         # Vite plugin — file read/write endpoints (only if SEKKEI_EDIT=1)
│   ├── safe-path.ts               # Path traversal protection for /__api/ endpoints
│   └── frontmatter-utils.ts       # YAML frontmatter split/join utilities
│
├── dist/                          # Compiled output (TypeScript → JavaScript)
│   ├── cli.js                     # Executable CLI
│   ├── generate-config.js
│   ├── generate-index.js
│   └── resolve-docs-dir.js
│
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies
- **vitepress** 1.6.4 — SSG + dev server
- **vue** 3.5.0 — Framework
- **yaml** 2.7.0 — YAML parsing
- **@milkdown/kit** 7.18.0 — Markdown editor
- **@milkdown/vue** 7.18.0 — Vue integration
- **@milkdown/theme-nord** 7.18.0 — Nord theme for editor

---

## 2. How Preview Command Is Invoked

### Entry Point: `/sekkei:preview` Skill Command

**Location:** `packages/skills/content/SKILL.md` (line 47)

```markdown
- `/sekkei:preview` — Start VitePress docs preview server
```

**Routing:** `packages/skills/content/references/utilities.md` (lines 171–193)

### CLI Invocation Steps

1. **User runs:** `/sekkei:preview` (or `/sekkei:preview --edit` for WYSIWYG mode)
2. **MCP skill executes:** `npx sekkei-preview` from project root
3. **CLI.ts flow:**
   - Parse args: `--docs <path>`, `--port <N>`, `--edit`, `--help`
   - Resolve docs directory (priority: CLI flag → `sekkei-docs/` → `sekkei.config.yaml` output.directory)
   - Generate `index.md` if missing (via `generateIndexIfMissing()`)
   - Generate VitePress config at `{docsDir}/.vitepress/config.mts` (via `generateVitePressConfig()`)
   - Create symlink: `{docsDir}/node_modules` → `{packageDir}/node_modules`
   - Spawn VitePress child process with `cwd={docsDir}`
   - Default dev server: port 5173, with hot-reload
   - Cleanup on exit: remove `.vitepress/config.mts`, `.vitepress/theme/`, node_modules symlink

### CLI Commands
```bash
sekkei-preview              # dev server (default, hot-reload)
sekkei-preview --edit       # dev + WYSIWYG editing enabled
sekkei-preview build        # build static site
sekkei-preview serve        # serve built site
sekkei-preview --docs <path> --port 3000  # custom path + port
```

**Default URL:** `http://localhost:5173`

---

## 3. VitePress Config Generation (`generate-config.ts`)

### Key Functions

#### `buildSidebar(docsDir, basePath)`
- Recursively scans directory structure
- Filters: hides `.`, `_`, `node_modules`, `index.md`
- Sorts entries numerically (e.g., `01-overview` before `02-features`)
- Directories → collapsible groups
- `.md` files → sidebar links
- Title extraction: YAML frontmatter `title:` or first `# H1`

#### `generateVitePressConfig(docsDir, packageDir, options)`
Generates `{docsDir}/.vitepress/config.mts` with:
- **Title:** From `options.title` or "Sekkei Docs"
- **Sidebar:** Built from `buildSidebar()`
- **Search:** Local search provider
- **Edit mode:** Conditionally loads `sekkeiFileApiPlugin`
- **Vite config:**
  - Alias `vitepress/theme` to node_modules
  - fs.allow: package dir + docs dir (security)
  - optimizeDeps.entries: []
  - Plugins: `sekkeiFileApiPlugin()` if `options.edit=true`

#### File Writing
- Writes config to: `{docsDir}/.vitepress/config.mts`
- Creates theme re-export: `{docsDir}/.vitepress/theme/index.ts`
- Creates `.vitepress/` directory if missing

### Environment Variable
- **SEKKEI_EDIT=1** — Enables file API plugin for editing mode

---

## 4. File API Plugin (`file-api-plugin.ts`)

### Purpose
REST endpoints for WYSIWYG editing when `SEKKEI_EDIT=1`.

### Endpoints
- **GET /__api/read?path=file.md** — Read file + frontmatter
- **POST /__api/save** — Save markdown content, preserve frontmatter
- **GET /__api/list** — List all .md files with titles

### Security
- **Path traversal protection** (`safe-path.ts`): validates against `docsRoot`
- **Body size limit:** 10 MB
- **MIME check:** POST requires `application/json`

### Frontmatter Handling
- Reads file, splits YAML frontmatter
- Saves content → preserves frontmatter from existing file
- If no existing frontmatter: can save plain markdown
- Returns: `{content, frontmatter, path}`

### HMR Trigger
- After save, triggers Vite's file watcher → hot-reload

---

## 5. Current Docs/User-Guide Structure

### Location
`docs/user-guide/` — Vietnamese-language user guide for Sekkei

### File Tree
```
docs/user-guide/
├── index.md                                 # Main hub (Vietnamese)
├── introduction.md                          # What is Sekkei, why Japanese output
├── quick-start.md                           # 15-min walkthrough: init → create doc → preview → export
├── v-model-and-documents.md                 # 13 core + 9 supplementary doc types
│
├── reference/
│   ├── commands.md                          # 30 commands quick reference (table format)
│   ├── configuration.md                     # sekkei.config.yaml keys
│   └── glossary.md                          # 3-language term table (JP/EN/VI)
│
├── roles/                                   # Role-specific guides
│   ├── ba.md                                # Business Analyst
│   ├── dev-lead.md                          # Development Lead
│   ├── pm.md                                # Project Manager
│   ├── qa.md                                # QA Engineer
│   └── sales.md                             # Sales/Pre-sales
│
├── workflow/                                # Phase-based workflows
│   ├── index.md                             # Full project flowchart
│   ├── requirements.md                      # Phase 1: requirements, functions-list, nfr, project-plan
│   ├── design.md                            # Phase 2: basic-design, security-design, detail-design
│   ├── testing.md                           # Phase 3: test-plan, ut/it/st/uat-spec
│   ├── supplementary.md                     # 9 supplementary docs
│   └── change-request.md                    # Change request lifecycle
│
├── team-playbook/                           # Team coordination
│   ├── index.md                             # Team structure, RACI matrix
│   ├── scenarios.md                         # 3 end-to-end scenarios
│   ├── checklists.md                        # Copy-paste ready phase checklists
│   └── review-and-approval.md               # Quality gates
│
└── images/
    └── introduction/
        └── v-model.png                      # V-model diagram
```

### Content Language
- **Vietnamese** — User guide written in Vietnamese (tiếng Việt)
- **Japanese** — Technical terminology and output examples in Japanese
- **English** — Some cross-references

### Key Sections in Quick-Start
1. Prerequisites (Claude Code, Node.js 18+)
2. Init project with `npx sekkei init`
3. Health check: `/sekkei:version`
4. Create first document (RFP or direct requirements)
5. **Preview** section (lines 148–172):
   - Run `/sekkei:preview` → localhost:5173
   - Sidebar navigation auto-generated
   - Mermaid diagrams render
   - Full-text search
   - Edit mode: `/sekkei:preview --edit` with Milkdown WYSIWYG
   - Save: Ctrl+S / Cmd+S
   - Changes write directly to disk
6. Export to Excel/PDF/Word
7. Validate before sending to client

---

## 6. Sekkei Skill Definition

### Location
`packages/skills/content/SKILL.md` (1-164 lines)

### Preview Entry (line 47)
```markdown
- `/sekkei:preview` — Start VitePress docs preview server
```

### Utilities Reference (lines 150–193 in `utilities.md`)

**Command:** `/sekkei:preview`

**Workflow:**
1. Run `npx sekkei-preview` from project root
2. Docs dir auto-resolved: `--docs` flag → `sekkei-docs/` → `sekkei.config.yaml`
3. If `sekkei-docs/index.md` missing → auto-generate from `_index.yaml`
4. Three commands:
   - `npx sekkei-preview` — dev server (default, hot-reload)
   - `npx sekkei-preview --edit` — dev with WYSIWYG editing
   - `npx sekkei-preview build` / `serve` — static site
5. URL: `http://localhost:5173` (dev default)
6. Sidebar regenerates on restart
7. **Edit mode features:**
   - Floating "Edit" button (bottom-right)
   - Click → page replaced by Milkdown editor
   - Supports: headings, tables, lists, code blocks, bold/italic
   - Save → writes to disk → hot-reload
   - Cancel → discard changes
   - Keyboard: Ctrl+S / Cmd+S
   - YAML frontmatter auto-preserved (hidden)
   - Japanese IME supported
8. Without `--edit` → read-only preview

---

## 7. Index.md & _index.yaml Generation

### `generateIndexIfMissing(docsDir)` Flow

**Input:** docs directory path

**Output:** `{docsDir}/index.md` (homepage)

**Logic:**
1. If `index.md` exists → skip
2. If `_index.yaml` exists → use `generateFromIndexYaml()`
3. Else → use `generateMinimalIndex()`

### From `_index.yaml`
```yaml
title: "Project Name"
description: "Project description"
sections:
  - title: "Doc Title"
    path: "doc.md"
    description: "Doc description"
```
Generates:
- YAML frontmatter: `layout: home`
- Markdown with title, description, links to sections

### Minimal Index
Reads `sekkei.config.yaml` → extracts `project.name`
Generates simple homepage with Sekkei attribution link

### Homepage Layout
YAML frontmatter: `layout: home` (VitePress home layout)

---

## 8. Docs Directory Resolution (`resolve-docs-dir.ts`)

### Priority Order
1. **CLI flag:** `--docs <path>` argument
2. **Convention:** `./sekkei-docs/` in CWD (if exists)
3. **Config:** `sekkei.config.yaml` → `output.directory` (if exists)
4. **Error:** If none found, throw error with help text

### Config Parsing
Reads YAML safely — silently falls back to next priority on parse error

### Error Message
```
No docs directory found. Use --docs <path>, create ./sekkei-docs/, or set output.directory in sekkei.config.yaml
```

---

## 9. Skill-to-Command Integration

### Workflow Router in `SKILL.md`

When user invokes `/sekkei:preview`:

1. Load `SKILL.md` main entry
2. Route → "Other Commands" section → line 47
3. Route → `references/utilities.md` (Utilities section)
4. Line 171: `/sekkei:preview` definition
5. Execute workflow: resolve docs → generate config → spawn VitePress

### Sub-Routing for Other Commands
- **RFP:** `references/rfp-command.md`, `rfp-manager.md`, `rfp-loop.md`
- **Requirements:** `references/phase-requirements.md`
- **Design:** `references/phase-design.md`
- **Testing:** `references/phase-test.md`
- **Utilities:** `references/utilities.md` (validate, status, export, translate, glossary, update, diff-visual, **preview**, plan, implement, version, uninstall, rebuild)

---

## Key Findings

### VitePress Integration
- **Dynamic config generation** — no pre-committed config, generated at runtime based on docs dir structure
- **Sidebar auto-builder** — scans directory, extracts titles from frontmatter/H1
- **Symlinked node_modules** — docs dir uses package's node_modules via symlink (removed on dev exit)

### WYSIWYG Editor
- **Milkdown-based** (Nord theme) — Vue 3 component, embedded in VitePress theme
- **File API plugin** — Vite dev server middleware for REST read/write/list
- **Edit mode toggle** — via env var `SEKKEI_EDIT=1` and CLI `--edit` flag
- **Hot-reload trigger** — file save → HMR update → page live reload

### Documentation Structure
- **Vietnamese-first** — all guides in Vietnamese
- **Role-based organization** — BA, PM, Dev Lead, QA, Sales have dedicated guides
- **Workflow-based organization** — Requirements → Design → Testing → Supplementary → Change Request phases
- **Team playbook** — RACI, checklists, 3 end-to-end scenarios

### Skill Definition
- **30 commands documented** — quick reference table in `commands.md`
- **Routing model** — `/sekkei:subcommand` → load SKILL.md → route to `references/` file
- **Nested workflows** — each phase has detailed workflow file
- **Preview command** — minimal docs (just workflow steps), relies on utilities.md for full details

---

## Unresolved Questions

1. **VitePress Theme Customization:** How much CSS customization exists for Japanese typography? (checked custom.css and editor.css but didn't review full content)
2. **Split Mode Support:** How does preview handle split-mode docs (features/ subdirs with manifest)? (generate-config.ts buildSidebar handles nested dirs but no explicit split logic visible)
3. **Edit Mode Conflict:** Does simultaneous file editing (e.g., from CLI + browser) cause conflicts? (file-api-plugin has no locking mechanism visible)
4. **Performance:** Symlinked node_modules on macOS/Windows — any performance implications? (code uses 'junction' symlink type for Windows)

---

## Summary

The sekkei preview package is a **tightly integrated VitePress-based documentation viewer + WYSIWYG editor** for Japanese specification documents. It:

1. **Auto-generates** VitePress config from docs directory structure
2. **Provides WYSIWYG editing** via Milkdown when `--edit` flag is set
3. **Exposes REST API** (`/__api/`) for file operations (read/save/list)
4. **Protects against path traversal** and validates all file operations
5. **Integrates into Claude Code** as `/sekkei:preview` skill command
6. **Uses Vietnamese** user guide with role-based and workflow-based organization
7. **Documents 30 total Sekkei commands** in quick-reference table format

User guide is comprehensive but focused on Vietnamese audience; no equivalent English guide exists currently.
