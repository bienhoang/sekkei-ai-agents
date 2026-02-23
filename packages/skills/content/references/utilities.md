# Utility Commands

Command workflows for validation, export, translation, and maintenance utilities.
Parent: `SKILL.md` → Workflow Router → Utilities.

## `/sekkei:validate @doc`

1. Read the document to validate
2. Determine the doc_type from the document header or user input
3. **Check for manifest**: look for `_index.yaml` in output directory
4. **If manifest exists for this doc type (type=split):**
   a. Call `validate_document` with `manifest_path` (no content needed)
   b. Display per-file validation results + aggregate cross-ref report
5. **If no manifest:**
   a. If an upstream document is available, read it too
   b. Call MCP tool `validate_document` with content, doc_type, and optional upstream_content
6. Display the validation results:
   - Section completeness (per-file for split, overall for monolithic)
   - Cross-reference coverage percentage
   - Missing/orphaned IDs
   - Missing table columns
7. Suggest fixes for any issues found

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
   c. Load glossary once from `sekkei-docs/glossary.yaml`
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
   a. If `sekkei-docs/glossary.yaml` exists, load glossary path
   b. Call MCP tool `translate_document` with content, source_lang, target_lang, glossary_path
   c. Use the returned translation context + glossary terms to translate
   d. Preserve all Markdown formatting, tables, and ID references
   e. Save output to `./sekkei-docs/{doc-type}.{target_lang}.md`
5. Report: files translated, glossary terms applied, output paths

## `/sekkei:glossary [seed|add|list|find|export|finalize]`

1. Locate `sekkei-docs/glossary.yaml` (create if not exists)
2. For `seed`: extract candidate terms from upstream docs (requirements, basic-design) → call `manage_glossary` with action "seed" → show extracted terms for review
3. For `add`: ask for JP term, EN term, VI term, context → call `manage_glossary` with action "add"
4. For `list`: call `manage_glossary` with action "list" → display all terms
5. For `find`: ask for search query → call with action "find"
6. For `export`: call with action "export" → display as Markdown table (4 columns: ja/en/vi/context)
7. For `finalize`: lock glossary for translation/export use → call `manage_glossary` with action "finalize" → set `glossary.status: finalized` in config
8. For `import`: ask for industry (finance / medical / manufacturing / real-estate / logistics / retail / insurance / education / government / construction / telecom / automotive / energy / food-service / common) → call with action "import", industry → display imported/skipped counts

## `/sekkei:update @doc`

1. Read the current version of the upstream document
2. Read the previous version (from git or stored copy)
3. Read the downstream document to check
4. Call MCP tool `analyze_update` with upstream_old, upstream_new, downstream_content
5. Display: changed sections, changed IDs, impacted downstream sections
6. Ask user: regenerate affected sections? → if yes, call generate for impacted parts

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
7. Save revision Excel to `./sekkei-docs/{doc-type}-revision.xlsx`

## `/sekkei:preview`

1. Run `npx sekkei-preview` from the project root (or `node <sekkei-path>/packages/sekkei-preview/dist/cli.js`).
2. Docs dir resolved automatically: `--docs` flag → `sekkei-docs/` in CWD → `sekkei.config.yaml output.directory`.
3. If `sekkei-docs/index.md` missing, CLI auto-generates a homepage from `_index.yaml`.
4. Commands:
   - `npx sekkei-preview` — dev server (default, hot-reload)
   - `npx sekkei-preview --edit` — dev server with WYSIWYG editing enabled
   - `npx sekkei-preview build` — build static site
   - `npx sekkei-preview serve` — serve built site
   - `npx sekkei-preview --docs ./path --port 3000` — custom path + port
5. Preview URL: `http://localhost:5173` (dev default). Sidebar regenerates from directory structure on restart.
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

## `/sekkei:plan @doc-type`

Plan large document generation with user survey and phased execution strategy.
See `references/plan-orchestrator.md` for detailed logic.

1. Determine doc-type from `@doc-type` argument or current chain status (next incomplete doc)
2. Load `sekkei.config.yaml` → verify split config exists for this doc-type
3. Read `functions-list.md` → extract 大分類 feature groups with IDs
4. **Survey Round 1 — Scope**: Present features via `AskUserQuestion` (multiSelect). User selects features to include and sets priority order.
5. **Survey Round 2 — Detail**: For each selected feature, ask via `AskUserQuestion`: complexity (simple/medium/complex), special requirements, external dependencies, custom instructions.
6. **Generate plan**: Create `sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/` directory with:
   - `plan.md` — YAML frontmatter (title, doc_type, status, features, feature_count, split_mode, created, phases) + overview + phases table
   - Phase files per mapping in `references/plan-orchestrator.md` §4
7. Display plan summary table → ask user to review
8. Report: "Plan created at `sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/`. Run `/sekkei:implement @{plan-path}` to execute."

## `/sekkei:implement @plan-path`

Execute a generation plan phase by phase, delegating to existing sekkei sub-commands.
See `references/plan-orchestrator.md` for detailed logic.

1. Read `plan.md` from `@plan-path` → parse YAML frontmatter → validate status is `pending` or `in_progress`
2. Update plan status to `in_progress`
3. Parse all `phase-XX-*.md` files → build ordered execution queue (sort by phase number)
4. **Per-phase execution loop**:
   a. Display phase summary (name, scope, estimated sections)
   b. Ask user: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   c. If Proceed: delegate to the sekkei sub-command specified in the phase file (e.g., `/sekkei:basic-design` with feature scope)
   d. If Skip: mark phase as skipped, continue to next
   e. If Stop: save progress, exit loop
   f. After delegation completes: mark phase TODO checkboxes as done, update plan.md phases table status
5. After all phases complete: run `/sekkei:validate` on generated documents
6. Update plan.md status to `completed`
7. Report: generation summary (phases completed, files generated, validation results)

## `/sekkei:version`

1. Run CLI: `npx sekkei version` (or `node <path>/dist/cli/main.js version`)
2. Display the health check output to the user
3. If any items show ✗, suggest remediation steps
4. For JSON output: `npx sekkei version --json`

## `/sekkei:uninstall`

1. Confirm with user: "This will remove Sekkei skill, commands, and MCP entry from Claude Code. Proceed?"
2. If confirmed: run `npx sekkei uninstall --force`
3. Display removal summary
4. Note: "Package remains installed. Run `npm uninstall -g sekkei-mcp-server` to fully remove."

## `/sekkei:rebuild`

1. Run CLI: `npx sekkei update`
2. Display build + copy progress
3. Show post-update health check
4. If health check passes: "Update complete. Restart Claude Code to activate."
5. Use `--skip-build` to skip the build step: `npx sekkei update --skip-build`
