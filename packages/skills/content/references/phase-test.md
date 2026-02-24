> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Test Phase Commands

Command workflows for the test phase of the V-model document chain.
Parent: `SKILL.md` → Workflow Router → Test Phase.

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

## `/sekkei:ut-spec @detail-design`

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

## `/sekkei:it-spec @basic-design`

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

## `/sekkei:st-spec @basic-design`

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

## `/sekkei:uat-spec @requirements`

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
