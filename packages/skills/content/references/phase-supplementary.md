> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Supplementary Commands

Command workflows for supplementary documents (operation, migration, matrix, sitemap).
Parent: `SKILL.md` → Workflow Router → Supplementary.

## `/sekkei:operation-design @input`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/02-requirements/requirements.md` exists
   - If missing → ABORT: "Requirements not found. Run `/sekkei:requirements` first."
2. Check `{output.directory}/02-requirements/nfr.md` exists
   - If missing → WARN: "NFR not found. Operation-design will only reference REQ-xxx IDs.
     Run `/sekkei:nfr` first for complete cross-referencing."
   - Continue (not blocking)

**Interview questions (ask before generating):**
- What is the operational team structure?
- SLA requirements (uptime %, RTO, RPO)?
- Monitoring tools in use (Datadog, CloudWatch, etc.)?

1. Read the input (ideally the generated テスト仕様書 or requirements)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Load upstream content:**
   - Read `{output.directory}/02-requirements/requirements.md` → req_content
   - Read `{output.directory}/02-requirements/nfr.md` → nfr_content (if exists)
   - upstream = req_content + "\n\n" + nfr_content
4. Call MCP tool `generate_document` with `doc_type: "operation-design"`, `upstream_content: upstream`, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input is not Japanese.
5. Follow these rules strictly:
   - 6-section structure: 運用体制, バックアップ・リストア, 監視・アラート, 障害対応手順, ジョブ管理, SLA定義
   - 障害対応手順: OP-001 format with 6 columns
   - SLA定義: numeric targets required (no vague terms)
   - Cross-reference NFR-xxx, REQ-xxx IDs from upstream
6. Call MCP tool `validate_document` with saved content, `doc_type: "operation-design"`,
   and `upstream_content`. Show results as non-blocking.
7. Save output to `{output.directory}/07-operations/operation-design.md`
8. Update chain status if configured: `operation_design.status: complete`

## `/sekkei:migration-design @input`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/03-system/basic-design.md` exists
   - If missing → ABORT: "Basic-design not found. Run `/sekkei:basic-design` first."
2. Check `{output.directory}/02-requirements/requirements.md` exists
   - If missing → WARN: "Requirements not found. Migration-design will have limited REQ-xxx references."
   - Continue (not blocking)
3. Check `{output.directory}/07-operations/operation-design.md` exists
   - If missing → WARN: "Operation-design not found. Migration-design will skip OP-xxx references."
   - Continue (not blocking)

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
   and `upstream_content`. Show results as non-blocking.
7. Save output to `{output.directory}/06-data/migration-design.md`
8. Update chain status if configured: `migration_design.status: complete`

## `/sekkei:matrix`

**Interview questions (ask before generating):**
- Which matrix? CRUD図 or トレーサビリティマトリックス?
- Export format? (Excel recommended for matrices)

1. Determine matrix type from user input
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **For CRUD図 (`crud-matrix`):**

   **Prerequisite check:**
   - Check `{output.directory}/04-functions-list/functions-list.md` exists
     - If missing → ABORT: "Functions-list not found. Run `/sekkei:functions-list` first."
   - Check `{output.directory}/03-system/basic-design.md` exists
     - If missing → ABORT: "Basic-design not found (need TBL-xxx). Run `/sekkei:basic-design` first."

   a. **Load upstream content:**
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content
      - Read `{output.directory}/03-system/basic-design.md` → bd_content
      - upstream = fl_content + "\n\n" + bd_content
   b. Call MCP tool `generate_document` with `doc_type: "crud-matrix"`, `upstream_content: upstream`
   c. AI generates markdown table: rows=functions, columns=tables, cells=C/R/U/D
   d. Call `export_document` with `doc_type: "crud-matrix"`, `format: "xlsx"`
   e. Save markdown to `{output.directory}/03-system/crud-matrix.md`
   f. Save xlsx to `{output.directory}/03-system/crud-matrix.xlsx`

4. **For トレーサビリティマトリックス (`traceability-matrix`):**

   **Prerequisite check:**
   - Check `{output.directory}/02-requirements/requirements.md` exists
     - If missing → ABORT: "Requirements not found. Run `/sekkei:requirements` first."
   - Check `{output.directory}/03-system/basic-design.md` exists
     - If missing → WARN: "Basic-design not found. Traceability coverage will be partial."
     - Continue (not blocking)

   a. **Load upstream content:**
      - Read all chain documents from `{output.directory}/`:
        - `02-requirements/requirements.md`
        - `04-functions-list/functions-list.md` (if exists)
        - `03-system/basic-design.md` (if exists)
        - `03-system/detail-design.md` (if exists)
        - `08-test/ut-spec.md`, `it-spec.md`, `st-spec.md`, `uat-spec.md` (if exist)
      - upstream = concatenated content
   b. Call `generate_document` with `doc_type: "traceability-matrix"`, `upstream_content: upstream`
   c. AI generates markdown table: rows=REQ-xxx, columns=SCR/API/UT/IT/ST coverage
   d. Call `export_document` with `doc_type: "traceability-matrix"`, `format: "xlsx"`
   e. Save markdown to `{output.directory}/08-test/traceability-matrix.md`
   f. Save xlsx to `{output.directory}/08-test/traceability-matrix.xlsx`

5. Report: file path, dimensions (rows × columns), coverage summary

## `/sekkei:sitemap`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/04-functions-list/functions-list.md` exists
   - If missing → WARN: "Functions-list not found. Sitemap will not have F-xxx cross-references.
     Run `/sekkei:functions-list` first for complete mapping."
   - Continue (not blocking — sitemap can work from user description alone)

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
   and `upstream_content`. Show results as non-blocking.
7. Save to `{output.directory}/03-system/sitemap.md`
8. Optionally call `export_document` with `doc_type: "sitemap"`, `format: "xlsx"` or `"pdf"`
9. Report: file path, total pages/screens count, hierarchy depth
