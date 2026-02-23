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
   - Read `sekkei.config.yaml` → check `split.basic-design` exists
   - Count 大分類 features from `functions-list.md`
   - If split enabled AND features >= 3 AND no active plan for `basic-design` in `sekkei-docs/plans/`:
     → Ask: "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan basic-design` → run `/sekkei:implement @{returned-plan-path}`
     → If N: continue with step 1 below
1. Read the input (ideally the generated 要件定義書 or requirements summary)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. **Check for split config**: read `sekkei.config.yaml` → `split.basic-design`
4. **If split enabled:**
   a. **Load upstream content:**
      - Read `{output.directory}/02-requirements/requirements.md` → req_content
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - upstream = req_content + "\n\n" + fl_content (or just req_content if no FL)
   b. Read `functions-list.md` → extract feature groups (大分類)
   c. Create output directories: `shared/`, `features/{feature-id}/`
   d. For each shared section in split config:
      - Call `generate_document` with `scope: "shared"`, `upstream_content: upstream`
      - Save to `shared/{section-name}.md`
   e. For each feature from functions-list:
      i. Generate feature basic-design:
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_content: upstream)`
         - Save output to `features/{feature-id}/basic-design.md`
      ii. Generate per-feature screen-design (split mode only):
         - Construct screen_input = Screen Design Document Instructions (see below) + "\n\n## Feature Requirements\n" + {feature_input}
         - Call `generate_document(doc_type: "basic-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: screen_input, upstream_content: upstream)`
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
   f. Create/update `_index.yaml` manifest via manifest-manager

**Screen Design Rules (split mode only):**
- Screen IDs use format SCR-{FEATURE_ID}-{seq} (e.g., SCR-AUTH-001)
- Each screen-design.md covers ALL screens for that feature
- 6 mandatory sections per screen: 画面レイアウト, 画面項目定義, バリデーション一覧, イベント一覧, 画面遷移, 権限
- Do NOT add per-screen sections to basic-design.md in split mode — reference screen-design.md instead
- The Screen Design Document Instructions block is provided by `buildScreenDesignInstruction(featureId, language)` from `generation-instructions.ts` — pass the project language from config
5. **If not split (default):**
   a. **Load upstream content:**
      - Read `{output.directory}/02-requirements/requirements.md` → req_content
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - upstream = req_content + "\n\n" + fl_content (or just req_content if no FL)
   b. Call MCP tool `generate_document` with `doc_type: "basic-design"`, `language` from config,
      `input_content: @input`, `upstream_content: upstream`, `project_type` from config
   c. Use the returned template + AI instructions to generate the 基本設計書
   d. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Screen list: SCR-001 format (8 columns)
      - Table definitions: TBL-001 format (8 columns)
      - API list: API-001 format (8 columns)
      - Include Mermaid diagrams for architecture and ER diagrams
      - Cross-reference REQ-xxx and F-xxx IDs from upstream documents
   e. Save output to `{output.directory}/03-system/basic-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "basic_design"`,
   `status: "complete"`, `output: "03-system/basic-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "basic-design"`.
   Show results as non-blocking.
8. Suggest next steps:
   > "Basic design complete. Next steps:
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:security-design` — generate セキュリティ設計書
   > - `/sekkei:validate @basic-design` — validate cross-references"

## `/sekkei:security-design @basic-design`

**Interview questions (ask before generating):**
- Authentication method? (OAuth2, SAML, OpenID Connect, custom)
- Data classification levels? (公開, 社内, 機密, 極秘)
- Applicable compliance? (個人情報保護法, PCI-DSS, HIPAA, ISMS)

1. Read the upstream 基本設計書
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "security-design"`, `upstream_content` (basic-design), and `language` from config
4. Follow these rules strictly:
   - ID format: `SEC-001`
   - Address OWASP Top 10 risks explicitly
   - Specify TLS 1.3+ for all transport, bcrypt (cost≥12) or Argon2id for passwords
   - Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from 基本設計書
5. Save output to `{output.directory}/03-system/security-design.md`
6. Update chain status: `security_design.status: complete`

## `/sekkei:detail-design @input`

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
2. If `sekkei.config.yaml` exists, load project metadata
3. **Check for split config**: read `sekkei.config.yaml` → `split.detail-design`
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in split config:
      - Call `generate_document` with `scope: "shared"`
      - Save to `shared/{section-name}.md`
   d. For each feature:
      - Call `generate_document` with `scope: "feature"`, `feature_id: "{ID}"`
      - Save to `features/{feature-id}/detail-design.md`
   e. Create/update `_index.yaml` manifest
5. **If not split (default):**
   a. Call MCP tool `generate_document` with `doc_type: "detail-design"`, `language` from config (default: "ja"), and input. Pass `input_lang: "en"` or `input_lang: "vi"` if input is not Japanese.
   b. Use the returned template + AI instructions to generate the 詳細設計書
   c. Follow these rules strictly:
      - 10-section structure as defined in the template
      - Module list with call relationships
      - Class specs: CLS-001 format with Mermaid class diagrams
      - API detail specs: endpoint, req/res schemas, error codes
      - Validation rules per screen field
      - Error message list with severity levels
      - Sequence diagrams (Mermaid) for key processing flows
      - Cross-reference SCR-xxx, TBL-xxx, API-xxx IDs from 基本設計書
   d. Save output to `./sekkei-docs/detail-design.md`
6. Update chain status: `detail_design.status: complete`
