# Test Phase Commands

Command workflows for the test phase of the V-model document chain.
Parent: `SKILL.md` → Workflow Router → Test Phase.

## `/sekkei:test-plan @requirements`

**Interview questions (ask before generating):**
- Test scope and what is out of scope?
- CI/CD integration and automation strategy?
- Environment constraints? (staging, UAT env, data masking)
- Testing tools and frameworks?

1. Read the upstream 要件定義書 and 基本設計書 (if available)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-plan"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `TP-001`
   - Define entry criteria and exit criteria for each test level (UT, IT, ST, UAT)
   - Cross-reference REQ-xxx, NFR-xxx IDs from upstream
5. Save output to `{output.directory}/08-test/test-plan.md`
6. Update chain status: `test_plan.status: complete`

## `/sekkei:ut-spec @detail-design`

**Interview questions (ask before generating):**
- Target modules/classes for unit testing?
- Testing framework? (Jest, JUnit, pytest, etc.)
- Coverage target (line/branch %)?

1. Read the upstream 詳細設計書 (optionally: `source_code_path` if source exists)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "ut-spec"`, `upstream_content` (detail-design), and `language` from config
4. Follow these rules strictly:
   - ID format: `UT-001`
   - Cross-reference CLS-xxx and DD-xxx IDs from 詳細設計書
   - Minimum 5 test cases per module
   - テスト観点: 正常系 / 異常系 / 境界値 (all three required)
5. Save output:
   - Default: `{output.directory}/08-test/ut-spec.md`
   - Feature scope: `{output.directory}/05-features/{name}/ut-spec.md`
6. Update chain status: `ut_spec.status: complete`

## `/sekkei:it-spec @basic-design`

**Interview questions (ask before generating):**
- Integration scope? (API-to-API, screen-to-API, DB integration, external services)
- Test doubles strategy? (mocks, stubs, contract tests)

1. Read the upstream 基本設計書
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "it-spec"`, `upstream_content` (basic-design), and `language` from config
4. Follow these rules strictly:
   - ID format: `IT-001`
   - Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from 基本設計書
   - Verify interface contracts: request/response schemas, error codes
5. Save output:
   - Default: `{output.directory}/08-test/it-spec.md`
   - Feature scope: `{output.directory}/05-features/{name}/it-spec.md`
6. Update chain status: `it_spec.status: complete`

## `/sekkei:st-spec @basic-design`

**Interview questions (ask before generating):**
- Key E2E business scenarios to validate?
- Performance test scope? (load, stress, soak targets)
- Security test scope? (OWASP, penetration testing)

1. Read the upstream 基本設計書 and 機能一覧 (if available)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "st-spec"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `ST-001`
   - Cross-reference SCR-xxx, TBL-xxx, F-xxx IDs from upstream
   - Include E2E scenarios, performance targets (numeric), and security test cases
   - System-level only — no per-feature split
5. Save output to `{output.directory}/08-test/st-spec.md`
6. Update chain status: `st_spec.status: complete`

## `/sekkei:uat-spec @requirements`

**Interview questions (ask before generating):**
- Key business scenarios for acceptance?
- Who owns acceptance criteria sign-off? (business owner, PO, client)
- Sign-off process and criteria?

1. Read the upstream 要件定義書 and 非機能要件定義書 (if available)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "uat-spec"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `UAT-001`
   - Cross-reference REQ-xxx and NFR-xxx IDs from upstream
   - Business scenario-based test cases (not technical)
   - System-level only — no per-feature split
5. Save output to `{output.directory}/08-test/uat-spec.md`
6. Update chain status: `uat_spec.status: complete`
