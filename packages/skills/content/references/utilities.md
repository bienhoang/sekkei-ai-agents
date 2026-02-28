# Utility Commands

Command workflows for validation, export, translation, and maintenance utilities.

## `/sekkei:validate @doc`

### If `@doc` specified (single document validation):

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory` (default: `workspace-docs`)
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
8. **If `config_path` available**: Check upstream staleness via git timestamps
   - Compare last-modified date of upstream vs downstream docs
   - Display WARNING for docs where upstream changed after downstream was last generated
   - Staleness is advisory only — does not affect validation result
9. Suggest fixes for issues found
10. **Post-validation changelog sync** (if validation passes):
    a. Check if 改訂履歴 last entry date is older than file's last-modified date:
       ```bash
       git log -1 --format="%ai" -- {doc_path}
       ```
    b. If stale: ask user via `AskUserQuestion` — "Document {doc_type} was modified but 改訂履歴 is not updated. Update now?"
    c. If user confirms:
       - Read document, find 改訂履歴 table, parse last version number
       - Increment version (+0.1), insert new row: next version | today's date | 作成者 (blank) | "Manual update"
       - Save document
       - Pass updated content as `existing_content` to `generate_document` with `auto_insert_changelog: false` to preserve the manually inserted row
    d. If user declines: skip, continue to next doc

### If no `@doc` (full chain validation):

1. Load `sekkei.config.yaml` → get `config_path`
2. Call MCP tool `validate_chain` with `config_path`
3. Display chain-wide cross-reference report
4. Highlight broken links and orphaned IDs across all documents
5. Display staleness warnings: docs where upstream file is newer than downstream

## `/sekkei:status`

1. Locate `sekkei.config.yaml` in the project root
2. Call MCP tool `get_chain_status` with the config path
3. Display the document chain progress table
4. If `_index.yaml` exists, show per-feature split status
5. Suggest the next document to generate based on chain status

## `/sekkei:export @doc --format=xlsx|pdf|docx`

1. Read the document or identify doc type
2. Determine format from `--format` flag (default: xlsx)
3. **Check for manifest**: look for `_index.yaml` in output directory
4. **If manifest exists for this doc type (type=split):**
   a. Ask user: "Export merged document or per-feature?"
   b. If merged: Call `export_document` with `source: "manifest"`, `manifest_path`
   c. If per-feature: Ask which feature → call with `feature_id`
5. **If no manifest (monolithic):**
   a. Read file, call `export_document` with `source: "file"`, content
6. Report: file path, file size, export status
7. For xlsx: IPA 4-sheet structure (表紙, 更新履歴, 目次, 本文) with JP formatting
8. For pdf: Noto Sans JP font, A4 landscape, TOC, page numbers
9. For docx: Cover page, auto-generated TOC (update with Ctrl+A → F9 in Word), heading hierarchy, formatted tables, MS Mincho JP font

## `/sekkei:translate @doc --lang=en`

1. Read the document to translate
2. **Check for manifest**: look for `_index.yaml` in output directory
3. **If manifest exists and doc type is split:**
   a. Load `_index.yaml` via manifest-manager
   b. Get document entry for the specified doc type
   c. Load glossary once from `workspace-docs/glossary.yaml`
   d. Create target directory: `translations/{lang}/`
   e. For each shared file in manifest:
      - Read file content
      - Call `translate_document` MCP tool
      - Use returned context + glossary to translate
      - Save to `translations/{lang}/shared/{filename}`
   f. For each feature file in manifest:
      - Read file content
      - Call `translate_document` MCP tool
      - Translate with feature context
      - Save to `translations/{lang}/features/{feature-id}/{filename}`
   g. Create `translations/{lang}/_index.yaml` mirroring source structure
   h. Update source `_index.yaml` translations[] entry
4. **If no manifest (monolithic):**
   a. If `workspace-docs/glossary.yaml` exists, load glossary path
   b. Call MCP tool `translate_document` with content, source_lang, target_lang, glossary_path
   c. Use the returned translation context + glossary terms to translate
   d. Preserve all Markdown formatting, tables, and ID references
   e. Save output to `./workspace-docs/{doc-type}.{target_lang}.md`
5. Report: files translated, glossary terms applied, output paths

## `/sekkei:glossary [add|list|find|export|import]`

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory`
2. **Resolve glossary path**: `{output.directory}/glossary.yaml` (create if not exists)
3. For `add`: ask JP term, EN term, VI term, context → call `manage_glossary` with action "add", `project_path`
4. For `list`: call `manage_glossary` with action "list", `project_path` → display all terms
5. For `find`: ask search query → call with action "find", `project_path`
6. For `export`: call with action "export", `project_path` → display Markdown table (ja/en/vi/context)
7. For `import`: ask for industry → call with action "import", `project_path`, `industry` → display imported/skipped counts

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
7. Display: changed sections, changed IDs, impacted downstream sections, suggested 改訂履歴 row
8. **改訂履歴の更新手順:** `change-request-command.md` §Changelog (改訂履歴) Preservation を参照。upstream doc と downstream doc の両方に適用する。
9. Ask user: confirm & save? Or edit the row first?
10. If regenerating: pass updated document as `existing_content` to `generate_document` — also pass `auto_insert_changelog: true` and `change_description: "{summary}"` as safety net
11. **Global CHANGELOG sync** (after user confirms update):
    a. Before regeneration: read target doc's 改訂履歴, parse last version → increment (+0.1)
    b. Insert new 改訂履歴 row: next version | today's date | 作成者 (blank) | "Upstream sync: {upstream_doc_type} changed"
    c. Pass updated content as `existing_content` to `generate_document` with `auto_insert_changelog: true`, `change_description: "Upstream sync: {changed_ids}"`
    d. After regeneration: append entry to Global CHANGELOG (`workspace-docs/CHANGELOG.md`):
       ```
       ## {today's date} — {doc_type} updated
       - Upstream sync from {upstream_doc_type}: {changed_ids}
       - Version bumped to {new_version}
       ```
    e. Notify user: "Updated {doc_type} — run `/sekkei:validate` to verify chain consistency"

### Staleness mode:

1. Call MCP tool `analyze_update` with `check_staleness: true`, `config_path`
2. Display per-feature staleness scores and affected doc types

## `/sekkei:diff-visual @before_file @after_file`

1. Read the before document (previous version from git or chain backup)
2. Read the after document (current version)
3. Read the downstream document to check for impacts
4. Call MCP tool `analyze_update` with `revision_mode: true` → change report with markers
5. Use the `marked_document` from the response to call `export_document` with `format: "xlsx"`
   - Rows marked with `【新規】` → red font in Excel
   - Rows marked with `【変更】` → yellow highlight in Excel
   - Rows marked with `【削除】` → strikethrough + gray in Excel
6. Display: change summary, impacted sections, suggested 改訂履歴 row
7. Save revision Excel to `./workspace-docs/{doc-type}-revision.xlsx`

## `/sekkei:preview`

1. Run `sekkei-preview` from the project root.
2. Docs dir resolved automatically: `--docs` flag → `workspace-docs/` in CWD → `sekkei.config.yaml output.directory`.
3. Commands:
   - `sekkei-preview` — start Express server with WYSIWYG editor (Tiptap v3)
   - `sekkei-preview --guide` — open user guide (readonly mode)
   - `sekkei-preview --docs ./path --port 4983` — custom docs path + port
   - `sekkei-preview --no-open` — start without auto-opening browser
   - `sekkei-preview --help` — show usage
4. Preview URL: `http://localhost:4983` (default). Port auto-selects if busy.
5. **Workspace mode** (default):
   - Tree sidebar shows `.md` files from docs directory
   - Click file → WYSIWYG editor (Tiptap v3 + tiptap-markdown)
   - Supports: headings, lists, bold/italic/strike, code, blockquote, links, HR
   - Save → `PUT /api/files` → writes markdown to disk preserving YAML frontmatter
   - Keyboard: `Cmd+S` / `Ctrl+S` to save
   - Dirty indicator (amber dot) shows unsaved changes
   - Confirm dialog when switching files with unsaved changes
6. **Guide mode** (`--guide` flag):
   - Serves bundled user guide (readonly)
   - No toolbar, no editing, no save
   - `PUT /api/files` returns 403
7. Without `--guide`, preview serves V-model spec docs from `workspace-docs/`.

## `/sekkei:dashboard`

1. Run `sekkei-dashboard` from the project root.
2. Docs dir resolved automatically: `--docs` flag → `workspace-docs/` in CWD → `sekkei.config.yaml output.directory`.
3. Commands:
   - `sekkei-dashboard` — start Express server with analytics dashboard
   - `sekkei-dashboard --docs ./path --port 4984` — custom docs path + port
   - `sekkei-dashboard --no-open` — start without auto-opening browser
   - `sekkei-dashboard --help` — show usage
4. Dashboard URL: `http://localhost:4984` (default). Port auto-selects if busy.
5. **Pages:**
   - **Overview** (`/`) — stat cards, V-model pipeline, completion donut, recent changelog
   - **Chain Status** (`/chain`) — full chain table, hierarchy viz, detail panel
   - **Analytics** (`/analytics`) — cross-ref analysis, staleness warnings, quality scores
   - **Change History** (`/changes`) — CHANGELOG timeline, CR tracking with state machine viz
   - **Feature Progress** (`/features`) — feature × doc matrix, completion bars (split mode only)
6. Data sources: `sekkei.config.yaml` (chain status), `.sekkei/` (CRs, plans), `CHANGELOG.md`, filesystem scanning. MCP `validate_chain` for optional deeper analysis.
7. UI language: English-only. Data content stays in original language (Japanese doc names, changelog entries).
8. MCP integration: spawns `sekkei-mcp-server` as child process. Falls back to filesystem if MCP unavailable.
9. Can run alongside Preview (different ports: dashboard=4984, preview=4983).

## `/sekkei:plan @doc-type`

Plan large document generation with user survey and phased execution strategy.
See `references/plan-orchestrator.md` for detailed logic.

1. Determine doc-type from `@doc-type` argument or current chain status (next incomplete doc)
2. Call MCP tool `manage_plan(action="detect", workspace_path, config_path, doc_type)` — check if a plan is needed and whether an active plan already exists
3. If response returns `has_active_plan=true`: ask user via `AskUserQuestion` — "An active plan exists for {doc-type}. Resume it or create a new one?" [Resume / Create New]
   - If Resume: report existing plan path → "Run `/sekkei:implement @{plan_path}` to continue."
4. **Survey Round 1 — Scope**: Present features via `AskUserQuestion` (multiSelect). User selects features to include and sets priority order.
5. **Survey Round 2 — Detail**: For each selected feature, ask via `AskUserQuestion`: complexity (simple/medium/complex), special requirements, external dependencies, custom instructions.
6. Call MCP tool `manage_plan(action="create", workspace_path, config_path, doc_type, features=[...], survey_data={...})` — creates plan directory and all phase files
7. Display plan summary from create response (phases table, feature count, plan path)
8. Report: "Plan created. Run `/sekkei:implement @{plan_path}` to execute."

## `/sekkei:implement @plan-path`

Execute a generation plan phase by phase, delegating to existing sekkei sub-commands.
See `references/plan-orchestrator.md` for detailed logic.

1. Call MCP tool `manage_plan(action="status", workspace_path, plan_id)` — read plan state and phases list
2. Validate response: status must be `pending` or `in_progress` (abort if `completed` or `cancelled`)
3. **Per-phase execution loop** — for each phase where `status != "completed"` and `status != "skipped"`:
   a. Call MCP tool `manage_plan(action="execute", workspace_path, config_path, plan_id, phase_number)` — returns phase summary and generate_document args
   b. Display phase summary from response (name, scope, feature, estimated sections)
   c. Ask user: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   d. If **Proceed**: call `generate_document(...)` with args from execute response → then call `manage_plan(action="update", workspace_path, plan_id, phase_number, phase_status="completed")`
   e. If **Skip**: call `manage_plan(action="update", workspace_path, plan_id, phase_number, phase_status="skipped")`
   f. If **Stop**: exit loop (progress already persisted via prior update calls)
4. After all phases done: validation phase auto-runs via final execute response (runs `/sekkei:validate` on manifest)
5. Call MCP tool `manage_plan(action="status", workspace_path, plan_id)` → display final report (phases completed/skipped/remaining, files generated, validation results)

## `/sekkei:version`

1. Run CLI: `npx sekkei version` (or `node <path>/dist/cli/main.js version`)
2. Display the health check output to the user
3. If any items show ✗, suggest remediation steps
4. For JSON output: `npx sekkei version --json`

## `/sekkei:uninstall`

1. Confirm with user: "This will remove Sekkei skill, commands, and MCP entry from Claude Code. Proceed?"
2. If confirmed: run `npx sekkei uninstall --force`
3. Display removal summary
4. Note: "Package remains installed. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove."

## `/sekkei:rebuild`

1. Run CLI: `npx sekkei update`
2. Display build + copy progress
3. Show post-update health check
4. If health check passes: "Update complete. Restart Claude Code to activate."
5. Use `--skip-build` to skip the build step: `npx sekkei update --skip-build`
