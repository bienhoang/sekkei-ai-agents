# Supplementary Commands

Command workflows for supplementary documents (operation, migration, matrix, sitemap).
Parent: `SKILL.md` → Workflow Router → Supplementary.

## `/sekkei:operation-design @input`

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

## `/sekkei:migration-design @input`

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

## `/sekkei:matrix`

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

## `/sekkei:sitemap`

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
