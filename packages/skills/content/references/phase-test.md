# Test Phase Commands

Command workflows for the test phase of the V-model document chain.

## Split Mode Detection

Before generating test specs (ut-spec, it-spec), check for split mode:

1. Call MCP tool `manage_plan(action="detect", workspace_path, config_path, doc_type="test-spec")`
2. Response: `{ should_trigger, reason, feature_count, has_active_plan, plan_path? }`
3. If `should_trigger=true` and `has_active_plan=false`:
   → Prompt user: "Detected {feature_count} features in split mode. Create a test-spec generation plan first? [Y/n]"
   - If Y: run `/sekkei:plan test-spec` → run `/sekkei:implement @{returned-plan-path}` → stop
   - If N: continue with normal generation below
4. If `should_trigger=true` and `has_active_plan=true`:
   → Ask user: "An active test-spec plan exists. Resume it or generate normally? [Resume / Generate Normally]"
   - If Resume: run `/sekkei:implement @{plan_path}` → stop
   - If Generate Normally: continue below
5. If `should_trigger=false`: continue with normal generation below

Note: st-spec and uat-spec are system-level only (no per-feature split) — skip detect for these.

---

## `/sekkei:test-plan @requirements`

**Prerequisite check (MUST run before interview):**
1. Read `chain.requirements.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:requirements` first."
2. Read upstream from `chain.requirements.output`; also load nfr and basic-design if their chain status is `"complete"`
3. Concatenate as `upstream_content` (requirements + nfr + basic-design) and pass to `generate_document`

**Interview questions (ask before generating):**
- Test scope and what is out of scope?
- CI/CD integration and automation strategy?
- Environment constraints? (staging, UAT env, data masking)
- Testing tools and frameworks?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-plan"`, `upstream_content`, and `language` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate test plan header + strategy" (activeForm: "Generating test plan header")
   - TaskCreate: "Generate test environment + schedule (§3-§6)" (activeForm: "Generating test environment + schedule")
   - TaskCreate: "Generate completion criteria (§7)" (activeForm: "Generating completion criteria")
   - TaskCreate: "Validate test plan" (activeForm: "Validating test plan")
5. **Stage 1 — Header + Strategy**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin sections + §1 テスト方針 + §2 テスト戦略 (TP-xxx IDs) →
   ID format: `TP-001`. Cross-reference REQ-xxx, F-xxx, NFR-xxx from upstream →
   **Write** to `{output.directory}/08-test/test-plan.md` → TaskUpdate complete
6. **Stage 2 — Environment + Schedule**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 テスト環境 + §4 スケジュール + §5 体制 + §6 リスク →
   Define entry criteria and exit criteria for each test level (UT, IT, ST, UAT) →
   Pass existing content for TP-xxx continuity → **Append** → TaskUpdate complete
7. **Stage 3 — Completion Criteria**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §7 完了基準 →
   Pass existing content (references all prior TP-xxx) → **Append** → TaskUpdate complete
8. TaskUpdate: validate in_progress
9. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "test_plan"`,
   `status: "complete"`, `output: "08-test/test-plan.md"`
10. Call MCP tool `validate_document` with saved content, `doc_type: "test-plan"`,
    and `upstream_content`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
11. TaskUpdate: validate complete
12. Suggest next steps:
   > "Test plan complete. Next steps (based on V-model):
   > - `/sekkei:ut-spec @detail-design` — generate 単体テスト仕様書
   > - `/sekkei:it-spec @basic-design` — generate 結合テスト仕様書
   > - `/sekkei:st-spec @basic-design` — generate システムテスト仕様書
   > - `/sekkei:uat-spec @requirements` — generate 受入テスト仕様書"

## `/sekkei:ut-spec @detail-design`

**Prerequisite check (MUST run before interview):**
1. Read `chain.detail_design.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:detail-design` first."
2. Read upstream from `chain.detail_design.output` (or `system_output` + `features_output` if split); also load test-plan if `chain.test_plan.status == "complete"`
3. Concatenate as `upstream_content` (detail-design + test-plan if available) and pass to `generate_document`

**Interview questions (ask before generating):**
- Target modules/classes for unit testing?
- Testing framework? (Jest, JUnit, pytest, etc.)
- Coverage target (line/branch %)?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "ut-spec"`, `upstream_content` (detail-design + test-plan), and `language` from config
4. **Pre-scan**: Extract CLS-xxx module IDs from upstream detail-design. Group into batches of 2-3 modules.
5. **Fallback check**: If total CLS-xxx <= 2, generate monolithically (skip to step 11 — single call with all rules, save, then validate).
6. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate UT spec header + test design" (activeForm: "Generating UT spec header")
   - TaskCreate: "Generate test cases for {CLS-xxx..CLS-yyy}" for each batch (activeForm: "Generating test cases for {module names}")
   - TaskCreate: "Generate traceability matrix" (activeForm: "Generating traceability matrix")
   - TaskCreate: "Generate defect report template" (activeForm: "Generating defect report template")
   - TaskCreate: "Validate UT spec" (activeForm: "Validating UT spec")
7. **Stage 1 — Header + Test Design**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 テスト設計 →
   **Write** to output path → TaskUpdate complete
8. **Stage 2..N — Per-Module Test Cases** (per CLS-xxx batch): For each batch:
   TaskUpdate in_progress →
   Read existing file; generate ONLY: §2 test case sub-section for this batch →
   ID format: `UT-001`. UT-xxx IDs continue from last stage (pass existing content) →
   Minimum 5 test cases per module. テスト観点: 正常系 / 異常系 / 境界値 (all three required) →
   Cross-reference CLS-xxx and DD-xxx from 詳細設計書. Cross-reference TP-xxx from テスト計画書 →
   **Append** → TaskUpdate complete
9. **Stage N+1 — Traceability**: TaskUpdate in_progress →
   Read full file; generate ONLY: §3 トレーサビリティ (UT-xxx -> CLS-xxx -> REQ-xxx matrix) →
   **Append** → TaskUpdate complete
10. **Stage N+2 — Defect Report**: TaskUpdate in_progress →
    Generate ONLY: §4 デフェクト報告 (skeleton template, minimal content) →
    **Append** → TaskUpdate complete
11. (Monolithic fallback): Follow these rules for single-call generation:
    - ID format: `UT-001`. Cross-reference CLS-xxx, DD-xxx, TP-xxx
    - Minimum 5 test cases per module. テスト観点: 正常系 / 異常系 / 境界値
12. Save output (already done if progressive):
    - Default: `{output.directory}/08-test/ut-spec.md`
    - Feature scope: `{output.directory}/05-features/{name}/ut-spec.md`
13. TaskUpdate: validate in_progress
14. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "ut_spec"`,
    `status: "complete"`, `output: <saved_path_from_step_12>`
15. Call MCP tool `validate_document` with saved content, `doc_type: "ut-spec"`,
    and `upstream_content`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
16. TaskUpdate: validate complete

## `/sekkei:it-spec @basic-design`

**Prerequisite check (MUST run before interview):**
1. Read `chain.basic_design.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:basic-design` first."
2. Read upstream from `chain.basic_design.output` (or split outputs); also load test-plan if `chain.test_plan.status == "complete"`
3. Concatenate as `upstream_content` (basic-design + test-plan if available) and pass to `generate_document`

**Interview questions (ask before generating):**
- Integration scope? (API-to-API, screen-to-API, DB integration, external services)
- Test doubles strategy? (mocks, stubs, contract tests)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "it-spec"`, `upstream_content` (basic-design + test-plan), and `language` from config
4. **Pre-scan**: Extract API-xxx IDs from upstream basic-design. Group by subsystem/module (2-4 APIs per stage).
5. **Fallback check**: If total API groups <= 2, generate monolithically (skip to step 10 — single call with all rules, save, then validate).
6. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate IT spec header + interface list" (activeForm: "Generating IT spec header")
   - TaskCreate: "Generate integration tests for {API group}" for each group (activeForm: "Generating integration tests")
   - TaskCreate: "Generate IT traceability" (activeForm: "Generating IT traceability")
   - TaskCreate: "Validate IT spec" (activeForm: "Validating IT spec")
7. **Stage 1 — Header + Interface List**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 結合テスト方針 + インターフェース一覧 →
   **Write** to output path → TaskUpdate complete
8. **Stage 2..N — Per-API Group Test Cases**: For each API group:
   TaskUpdate in_progress →
   Read existing file; generate ONLY: §2 テストケース for this API integration group (IT-xxx cases) →
   ID format: `IT-001`. Verify interface contracts: request/response schemas, error codes →
   Cross-reference API-xxx, SCR-xxx, TBL-xxx from 基本設計書. Cross-reference TP-xxx from テスト計画書 →
   Pass existing content for IT-xxx continuity → **Append** → TaskUpdate complete
9. **Stage N+1 — Traceability**: TaskUpdate in_progress →
   Read full file; generate ONLY: §3 トレーサビリティ →
   **Append** → TaskUpdate complete
10. (Monolithic fallback): ID format: `IT-001`. Cross-reference API-xxx, SCR-xxx, TBL-xxx, TP-xxx. Verify interface contracts.
11. Save output (already done if progressive):
    - Default: `{output.directory}/08-test/it-spec.md`
    - Feature scope: `{output.directory}/05-features/{name}/it-spec.md`
12. TaskUpdate: validate in_progress
13. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "it_spec"`,
    `status: "complete"`, `output: <saved_path_from_step_11>`
14. Call MCP tool `validate_document` with saved content, `doc_type: "it-spec"`,
    and `upstream_content`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
15. TaskUpdate: validate complete

## `/sekkei:st-spec @basic-design`

**Prerequisite check (MUST run before interview):**
1. Read `chain.basic_design.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:basic-design` first."
2. Read upstream from `chain.basic_design.output`; also load functions-list and test-plan if their chain status is `"complete"`
3. Concatenate as `upstream_content` (basic-design + functions-list + test-plan) and pass to `generate_document`

**Interview questions (ask before generating):**
- Key E2E business scenarios to validate?
- Performance test scope? (load, stress, soak targets)
- Security test scope? (OWASP, penetration testing)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "st-spec"`, `upstream_content`, and `language` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate ST spec header + scenario list" (activeForm: "Generating ST spec header")
   - TaskCreate: "Generate E2E test cases" (activeForm: "Generating E2E test cases")
   - TaskCreate: "Generate performance + security tests" (activeForm: "Generating performance + security tests")
   - TaskCreate: "Validate ST spec" (activeForm: "Validating ST spec")
5. **Stage 1 — Header + Scenario List**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 E2Eシナリオ一覧 (ST-xxx IDs) →
   ID format: `ST-001`. Cross-reference SCR-xxx, TBL-xxx, F-xxx from upstream →
   System-level only — no per-feature split →
   **Write** to `{output.directory}/08-test/st-spec.md` → TaskUpdate complete
6. **Stage 2 — E2E Test Cases**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §2 E2Eテストケース (scenario-based, largest section) →
   Cross-reference TP-xxx from テスト計画書 (if loaded). Pass existing content for ST-xxx continuity →
   Include E2E scenarios with performance targets (numeric) →
   **Append** → TaskUpdate complete
7. **Stage 3 — Performance + Security Tests**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 性能テスト + §4 セキュリティテスト →
   Include security test cases. Pass existing content →
   **Append** → TaskUpdate complete
8. TaskUpdate: validate in_progress
9. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "st_spec"`,
   `status: "complete"`, `output: "08-test/st-spec.md"`
10. Call MCP tool `validate_document` with saved content, `doc_type: "st-spec"`,
    and `upstream_content`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
11. TaskUpdate: validate complete

## `/sekkei:uat-spec @requirements`

**Prerequisite check (MUST run before interview):**
1. Read `chain.requirements.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:requirements` first."
2. Read upstream from `chain.requirements.output`; also load nfr and test-plan if their chain status is `"complete"`
3. Concatenate as `upstream_content` (requirements + nfr + test-plan) and pass to `generate_document`

**Interview questions (ask before generating):**
- Key business scenarios for acceptance?
- Who owns acceptance criteria sign-off? (business owner, PO, client)
- Sign-off process and criteria?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "uat-spec"`, `upstream_content`, and `language` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate UAT spec header + scenario list" (activeForm: "Generating UAT spec header")
   - TaskCreate: "Generate acceptance test cases" (activeForm: "Generating acceptance test cases")
   - TaskCreate: "Generate acceptance criteria + sign-off" (activeForm: "Generating acceptance criteria")
   - TaskCreate: "Validate UAT spec" (activeForm: "Validating UAT spec")
5. **Stage 1 — Header + Scenario List**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 受入テスト方針 + ビジネスシナリオ一覧 →
   ID format: `UAT-001`. Cross-reference REQ-xxx and NFR-xxx from upstream →
   System-level only — no per-feature split →
   **Write** to `{output.directory}/08-test/uat-spec.md` → TaskUpdate complete
6. **Stage 2 — Acceptance Test Cases**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §2 受入テストケース (UAT-xxx, business-scenario-based) →
   Cross-reference TP-xxx from テスト計画書 (if loaded). Business scenario-based (not technical) →
   Pass existing content for UAT-xxx continuity → **Append** → TaskUpdate complete
7. **Stage 3 — Acceptance Criteria + Sign-off**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 受入基準 + サインオフ条件 →
   Pass existing content → **Append** → TaskUpdate complete
8. TaskUpdate: validate in_progress
9. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "uat_spec"`,
   `status: "complete"`, `output: "08-test/uat-spec.md"`
10. Call MCP tool `validate_document` with saved content, `doc_type: "uat-spec"`,
    and `upstream_content`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
11. TaskUpdate: validate complete

## `/sekkei:test-evidence @test-spec`

**Prerequisite check (MUST run before interview):**
1. At least one test spec must exist (ut-spec, it-spec, st-spec, or uat-spec)
2. Load available test specs as `upstream_content`

**Interview questions (ask before generating):**
- Which test levels need evidence? (UT, IT, ST, UAT — all or specific)
- Evidence format? (screenshot, log, API response)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-evidence"`, `upstream_content`, `language` from config
4. Follow these rules strictly:
   - ID format: `EV-001`
   - One evidence row per test case ID from upstream
   - 9-column table: エビデンスID, テストケースID, テスト項目, 期待結果, 実施結果, スクリーンショット, 合否, テスター, 実施日
   - Summary section with pass/fail counts per test level
5. Save output to `{output.directory}/08-test/test-evidence.md`
6. Call MCP tool `validate_document` with saved content and `doc_type: "test-evidence"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.

## `/sekkei:test-result-report @test-specs`

**Prerequisite check (MUST run before interview):**
1. Read `chain.test_plan.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Run `/sekkei:test-plan` first."
2. Load test-plan + all available test specs (ut-spec, it-spec, st-spec, uat-spec) as `upstream_content`

**Interview questions (ask before generating):**
- Test completion date?
- Quality criteria thresholds? (e.g., pass rate ≥95%)
- Known issues to include?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-result-report"`, `upstream_content`, `language` from config
4. Follow these rules strictly:
   - ID format: `TR-001`
   - Result summary table per test level: 総件数, 合格, 不合格, 未実施, 合格率
   - Defect summary by severity: 件数, 解決済, 未解決
   - Go/No-Go judgment with quantitative criteria
   - Cross-reference TP-xxx, UT-xxx, IT-xxx, ST-xxx, UAT-xxx from upstream
5. Save output to `{output.directory}/08-test/test-result-report.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "test_result_report"`,
   `status: "complete"`, `output: "08-test/test-result-report.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "test-result-report"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
