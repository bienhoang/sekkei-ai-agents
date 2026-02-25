> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Design Phase Commands

Command workflows for the design phase of the V-model document chain.
Parent: `SKILL.md` → Workflow Router → Design Phase.

## `/sekkei:basic-design @input`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/02-requirements/requirements.md` exists
   - If missing → ABORT: "Requirements not found. Run `/sekkei:requirements` first."
2. Check `{output.directory}/04-functions-list/functions-list.md` exists
   - If missing → WARN: "Functions-list not found. Basic-design will only reference REQ-xxx IDs.
     Run `/sekkei:functions-list` first for complete cross-referencing."
   - Continue (not blocking)

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
   Show results as non-blocking.
7. Suggest next steps:
   > "Basic design complete. Next steps:
   > - `/sekkei:mockup` — generate HTML screen mockups
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:security-design` — generate セキュリティ設計書
   > - `/sekkei:validate @basic-design` — validate cross-references"

## `/sekkei:security-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/03-system/basic-design.md` exists (or check `chain.basic_design.status`)
   - If missing → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. Read basic-design content as primary upstream
3. Optionally load requirements + nfr for fuller cross-referencing:
   - If `chain.requirements.output` exists → read as additional upstream
   - If `chain.nfr.output` exists → read as additional upstream
4. Concatenate all as `upstream_content` (requirements + nfr + basic-design)

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
   Show results as non-blocking.
8. Suggest next steps:
   > "Security design complete. Next steps:
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:validate @security-design` — validate cross-references"

## `/sekkei:detail-design @input`

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
   Show results as non-blocking.
8. Suggest next steps:
   > "Detail design complete. Next steps:
   > - `/sekkei:ut-spec` — generate 単体テスト仕様書
   > - `/sekkei:validate @detail-design` — validate cross-references"
