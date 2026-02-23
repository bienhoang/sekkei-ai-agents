# Requirements Phase Commands

Command workflows for the requirements phase of the V-model document chain.
Parent: `SKILL.md` → Workflow Router → Requirements Phase.

**V2 Chain Order:** RFP → requirements → { nfr, functions-list, project-plan }

## `/sekkei:requirements @input`

**Interview questions (ask before generating):**
- Are there specific compliance/regulatory requirements?
- Performance targets (response time, throughput)?
- Security requirements level?

1. Read the input (RFP, scope freeze document, or free-text requirements)
2. If `sekkei.config.yaml` exists, load project metadata and `project_type`
3. Call MCP tool `generate_document` with `doc_type: "requirements"`, the input content, `project_type`, and `language` from `sekkei.config.yaml project.language` (default: "ja"). Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
4. Use the returned template + AI instructions to generate the 要件定義書
5. Follow these rules strictly:
   - 10-section structure as defined in the template
   - Functional requirements: REQ-001 format
   - Non-functional requirements: NFR-001 format with measurable targets
   - This is the FIRST document after RFP — it defines REQ-xxx IDs that all downstream docs reference
   - Include acceptance criteria
6. Save output to `./sekkei-docs/requirements.md`
7. Update chain status: `requirements.status: complete`

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
   - ID format: `[PREFIX]-001` (derive prefix from 大分類)
   - 処理分類: 入力 / 照会 / 帳票 / バッチ
   - 優先度 & 難易度: 高 / 中 / 低
   - Cross-reference REQ-xxx IDs from upstream 要件定義書
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
6. Update chain status: `nfr.status: complete`

## `/sekkei:project-plan @requirements`

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
