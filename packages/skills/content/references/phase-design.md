# Design Phase Commands

Command workflows for the design phase of the V-model document chain.

## `/sekkei:architecture-design @requirements`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/02-requirements/requirements.md` exists — abort if missing: "Run `/sekkei:requirements` first."
2. Load requirements + nfr + functions-list (if available) as `upstream_content`

**Interview questions (ask before generating):**
- Architecture pattern? (monolith, microservice, serverless, event-driven)
- Cloud provider? (AWS, GCP, Azure, on-premise, hybrid)
- Development methodology? (Scrum, Waterfall, SAFe)
- Key NFR priorities? (availability, performance, security)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "architecture-design"`, `upstream_content`, `language` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate architecture header + design approach" (activeForm: "Generating architecture header")
   - TaskCreate: "Generate infrastructure + tech selection (§3-§4)" (activeForm: "Generating infrastructure design")
   - TaskCreate: "Generate operations design (§5)" (activeForm: "Generating operations design")
   - TaskCreate: "Validate architecture design" (activeForm: "Validating architecture design")
5. **Stage 1 — Header + Design Approach**:
   - TaskUpdate: in_progress
   - Generate ONLY: YAML frontmatter + admin sections + §1 システム方式 + §2 開発方式
   - ID format: `ARCH-001`. Cross-reference REQ-xxx, NFR-xxx from upstream.
   - **Write** to `{output.directory}/03-system/architecture-design.md`
   - TaskUpdate: complete
6. **Stage 2 — Infrastructure + Tech Selection**:
   - TaskUpdate: in_progress
   - Read existing file; generate ONLY: §3 HW/NW構成 (Mermaid topology diagram) + §4 技術選定 table
   - Technology selection table with rationale and alternatives
   - Pass existing content for ARCH-xxx continuity
   - **Append** to file
   - TaskUpdate: complete
7. **Stage 3 — Operations**:
   - TaskUpdate: in_progress
   - Read existing file; generate ONLY: §5 運用方式
   - Pass existing content
   - **Append** to file
   - TaskUpdate: complete
8. TaskUpdate: validate in_progress
9. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "architecture_design"`,
   `status: "complete"`, `output: "03-system/architecture-design.md"`
10. Call MCP tool `validate_document` with saved content and `doc_type: "architecture-design"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
11. TaskUpdate: validate complete
12. Suggest next steps:
   > "Architecture design complete. Next steps:
   > - `/sekkei:basic-design` — generate 基本設計書
   > - `/sekkei:validate @architecture-design` — validate cross-references"

---

## `/sekkei:basic-design @input`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/02-requirements/requirements.md` exists — abort if missing: "Run `/sekkei:requirements` first."
2. Verify `{output.directory}/04-functions-list/functions-list.md` exists — warn if missing (not blocking): "Functions-list not found; basic-design will only reference REQ-xxx IDs."
3. Pass both files as `upstream_content` to `generate_document` (requirements mandatory; functions-list if present)

**Interview questions (ask before generating):**
- What architecture pattern? (monolith, microservices, serverless)
- Key external system integrations?
- Database type preference? (PostgreSQL, MySQL, etc.)
- Authentication method? (OAuth, SAML, custom)

0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Call MCP tool `manage_plan(action="detect", workspace_path, config_path, doc_type="basic-design")`
   - Response: `{ should_trigger, reason, feature_count, has_active_plan, plan_path? }`
   - If `should_trigger=true` and `has_active_plan=false`:
     → Ask: "Detected {feature_count} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan basic-design` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
   - If `should_trigger=true` and `has_active_plan=true`:
     → Ask: "An active plan exists. Resume it or continue normally? [Resume / Continue Normally]"
     → If Resume: run `/sekkei:implement @{plan_path}`
1. Read the input (ideally the generated 要件定義書 or requirements summary)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Check for split config**: read `sekkei.config.yaml` → `split.basic-design`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in split config:
      - Call `generate_document` with `scope: "shared"`, `upstream_paths: ["02-requirements/requirements.md", "04-functions-list/functions-list.md"]`
      - Save to `shared/{section-name}.md`
   d. For each feature from functions-list:
      i. Generate feature basic-design **progressively** (follow `references/progressive-generation.md`):
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_paths: [...])`
         - TaskCreate: "Generate {feature_name} header" (activeForm: "Generating {feature_name} header")
         - TaskCreate: "Generate {feature_name} screens" (activeForm: "Generating {feature_name} screens")
         - TaskCreate: "Generate {feature_name} business flow" (activeForm: "Generating {feature_name} flow")
         - TaskCreate: "Generate {feature_name} summary" (activeForm: "Generating {feature_name} summary")
         - **Stage 1**: Generate admin + overview for this feature → **Write** to `features/{feature-id}/basic-design.md` → TaskUpdate complete
         - **Stage 2**: Read existing; generate §5 画面設計 for this feature's SCR-xxx → **Append** → TaskUpdate complete
         - **Stage 3**: Read existing; generate §3 業務フロー for this feature → **Append** → TaskUpdate complete
         - **Stage 4**: Read existing; generate remaining sections → **Append** → TaskUpdate complete
      ii. Generate per-feature screen-design (split mode only):
         - Construct screen_input = Screen Design Document Instructions (see below) + "\n\n## Feature Requirements\n" + {feature_input}
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: screen_input, upstream_paths: ["02-requirements/requirements.md", "04-functions-list/functions-list.md"])`
         - Save output to `features/{feature-id}/screen-design.md`
      iii. Suggest HTML mockup generation:
         - After screen-design.md is saved, inform user:
           "Screen design complete. Run `/sekkei:mockup` to generate HTML mockups, screenshot them, and embed PNGs into screen-design.md."
         - Do NOT auto-render — user triggers mockup generation explicitly
      iv. Update `_index.yaml` manifest entry for this feature to list both basic-design.md and screen-design.md files
   e. Create/update `_index.yaml` manifest via manifest-manager

**Screen Design Rules (split mode only):**
- Screen IDs use format SCR-{FEATURE_ID}-{seq} (e.g., SCR-AUTH-001)
- Each screen-design.md covers ALL screens for that feature
- 6 mandatory sections per screen: 画面レイアウト, 画面項目定義, バリデーション一覧, イベント一覧, 画面遷移, 権限
- Do NOT add per-screen sections to basic-design.md in split mode — reference screen-design.md instead
- The Screen Design Document Instructions block is provided by `buildScreenDesignInstruction(featureId, language)` from `generation-instructions.ts` — pass the project language from config
5. **If not split (default):**
   a. Call MCP tool `generate_document` with:
      - `doc_type: "basic-design"`, `language` from config
      - `input_content: @input`, `project_type` from config
      - `upstream_paths: ["02-requirements/requirements.md", "04-functions-list/functions-list.md"]`
      - **Do NOT use** `post_actions` — chain status updated explicitly after all stages complete
   b. **Create progress tasks** (follow `references/progressive-generation.md`):
      - TaskCreate: "Generate basic-design header + architecture" (activeForm: "Generating header + architecture")
      - TaskCreate: "Generate business flow + functions (§3-§4)" (activeForm: "Generating business flow")
      - TaskCreate: "Generate screen design (§5)" (activeForm: "Generating screen design")
      - TaskCreate: "Generate reports + DB design (§6-§7)" (activeForm: "Generating reports + DB design")
      - TaskCreate: "Generate external interfaces (§8)" (activeForm: "Generating external interfaces")
      - TaskCreate: "Generate NFR design + tech rationale (§9-§10)" (activeForm: "Generating NFR design")
      - TaskCreate: "Validate basic-design" (activeForm: "Validating basic-design")
   c. **Stage 1 — Header + Architecture**: TaskUpdate in_progress →
      Generate ONLY: YAML frontmatter + admin + §1 概要 + §2 システム構成 (Mermaid) →
      **Write** to `{output.directory}/03-system/basic-design.md` → TaskUpdate complete
   d. **Stage 2 — Business Flow + Functions**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §3 業務フロー + §4 機能一覧 →
      Cross-reference REQ-xxx and F-xxx IDs. Pass existing content for ID continuity →
      **Append** → TaskUpdate complete
   e. **Stage 3 — Screen Design**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §5 画面設計 (SCR-xxx IDs, 8 columns) →
      Pass existing content → **Append** → TaskUpdate complete
   f. **Stage 4 — Reports + DB Design**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §6 帳票設計 (RPT-xxx) + §7 DB設計 (TBL-xxx, ER diagram) →
      TBL-001 format (8 columns). Pass existing content → **Append** → TaskUpdate complete
   g. **Stage 5 — External Interfaces**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §8 外部インターフェース (API-xxx, 8 columns) →
      Pass existing content → **Append** → TaskUpdate complete
   h. **Stage 6 — NFR Design + Tech Rationale**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §9 非機能設計 + §10 技術選定根拠 →
      Pass existing content → **Append** → TaskUpdate complete
   i. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "basic_design"`, `status: "complete"`, `output: "03-system/basic-design.md"`
   j. **Suggest HTML mockup generation:**
      - Inform user: "Basic design complete with screen definitions. Run `/sekkei:mockup` to generate HTML mockups."
6. TaskUpdate: validate in_progress
7. Call MCP tool `validate_document` with saved content and `doc_type: "basic-design"`.
   **Post-generation validation (mandatory):** If validation reports errors (missing sections, broken cross-refs): fix inline before finalizing. If validation passes: proceed.
8. TaskUpdate: validate complete
9. Suggest next steps:
   > "Basic design complete. Next steps:
   > - `/sekkei:mockup` — generate HTML screen mockups
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:security-design` — generate セキュリティ設計書
   > - `/sekkei:validate @basic-design` — validate cross-references"

## `/sekkei:security-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists (or `chain.basic_design.status == "complete"`) — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design as primary upstream; also load requirements and nfr if `chain.*.output` paths exist
3. Concatenate as `upstream_content` (requirements + nfr + basic-design) and pass to `generate_document`

**Interview questions (ask before generating):**

Base questions (always ask):
- Authentication method? (OAuth2, SAML, OpenID Connect, JWT, custom)
- Data classification levels? (公開, 社内, 機密, 極秘)
- Applicable compliance? (個人情報保護法, PCI-DSS, HIPAA, ISMS, FISC, SOC2)
- Third-party integrations requiring security review? (payment, analytics, SSO providers)
- Cloud provider and infrastructure? (AWS, GCP, Azure, on-premise)

Conditional questions (check `project_type` in sekkei.config.yaml):
- If `saas`: Tenant isolation strategy? (shared DB / schema per tenant / DB per tenant)
- If `mobile`: Mobile-specific security? (certificate pinning, biometric auth, jailbreak detection)
- If `government`: Security clearance level? (一般, 秘, 機密)
- If `finance`: FISC/PCI-DSS compliance tier? (Level 1-4)
- If `healthcare`: 3省2ガイドライン compliance scope?
- If `microservice`: Service mesh / API gateway? (Istio, Kong, custom)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "security-design"`, `upstream_content` (including interview answers as context), `language` from config, and `project_type` from config
4. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate security header + policy" (activeForm: "Generating security header")
   - TaskCreate: "Generate core security (§3-§5)" (activeForm: "Generating core security measures")
   - TaskCreate: "Generate advanced security (§6-§8)" (activeForm: "Generating advanced security measures")
   - TaskCreate: "Generate optional security sections (§9-§12)" (activeForm: "Generating optional security sections")
   - TaskCreate: "Validate security design" (activeForm: "Validating security design")
5. **Stage 1 — Header + Policy**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 セキュリティ方針 + §2 対策一覧 (SEC-xxx IDs) →
   ID format: `SEC-001`. Cross-reference REQ-xxx, NFR-xxx from requirements/nfr. →
   **Write** to `{output.directory}/03-system/security-design.md` → TaskUpdate complete
6. **Stage 2 — Core Security**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 認証・認可 + §4 データ保護 + §5 通信セキュリティ →
   Address OWASP Top 10 risks. TLS 1.3+ for transport, bcrypt (cost≥12) or Argon2id for passwords. →
   Cross-reference API-xxx, SCR-xxx, TBL-xxx from 基本設計書. Pass existing content → **Append** → TaskUpdate complete
7. **Stage 3 — Advanced Security**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §6 脆弱性対策 + §7 監査ログ + §8 インシデント対応 →
   Pass existing content → **Append** → TaskUpdate complete
8. **Stage 4 — Optional Sections**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §9 APIセキュリティ + §10 鍵管理 + §11 サプライチェーン + §12 参考資料 →
   Pass existing content → **Append** → TaskUpdate complete
9. TaskUpdate: validate in_progress
10. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "security_design"`,
    `status: "complete"`, `output: "03-system/security-design.md"`
11. Call MCP tool `validate_document` with saved content and `doc_type: "security-design"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
12. TaskUpdate: validate complete
13. Suggest next steps:
   > "Security design complete. Next steps:
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:validate @security-design` — validate cross-references"

## `/sekkei:detail-design @input`

**Prerequisite check (MUST run before interview):**
1. Confirm basic-design exists: check `chain.basic_design.status == "complete"` in config, or any `features/*/basic-design.md`, or `03-system/basic-design.md` — abort if all fail: "Run `/sekkei:basic-design` first."
2. **Load upstream (mode-aware):**
   - **Split mode** (`split.detail-design` in config): global_upstream = `shared/*.md` + requirements.md + functions-list.md (per-feature upstream assembled in §4 below)
   - **Monolithic**: upstream_content = basic-design.md + requirements.md + functions-list.md (last two if they exist)

**Interview questions (ask before generating):**
- Programming language and framework?
- ORM preference?
- API style? (REST, GraphQL, gRPC)
- Error handling strategy?

0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Call MCP tool `manage_plan(action="detect", workspace_path, config_path, doc_type="detail-design")`
   - Response: `{ should_trigger, reason, feature_count, has_active_plan, plan_path? }`
   - If `should_trigger=true` and `has_active_plan=false`:
     → Ask: "Detected {feature_count} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan detail-design` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
   - If `should_trigger=true` and `has_active_plan=true`:
     → Ask: "An active plan exists. Resume it or continue normally? [Resume / Continue Normally]"
     → If Resume: run `/sekkei:implement @{plan_path}`
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
      ii. Generate feature detail-design **progressively** (follow `references/progressive-generation.md`):
         - Call `generate_document(doc_type: "detail-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_content: feature_upstream)`
         - TaskCreate: "Generate {feature_name} header" (activeForm: "Generating {feature_name} header")
         - TaskCreate: "Generate {feature_name} class design" (activeForm: "Generating {feature_name} classes")
         - TaskCreate: "Generate {feature_name} API detail" (activeForm: "Generating {feature_name} APIs")
         - TaskCreate: "Generate {feature_name} processing flow" (activeForm: "Generating {feature_name} flow")
         - **Stage 1**: Generate admin + §1 概要 for this feature → **Write** to `features/{feature-id}/detail-design.md` → TaskUpdate complete
         - **Stage 2**: Read existing; generate §3 クラス設計 for this feature's CLS-xxx → **Append** → TaskUpdate complete
         - **Stage 3**: Read existing; generate §4 API詳細 for this feature's API-xxx → **Append** → TaskUpdate complete
         - **Stage 4**: Read existing; generate §7 処理フロー + remaining sections → **Append** → TaskUpdate complete
      iii. Update `_index.yaml` manifest entry
   e. Create/update `_index.yaml` manifest via manifest-manager
5. **If not split (default):**
   a. Use `upstream_content` prepared in prerequisite check above
   b. Call MCP tool `generate_document` with `doc_type: "detail-design"`, `language` from config (default: "ja"),
      `input_content: @input`, `upstream_content: upstream`. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   c. **Create progress tasks** (follow `references/progressive-generation.md`):
      - TaskCreate: "Generate detail-design header + modules" (activeForm: "Generating header + module list")
      - TaskCreate: "Generate class design (§3)" (activeForm: "Generating class design")
      - TaskCreate: "Generate API detail + validation + errors (§4-§6)" (activeForm: "Generating API details")
      - TaskCreate: "Generate processing flow + remaining (§7-§10)" (activeForm: "Generating processing flow")
      - TaskCreate: "Validate detail-design" (activeForm: "Validating detail-design")
   d. **Stage 1 — Header + Module List**: TaskUpdate in_progress →
      Generate ONLY: YAML frontmatter + admin + §1 概要 + §2 モジュール一覧 (module list with call relationships) →
      **Write** to `{output.directory}/03-system/detail-design.md` → TaskUpdate complete
   e. **Stage 2 — Class Design**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §3 クラス設計 (CLS-xxx IDs, Mermaid class diagrams) →
      Cross-reference SCR-xxx, TBL-xxx, API-xxx from 基本設計書. Pass existing content →
      **Append** → TaskUpdate complete
   f. **Stage 3 — API Detail + Validation + Errors**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §4 API詳細仕様 (endpoint, req/res schemas, error codes) + §5 バリデーション rules + §6 エラーメッセージ list →
      Pass existing content → **Append** → TaskUpdate complete
   g. **Stage 4 — Processing Flow + Remaining**: TaskUpdate in_progress →
      Read existing file; generate ONLY: §7 処理フロー (Mermaid sequence diagrams) + §8 エラー処理 + §9 セキュリティ + §10 パフォーマンス →
      Pass existing content → **Append** → TaskUpdate complete
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "detail_design"`:
   - **If split mode:** `status: "complete"`, `system_output: "03-system/"`, `features_output: "05-features/"`
   - **If monolithic:** `status: "complete"`, `output: "03-system/detail-design.md"`
7. TaskUpdate: validate in_progress
8. Call MCP tool `validate_document` with saved content and `doc_type: "detail-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
9. TaskUpdate: validate complete
10. Suggest next steps:
    > "Detail design complete. Next steps:
    > - `/sekkei:ut-spec` — generate 単体テスト仕様書
    > - `/sekkei:validate @detail-design` — validate cross-references"

## `/sekkei:db-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design + requirements + nfr as `upstream_content`

**Interview questions (ask before generating):**
- Database engine? (PostgreSQL, MySQL, Oracle, SQL Server, MongoDB)
- Estimated data volume? (GB, TB scale)
- Partitioning strategy needs?
- Replication / HA requirements?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "db-design"`, `upstream_content`, `language` from config
4. **Pre-scan**: Extract TBL-xxx IDs from upstream basic-design content. Group into batches of 3-5 tables.
5. **Fallback check**: If total TBL-xxx <= 3, generate monolithically (skip to step 12 — single call with all rules, save, then validate).
6. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate DB design header + naming" (activeForm: "Generating DB design header")
   - TaskCreate: "Generate ER diagram" (activeForm: "Generating ER diagram")
   - TaskCreate: "Generate tables {TBL-xxx..TBL-yyy}" for each batch (activeForm: "Generating table definitions")
   - TaskCreate: "Generate index design" (activeForm: "Generating index design")
   - TaskCreate: "Generate DB summary sections" (activeForm: "Generating DB summary")
   - TaskCreate: "Validate DB design" (activeForm: "Validating DB design")
7. **Stage 1 — Header + Naming**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 DB設計方針 + §8 命名規約 →
   ID format: `DB-001`. **Write** to `{output.directory}/03-system/db-design.md` → TaskUpdate complete
8. **Stage 2 — ER Diagram**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §2 ER図 (Mermaid erDiagram) →
   Cross-reference TBL-xxx from upstream. Pass existing content → **Append** → TaskUpdate complete
9. **Stage 3..N — Table Details** (per TBL-xxx batch): For each batch:
   TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 テーブル詳細 for this batch's TBL-xxx tables →
   Expand with full column definitions. Pass existing content for ID continuity →
   **Append** → TaskUpdate complete
10. **Stage N+1 — Index Design**: TaskUpdate in_progress →
    Read existing file; generate ONLY: §4 インデックス設計 (index table with purpose for each index) →
    Cross-reference TBL-xxx, REQ-xxx, NFR-xxx. Pass existing content → **Append** → TaskUpdate complete
11. **Stage N+2 — Summary**: TaskUpdate in_progress →
    Read existing file; generate ONLY: §5 パーティション + §6 移行 + §7 バックアップ →
    Pass existing content → **Append** → TaskUpdate complete
12. (Monolithic fallback): Follow these rules for single-call generation:
    - ID format: `DB-001` for design decisions
    - Expand all TBL-xxx from basic-design with full column definitions
    - Include Mermaid erDiagram
    - Index design table with purpose for each index
    - Cross-reference TBL-xxx, REQ-xxx, NFR-xxx from upstream
13. Save output to `{output.directory}/03-system/db-design.md` (already done if progressive)
14. TaskUpdate: validate in_progress
15. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "db_design"`,
    `status: "complete"`, `output: "03-system/db-design.md"`
16. Call MCP tool `validate_document` with saved content and `doc_type: "db-design"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
17. TaskUpdate: validate complete

## `/sekkei:screen-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design as `upstream_content`

**Interview questions (ask before generating):**
- Target platform? (Web/Mobile/Desktop)
- Design system / UI framework?
- Accessibility requirements?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "screen-design"`, `upstream_content`, `language` from config
4. Follow these rules strictly:
   - Screen list with SCR-xxx IDs (8 columns)
   - Mermaid stateDiagram-v2 for transitions
   - Per-screen: 6 sub-sections (layout, items, validation, events, transitions, permissions)
   - YAML layout blocks for screen structure
   - Cross-reference SCR-xxx, API-xxx from basic-design
5. Save output to `{output.directory}/03-system/screen-design.md`
6. Call MCP tool `validate_document` with saved content and `doc_type: "screen-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
7. Suggest: "Run `/sekkei:mockup` to generate HTML mockups from screen definitions."

## `/sekkei:interface-spec @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design + requirements as `upstream_content`

**Interview questions (ask before generating):**
- External systems to integrate?
- Protocol preferences? (REST, gRPC, MQ, file transfer)
- SLA requirements per interface?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "interface-spec"`, `upstream_content`, `language` from config
4. Follow these rules strictly:
   - ID format: `IF-001`
   - Request/response schema tables with field types
   - Error code table with retry guidance
   - SLA per interface (availability, latency, throughput)
   - Cross-reference API-xxx from basic-design
5. Save output to `{output.directory}/03-system/interface-spec.md`
6. Call MCP tool `validate_document` with saved content and `doc_type: "interface-spec"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.

## `/sekkei:report-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design + functions-list as `upstream_content`

**Interview questions (ask before generating):**
- Report output formats? (PDF, Excel, CSV)
- Report delivery method? (print, email, download, scheduled)
- Paper size / layout preferences?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "report-design"`, `upstream_content`, `language` from config
4. **Pre-scan**: Extract RPT-xxx IDs from upstream basic-design content. Group 1-2 reports per stage.
5. **Fallback check**: If total RPT-xxx <= 2, generate monolithically (skip to step 12 — single call, save, then validate).
6. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate report design header + catalog" (activeForm: "Generating report design header")
   - TaskCreate: "Generate report layout {RPT-xxx}" for each batch (activeForm: "Generating report layouts")
   - TaskCreate: "Generate output conditions + data mapping" (activeForm: "Generating data mapping")
   - TaskCreate: "Generate print + delivery design" (activeForm: "Generating delivery design")
   - TaskCreate: "Validate report design" (activeForm: "Validating report design")
7. **Stage 1 — Header + Catalog**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 帳票概要 + §2 帳票一覧 (RPT catalog) →
   **Write** to `{output.directory}/03-system/report-design.md` → TaskUpdate complete
8. **Stage 2..N — Report Layouts** (per RPT-xxx batch): For each batch:
   TaskUpdate in_progress →
   Read existing file; generate ONLY: §3 帳票レイアウト for this batch's RPT-xxx →
   Layout description (header, detail, footer, page break). Pass existing content for ID continuity →
   **Append** → TaskUpdate complete
9. **Stage N+1 — Output Conditions + Mapping**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §4 出力条件 + §5 データマッピング →
   Data mapping: RPT field → TBL-xxx source. Cross-reference F-xxx, SCR-xxx, TBL-xxx →
   Pass existing content → **Append** → TaskUpdate complete
10. **Stage N+2 — Print + Delivery**: TaskUpdate in_progress →
    Read existing file; generate ONLY: §6 印刷・配信設計 →
    Pass existing content → **Append** → TaskUpdate complete
11. (Monolithic fallback): Use existing RPT-xxx IDs from basic-design, add new as RPT-NNN. Layout per report. Output conditions. Data mapping: RPT field → TBL-xxx source. Cross-reference F-xxx, SCR-xxx, TBL-xxx.
12. Save output to `{output.directory}/03-system/report-design.md` (already done if progressive)
13. TaskUpdate: validate in_progress
14. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "report_design"`,
    `status: "complete"`, `output: "03-system/report-design.md"`
15. Call MCP tool `validate_document` with saved content and `doc_type: "report-design"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
16. TaskUpdate: validate complete

## `/sekkei:batch-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Verify `{output.directory}/03-system/basic-design.md` exists — abort if missing: "Run `/sekkei:basic-design` first."
2. Load basic-design + functions-list + nfr as `upstream_content`

**Interview questions (ask before generating):**
- Batch execution platform? (cron, AWS Step Functions, Airflow, JP1)
- Maintenance window constraints?
- Data volume per batch job?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "batch-design"`, `upstream_content`, `language` from config
4. **Pre-scan**: Extract BATCH-xxx IDs from upstream functions-list (処理分類 = バッチ). Group 1-2 jobs per stage.
5. **Fallback check**: If total BATCH-xxx <= 2, generate monolithically (skip to step 12 — single call, save, then validate).
6. **Create progress tasks** (follow `references/progressive-generation.md`):
   - TaskCreate: "Generate batch design header + job list" (activeForm: "Generating batch design header")
   - TaskCreate: "Generate job detail {BATCH-xxx}" for each batch (activeForm: "Generating job details")
   - TaskCreate: "Generate schedule + error handling" (activeForm: "Generating schedule design")
   - TaskCreate: "Generate operations integration" (activeForm: "Generating operations integration")
   - TaskCreate: "Validate batch design" (activeForm: "Validating batch design")
7. **Stage 1 — Header + Job List + Flow**: TaskUpdate in_progress →
   Generate ONLY: YAML frontmatter + admin + §1 バッチ概要 + §2 ジョブ一覧 + §3 フロー図 (Mermaid flowchart for job dependencies) →
   ID format: `BATCH-001`. **Write** to `{output.directory}/03-system/batch-design.md` → TaskUpdate complete
8. **Stage 2..N — Job Details** (per BATCH-xxx batch): For each batch:
   TaskUpdate in_progress →
   Read existing file; generate ONLY: §4 ジョブ詳細 for this batch's BATCH-xxx →
   Execution timing, dependencies, retry, timeout. Pass existing content for ID continuity →
   **Append** → TaskUpdate complete
9. **Stage N+1 — Schedule + Error Handling**: TaskUpdate in_progress →
   Read existing file; generate ONLY: §5 スケジュール設計 + §6 エラーハンドリング →
   Error handling per job: retry policy, dead-letter, alert escalation →
   Cross-reference F-xxx (batch functions), TBL-xxx, OP-xxx. Pass existing content →
   **Append** → TaskUpdate complete
10. **Stage N+2 — Operations Integration**: TaskUpdate in_progress →
    Read existing file; generate ONLY: §7 運用連携 →
    Pass existing content → **Append** → TaskUpdate complete
11. (Monolithic fallback): ID format: `BATCH-001`. Job list with execution timing, dependencies, retry, timeout. Mermaid flowchart. Error handling per job. Cross-reference F-xxx, TBL-xxx, OP-xxx.
12. Save output to `{output.directory}/03-system/batch-design.md` (already done if progressive)
13. TaskUpdate: validate in_progress
14. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "batch_design"`,
    `status: "complete"`, `output: "03-system/batch-design.md"`
15. Call MCP tool `validate_document` with saved content and `doc_type: "batch-design"`.
    **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
16. TaskUpdate: validate complete
