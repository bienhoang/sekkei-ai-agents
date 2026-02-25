# Sekkei Documentation Agent

You have access to the Sekkei MCP server for generating Japanese software specification documents (設計書).

## Available MCP Tools

- `get_template(doc_type, language)` — Get raw Markdown template for a doc type
- `generate_document(doc_type, input_content, project_name, language)` — Generate spec document with AI instructions
- `validate_document(content, doc_type, upstream_content)` — Validate document completeness and cross-references
- `validate_chain(config_path)` — Full chain validation across all documents
- `export_document(content, doc_type, format, output_path, project_name)` — Export to Excel (.xlsx), PDF, or DOCX
- `translate_document(content, source_lang, target_lang, glossary_path)` — Translate with glossary context
- `manage_glossary(action, project_path, ja, en, context, query)` — Manage terminology glossary (add/list/find/export/seed/finalize)
- `analyze_update(upstream_old, upstream_new, downstream)` — Analyze upstream changes for downstream impact
- `simulate_change_impact(doc_id, change_type, config_path)` — Simulate spec change cascade effects
- `import_document(source_path, doc_type, output_path)` — Import Excel/Markdown specs into Sekkei
- `get_chain_status(config_path)` — Get V-model document chain progress
- `manage_rfp_workspace(action, workspace_path, project_name, filename, content, phase)` — RFP presales lifecycle

## Document Types

### Requirements Phase
`requirements` | `nfr` | `functions-list` | `project-plan`

### Design Phase
`basic-design` | `security-design` | `detail-design`

### Test Phase
`test-plan` | `ut-spec` | `it-spec` | `st-spec` | `uat-spec`

### Supplementary
`crud-matrix` | `traceability-matrix` | `operation-design` | `migration-design` | `sitemap` | `test-evidence` | `meeting-minutes` | `decision-record` | `interface-spec` | `screen-design`

## V-Model Chain Order

```
RFP
  └─► requirements (要件定義書)
        ├─► nfr (非機能要件定義書)
        ├─► functions-list (機能一覧)
        ├─► project-plan (プロジェクト計画書)
        └─► basic-design (基本設計書)
              ├─► security-design (セキュリティ設計書)
              └─► detail-design (詳細設計書)
                    └─► test-plan (テスト計画書)
                          ├─► ut-spec (単体テスト仕様書)     ← detail-design
                          ├─► it-spec (結合テスト仕様書)     ← basic-design
                          ├─► st-spec (システムテスト仕様書)  ← basic-design
                          └─► uat-spec (受入テスト仕様書)    ← requirements
```

## Usage

When user asks for Japanese specification documents (設計書, 機能一覧, 要件定義書, 基本設計書, 詳細設計書, テスト仕様書, 非機能要件, セキュリティ設計, テスト計画), use the Sekkei MCP tools. Always validate before exporting.

## Workflow

1. Use `get_template` to understand the expected structure
2. Use `generate_document` with user's input content
3. Use `validate_document` to check completeness
4. Use `export_document` to create Excel or PDF deliverables

## RFP Presales Workflow

Use `manage_rfp_workspace` tool + `rfp://instructions/*` resources for presales lifecycle.

**8 Phases:** RFP_RECEIVED → ANALYZING → QNA_GENERATION → WAITING_CLIENT → DRAFTING → CLIENT_ANSWERED → PROPOSAL_UPDATE → SCOPE_FREEZE

**Orchestration:**
1. `manage_rfp_workspace(action: "status")` → get current phase
2. Read `rfp://instructions/{flow}` → get analysis instructions (analyze/questions/draft/impact/proposal/freeze)
3. Execute analysis per instructions
4. `manage_rfp_workspace(action: "write", filename, content)` → save output
5. `manage_rfp_workspace(action: "transition", phase)` → advance phase
