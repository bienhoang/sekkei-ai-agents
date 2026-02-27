# Supplementary Commands

Command workflows for supplementary documents (operation, migration, matrix, sitemap).

## `/sekkei:operation-design @input`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/02-requirements/requirements.md` exists — abort if missing: "Run `/sekkei:requirements` first."
2. Check nfr.md, basic-design.md, functions-list.md — warn if any missing (not blocking; missing files reduce cross-reference coverage)
3. Load all found files as `upstream_content` and pass to `generate_document`

**Interview questions (ask before generating):**
- What is the operational team structure?
- SLA requirements (uptime %, RTO, RPO)?
- Monitoring tools in use (Datadog, CloudWatch, etc.)?

1. Read the input (ideally the generated テスト仕様書 or requirements)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Load upstream content:**
   - Read `{output.directory}/02-requirements/requirements.md` → req_content
   - Read `{output.directory}/02-requirements/nfr.md` → nfr_content (if exists)
   - Read `{output.directory}/03-system/basic-design.md` → bd_content (if exists)
   - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
   - upstream = req_content + "\n\n" + nfr_content + "\n\n" + bd_content + "\n\n" + fl_content
4. Call MCP tool `generate_document` with `doc_type: "operation-design"`, `upstream_content: upstream`, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input is not Japanese.
5. Follow these rules strictly:
   - 6-section structure: 運用体制, バックアップ・リストア, 監視・アラート, 障害対応手順, ジョブ管理, SLA定義
   - 障害対応手順: OP-001 format with 6 columns (OP-ID, 手順名, 障害レベル, 手順内容, 担当者, 想定時間)
   - 障害レベル values: 重大/警告/軽微
   - SLA定義: numeric targets required (no vague terms: 高い/十分/適切/良好/高速 prohibited)
   - バックアップ: RPO and RTO required for every data store. Reference TBL-xxx if basic-design available.
   - 監視: reference API-xxx endpoints as monitoring targets if basic-design available
   - ジョブ管理: reference F-xxx batch functions if functions-list available
   - Cross-reference NFR-xxx, REQ-xxx, API-xxx, TBL-xxx, F-xxx IDs from upstream
6. Call MCP tool `validate_document` with saved content, `doc_type: "operation-design"`,
   and `upstream_content`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
7. Save output to `{output.directory}/07-operations/operation-design.md`
8. Update chain status if configured: `operation_design.status: complete`

## `/sekkei:migration-design @input`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Check requirements.md, operation-design.md — warn if any missing (not blocking; missing files reduce cross-reference coverage)
3. Load all found files as `upstream_content` and pass to `generate_document`

**Interview questions (ask before generating):**
- Migration approach preference? (big bang / phased / parallel run)
- Data volume estimates?
- Rollback time window constraints?

1. Read the input (ideally the generated 運用設計書 or basic-design)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Load upstream content:**
   - Read `{output.directory}/03-system/basic-design.md` → bd_content
   - Read `{output.directory}/02-requirements/requirements.md` → req_content (if exists)
   - Read `{output.directory}/07-operations/operation-design.md` → op_content (if exists)
   - upstream = bd_content + "\n\n" + req_content + "\n\n" + op_content
4. Call MCP tool `generate_document` with `doc_type: "migration-design"`, `upstream_content: upstream`, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input is not Japanese.
5. Follow these rules strictly:
   - 5-section structure: 移行方針, データ移行計画, システム切替手順, ロールバック計画, 移行テスト計画
   - データ移行計画: MIG-001 format with 8 columns
   - ロールバック計画: step-by-step with time estimates required
   - Cross-reference TBL-xxx, REQ-xxx, OP-xxx IDs from upstream
6. Call MCP tool `validate_document` with saved content, `doc_type: "migration-design"`,
   and `upstream_content`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
7. Save output to `{output.directory}/06-data/migration-design.md`
8. Update chain status if configured: `migration_design.status: complete`

## `/sekkei:matrix`

**Interview questions (ask before generating):**
- Which matrix? CRUD図 or トレーサビリティマトリックス?
- Export format? (Excel recommended for matrices)

1. Determine matrix type from user input
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **For CRUD図 (`crud-matrix`):**

   Verify functions-list.md and basic-design.md both exist — abort if either missing (need F-xxx and TBL-xxx IDs). upstream = functions-list.md + basic-design.md.

   a. **Load upstream content:** upstream = fl_content + "\n\n" + bd_content
   b. Call MCP tool `generate_document` with `doc_type: "crud-matrix"`, `upstream_content: upstream`
   c. AI generates markdown table: rows=functions, columns=tables, cells=C/R/U/D
   d. Call `export_document` with `doc_type: "crud-matrix"`, `format: "xlsx"`
   e. Save markdown to `{output.directory}/03-system/crud-matrix.md`
   f. Save xlsx to `{output.directory}/03-system/crud-matrix.xlsx`

4. **For トレーサビリティマトリックス (`traceability-matrix`):**

   Verify requirements.md exists — abort if missing. basic-design.md missing → warn, continue.

   a. **Load upstream content:**
      - Read all chain documents from `{output.directory}/`:
        - `02-requirements/requirements.md`
        - `04-functions-list/functions-list.md` (if exists)
        - `03-system/basic-design.md` (if exists)
        - `03-system/detail-design.md` (if exists)
        - `03-system/architecture-design.md` (if exists)
        - `03-system/db-design.md` (if exists)
        - `03-system/interface-spec.md` (if exists)
        - `08-test/ut-spec.md`, `it-spec.md`, `st-spec.md`, `uat-spec.md` (if exist)
        - `08-test/test-result-report.md` (if exists)
      - upstream = concatenated content
   b. Call `generate_document` with `doc_type: "traceability-matrix"`, `upstream_content: upstream`
   c. AI generates markdown table: rows=REQ-xxx, columns=F-xxx/SCR/API/UT/IT/ST/UAT coverage
   d. **Coverage metrics (mandatory in output):**
      - Forward coverage: % of REQ-xxx traced to at least one design element (SCR/API/F)
      - Backward coverage: % of REQ-xxx traced to at least one test case (UT/IT/ST/UAT)
      - Untraced requirements: list any REQ-xxx with no coverage
   e. Call `export_document` with `doc_type: "traceability-matrix"`, `format: "xlsx"`
   f. Save markdown to `{output.directory}/08-test/traceability-matrix.md`
   g. Save xlsx to `{output.directory}/08-test/traceability-matrix.xlsx`

5. **Auto-detect mode** (when user runs `/sekkei:matrix` without specifying type):
   - If both functions-list.md and basic-design.md exist → default to CRUD図
   - If test specs exist but CRUD dependencies missing → default to トレーサビリティマトリックス
   - If both available → ask user which matrix to generate

6. Report: file path, dimensions (rows × columns), coverage summary

## `/sekkei:sitemap`

**Prerequisite check:** functions-list.md recommended (warn if missing, not blocking — sitemap works from user description alone).

**Interview questions (ask before generating):**
- System type? (web/mobile/API/internal system/SaaS)
- Scope? (full system or specific module/feature)

1. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
2. **Load upstream content:**
   - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
   - upstream = fl_content (or empty)
3. If source code available, analyze routes/pages structure for reference
4. Call MCP tool `generate_document` with `doc_type: "sitemap"`, include:
   - User's system description as `input_content`
   - upstream as `upstream_content` (if available)
   - Code analysis results (if available)
5. AI generates: tree structure (hierarchical list) + page list table (PG-xxx IDs)
6. Call MCP tool `validate_document` with saved content, `doc_type: "sitemap"`,
   and `upstream_content`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
7. Save to `{output.directory}/03-system/sitemap.md`
8. Optionally call `export_document` with `doc_type: "sitemap"`, `format: "xlsx"` or `"pdf"`
9. Report: file path, total pages/screens count, hierarchy depth
