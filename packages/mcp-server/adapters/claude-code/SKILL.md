---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: init, functions-list, requirements, basic-design, detail-design, test-spec, validate, status, export, translate, glossary, update"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain:
**RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書 → テスト仕様書**

## Sub-Commands

- `/sekkei:init` — Initialize project config + numbered scaffold
- `/sekkei:overview @input` — Generate プロジェクト概要 (01-overview.md)
- `/sekkei:functions-list @input` — Generate 機能一覧 (04-functions-list.md)
- `/sekkei:requirements @input` — Generate 要件定義書 (02-requirements.md)
- `/sekkei:basic-design @input` — Generate 基本設計書 (03-system/ + 05-features/)
- `/sekkei:detail-design @input` — Generate 詳細設計書 (05-features/{name}/)
- `/sekkei:test-spec @input` — Generate テスト仕様書 (08-test/ + 05-features/)
- `/sekkei:validate [@doc | --structure]` — Validate content or structure
- `/sekkei:status` — Show document chain progress
- `/sekkei:export @doc --format=xlsx|pdf` — Export document to Excel or PDF
- `/sekkei:translate @doc --lang=en` — Translate document with glossary context
- `/sekkei:glossary [add|list|find|export]` — Manage project terminology (10-glossary.md)
- `/sekkei:update @doc` — Detect upstream changes and impacted sections

## Workflow Router

When the user invokes a sub-command, follow the corresponding workflow below.

### `/sekkei:init`

**Interview (ask all before writing anything):**
1. Project name?
2. Project type? (web / mobile / api / desktop / lp / internal-system / saas / batch)
3. Tech stack? (comma-separated, e.g. TypeScript, React, PostgreSQL)
4. Team size? (number)
5. Output language? (ja / en / vi — default: ja)
6. Keigo preference? (丁寧語 / 謙譲語 / simple — default: 丁寧語)
7. Output directory name? (default: docs/)
8. Initial feature list? (comma-separated display names, e.g. 販売管理, ユーザー管理)
   — For each: confirm or edit the auto-derived kebab-case folder name

**Steps:**

1. Auto-derive kebab names for each feature:
   - Strip non-ASCII, lowercase, replace spaces/underscores with `-`
   - Example: "販売管理" → ask user to provide ASCII name → "sales-management"
   - Assign short mnemonic ID (SAL, USR, etc.) — 2-5 uppercase letters
   - Kebab names must match `^[a-z][a-z0-9-]{1,49}$`; no two features may share the same name

2. Write `sekkei.config.yaml` in project root using the numbered chain schema:
   - Set `output.directory` to the user's chosen directory (prefix `./` if relative)
   - All chain entries set to `status: pending`
   - Features are discovered at runtime from `05-features/` subdirectories — do NOT add a `features:` array to config

3. Create output directory if it does not exist

4. Create scaffold files (skip any that already exist):

   **Top-level single-file placeholders:**
   - `{output-dir}/01-overview.md` — `# Overview\n\n<!-- pending: run /sekkei:overview -->`
   - `{output-dir}/02-requirements.md` — `# 要件定義書\n\n<!-- pending: run /sekkei:requirements -->`
   - `{output-dir}/04-functions-list.md` — `# 機能一覧\n\n<!-- pending: run /sekkei:functions-list -->`
   - `{output-dir}/10-glossary.md` — `# 用語集\n\n<!-- pending: run /sekkei:glossary -->`

   **Folder index files (use section-index.md template):**
   - `{output-dir}/03-system/index.md` — title "システム設計"
   - `{output-dir}/05-features/index.md` — title "機能設計"
   - `{output-dir}/06-data/index.md` — title "データ設計"
   - `{output-dir}/07-operations/index.md` — title "運用設計"
   - `{output-dir}/08-test/index.md` — title "テスト計画"
   - `{output-dir}/09-ui/index.md` — title "UI/UXガイドライン"

   **Feature folder placeholders** (for each feature):
   - Create `{output-dir}/05-features/{feature-name}/` directory
   - Write `{output-dir}/05-features/{feature-name}/index.md` using feature-index.md template

5. Print confirmation:
   - Config written: `sekkei.config.yaml`
   - Output directory: `{output-dir}/`
   - Files created: list all files
   - Features registered: list name + display
   - Next step: "Run `/sekkei:functions-list @{rfp-file}` to begin"

### `/sekkei:overview @input`

1. Read the input (RFP, project brief, or free-text description)
2. Load `sekkei.config.yaml` — get `output.directory` and `project.name`
3. Call MCP tool `generate_document` with `doc_type: "overview"` and input content
4. Use returned template + instructions to generate the プロジェクト概要 document
5. Follow these rules:
   - 5 sections: プロジェクト概要, ビジネス目標, システムスコープ, ステークホルダー, アーキテクチャ概要
   - Include Mermaid C4 context diagram in section 5
   - Must NOT contain requirements or design decisions
6. Save output to `{output.directory}/01-overview.md`
7. Update `sekkei.config.yaml`: `chain.overview.status: complete`, `chain.overview.output: "01-overview.md"`

### `/sekkei:functions-list @input`

**Interview questions (ask before generating):**
- What are the main subsystems/modules?
- Any specific processing types (batch jobs, reports)?
- Priority scheme preference (高/中/低 or phase-based)?

1. Read the input content (RFP, meeting notes, or free-text requirements)
2. Load `sekkei.config.yaml` — get `output.directory`
3. Call MCP tool `generate_document` with `doc_type: "functions-list"` and the input content
4. Use the returned template + AI instructions to generate the 機能一覧
5. Follow these rules strictly:
   - 3-tier hierarchy: 大分類 → 中分類 → 小機能
   - ID format: `[PREFIX]-001` (derive prefix from 大分類)
   - 処理分類: 入力 / 照会 / 帳票 / バッチ
   - 優先度 & 難易度: 高 / 中 / 低
   - Generate 10+ functions minimum
6. Save output to `{output.directory}/04-functions-list.md`
7. Update `sekkei.config.yaml`: `chain.functions_list.status: complete`, `chain.functions_list.output: "04-functions-list.md"`

### `/sekkei:requirements @input`

**Interview questions (ask before generating):**
- Are there specific compliance/regulatory requirements?
- Performance targets (response time, throughput)?
- Security requirements level?

1. Read the input (ideally the generated 機能一覧 or RFP)
2. Load `sekkei.config.yaml` — get `output.directory`
3. Call MCP tool `generate_document` with `doc_type: "requirements"` and input
4. Use the returned template + AI instructions to generate the 要件定義書
5. Follow these rules strictly:
   - 10-section structure as defined in the template
   - Functional requirements: REQ-001 format
   - Non-functional requirements: NFR-001 format with measurable targets
   - Cross-reference F-xxx IDs from 機能一覧 if available
   - Include acceptance criteria
6. Save output to `{output.directory}/02-requirements.md`
7. Update `sekkei.config.yaml`: `chain.requirements.status: complete`, `chain.requirements.output: "02-requirements.md"`

### `/sekkei:basic-design @input`

**Interview questions (ask before generating):**
- What architecture pattern? (monolith, microservices, serverless)
- Key external system integrations?
- Database type preference? (PostgreSQL, MySQL, etc.)
- Authentication method? (OAuth, SAML, custom)
- Generating shared system design or a specific feature? (shared / feature)
- If feature: which feature? (select from `features[]` in config)

1. Read the input (ideally the generated 要件定義書)
2. Load `sekkei.config.yaml` — get `output.directory` and `features[]`
3. Call MCP tool `generate_document` with `doc_type: "basic-design"` and input
4. Use the returned template + AI instructions to generate the 基本設計書
5. Follow the ID and table rules as before (SCR-001, TBL-001, API-001)
6. Route by scope:

   **If scope = shared (03-system/):**
   Generate shared sections as separate files:
   - `03-system/system-architecture.md`, `03-system/database-design.md`, `03-system/external-interface.md`
   - `03-system/non-functional-design.md`, `03-system/technology-rationale.md`
   For each file: call `generate_document` with `doc_type: "basic-design", scope: "shared"`.
   Update `03-system/index.md` to reflect all generated files.
   Update config: `chain.basic_design.status: in-progress`, `chain.basic_design.system_output: "03-system/"`

   **If scope = feature:**
   Ask: which feature? → get `name` and `display` from `features[]` in config.
   Call `generate_document` with `doc_type: "basic-design", scope: "feature", feature_name: {name}`.
   Save to `{output.directory}/05-features/{name}/basic-design.md`.
   Regenerate `{output.directory}/05-features/{name}/index.md` — update basic-design.md row to ✅.
   Update config: `chain.basic_design.features_output: "05-features/"`

### `/sekkei:detail-design @input`

**Interview questions (ask before generating):**
- Programming language and framework?
- ORM preference?
- API style? (REST, GraphQL, gRPC)
- Error handling strategy?
- Which feature? (select from `features[]` in config)

1. Read the input (ideally the generated 基本設計書)
2. Load `sekkei.config.yaml` — get `output.directory` and `features[]`
3. Ask which feature → get `name` from config `features[]`
4. Call `generate_document` with `doc_type: "detail-design", scope: "feature", feature_name: {name}`
5. Follow the rules (module design, class specs CLS-001, API detail, validation rules, sequence diagrams)
6. Save to `{output.directory}/05-features/{name}/detail-design.md`
7. Regenerate `{output.directory}/05-features/{name}/index.md` — update detail-design.md row to ✅
8. Update config: `chain.detail_design.features_output: "05-features/"`

### `/sekkei:test-spec @input`

**Interview questions (ask before generating):**
- Global test strategy or feature-specific test cases? (global / feature)
- If feature: which feature?
- Test levels to cover? (UT, IT, ST, UAT)
- Test tools/frameworks used?

1. Read the input (ideally the generated 詳細設計書)
2. Load `sekkei.config.yaml` — get `output.directory` and `features[]`
3. Route by scope:

   **If scope = global (08-test/):**
   Generate global test strategy document.
   Save to `{output.directory}/08-test/strategy.md`
   Update `08-test/index.md` to link strategy.md.
   Update config: `chain.test_spec.global_output: "08-test/"`

   **If scope = feature:**
   Ask which feature → get `name` from config `features[]`
   Call `generate_document` with `doc_type: "test-spec", scope: "feature", feature_name: {name}`
   Save to `{output.directory}/05-features/{name}/test-spec.md`
   Regenerate `{output.directory}/05-features/{name}/index.md` — update test-spec.md row to ✅
   Update config: `chain.test_spec.features_output: "05-features/"`

### `/sekkei:validate [@doc | --structure]`

**If `--structure` flag or no doc provided:**
1. Load `sekkei.config.yaml` — get `output.directory`
2. Call MCP tool `validate_document` with `structure_path: {output.directory}`
3. Display structural validation results (missing files, non-kebab folders, missing index.md)
4. Suggest fixes for each issue

**If `@doc` provided (content validation):**
1. Read the document to validate
2. Determine the doc_type from the document header or user input
3. If an upstream document is available, read it too
4. Call MCP tool `validate_document` with content, doc_type, and optional upstream_content
5. Display results: section completeness, cross-ref coverage, missing/orphaned IDs
6. Suggest fixes for any issues found

### `/sekkei:status`

1. Locate `sekkei.config.yaml` in the project root
2. Call MCP tool `get_chain_status` with the config path
3. Display the document chain progress table (includes overview + glossary rows)
4. Display feature status table (per-feature doc completion)
5. Suggest the next document to generate based on chain status

### `/sekkei:export @doc --format=xlsx|pdf`

1. Load `sekkei.config.yaml` — get `output.directory`
2. Determine format from `--format` flag (default: xlsx)
3. Resolve source path:
   - For single-file docs: use `chain.{doc_type}.output` (e.g., `02-requirements.md`)
   - For split docs: locate `_index.yaml` in `{output.directory}/` and pass `manifest_path` to export tool
4. Set output path: `{output.directory}/{doc-type}.{format}`
5. Call MCP tool `export_document` with content, doc_type, format, output_path
6. Report: file path, file size, export status

### `/sekkei:translate @doc --lang=en`

1. Read the document to translate
2. Resolve source path from `sekkei.config.yaml` chain entry
3. Call MCP tool `translate_document` with content, source_lang, target_lang, glossary_path
4. Use the returned translation context + glossary terms to translate
5. Preserve all Markdown formatting, tables, and ID references
6. Save translated output to `{output.directory}/{doc-type}.{target_lang}.md`

### `/sekkei:glossary [add|list|find|export]`

1. Locate `{output.directory}/10-glossary.md` (create if not exists)
2. For `add`: ask for JP term, EN term, context → call `manage_glossary` with action "add"
3. For `list`: call `manage_glossary` with action "list" → display all terms
4. For `find`: ask for search query → call with action "find"
5. For `export`: call with action "export" → display as Markdown table

### `/sekkei:update @doc`

1. Read the current version of the upstream document
2. Read the previous version (from git or stored copy)
3. Read the downstream document to check
4. Call MCP tool `analyze_update` with upstream_old, upstream_new, downstream_content
5. Display: changed sections, changed IDs, impacted downstream sections
6. Ask user: regenerate affected sections? → if yes, call generate for impacted parts

## Document Chain

```
RFP → /sekkei:overview → /sekkei:functions-list → /sekkei:requirements
     → /sekkei:basic-design (shared) → /sekkei:basic-design (per feature)
     → /sekkei:detail-design (per feature) → /sekkei:test-spec
```

Output structure:
```
{output.directory}/
  01-overview.md           ← /sekkei:overview
  02-requirements.md       ← /sekkei:requirements
  03-system/               ← /sekkei:basic-design --shared
  04-functions-list.md     ← /sekkei:functions-list
  05-features/{name}/      ← /sekkei:basic-design, detail-design, test-spec
  06-data/                 ← /sekkei:migration-design
  07-operations/           ← /sekkei:operation-design
  08-test/                 ← /sekkei:test-spec --global
  09-ui/                   ← (manual or future sub-command)
  10-glossary.md           ← /sekkei:glossary
```

## References

- `references/doc-standards.md` — Japanese documentation standards and column headers
- `references/v-model-guide.md` — V-model workflow and chain-of-documents guide
