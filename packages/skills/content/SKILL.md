---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: functions-list, requirements, basic-design, detail-design, test-spec, matrix, sitemap, operation-design, migration-design, validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain:
**RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書 → テスト仕様書**

## Sub-Commands

- `/sekkei:functions-list @input` — Generate 機能一覧 (Function List) from RFP/input
- `/sekkei:requirements @input` — Generate 要件定義書 (Requirements Definition)
- `/sekkei:basic-design @input` — Generate 基本設計書 (Basic Design Document)
- `/sekkei:detail-design @input` — Generate 詳細設計書 (Detail Design Document)
- `/sekkei:test-spec @input` — Generate テスト仕様書 (Test Specification)
- `/sekkei:matrix` — Generate CRUD図 or トレーサビリティマトリックス and export to Excel
- `/sekkei:sitemap` — Generate サイトマップ (System Structure Map) with page hierarchy
- `/sekkei:operation-design @input` — Generate 運用設計書 (Operation Design)
- `/sekkei:migration-design @input` — Generate 移行設計書 (Migration Design)
- `/sekkei:validate @doc` — Validate document completeness and cross-references
- `/sekkei:status` — Show document chain progress
- `/sekkei:export @doc --format=xlsx|pdf|docx` — Export document to Excel, PDF, or Word
- `/sekkei:translate @doc --lang=en` — Translate document with glossary context
- `/sekkei:glossary [add|list|find|export]` — Manage project terminology
- `/sekkei:update @doc` — Detect upstream changes and impacted sections
- `/sekkei:diff-visual @before @after` — Generate color-coded revision Excel (朱書き)
- `/sekkei:plan @doc-type` — Create generation plan for large documents (auto-triggered in split mode)
- `/sekkei:implement @plan-path` — Execute a generation plan phase by phase
- `/sekkei:preview` — Start VitePress docs preview server
- `/sekkei:version` — Show version and environment health check
- `/sekkei:uninstall` — Remove Sekkei from Claude Code
- `/sekkei:rebuild` — Rebuild and re-install Sekkei skill + MCP (runs `sekkei update` CLI)

## Workflow Router

When the user invokes a sub-command, follow the corresponding workflow below.

### Project Setup (prerequisite)

Before using any sub-command, initialize the project via CLI:

```bash
npx sekkei init
```

This interactive wizard creates `sekkei.config.yaml`, sets up the output directory, imports industry glossary, and configures Python dependencies for export features. No AI required.

### `/sekkei:functions-list @input`

**Interview questions (ask before generating):**
- What are the main subsystems/modules?
- Any specific processing types (batch jobs, reports)?
- Priority scheme preference (高/中/低 or phase-based)?

1. Read the input content (RFP, meeting notes, or free-text requirements)
2. If `sekkei.config.yaml` exists, load project metadata
3. Call MCP tool `generate_document` with `doc_type: "functions-list"` and the input content. Pass `language` from `sekkei.config.yaml project.language` (default: "ja"). Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
4. Use the returned template + AI instructions to generate the 機能一覧
5. Follow these rules strictly:
   - 3-tier hierarchy: 大分類 → 中分類 → 小機能
   - ID format: `[PREFIX]-001` (derive prefix from 大分類)
   - 処理分類: 入力 / 照会 / 帳票 / バッチ
   - 優先度 & 難易度: 高 / 中 / 低
   - Generate 10+ functions minimum
6. Save output to `./sekkei-docs/functions-list.md`
7. Update `sekkei.config.yaml` chain status: `functions_list.status: complete`
8. **Count 大分類 feature groups** from the generated `functions-list.md`:
   - Scan for distinct values in the 大分類 column of the 機能一覧 table
   - Derive a short feature ID for each (2–5 uppercase letters, e.g., "AUTH", "SALES", "REPORT")
9. **If count >= 3**, prompt the user:
   > "Detected {N} feature groups: {list}. Enable split mode? Split generates separate files per feature for basic-design, detail-design, and test-spec. Recommended for projects with 3+ features. [Y/n]"
10. **If user confirms split:**
    a. Uncomment/rewrite the `split:` block in `sekkei.config.yaml` with defaults:
       ```yaml
       split:
         basic-design:
           shared: [system-architecture, database-design, external-interface, non-functional-design, technology-rationale]
           per_feature: [overview, business-flow, screen-design, report-design, functions-list]
         detail-design:
           shared: [system-architecture, database-design]
           per_feature: [overview, module-design, class-design, api-detail, processing-flow]
         test-spec:
           shared: []
           per_feature: [unit-test, integration-test, system-test, acceptance-test]
       ```
    b. Create directories: `{output_dir}/features/{feature-id}/` for each detected 大分類
    c. Write `{output_dir}/_index.yaml` manifest with detected features:
       ```yaml
       version: "1"
       project: "{project_name}"
       language: "{project_language}"
       documents: {}
       ```
       Then for each feature, add an entry to the manifest's feature list.
    d. Confirm: "Split mode enabled. Created {N} feature directories. Run `/sekkei:basic-design` to generate split documents."
11. **If user declines split (or count < 3):** proceed without changes. Monolithic flow remains default.

### `/sekkei:requirements @input`

**Interview questions (ask before generating):**
- Are there specific compliance/regulatory requirements?
- Performance targets (response time, throughput)?
- Security requirements level?

1. Read the input (ideally the generated 機能一覧 or RFP)
2. If `sekkei.config.yaml` exists, load project metadata and `project_type`
3. Read upstream 機能一覧 output file from chain config. Call MCP tool `generate_document` with `doc_type: "requirements"`, `upstream_content` (functions-list content), `project_type`, and `language` from `sekkei.config.yaml project.language` (default: "ja"). Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
4. Use the returned template + AI instructions to generate the 要件定義書
5. Follow these rules strictly:
   - 10-section structure as defined in the template
   - Functional requirements: REQ-001 format
   - Non-functional requirements: NFR-001 format with measurable targets
   - Cross-reference F-xxx IDs from 機能一覧 if available
   - Include acceptance criteria
6. Save output to `./sekkei-docs/requirements.md`
7. Update chain status: `requirements.status: complete`

### `/sekkei:basic-design @input`

**Interview questions (ask before generating):**
- What architecture pattern? (monolith, microservices, serverless)
- Key external system integrations?
- Database type preference? (PostgreSQL, MySQL, etc.)
- Authentication method? (OAuth, SAML, custom)

0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Read `sekkei.config.yaml` → check `split.basic-design` exists
   - Count 大分類 features from `functions-list.md`
   - If split enabled AND features >= 3 AND no active plan for `basic-design` in `sekkei-docs/plans/`:
     → Ask: "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan basic-design` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
1. Read the input (ideally the generated 要件定義書 or requirements summary)
2. If `sekkei.config.yaml` exists, load project metadata
3. **Check for split config**: read `sekkei.config.yaml` → `split.basic-design`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in split config:
      - Call `generate_document` with `scope: "shared"`
      - Save to `shared/{section-name}.md`
   d. For each feature from functions-list:
      i. Generate feature basic-design:
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input})`
         - Save output to `features/{feature-id}/basic-design.md`
      ii. Generate per-feature screen-design (split mode only):
         - Construct screen_input = Screen Design Document Instructions (see below) + "\n\n## Feature Requirements\n" + {feature_input}
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: screen_input)`
         - Save output to `features/{feature-id}/screen-design.md`
      iii. Render screen mockup images (auto):
         - If `screen-design.md` contains YAML layout blocks in section 1:
           a. Parse YAML layouts from the saved file
           b. For each screen, render PNG mockup to `features/{feature-id}/images/SCR-{ID}.png`
           c. In the markdown, insert `![SCR-{ID}](./images/SCR-{ID}.png)` after the YAML block
           d. Keep YAML block in a `<!-- yaml-source ... -->` HTML comment for re-rendering
         - If Playwright not available, skip rendering; YAML block stays as-is (still readable)
         - Log rendered paths to stderr
      iv. Update `_index.yaml` manifest entry for this feature to list both basic-design.md and screen-design.md files
   e. Create/update `_index.yaml` manifest via manifest-manager

**Screen Design Rules (split mode only):**
- Screen IDs use format SCR-{FEATURE_ID}-{seq} (e.g., SCR-AUTH-001)
- Each screen-design.md covers ALL screens for that feature
- 6 mandatory sections per screen: 画面レイアウト, 画面項目定義, バリデーション一覧, イベント一覧, 画面遷移, 権限
- Do NOT add per-screen sections to basic-design.md in split mode — reference screen-design.md instead
- The Screen Design Document Instructions block is provided by `buildScreenDesignInstruction(featureId, language)` from `generation-instructions.ts` — pass the project language from config
5. **If not split (default):**
   a. Call MCP tool `generate_document` with `doc_type: "basic-design"`, `language` from config (default: "ja"), and input. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   b. Use the returned template + AI instructions to generate the 基本設計書
   c. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Screen list: SCR-001 format (8 columns)
      - Table definitions: TBL-001 format (8 columns)
      - API list: API-001 format (8 columns)
      - Include Mermaid diagrams for architecture and ER diagrams
      - Cross-reference REQ-xxx IDs from 要件定義書
   d. Save output to `./sekkei-docs/basic-design.md`
6. Update chain status: `basic_design.status: complete`

### `/sekkei:detail-design @input`

**Interview questions (ask before generating):**
- Programming language and framework?
- ORM preference?
- API style? (REST, GraphQL, gRPC)
- Error handling strategy?

0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Read `sekkei.config.yaml` → check `split.detail-design` exists
   - Count 大分類 features from `functions-list.md`
   - If split enabled AND features >= 3 AND no active plan for `detail-design` in `sekkei-docs/plans/`:
     → Ask: "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan detail-design` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
1. Read the input (ideally the generated 基本設計書)
2. If `sekkei.config.yaml` exists, load project metadata
3. **Check for split config**: read `sekkei.config.yaml` → `split.detail-design`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in split config:
      - Call `generate_document` with `scope: "shared"`
      - Save to `shared/{section-name}.md`
   d. For each feature:
      - Call `generate_document` with `scope: "feature"`, `feature_id: "{ID}"`
      - Save to `features/{feature-id}/detail-design.md`
   e. Create/update `_index.yaml` manifest
5. **If not split (default):**
   a. Call MCP tool `generate_document` with `doc_type: "detail-design"`, `language` from config (default: "ja"), and input. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   b. Use the returned template + AI instructions to generate the 詳細設計書
   c. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Module list with call relationships
      - Class specs: CLS-001 format with Mermaid class diagrams
      - API detail specs: endpoint, req/res schemas, error codes
      - Validation rules per screen field
      - Error message list with severity levels
      - Sequence diagrams (Mermaid) for key processing flows
      - Cross-reference SCR-xxx, TBL-xxx, API-xxx IDs from 基本設計書
   d. Save output to `./sekkei-docs/detail-design.md`
6. Update chain status: `detail_design.status: complete`

### `/sekkei:test-spec @input`

**Interview questions (ask before generating):**
- Test levels to cover? (UT, IT, ST, UAT)
- Test tools/frameworks used?
- Performance test targets (response time, throughput)?
- Security test requirements?

0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Read `sekkei.config.yaml` → check `split.test-spec` exists
   - Count 大分類 features from `functions-list.md`
   - If split enabled AND features >= 3 AND no active plan for `test-spec` in `sekkei-docs/plans/`:
     → Ask: "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan test-spec` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
1. Read the input (ideally the generated 詳細設計書)
2. If `sekkei.config.yaml` exists, load project metadata
3. **Check for split config**: read `sekkei.config.yaml` → `split.test-spec`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups
   b. For each feature:
      - Call `generate_document` with `scope: "feature"`, `feature_id: "{ID}"`
      - Save to `features/{feature-id}/test-spec.md`
   c. Create/update `_index.yaml` manifest (test-spec has no shared sections by default)
5. **If not split (default):**
   a. Call MCP tool `generate_document` with `doc_type: "test-spec"`, `language` from config (default: "ja"), and input. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   b. Use the returned template + AI instructions to generate the テスト仕様書
   c. Follow these rules strictly:
      - 4-section structure as defined in the template
      - Test cases: 12-column table per level (UT/IT/ST/UAT)
      - テスト観点: 正常系/異常系/境界値/パフォーマンス/セキュリティ
      - ID format: UT-001, IT-001, ST-001, UAT-001
      - Traceability matrix: REQ-ID → F-ID → テストケースID
      - Generate 5+ test cases per major function
      - Cross-reference REQ-xxx, F-xxx IDs from upstream
   d. Save output to `./sekkei-docs/test-spec.md`
6. Update chain status: `test_spec.status: complete`

### `/sekkei:operation-design @input`

**Interview questions (ask before generating):**
- What is the operational team structure?
- SLA requirements (uptime %, RTO, RPO)?
- Monitoring tools in use (Datadog, CloudWatch, etc.)?

1. Read the input (ideally the generated テスト仕様書 or requirements)
2. If `sekkei.config.yaml` exists, load project metadata
3. Read upstream documents (requirements, test-spec) to extract NFR-xxx and REQ-xxx IDs
4. Call MCP tool `generate_document` with `doc_type: "operation-design"`, `upstream_content`, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input is not Japanese.
5. Follow these rules strictly:
   - 6-section structure: 運用体制, バックアップ・リストア, 監視・アラート, 障害対応手順, ジョブ管理, SLA定義
   - 障害対応手順: OP-001 format with 6 columns
   - SLA定義: numeric targets required (no vague terms)
   - Cross-reference NFR-xxx, REQ-xxx IDs from upstream
6. Save output to `./sekkei-docs/operation-design.md`
7. Update chain status if configured: `operation_design.status: complete`

### `/sekkei:migration-design @input`

**Interview questions (ask before generating):**
- Migration approach preference? (big bang / phased / parallel run)
- Data volume estimates?
- Rollback time window constraints?

1. Read the input (ideally the generated 運用設計書 or basic-design)
2. If `sekkei.config.yaml` exists, load project metadata
3. Read upstream documents to extract TBL-xxx, REQ-xxx, OP-xxx IDs
4. Call MCP tool `generate_document` with `doc_type: "migration-design"`, `upstream_content`, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input is not Japanese.
5. Follow these rules strictly:
   - 5-section structure: 移行方針, データ移行計画, システム切替手順, ロールバック計画, 移行テスト計画
   - データ移行計画: MIG-001 format with 8 columns
   - ロールバック計画: step-by-step with time estimates required
   - Cross-reference TBL-xxx, REQ-xxx, OP-xxx IDs from upstream
6. Save output to `./sekkei-docs/migration-design.md`
7. Update chain status if configured: `migration_design.status: complete`

### `/sekkei:matrix`

**Interview questions (ask before generating):**
- Which matrix? CRUD図 or トレーサビリティマトリックス?
- Export format? (Excel recommended for matrices)

1. Determine matrix type from user input
2. **For CRUD図 (`crud-matrix`):**
   a. Read generated `functions-list.md` (F-xxx IDs) and `basic-design.md` (TBL-xxx IDs)
   b. Call MCP tool `generate_document` with `doc_type: "crud-matrix"`, `upstream_content` containing both documents
   c. AI generates markdown table: rows=functions, columns=tables, cells=C/R/U/D
   d. Call `export_document` with `doc_type: "crud-matrix"`, `format: "xlsx"`
   e. Save to `./sekkei-docs/crud-matrix.xlsx`
3. **For トレーサビリティマトリックス (`traceability-matrix`):**
   a. Read all chain documents: functions-list, requirements, basic-design, detail-design, test-spec
   b. Call `generate_document` with `doc_type: "traceability-matrix"`, `upstream_content` containing all docs
   c. AI generates markdown table: rows=REQ-xxx, columns=SCR/API/UT/IT/ST coverage
   d. Call `export_document` with `doc_type: "traceability-matrix"`, `format: "xlsx"`
   e. Save to `./sekkei-docs/traceability-matrix.xlsx`
4. Report: file path, dimensions (rows × columns), coverage summary

### `/sekkei:sitemap`

**Interview questions (ask before generating):**
- System type? (web/mobile/API/internal system/SaaS)
- Scope? (full system or specific module/feature)
- Functions-list available? (for F-xxx cross-references)

1. If functions-list exists, read `functions-list.md` to extract F-xxx IDs
2. If source code available, analyze routes/pages structure for reference
3. Call MCP tool `generate_document` with `doc_type: "sitemap"`, include:
   - User's system description as `input_content`
   - Functions-list content as `upstream_content` (if available)
   - Code analysis results (if available)
4. AI generates: tree structure (hierarchical list) + page list table (PG-xxx IDs)
5. Save to `./sekkei-docs/sitemap.md`
6. Optionally call `export_document` with `doc_type: "sitemap"`, `format: "xlsx"` or `"pdf"`
7. Report: file path, total pages/screens count, hierarchy depth

### `/sekkei:validate @doc`

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

### `/sekkei:status`

1. Locate `sekkei.config.yaml` in the project root
2. Call MCP tool `get_chain_status` with the config path
3. Display the document chain progress table
4. If `_index.yaml` exists, show per-feature split status
5. Suggest the next document to generate based on chain status

### `/sekkei:export @doc --format=xlsx|pdf|docx`

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

### `/sekkei:translate @doc --lang=en`

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

### `/sekkei:glossary [add|list|find|export]`

1. Locate `sekkei-docs/glossary.yaml` (create if not exists)
2. For `add`: ask for JP term, EN term, VI term, context → call `manage_glossary` with action "add"
3. For `list`: call `manage_glossary` with action "list" → display all terms
4. For `find`: ask for search query → call with action "find"
5. For `export`: call with action "export" → display as Markdown table (4 columns: ja/en/vi/context)
6. For `import`: ask for industry (finance / medical / manufacturing / real-estate / logistics / retail / insurance / education / government / construction / telecom / automotive / energy / food-service / common) → call with action "import", industry → display imported/skipped counts

### `/sekkei:update @doc`

1. Read the current version of the upstream document
2. Read the previous version (from git or stored copy)
3. Read the downstream document to check
4. Call MCP tool `analyze_update` with upstream_old, upstream_new, downstream_content
5. Display: changed sections, changed IDs, impacted downstream sections
6. Ask user: regenerate affected sections? → if yes, call generate for impacted parts

### `/sekkei:diff-visual @before_file @after_file`

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

### `/sekkei:preview`

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

### `/sekkei:plan @doc-type`

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

### `/sekkei:implement @plan-path`

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

### `/sekkei:version`

1. Run CLI: `npx sekkei version` (or `node <path>/dist/cli/main.js version`)
2. Display the health check output to the user
3. If any items show \u2717, suggest remediation steps
4. For JSON output: `npx sekkei version --json`

### `/sekkei:uninstall`

1. Confirm with user: "This will remove Sekkei skill, commands, and MCP entry from Claude Code. Proceed?"
2. If confirmed: run `npx sekkei uninstall --force`
3. Display removal summary
4. Note: "Package remains installed. Run `npm uninstall -g sekkei-mcp-server` to fully remove."

### `/sekkei:rebuild`

1. Run CLI: `npx sekkei update`
2. Display build + copy progress
3. Show post-update health check
4. If health check passes: "Update complete. Restart Claude Code to activate."
5. Use `--skip-build` to skip the build step: `npx sekkei update --skip-build`

## Document Chain

Documents build on each other. The recommended generation order is:

```
RFP/Input → /sekkei:functions-list → /sekkei:requirements → /sekkei:basic-design → /sekkei:detail-design → /sekkei:test-spec
```

Each downstream document should cross-reference IDs from upstream documents.

## Split Mode

When `sekkei.config.yaml` contains a `split` section, generation commands (basic-design, detail-design, test-spec) produce per-feature files instead of monolithic documents.

**Structure:**
```
sekkei-docs/
├── _index.yaml          # Manifest (auto-generated)
├── functions-list.md    # Always monolithic
├── requirements.md      # Always monolithic
├── shared/              # Shared sections (architecture, DB, etc.)
│   ├── architecture.md
│   └── database.md
├── features/
│   ├── sal-sales/
│   │   ├── basic-design.md
│   │   ├── detail-design.md
│   │   └── test-spec.md
│   └── acc-accounting/
│       └── ...
└── translations/
    └── en/
        ├── _index.yaml
        ├── shared/
        └── features/
```

**Benefits:** Smaller AI context per generation call → higher quality. Per-feature export/validation. Feature-grouped sidebar in VitePress preview.

## References

- `references/doc-standards.md` — Japanese documentation standards and column headers
- `references/v-model-guide.md` — V-model workflow and chain-of-documents guide
- `references/plan-orchestrator.md` — Plan orchestration logic for large document generation
