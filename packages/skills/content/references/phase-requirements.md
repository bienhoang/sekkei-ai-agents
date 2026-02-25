> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Requirements Phase Commands

Command workflows for the requirements phase of the V-model document chain.
Parent: `SKILL.md` → Workflow Router → Requirements Phase.

**V2 Chain Order:** RFP → requirements → { functions-list, nfr, project-plan } (parallel after requirements)

## `/sekkei:requirements @input`

**Prerequisite check (MUST run before interview):**
1. If `@input` argument provided by user → input source confirmed, proceed
2. If no `@input`:
   a. Check if `{output.directory}/01-rfp/` directory exists and contains `.md` files
   b. If exists → glob all `.md` files in `{output.directory}/01-rfp/`, sort by filename, concatenate as input, proceed
3. If neither condition met → **ABORT**. Do NOT proceed to interview. Tell user:
   > "No input source available. Either provide input with `@input` or run `/sekkei:rfp` first to create the RFP workspace in `01-rfp/`."
4. Check `chain.requirements.status` in sekkei.config.yaml. If `in-progress`, warn: 'Requirements generation may already be in progress. Continue anyway? [Y/n]'

**Interview (2 rounds — ask each group in a single prompt):**

**Round 1 — Scope & Scale** (feeds §1 概要, §2 現状課題):
- What is the project scope? (confirm from RFP or clarify if no RFP)
- Target user count and scale? (affects NFR numeric targets)
- Performance targets? (response time, concurrent users, uptime SLA)

**Round 2 — Technical & Compliance** (feeds §3 要件定義, §4 制約条件):
- Are there compliance/regulatory requirements? (個人情報保護法, SOC2, ISO27001, etc.)
- Security requirements level? (basic, enterprise, government)
- Any technology constraints already decided? (platform, language, cloud provider)

**After interview, format answers as structured context block:**
```yaml
# Interview Context (inject into generate_document input_content prefix)
interview_context:
  scope: "{user's scope answer}"
  user_count: "{user's scale answer}"
  performance_targets: "{user's performance answer}"
  compliance: "{user's compliance answer}"
  security_level: "{user's security answer}"
  tech_constraints: "{user's tech answer}"
```
Prepend this YAML block to the input_content before calling generate_document.

1. Read 01-rfp/ workspace content if available (analysis, scope freeze, decisions)
   - If combined input exceeds 400KB, warn: 'Input is very large (>400KB). Consider summarizing or splitting by subsystem for better results.' Proceed if user confirms.
2. If @input provided, merge with RFP content as additional context
3. If `sekkei.config.yaml` exists, load project metadata and `project_type`
4. Call MCP tool `generate_document` with `doc_type: "requirements"`, input content, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input not Japanese.
5. Use the returned template + AI instructions to generate the 要件定義書
6. Follow these rules strictly:
   - 10-section structure as defined in the template
   - Functional requirements: REQ-001 format
   - Non-functional requirements: NFR-001 format with measurable targets
   - Trace each requirement back to RFP source via 関連RFP項目 column
   - Do NOT reference F-xxx — functions-list does not exist yet
   - This is the FIRST document after RFP — defines REQ-xxx IDs for all downstream docs
   - Include acceptance criteria for each major requirement
   - If `preset: agile` in sekkei.config.yaml, use user story format: 'As a [role], I want [feature], so that [benefit]' instead of detailed 機能要件一覧 table
7. Save output to `{output.directory}/02-requirements/requirements.md`
8. In parallel:
   a. Call MCP tool `validate_document` with saved content and `doc_type: "requirements"`
   b. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "requirements"`, `status: "complete"`, `output: "02-requirements/requirements.md"`
9. After both complete:
   - Show validation results (no issues / warnings / errors)
   - If validation returned errors: call `update_chain_status` again with `status: "in-progress"` to downgrade
10. Suggest next steps (can run in parallel):
   > "Requirements complete. Next steps (can run in parallel):
   > - `/sekkei:functions-list` — generate 機能一覧 from requirements
   > - `/sekkei:nfr` — generate detailed 非機能要件 from requirements"

## `/sekkei:functions-list @requirements`

**Interview questions (ask before generating):**
- What are the main subsystems/modules?
- Any specific processing types (batch jobs, reports)?
- Priority scheme preference (高/中/低 or phase-based)?

1. Read the upstream 要件定義書 (requirements) or input content
2. If `sekkei.config.yaml` exists, load project metadata
3. Read upstream requirements output file from chain config. Call MCP tool `generate_document` with `doc_type: "functions-list"`, `upstream_content` (requirements content), and `language` from `sekkei.config.yaml project.language` (default: "ja"). Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
4. Use the returned template + AI instructions to generate the 機能一覧
5. Follow these rules strictly:
   - 3-tier hierarchy: 大分類 → 中分類 → 小機能
   - ID format: `F-001` (sequential). For split mode with custom prefixes, use subsystem prefix (e.g., SAL-001)
   - 処理分類: 入力 / 照会 / 帳票 / バッチ / API / イベント / スケジューラ / Webhook
   - 優先度 & 難易度: 高 / 中 / 低
   - Cross-reference REQ-xxx IDs from upstream 要件定義書
   - Generate 10+ functions minimum
   - For large projects (>30 functions): split into sub-sections by 大分類 with separate tables
   - If `functions_list.extra_columns` in config, extra columns are appended after 備考
6. Save output to `{output.directory}/04-functions-list/functions-list.md`
7. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "functions-list"`, `status: "complete"`, `output: "04-functions-list/functions-list.md"`
8. Call MCP tool `validate_document` with saved content and `doc_type: "functions-list"`. Show results as non-blocking.
9. **Count 大分類 feature groups** from the generated `functions-list.md`:
   - Scan for distinct values in the 大分類 column of the 機能一覧 table
   - Derive a short feature ID for each (2–5 uppercase letters, e.g., "AUTH", "SALES", "REPORT")
10. **If count >= 3**, prompt the user:
   > "Detected {N} feature groups: {list}. Enable split mode? Split generates separate files per feature for basic-design, detail-design, and test-spec. Recommended for projects with 3+ features. [Y/n]"
11. **If user confirms split:**
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
12. **If user declines split (or count < 3):** proceed without changes. Monolithic flow remains default.

## `/sekkei:nfr @requirements`

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
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "nfr"`, `status: "complete"`, `output: "02-requirements/nfr.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "nfr"`. Show results as non-blocking.

## `/sekkei:project-plan @requirements`

**Prerequisite check (MUST run before interview):**
1. Load `sekkei.config.yaml` — read `chain.requirements.status` and `chain.requirements.output`
2. If `chain.requirements.status` != "complete" → **ABORT**. Tell user:
   > "Requirements not complete. Run `/sekkei:requirements` first."
3. Read requirements content from `chain.requirements.output` path
4. Check `chain.functions_list.status` — if "complete", also read `chain.functions_list.output` content
5. Concatenate both as `upstream_content` (requirements first, then functions-list if available)

**Interview questions (ask before generating):**
- Team size and composition? (developers, QA, PM, etc.)
- Target timeline and key milestones?
- Methodology? (waterfall, hybrid, agile-waterfall)
- Budget or effort constraints?

1. Use `upstream_content` prepared in prerequisite check above
2. Call MCP tool `generate_document` with `doc_type: "project-plan"`, `upstream_content` (requirements + optional functions-list), and `language` from config
3. Follow these rules strictly:
   - ID format: `PP-001`
   - Include WBS table with task breakdown and owners
   - Include milestone table with dates and deliverables
   - Cross-reference REQ-xxx IDs from upstream 要件定義書
   - Cross-reference F-xxx IDs from 機能一覧 if available in upstream_content
4. Save output to `{output.directory}/02-requirements/project-plan.md`
5. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "project_plan"`, `status: "complete"`, `output: "02-requirements/project-plan.md"`
6. Call MCP tool `validate_document` with saved content, `doc_type: "project-plan"`, and `upstream_content` (same content from prerequisite). Show results:
   - If no issues: "Validation passed."
   - If warnings: show as non-blocking warnings
   - If errors: show but do NOT abort — document already saved
7. Suggest next steps:
   > "Project plan complete. Next steps:
   > - `/sekkei:basic-design` — generate 基本設計書 from requirements + functions-list"
