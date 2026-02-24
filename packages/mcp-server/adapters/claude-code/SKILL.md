---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: rfp, requirements, functions-list, nfr, project-plan, basic-design, security-design, detail-design, test-plan, ut-spec, it-spec, st-spec, uat-spec, matrix, sitemap, operation-design, migration-design, validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain.

## Document Generation Commands

### Requirements Phase
- `/sekkei:requirements @input`   — 要件定義書
- `/sekkei:nfr @requirements`     — 非機能要件定義書
- `/sekkei:functions-list @input` — 機能一覧
- `/sekkei:project-plan @req`     — プロジェクト計画書

### Design Phase
- `/sekkei:basic-design @input`     — 基本設計書
- `/sekkei:security-design @bd`     — セキュリティ設計書
- `/sekkei:detail-design @input`    — 詳細設計書

### Test Phase
- `/sekkei:test-plan @req`          — テスト計画書
- `/sekkei:ut-spec @detail-design`  — 単体テスト仕様書
- `/sekkei:it-spec @basic-design`   — 結合テスト仕様書
- `/sekkei:st-spec @basic-design`   — システムテスト仕様書
- `/sekkei:uat-spec @requirements`  — 受入テスト仕様書

## Other Commands

- `/sekkei:rfp [@project-name]` — Presales RFP lifecycle (analyze → Q&A → proposal → scope freeze)
- `/sekkei:matrix` — Generate CRUD図 or トレーサビリティマトリックス and export to Excel
- `/sekkei:sitemap` — Generate サイトマップ (System Structure Map) with page hierarchy
- `/sekkei:operation-design @input` — Generate 運用設計書 (Operation Design)
- `/sekkei:migration-design @input` — Generate 移行設計書 (Migration Design)
- `/sekkei:validate @doc` — Validate document completeness and cross-references
- `/sekkei:status` — Show document chain progress
- `/sekkei:export @doc --format=xlsx|pdf|docx` — Export document to Excel, PDF, or Word
- `/sekkei:translate @doc --lang=en` — Translate document with glossary context
- `/sekkei:glossary [add|list|find|export|import]` — Manage project terminology
- `/sekkei:update @doc` — Detect upstream changes and impacted sections
- `/sekkei:diff-visual @before @after` — Generate color-coded revision Excel (朱書き)
- `/sekkei:plan @doc-type` — Create generation plan for large documents (auto-triggered in split mode)
- `/sekkei:implement @plan-path` — Execute a generation plan phase by phase
- `/sekkei:preview` — Start VitePress docs preview server (`--guide` for user guide)
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

### `/sekkei:rfp [@project-name]`

End-to-end presales workflow. Resumable. Deterministic. File-based state.

**State management:** Use MCP tool `manage_rfp_workspace` for all workspace operations.
**Analysis instructions:** Read MCP resource `rfp://instructions/{flow}` for each analysis phase.
**Supplementary context:** `references/rfp-command.md`, `references/rfp-manager.md`, `references/rfp-loop.md`.

1. Call `manage_rfp_workspace(action: "status", workspace_path: ".")` — if workspace missing, call with `action: "create", project_name: "<name>"`
2. Read routing: `rfp://instructions/routing` → get phase→flow mapping
3. Route per current phase:
   - `RFP_RECEIVED` → read `rfp://instructions/analyze` → Flow 1
   - `ANALYZING` → read `rfp://instructions/questions` → Flow 2
   - `QNA_GENERATION` → Ask: wait for client or BUILD_NOW?
   - `WAITING_CLIENT` → Check for client answers
   - `DRAFTING` → read `rfp://instructions/draft` → Flow 3
   - `CLIENT_ANSWERED` → read `rfp://instructions/impact` → Flow 4
   - `PROPOSAL_UPDATE` → read `rfp://instructions/proposal` → Flow 5
   - `SCOPE_FREEZE` → read `rfp://instructions/freeze` → Flow 6
4. Call `manage_rfp_workspace(action: "write", filename: "<output>", content: "<result>")` → save output
5. Call `manage_rfp_workspace(action: "transition", phase: "<next>")` → advance phase

**On SCOPE_FREEZE with HIGH/MEDIUM confidence:**
→ Prompt: "Scope frozen. Confidence: {level}. Run `/sekkei:requirements` with `05_proposal.md` as input? [Y/n]"

**Resume:** Run `/sekkei:rfp` again — tool detects existing workspace and resumes from last phase.

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
3. Call MCP tool `generate_document` with `doc_type: "requirements"`, the input content, `project_type`, and `language` from `sekkei.config.yaml project.language` (default: "ja"). Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese. Requirements is the FIRST doc after RFP — it defines REQ-xxx IDs.
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

**Prerequisite check (MUST run before interview):**
1. Check basic-design exists (3-tier check):
   a. If `sekkei.config.yaml` exists → check `chain.basic_design.status == "complete"` (preferred)
   b. Else if split config active → check at least one `{output.directory}/features/*/basic-design.md` exists
   c. Else → check `{output.directory}/03-system/basic-design.md` exists
   - If ALL checks fail → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. **Load upstream (mode-aware):**
   a. Read `sekkei.config.yaml` → check `split.detail-design` exists
   b. **If split mode:**
      - Read ALL `{output.directory}/shared/*.md` → shared_content
      - Read `{output.directory}/02-requirements/requirements.md` → req_content (if exists)
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - global_upstream = shared_content + "\n\n" + req_content + "\n\n" + fl_content
      - (Per-feature upstream assembled in §4 below)
   c. **If monolithic:**
      - Read `{output.directory}/03-system/basic-design.md` → bd_content
      - Read `{output.directory}/02-requirements/requirements.md` → req_content (if exists)
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - upstream_content = bd_content + "\n\n" + req_content + "\n\n" + fl_content

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
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Check for split config**: read `sekkei.config.yaml` → `split.detail-design`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in `split.detail-design.shared` config:
      - Call `generate_document` with `doc_type: "detail-design"`, `scope: "shared"`, `upstream_content: global_upstream`
      - Save to `shared/{section-name}.md`
   d. For each feature from functions-list:
      i. **Assemble per-feature upstream:**
         - Read `features/{feature-id}/basic-design.md` → feature_bd
         - Read `features/{feature-id}/screen-design.md` → feature_scr (if exists)
         - feature_upstream = global_upstream + "\n\n" + feature_bd + "\n\n" + feature_scr
      ii. Generate feature detail-design:
         - Call `generate_document(doc_type: "detail-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_content: feature_upstream)`
         - Save output to `features/{feature-id}/detail-design.md`
      iii. Update `_index.yaml` manifest entry
   e. Create/update `_index.yaml` manifest via manifest-manager
5. **If not split (default):**
   a. Use `upstream_content` prepared in prerequisite check above
   b. Call MCP tool `generate_document` with `doc_type: "detail-design"`, `language` from config (default: "ja"),
      `input_content: @input`, `upstream_content: upstream`. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   c. Use the returned template + AI instructions to generate the 詳細設計書
   d. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Module list with call relationships
      - Class specs: CLS-001 format with Mermaid class diagrams
      - API detail specs: endpoint, req/res schemas, error codes
      - Validation rules per screen field
      - Error message list with severity levels
      - Sequence diagrams (Mermaid) for key processing flows
      - Cross-reference SCR-xxx, TBL-xxx, API-xxx IDs from 基本設計書
   e. Save output to `{output.directory}/03-system/detail-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "detail_design"`:
   - **If split mode:** `status: "complete"`, `system_output: "03-system/"`, `features_output: "05-features/"`
   - **If monolithic:** `status: "complete"`, `output: "03-system/detail-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "detail-design"`.
   Show results as non-blocking.
8. Suggest next steps:
   > "Detail design complete. Next steps:
   > - `/sekkei:ut-spec` — generate 単体テスト仕様書
   > - `/sekkei:validate @detail-design` — validate cross-references"

### `/sekkei:nfr @requirements`

**Interview questions (ask before generating):**
- Which IPA NFUG categories are in scope? (可用性, 性能, セキュリティ, 拡張性, 運用保守性, 移行性)
- Target SLA values? (uptime %, response time, throughput)
- Compliance requirements? (個人情報保護法, SOC2, ISO27001, etc.)

1. Read the upstream 要件定義書 (or input)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "nfr"`, `upstream_content` (requirements), and `language` from config
4. Follow these rules strictly:
   - ID format: `NFR-001`
   - Each NFR MUST have a numeric 目標値 (no vague terms — use %, ms, RPS, hours)
   - Cover all 6 IPA NFUG categories: 可用性, 性能効率性, セキュリティ, 保守性, 移植性, 信頼性
   - Cross-reference REQ-xxx IDs from 要件定義書
5. Save output to `{output.directory}/02-requirements/nfr.md`
6. Update chain status: `nfr.status: complete`

### `/sekkei:security-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/03-system/basic-design.md` exists (or check `chain.basic_design.status`)
   - If missing → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. Read basic-design content as primary upstream
3. Optionally load requirements + nfr for fuller cross-referencing:
   - If `chain.requirements.output` exists → read as additional upstream
   - If `chain.nfr.output` exists → read as additional upstream
4. Concatenate all as `upstream_content` (requirements + nfr + basic-design)

**Interview questions (ask before generating):**
- Authentication method? (OAuth2, SAML, OpenID Connect, custom)
- Data classification levels? (公開, 社内, 機密, 極秘)
- Applicable compliance? (個人情報保護法, PCI-DSS, HIPAA, ISMS)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "security-design"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `SEC-001`
   - Address OWASP Top 10 risks explicitly
   - Specify TLS 1.3+ for all transport, bcrypt (cost≥12) or Argon2id for passwords
   - Cross-reference REQ-xxx, NFR-xxx IDs from requirements/nfr
   - Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from 基本設計書
5. Save output to `{output.directory}/03-system/security-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "security_design"`,
   `status: "complete"`, `output: "03-system/security-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "security-design"`.
   Show results as non-blocking.
8. Suggest next steps:
   > "Security design complete. Next steps:
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:validate @security-design` — validate cross-references"

### `/sekkei:project-plan @requirements`

**Interview questions (ask before generating):**
- Team size and composition? (developers, QA, PM, etc.)
- Target timeline and key milestones?
- Methodology? (waterfall, hybrid, agile-waterfall)
- Budget or effort constraints?

1. Read the upstream 要件定義書 (and 機能一覧 if available)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "project-plan"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `PP-001`
   - Include WBS table with task breakdown and owners
   - Include milestone table with dates and deliverables
   - Cross-reference REQ-xxx, F-xxx IDs from upstream
5. Save output to `{output.directory}/02-requirements/project-plan.md`
6. Update chain status: `project_plan.status: complete`

### `/sekkei:test-plan @requirements`

**Prerequisite check (MUST run before interview):**
1. Load `sekkei.config.yaml` — read `chain.requirements.status`
2. If `chain.requirements.status` != "complete" → **ABORT**. Tell user:
   > "Requirements not complete. Run `/sekkei:requirements` first."
3. Read requirements content from `chain.requirements.output`
4. Check `chain.nfr.status` — if "complete", also read nfr content
5. Check `chain.basic_design.status` — if "complete", also read basic-design content
6. Concatenate all as `upstream_content` (requirements + nfr + basic-design, in that order)

**Interview questions (ask before generating):**
- Test scope and what is out of scope?
- CI/CD integration and automation strategy?
- Environment constraints? (staging, UAT env, data masking)
- Testing tools and frameworks?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-plan"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `TP-001`
   - Define entry criteria and exit criteria for each test level (UT, IT, ST, UAT)
   - Cross-reference REQ-xxx, F-xxx, NFR-xxx IDs from upstream
5. Save output to `{output.directory}/08-test/test-plan.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "test_plan"`,
   `status: "complete"`, `output: "08-test/test-plan.md"`
7. Call MCP tool `validate_document` with saved content, `doc_type: "test-plan"`,
   and `upstream_content`. Show results as non-blocking.
8. Suggest next steps:
   > "Test plan complete. Next steps (based on V-model):
   > - `/sekkei:ut-spec @detail-design` — generate 単体テスト仕様書
   > - `/sekkei:it-spec @basic-design` — generate 結合テスト仕様書
   > - `/sekkei:st-spec @basic-design` — generate システムテスト仕様書
   > - `/sekkei:uat-spec @requirements` — generate 受入テスト仕様書"

### `/sekkei:ut-spec @detail-design`

**Prerequisite check (MUST run before interview):**
1. Call MCP tool `get_chain_status` with `config_path` — read full chain
2. If `chain.detail_design.status` != "complete" → **ABORT**. Tell user:
   > "Detail design not complete. Run `/sekkei:detail-design` first."
3. Read detail-design content from `chain.detail_design.output` (or `system_output` + `features_output` if split)
4. If `chain.test_plan.status` == "complete" → also read test-plan content (optional — provides test strategy context)
5. Concatenate as `upstream_content` (detail-design + test-plan if available)

**Interview questions (ask before generating):**
- Target modules/classes for unit testing?
- Testing framework? (Jest, JUnit, pytest, etc.)
- Coverage target (line/branch %)?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "ut-spec"`, `upstream_content` (detail-design + test-plan), and `language` from config
4. Follow these rules strictly:
   - ID format: `UT-001`
   - Cross-reference CLS-xxx and DD-xxx IDs from 詳細設計書
   - Cross-reference TP-xxx IDs from テスト計画書 (if loaded)
   - Minimum 5 test cases per module
   - テスト観点: 正常系 / 異常系 / 境界値 (all three required)
5. Save output:
   - Default: `{output.directory}/08-test/ut-spec.md`
   - Feature scope: `{output.directory}/05-features/{name}/ut-spec.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "ut_spec"`,
   `status: "complete"`, `output: <saved_path_from_step_5>`
7. Call MCP tool `validate_document` with saved content, `doc_type: "ut-spec"`,
   and `upstream_content`. Show results as non-blocking.

### `/sekkei:it-spec @basic-design`

**Prerequisite check (MUST run before interview):**
1. Call MCP tool `get_chain_status` with `config_path` — read full chain
2. If `chain.basic_design.status` != "complete" → **ABORT**. Tell user:
   > "Basic design not complete. Run `/sekkei:basic-design` first."
3. Read basic-design content from `chain.basic_design.output` (or `system_output` + `features_output` if split)
4. If `chain.test_plan.status` == "complete" → also read test-plan content (optional — provides test strategy context)
5. Concatenate as `upstream_content` (basic-design + test-plan if available)

**Interview questions (ask before generating):**
- Integration scope? (API-to-API, screen-to-API, DB integration, external services)
- Test doubles strategy? (mocks, stubs, contract tests)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "it-spec"`, `upstream_content` (basic-design + test-plan), and `language` from config
4. Follow these rules strictly:
   - ID format: `IT-001`
   - Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from 基本設計書
   - Cross-reference TP-xxx IDs from テスト計画書 (if loaded)
   - Verify interface contracts: request/response schemas, error codes
5. Save output:
   - Default: `{output.directory}/08-test/it-spec.md`
   - Feature scope: `{output.directory}/05-features/{name}/it-spec.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "it_spec"`,
   `status: "complete"`, `output: <saved_path_from_step_5>`
7. Call MCP tool `validate_document` with saved content, `doc_type: "it-spec"`,
   and `upstream_content`. Show results as non-blocking.

### `/sekkei:st-spec @basic-design`

**Prerequisite check (MUST run before interview):**
1. Call MCP tool `get_chain_status` with `config_path` — read full chain
2. If `chain.basic_design.status` != "complete" → **ABORT**. Tell user:
   > "Basic design not complete. Run `/sekkei:basic-design` first."
3. Read basic-design content from `chain.basic_design.output` (or `system_output` + `features_output` if split)
4. If `chain.functions_list.status` == "complete" → also read functions-list content
5. If `chain.test_plan.status` == "complete" → also read test-plan content (optional — provides test strategy context)
6. Concatenate as `upstream_content` (basic-design + functions-list + test-plan, in order of availability)

**Interview questions (ask before generating):**
- Key E2E business scenarios to validate?
- Performance test scope? (load, stress, soak targets)
- Security test scope? (OWASP, penetration testing)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "st-spec"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `ST-001`
   - Cross-reference SCR-xxx, TBL-xxx, F-xxx IDs from upstream
   - Cross-reference TP-xxx IDs from テスト計画書 (if loaded)
   - Include E2E scenarios, performance targets (numeric), and security test cases
   - System-level only — no per-feature split
5. Save output to `{output.directory}/08-test/st-spec.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "st_spec"`,
   `status: "complete"`, `output: "08-test/st-spec.md"`
7. Call MCP tool `validate_document` with saved content, `doc_type: "st-spec"`,
   and `upstream_content`. Show results as non-blocking.

### `/sekkei:uat-spec @requirements`

**Prerequisite check (MUST run before interview):**
1. Call MCP tool `get_chain_status` with `config_path` — read full chain
2. If `chain.requirements.status` != "complete" → **ABORT**. Tell user:
   > "Requirements not complete. Run `/sekkei:requirements` first."
3. Read requirements content from `chain.requirements.output`
4. If `chain.nfr.status` == "complete" → also read nfr content
5. If `chain.test_plan.status` == "complete" → also read test-plan content (optional — provides test strategy context)
6. Concatenate as `upstream_content` (requirements + nfr + test-plan, in order of availability)

**Interview questions (ask before generating):**
- Key business scenarios for acceptance?
- Who owns acceptance criteria sign-off? (business owner, PO, client)
- Sign-off process and criteria?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "uat-spec"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `UAT-001`
   - Cross-reference REQ-xxx and NFR-xxx IDs from upstream
   - Cross-reference TP-xxx IDs from テスト計画書 (if loaded)
   - Business scenario-based test cases (not technical)
   - System-level only — no per-feature split
5. Save output to `{output.directory}/08-test/uat-spec.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "uat_spec"`,
   `status: "complete"`, `output: "08-test/uat-spec.md"`
7. Call MCP tool `validate_document` with saved content, `doc_type: "uat-spec"`,
   and `upstream_content`. Show results as non-blocking.

### `/sekkei:operation-design @input`

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

### `/sekkei:migration-design @input`

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

### `/sekkei:matrix`

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

### `/sekkei:sitemap`

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

### `/sekkei:validate @doc`

#### If `@doc` specified (single document validation):

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory` (default: `sekkei-docs`)
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
8. Suggest fixes for issues found

#### If no `@doc` (full chain validation):

1. Load `sekkei.config.yaml` → get `config_path`
2. Call MCP tool `validate_chain` with `config_path`
3. Display chain-wide cross-reference report
4. Highlight broken links and orphaned IDs across all documents

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

### `/sekkei:glossary [add|list|find|export|import]`

1. **Load config**: Read `sekkei.config.yaml` → extract `output.directory`
2. **Resolve glossary path**: `{output.directory}/glossary.yaml` (create if not exists)
3. For `add`: ask JP term, EN term, VI term, context → call `manage_glossary` with action "add", `project_path`
4. For `list`: call `manage_glossary` with action "list", `project_path` → display all terms
5. For `find`: ask search query → call with action "find", `project_path`
6. For `export`: call with action "export", `project_path` → display Markdown table (ja/en/vi/context)
7. For `import`: ask for industry → call with action "import", `project_path`, `industry` → display imported/skipped counts

### `/sekkei:update @doc`

#### Standard mode (diff analysis):

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
7. Display: changed sections, changed IDs, impacted downstream sections
8. Ask user: regenerate affected sections? → if yes, call generate for impacted parts

#### Staleness mode:

1. Call MCP tool `analyze_update` with `check_staleness: true`, `config_path`
2. Display per-feature staleness scores and affected doc types

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

1. Run `npx @bienhoang/sekkei-preview` from the project root (or `node <sekkei-path>/packages/sekkei-preview/dist/cli.js`).
2. Docs dir resolved automatically: `--docs` flag → `sekkei-docs/` in CWD → `sekkei.config.yaml output.directory`.
3. If `sekkei-docs/index.md` missing, CLI auto-generates a homepage from `_index.yaml`.
4. Commands:
   - `npx @bienhoang/sekkei-preview` — dev server (default, hot-reload)
   - `npx @bienhoang/sekkei-preview --edit` — dev server with WYSIWYG editing enabled
   - `npx @bienhoang/sekkei-preview --guide` — open user guide
   - `npx @bienhoang/sekkei-preview --guide --edit` — open user guide with WYSIWYG editing
   - `npx @bienhoang/sekkei-preview build` — build static site
   - `npx @bienhoang/sekkei-preview serve` — serve built site
   - `npx @bienhoang/sekkei-preview --docs ./path --port 3000` — custom path + port
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
8. Without `--guide`, preview serves V-model spec docs from `sekkei-docs/`.

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
4. Note: "Package remains installed. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove."

### `/sekkei:rebuild`

1. Run CLI: `npx sekkei update`
2. Display build + copy progress
3. Show post-update health check
4. If health check passes: "Update complete. Restart Claude Code to activate."
5. Use `--skip-build` to skip the build step: `npx sekkei update --skip-build`

## Document Chain

Documents build on each other. Each downstream document cross-references IDs from upstream documents.

```
RFP (/sekkei:rfp)
  └─► Requirements (/sekkei:requirements)
        ├─► NFR (/sekkei:nfr)
        ├─► Functions List (/sekkei:functions-list)
        ├─► Project Plan (/sekkei:project-plan)
        └─► Glossary (/sekkei:glossary import|add)
              └─► Basic Design (/sekkei:basic-design)
                    ├─► Security Design (/sekkei:security-design)
                    ├─► Detail Design (/sekkei:detail-design)
                    └─► Test Plan (/sekkei:test-plan)        ← requirements + nfr + basic-design
                          ├─► UT Spec (/sekkei:ut-spec)      ← detail-design + test-plan
                          ├─► IT Spec (/sekkei:it-spec)      ← basic-design + test-plan
                          ├─► ST Spec (/sekkei:st-spec)      ← basic-design + functions-list + test-plan
                          └─► UAT Spec (/sekkei:uat-spec)    ← requirements + nfr + test-plan
```

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

- `references/rfp-command.md` — RFP entrypoint: routing table, UX patterns, delegation model
- `references/rfp-manager.md` — RFP workspace: state management, file persistence, recovery
- `references/rfp-loop.md` — RFP analysis: 6 presales flows, risk detection, Q&A generation
- `references/doc-standards.md` — Japanese documentation standards and column headers
- `references/v-model-guide.md` — V-model workflow and chain-of-documents guide
- `references/plan-orchestrator.md` — Plan orchestration logic for large document generation
