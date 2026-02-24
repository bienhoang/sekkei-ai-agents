# Phase 06 — SKILL.md + install.sh Updates

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: All previous phases (phase-01 through phase-05)
- Docs: [SKILL.md](/sekkei/skills/sekkei/SKILL.md), [install.sh](/sekkei/install.sh)

## Overview

- **Date**: 2026-02-21
- **Priority**: P2 (documentation + integration)
- **Status**: pending
- **Effort**: 2.5h
- **Description**: Update SKILL.md `/sekkei:preview` section to document `--edit` flag and editing workflow. Update `install.sh` to build the sekkei-preview package and link the CLI. Create sub-command stub for `preview` with `--edit` hint.

## Key Insights

- SKILL.md line 436-446 has existing `/sekkei:preview` section — needs update for `--edit`
- install.sh line 136 creates `preview` sub-command stub — needs `--edit` argument hint
- install.sh currently does NOT build packages/ — needs new build step
- The sekkei-preview package is consumed via `node <installed-path>/dist/cli.js` (direct path, no npx)
- No npm link needed — install.sh stores path in SKILL.md sub-command stub
<!-- Updated: Validation Session 1 - Direct node path replaces npm link -->

## Requirements

### Functional
- FR-01: SKILL.md documents `--edit` flag with full workflow
- FR-02: install.sh builds sekkei-preview package (npm install + npm run build)
- FR-03: SKILL.md uses direct `node <path>/dist/cli.js` instead of `npx sekkei-preview` (no npm link)
<!-- Updated: Validation Session 1 - Direct node path replaces npm link -->
- FR-04: Sub-command stub updated with `--edit` argument hint
- FR-05: README section template for user projects

### Non-Functional
- NFR-01: install.sh backward compatible (preview build failure = warning, not error)
- NFR-02: SKILL.md update follows existing format and style

## Architecture

### install.sh Changes

```
Existing flow:
  1. Prerequisites
  2. Build MCP Server
  3. Install Skill + Slash Command
  4. Register MCP Server
  5. Python Setup (optional)
  6. Verify

New step between 2 and 3:
  2b. Build sekkei-preview package
      cd sekkei/packages/sekkei-preview
      npm install
      npm run build
      Store PREVIEW_CLI="$PREVIEW_DIR/dist/cli.js" (for sub-command stub)
```

### SKILL.md Changes

```
Existing /sekkei:preview section (lines 436-446):
  - npx sekkei-preview
  - --docs, --port flags
  - build, serve commands

Updated section adds:
  - --edit flag description
  - Edit workflow (click Edit → WYSIWYG → Save)
  - Keyboard shortcuts
  - Frontmatter preservation note
```

## Related Code Files

### Create
- None

### Modify
- `sekkei/skills/sekkei/SKILL.md` — update `/sekkei:preview` section
- `sekkei/install.sh` — add package build step, update sub-command stub
- `sekkei/packages/sekkei-preview/package.json` — ensure `npm link` works

### Delete
- None

## Implementation Steps

1. Update SKILL.md `/sekkei:preview` section (replace lines 436-446):
   ```markdown
   ### `/sekkei:preview`

   1. Run `npx sekkei-preview` from the project root.
   2. Docs dir resolved automatically: `--docs` flag → `sekkei-docs/` in CWD
      → `sekkei.config.yaml output.directory`.
   3. If `sekkei-docs/index.md` missing, CLI auto-generates a homepage from
      `_index.yaml`.
   4. Commands:
      - `npx sekkei-preview` — dev server (default, hot-reload)
      - `npx sekkei-preview --edit` — dev server with WYSIWYG editing enabled
      - `npx sekkei-preview build` — build static site
      - `npx sekkei-preview serve` — serve built site
      - `npx sekkei-preview --docs ./path --port 3000` — custom path + port
   5. Preview URL: `http://localhost:5173` (dev default). Sidebar regenerates
      from directory structure on restart.
   6. **Edit mode** (`--edit` flag):
      - Each page shows a floating "Edit" button (bottom-right)
      - Click Edit → page content replaced by WYSIWYG editor (Milkdown)
      - Supports: headings, tables, lists, code blocks, bold/italic
      - Save → writes markdown to disk → page hot-reloads
      - Cancel → discard changes, return to read-only view
      - Keyboard: `Ctrl+S` / `Cmd+S` to save
      - YAML frontmatter preserved automatically (not shown in editor)
      - Japanese IME input supported
   7. Without `--edit` flag, preview is read-only (no edit button shown).
   ```

2. Update install.sh — add build step after MCP server build:
   ```bash
   # ── 2b. Build sekkei-preview Package ──────────────────────────────────
   PREVIEW_DIR="$SCRIPT_DIR/packages/sekkei-preview"
   if [[ -d "$PREVIEW_DIR" && -f "$PREVIEW_DIR/package.json" ]]; then
     step "Building sekkei-preview package"
     cd "$PREVIEW_DIR"
     npm install --no-fund --no-audit 2>&1 | tail -1
     ok "Preview dependencies installed"
     npm run build 2>&1 | tail -1
     ok "Preview TypeScript compiled"
     PREVIEW_CLI="$PREVIEW_DIR/dist/cli.js"
     ok "sekkei-preview built: $PREVIEW_CLI"
   else
     warn "sekkei-preview package not found — skipping (preview unavailable)"
   fi
   ```

3. Update sub-command stub in install.sh (line 136):
   - Change: `create_subcmd "preview" "Start VitePress docs preview" ""`
   - To: `create_subcmd "preview" "Start VitePress docs preview (--edit for WYSIWYG)" "[--edit] [--docs path] [--port N]"`

4. Update install.sh verification section:
   - Add check for sekkei-preview:
     ```bash
     if [[ -f "$PREVIEW_CLI" ]]; then
       ok "sekkei-preview CLI: $PREVIEW_CLI"
     else
       warn "sekkei-preview CLI not found"
     fi
     ```

5. Verify install.sh runs cleanly end-to-end:
   - Run `./install.sh` from sekkei/
   - Confirm MCP server builds
   - Confirm sekkei-preview builds
   - Confirm `npx sekkei-preview --help` works (or exits with usage)

6. Test SKILL.md is syntactically valid:
   - Verify YAML frontmatter intact
   - Verify markdown links/formatting
   - Verify sub-command list count still correct

## Todo List

- [ ] Update SKILL.md /sekkei:preview section with --edit documentation
- [ ] Add sekkei-preview build step to install.sh
- [ ] Update preview sub-command stub with --edit hint
- [ ] Add sekkei-preview verification to install.sh
- [ ] Test install.sh runs end-to-end
- [ ] Verify npx sekkei-preview is available after install
- [ ] Verify SKILL.md formatting

## Success Criteria

- `./install.sh` builds both MCP server and sekkei-preview package
- `npx sekkei-preview` is available after install
- SKILL.md `/sekkei:preview` section documents `--edit` flag clearly
- Sub-command stub shows `--edit` in argument hint
- Install.sh is backward compatible (preview missing = warning, not failure)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Direct path breaks if moved | Low | Store path in sub-command stub, re-run install.sh to update |
| install.sh breaks existing flow | Medium | Guard with directory existence check |
| SKILL.md sub-command count off | Low | Verify count in description matches stubs |

## Security Considerations

- install.sh runs with user permissions only
- npm link creates symlink in user's global node_modules
- No new credentials or secrets introduced

## Next Steps

- After all phases: Integration testing with real sekkei docs
- Future: `sekkei-preview` publish to npm registry
- Future: Auto-save with debounce (opt-in)
- Future: Diff view before saving
