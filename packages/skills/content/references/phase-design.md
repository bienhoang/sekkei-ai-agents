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
4. Follow these rules strictly:
   - ID format: `ARCH-001`
   - 5 sections: システム方式, 開発方式, 運用方式, HW/NW構成, 技術選定
   - Include Mermaid diagram for system topology
   - Technology selection table with rationale and alternatives
   - Cross-reference REQ-xxx, NFR-xxx from upstream
5. Save output to `{output.directory}/03-system/architecture-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "architecture_design"`,
   `status: "complete"`, `output: "03-system/architecture-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "architecture-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
8. Suggest next steps:
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
      i. Generate feature basic-design:
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_paths: ["02-requirements/requirements.md", "04-functions-list/functions-list.md"])`
         - Save output to `features/{feature-id}/basic-design.md`
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
      - `post_actions: ["update_chain_status"]`
   b. Use the returned template + AI instructions to generate the 基本設計書
   c. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Screen list: SCR-001 format (8 columns)
      - Table definitions: TBL-001 format (8 columns)
      - API list: API-001 format (8 columns)
      - Include Mermaid diagrams for architecture and ER diagrams
      - Cross-reference REQ-xxx and F-xxx IDs from upstream documents
   d. Save output to `{output.directory}/03-system/basic-design.md`
   e. **Suggest HTML mockup generation:**
      - Inform user: "Basic design complete with screen definitions. Run `/sekkei:mockup` to generate HTML mockups."
6. Call MCP tool `validate_document` with saved content and `doc_type: "basic-design"`.
   **Post-generation validation (mandatory):** If validation reports errors (missing sections, broken cross-refs): fix inline before finalizing. If validation passes: proceed to update chain status.
7. Suggest next steps:
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
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
8. Suggest next steps:
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
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing. If validation passes: proceed.
8. Suggest next steps:
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
4. Follow these rules strictly:
   - ID format: `DB-001` for design decisions
   - Expand all TBL-xxx from basic-design with full column definitions
   - Include Mermaid erDiagram
   - Index design table with purpose for each index
   - Cross-reference TBL-xxx, REQ-xxx, NFR-xxx from upstream
5. Save output to `{output.directory}/03-system/db-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "db_design"`,
   `status: "complete"`, `output: "03-system/db-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "db-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.

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
4. Follow these rules strictly:
   - Use existing RPT-xxx IDs from basic-design, add new as RPT-NNN
   - Layout description per report (header, detail, footer, page break)
   - Output conditions: filtering, sorting, grouping per report
   - Data mapping: RPT field → TBL-xxx source
   - Cross-reference F-xxx, SCR-xxx, TBL-xxx from upstream
5. Save output to `{output.directory}/03-system/report-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "report_design"`,
   `status: "complete"`, `output: "03-system/report-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "report-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.

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
4. Follow these rules strictly:
   - ID format: `BATCH-001`
   - Job list with execution timing, dependencies, retry, timeout
   - Mermaid flowchart for job dependencies
   - Error handling per job: retry policy, dead-letter, alert escalation
   - Cross-reference F-xxx (batch functions), TBL-xxx, OP-xxx from upstream
5. Save output to `{output.directory}/03-system/batch-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "batch_design"`,
   `status: "complete"`, `output: "03-system/batch-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "batch-design"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
