# Requirements Phase Commands

Command workflows for the requirements phase of the V-model document chain.

**V2 Chain Order:** RFP → requirements → { functions-list, nfr, project-plan } (parallel after requirements)

## `/sekkei:requirements @input`

**Prerequisite check (MUST run before interview):**
1. If `@input` provided → proceed. Else check `{output.directory}/01-rfp/` for `.md` files → concatenate as input, proceed. If neither → **ABORT**: "No input source. Run `/sekkei:rfp` first."
2. Read `chain.requirements.status` from `sekkei.config.yaml` — if `in-progress`, warn: "Requirements generation may already be in progress. Continue? [Y/n]"

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
5. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate requirements admin + overview" (activeForm: "Generating admin + overview")
   - TaskCreate: "Generate functional requirements (§3.1)" (activeForm: "Generating functional requirements")
   - TaskCreate: "Generate non-functional requirements (§3.2)" (activeForm: "Generating non-functional requirements")
   - TaskCreate: "Generate constraints + acceptance criteria (§4-§8)" (activeForm: "Generating constraints + acceptance")
   - TaskCreate: "Validate requirements" (activeForm: "Validating requirements")
6. Use the returned template + AI instructions. Generate in **4 sequential stages** — save/append after each stage so user sees progress:

   - TaskUpdate: mark "admin + overview" in_progress
   **Stage 1 — Admin + §1 + §2** (write to file):
   Generate ONLY these sections using template structure + interview context + RFP input:
   - YAML frontmatter (from template)
   - 改訂履歴, 承認欄, 検印欄, 配布先, 用語集 (admin sections — fill placeholders)
   - §1 概要 (目的・背景, プロジェクト概要, 対象組織, 制約条件)
   - §2 現状課題 (現システム構成, 業務フロー, 課題分析, 改善目標)
   → **Save** to `{output.directory}/02-requirements/requirements.md`
   - TaskUpdate: mark "admin + overview" complete

   - TaskUpdate: mark "functional requirements" in_progress
   **Stage 2 — §3.1 機能要件** (append to file):
   Using Stage 1 output as context for consistency, generate ONLY:
   - §3 header + §3.1 機能要件:
     - §3.1.1 ユーザーロール
     - §3.1.2 ユースケース
     - §3.1.3 機能要件一覧 (11-column table, REQ-001 format)
     - §3.1.4 業務フロー図
   → **Append** to requirements.md
   - TaskUpdate: mark "functional requirements" complete

   - TaskUpdate: mark "non-functional requirements" in_progress
   **Stage 3 — §3.2 非機能要件** (append to file):
   Using Stage 1+2 output as context (reference REQ-xxx IDs from Stage 2), generate ONLY:
   - §3.2 非機能要件 (6-column NFR table, NFR-001 format with numeric targets)
   → **Append** to requirements.md
   - TaskUpdate: mark "non-functional requirements" complete

   - TaskUpdate: mark "constraints + acceptance" in_progress
   **Stage 4 — §4-§8** (append to file):
   Using Stage 1+2+3 output as context, generate ONLY:
   - §4 制約条件・前提条件 (技術的制約, 予算, 法的制約, 前提条件)
   - §5 受け入れ基準 (機能的, 非機能的, サインオフ条件)
   - §6 対象外・今後の検討事項
   - §7 用語定義・参考資料 (専門用語定義表, 関連ドキュメント)
   - §8 附録 (ユースケース記述, 業務ルール, 連携仕様)
   → **Append** to requirements.md
   - TaskUpdate: mark "constraints + acceptance" complete

7. Follow these rules strictly across ALL stages:
   - Functional requirements: REQ-001 format (sequential within Stage 2)
   - Non-functional requirements: NFR-001 format with measurable targets (Stage 3)
   - Trace each requirement back to RFP source via 関連RFP項目 column
   - Do NOT reference F-xxx — functions-list does not exist yet
   - This is the FIRST document after RFP — defines REQ-xxx IDs for all downstream docs
   - Include acceptance criteria for each major requirement (Stage 4 §5)
   - If `preset: agile` in sekkei.config.yaml, use user story format: 'As a [role], I want [feature], so that [benefit]' instead of detailed 機能要件一覧 table
8. After all 4 stages complete, read the full file content for validation in step 9.
9. TaskUpdate: mark "Validate requirements" in_progress
10. In parallel:
    a. Call MCP tool `validate_document` with saved content and `doc_type: "requirements"`
    b. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "requirements"`, `status: "complete"`, `output: "02-requirements/requirements.md"`
11. After both complete:
    - Show validation results (no issues / warnings / errors)
    - If validation returned errors: call `update_chain_status` again with `status: "in-progress"` to downgrade
    - TaskUpdate: mark "Validate requirements" complete
12. Suggest next steps (can run in parallel):
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
4. **Pre-scan upstream content**: Analyze the requirements document to identify distinct 大分類 (major category) groups. List each group name.
5. **Fallback check**: If <= 2 大分類 groups detected, generate monolithically (single call as before — skip to step 12).
6. **Create progress tasks** (follow `references/progressive-generation.md` Step 3):
   - TaskCreate: "Generate functions-list header" (activeForm: "Generating header sections")
   - TaskCreate: "Generate {大分類名} functions" for each group (activeForm: "Generating {大分類名} functions")
   - TaskCreate: "Generate functions-list summary" (activeForm: "Generating summary")
   - TaskCreate: "Validate functions-list" (activeForm: "Validating functions-list")
7. **Stage 1 — Header** (follow `references/progressive-generation.md` Step 4):
   - TaskUpdate: mark header task in_progress
   - Generate ONLY: YAML frontmatter + 改訂履歴 + 承認欄 + プロジェクト情報 + §1 機能概要
   - Follow these rules: 3-tier hierarchy: 大分類 → 中分類 → 小機能. If `functions_list.extra_columns` in config, extra columns are appended after 備考.
   - **Write** to `{output.directory}/04-functions-list/functions-list.md`
   - TaskUpdate: mark header task complete
8. **Stage 2..N — Per-大分類 content** (follow `references/progressive-generation.md` Step 5):
   For each 大分類 group from pre-scan:
   - TaskUpdate: mark this group's task in_progress
   - Read existing file content
   - Generate ONLY: `## 機能一覧表 — {大分類名}` sub-table (F-xxx rows for this group)
   - ID format: `F-001` (sequential). For split mode with custom prefixes, use subsystem prefix (e.g., SAL-001)
   - 処理分類: 入力 / 照会 / 帳票 / バッチ / API / イベント / スケジューラ / Webhook
   - 優先度 & 難易度: 高 / 中 / 低
   - Cross-reference REQ-xxx IDs from upstream 要件定義書
   - Pass existing content for ID continuity (continue F-xxx from last ID in existing content)
   - **Append** to functions-list.md
   - TaskUpdate: mark this group's task complete
9. **Stage N+1 — Summary** (follow `references/progressive-generation.md` Step 6):
   - TaskUpdate: mark summary task in_progress
   - Read full file content
   - Generate ONLY: 集計 section (function counts per 大分類, total)
   - **Append** to functions-list.md
   - TaskUpdate: mark summary task complete
10. (If monolithic fallback from step 5): Use the returned template + AI instructions to generate the full 機能一覧:
    - 3-tier hierarchy: 大分類 → 中分類 → 小機能
    - ID format: `F-001` (sequential). For split mode with custom prefixes, use subsystem prefix (e.g., SAL-001)
    - 処理分類: 入力 / 照会 / 帳票 / バッチ / API / イベント / スケジューラ / Webhook
    - 優先度 & 難易度: 高 / 中 / 低
    - Cross-reference REQ-xxx IDs from upstream 要件定義書
    - Generate 10+ functions minimum
    - For large projects (>30 functions): split into sub-sections by 大分類 with separate tables
    - If `functions_list.extra_columns` in config, extra columns are appended after 備考
11. Save output to `{output.directory}/04-functions-list/functions-list.md` (already done if progressive)
12. TaskUpdate: mark validate task in_progress
13. In parallel:
    a. Call MCP tool `validate_document` with saved content and `doc_type: "functions-list"`
    b. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "functions-list"`, `status: "complete"`, `output: "04-functions-list/functions-list.md"`
14. After both complete:
    - **Post-generation validation (mandatory):** If validation reports errors (missing sections, broken cross-refs): fix inline and call `update_chain_status` with `status: "in-progress"` to downgrade. If validation passes: proceed.
    - TaskUpdate: mark validate task complete
16. **Count 大分類 feature groups** from the generated `functions-list.md`:
    - Scan for distinct values in the 大分類 column of the 機能一覧 table
    - Derive a short feature ID for each (2–5 uppercase letters, e.g., "AUTH", "SALES", "REPORT")
17. **If count >= 3**, prompt the user:
    > "Detected {N} feature groups: {list}. Enable split mode? Split generates separate files per feature for basic-design, detail-design, and test-spec. Recommended for projects with 3+ features. [Y/n]"
18. **If user confirms split:**
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
19. **If user declines split (or count < 3):** proceed without changes. Monolithic flow remains default.

## `/sekkei:nfr @requirements`

**Interview questions (ask before generating):**
- Which IPA NFUG categories are in scope? (可用性, 性能, セキュリティ, 拡張性, 運用保守性, 移行性)
- Target SLA values? (uptime %, response time, throughput)
- Compliance requirements? (個人情報保護法, SOC2, ISO27001, etc.)

1. Read the upstream 要件定義書 (or input)
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "nfr"`, `upstream_content` (requirements), and `language` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate NFR header + overview" (activeForm: "Generating NFR header")
   - TaskCreate: "Generate NFR master table (§3)" (activeForm: "Generating NFR master table")
   - TaskCreate: "Generate IPA category details (§4-§9)" (activeForm: "Generating IPA category details")
   - TaskCreate: "Generate NFR references (§10)" (activeForm: "Generating NFR references")
   - TaskCreate: "Validate NFR" (activeForm: "Validating NFR")
5. **Stage 1 — Header + Overview**:
   - TaskUpdate: mark header task in_progress
   - Generate ONLY: YAML frontmatter + 改訂履歴 + 承認欄 + §1 概要 + §2 IPAグレード基準
   - **Write** to `{output.directory}/02-requirements/nfr.md`
   - TaskUpdate: mark header task complete
6. **Stage 2 — NFR Master Table**:
   - TaskUpdate: mark master table task in_progress
   - Read existing file content
   - Generate ONLY: §3 非機能要件一覧 (NFR-xxx master table covering all 6 categories)
   - ID format: `NFR-001`. Each NFR MUST have a numeric 目標値 (no vague terms — use %, ms, RPS, hours)
   - Pass existing content for ID continuity
   - **Append** to nfr.md
   - TaskUpdate: mark master table task complete
7. **Stage 3 — IPA Category Details**:
   - TaskUpdate: mark IPA details task in_progress
   - Read existing file content
   - Generate ONLY: §4 可用性 + §5 性能効率性 + §6 運用保守性 + §7 移行性 + §8 セキュリティ + §9 システム環境
   - Cover all 6 IPA NFUG categories: 可用性, 性能効率性, セキュリティ, 保守性, 移植性, 信頼性
   - Cross-reference REQ-xxx IDs from 要件定義書
   - Pass existing content (references NFR-xxx IDs from §3)
   - **Append** to nfr.md
   - TaskUpdate: mark IPA details task complete
8. **Stage 4 — References**:
   - TaskUpdate: mark references task in_progress
   - Read existing file content
   - Generate ONLY: §10 参考資料
   - **Append** to nfr.md
   - TaskUpdate: mark references task complete
9. TaskUpdate: mark validate task in_progress
10. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "nfr"`, `status: "complete"`, `output: "02-requirements/nfr.md"`
11. Call MCP tool `validate_document` with saved content and `doc_type: "nfr"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
12. TaskUpdate: mark validate task complete

## `/sekkei:project-plan @requirements`

**Prerequisite check (MUST run before interview):**
1. Read `chain.requirements.status` from `sekkei.config.yaml` — abort if not `"complete"`: "Requirements not complete. Run `/sekkei:requirements` first."
2. Read upstream from `chain.requirements.output`; if `chain.functions_list.status` is `"complete"`, also read `chain.functions_list.output`
3. Concatenate as `upstream_content` (requirements first, functions-list if available) and pass to `generate_document`

**Interview questions (ask before generating):**
- Team size and composition? (developers, QA, PM, etc.)
- Target timeline and key milestones?
- Methodology? (waterfall, hybrid, agile-waterfall)
- Budget or effort constraints?

1. Use `upstream_content` prepared in prerequisite check above
2. Call MCP tool `generate_document` with `doc_type: "project-plan"`, `upstream_content` (requirements + optional functions-list), and `language` from config
3. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate project plan header + overview" (activeForm: "Generating project plan header")
   - TaskCreate: "Generate WBS + milestones (§3-§4)" (activeForm: "Generating WBS + milestones")
   - TaskCreate: "Generate risk + quality plan (§5-§6)" (activeForm: "Generating risk + quality plan")
   - TaskCreate: "Validate project plan" (activeForm: "Validating project plan")
4. **Stage 1 — Header + Overview**:
   - TaskUpdate: mark header task in_progress
   - Generate ONLY: YAML frontmatter + 改訂履歴 + 承認欄 + §1 プロジェクト概要 + §2 体制
   - **Write** to `{output.directory}/02-requirements/project-plan.md`
   - TaskUpdate: mark header task complete
5. **Stage 2 — WBS + Milestones**:
   - TaskUpdate: mark WBS task in_progress
   - Read existing file content
   - Generate ONLY: §3 WBS table (PP-xxx IDs) + §4 マイルストーン
   - ID format: `PP-001`. Include WBS table with task breakdown and owners. Include milestone table with dates and deliverables.
   - Cross-reference REQ-xxx IDs from upstream 要件定義書. Cross-reference F-xxx IDs from 機能一覧 if available.
   - Pass existing content for ID continuity
   - **Append** to project-plan.md
   - TaskUpdate: mark WBS task complete
6. **Stage 3 — Risk + Quality**:
   - TaskUpdate: mark risk task in_progress
   - Read existing file content
   - Generate ONLY: §5 リスク管理 + §6 品質計画
   - Pass existing content (references PP-xxx from §3)
   - **Append** to project-plan.md
   - TaskUpdate: mark risk task complete
7. TaskUpdate: mark validate task in_progress
8. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "project_plan"`, `status: "complete"`, `output: "02-requirements/project-plan.md"`
9. Call MCP tool `validate_document` with saved content, `doc_type: "project-plan"`, and `upstream_content` (same content from prerequisite). Show results:
   - If no issues: "Validation passed."
   - If warnings: show as non-blocking warnings
   - If errors: show but do NOT abort — document already saved
10. TaskUpdate: mark validate task complete
11. Suggest next steps:
   > "Project plan complete. Next steps:
   > - `/sekkei:basic-design` — generate 基本設計書 from requirements + functions-list"
