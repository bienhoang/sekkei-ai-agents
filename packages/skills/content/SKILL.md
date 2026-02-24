---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: rfp, requirements, functions-list, nfr, project-plan, basic-design, security-design, detail-design, test-plan, ut-spec, it-spec, st-spec, uat-spec, matrix, sitemap, operation-design, migration-design, change, validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain.

## Document Generation Commands

### Requirements Phase
- `/sekkei:requirements @input`   — 要件定義書
- `/sekkei:nfr @requirements`     — 非機能要件定義書
- `/sekkei:functions-list @input` — 機能一覧
- `/sekkei:project-plan @req`     — プロジェクト計画書

### Design Phase
- `/sekkei:basic-design @input`     — 基本設計書
- `/sekkei:security-design @bd`     — セキュリティ設計書
- `/sekkei:detail-design @input`    — 詳細設計書

### Test Phase
- `/sekkei:test-plan @req`          — テスト計画書
- `/sekkei:ut-spec @detail-design`  — 単体テスト仕様書
- `/sekkei:it-spec @basic-design`   — 結合テスト仕様書
- `/sekkei:st-spec @basic-design`   — システムテスト仕様書
- `/sekkei:uat-spec @requirements`  — 受入テスト仕様書

## Other Commands

- `/sekkei:rfp [@project-name]` — Presales RFP lifecycle (analyze → Q&A → proposal → scope freeze)
- `/sekkei:matrix` — Generate CRUD図 or トレーサビリティマトリックス and export to Excel
- `/sekkei:sitemap` — Generate サイトマップ (System Structure Map) with page hierarchy
- `/sekkei:operation-design @input` — Generate 運用設計書 (Operation Design)
- `/sekkei:migration-design @input` — Generate 移行設計書 (Migration Design)
- `/sekkei:validate @doc` — Validate document completeness and cross-references
- `/sekkei:status` — Show document chain progress
- `/sekkei:export @doc --format=xlsx|pdf|docx` — Export document to Excel, PDF, or Word
- `/sekkei:translate @doc --lang=en` — Translate document with glossary context
- `/sekkei:glossary [add|list|find|export|import]` — Manage project terminology
- `/sekkei:change` — Change request lifecycle (impact analysis → approval → propagation → validation)
- `/sekkei:update @doc` — Detect upstream changes and impacted sections
- `/sekkei:diff-visual @before @after` — Generate color-coded revision Excel (朱書き)
- `/sekkei:plan @doc-type` — Create generation plan for large documents (auto-triggered in split mode)
- `/sekkei:implement @plan-path` — Execute a generation plan phase by phase
- `/sekkei:preview` — Start VitePress docs preview server (`--guide` for user guide)
- `/sekkei:version` — Show version and environment health check
- `/sekkei:uninstall` — Remove Sekkei from Claude Code
- `/sekkei:rebuild` — Rebuild and re-install Sekkei skill + MCP (runs `sekkei update` CLI)

## Workflow Router

When the user invokes a sub-command, load the corresponding reference file and follow its workflow.

### Project Setup (prerequisite)

Before using any sub-command, initialize the project via CLI:

```bash
npx sekkei init
```

This interactive wizard creates `sekkei.config.yaml`, sets up the output directory, imports industry glossary, and configures Python dependencies for export features. No AI required.

### RFP

→ Read `references/rfp-command.md` (routing), `references/rfp-manager.md` (state), `references/rfp-loop.md` (analysis)

### Requirements Phase

→ Read `references/phase-requirements.md`
Commands: requirements, functions-list, nfr, project-plan

### Design Phase

→ Read `references/phase-design.md`
Commands: basic-design, security-design, detail-design

### Test Phase

→ Read `references/phase-test.md`
Commands: test-plan, ut-spec, it-spec, st-spec, uat-spec

### Supplementary

→ Read `references/phase-supplementary.md`
Commands: matrix, sitemap, operation-design, migration-design

### Change Request

→ Read `references/change-request-command.md`
Commands: change

### Utilities

→ Read `references/utilities.md`
Commands: validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild

## Document Chain

Documents build on each other. Each downstream document cross-references IDs from upstream documents.

```
RFP (/sekkei:rfp)
  └─► Requirements (/sekkei:requirements)
        ├─► NFR (/sekkei:nfr)
        ├─► Functions List (/sekkei:functions-list)
        ├─► Project Plan (/sekkei:project-plan)
        └─► Glossary (/sekkei:glossary import|add)
              └─► Basic Design (/sekkei:basic-design)
                    ├─► Security Design (/sekkei:security-design)
                    ├─► Detail Design (/sekkei:detail-design)
                    └─► Test Plan (/sekkei:test-plan)        ← requirements + nfr + basic-design
                          ├─► UT Spec (/sekkei:ut-spec)      ← detail-design + test-plan
                          ├─► IT Spec (/sekkei:it-spec)      ← basic-design + test-plan
                          ├─► ST Spec (/sekkei:st-spec)      ← basic-design + functions-list + test-plan
                          └─► UAT Spec (/sekkei:uat-spec)    ← requirements + nfr + test-plan
```

## Split Mode

When `sekkei.config.yaml` contains a `split` section, generation commands (basic-design, detail-design, test-spec) produce per-feature files instead of monolithic documents.

**Structure:**
```
sekkei-docs/
├── _index.yaml          # Manifest (auto-generated)
├── functions-list.md    # Always monolithic
├── requirements.md      # Always monolithic
├── shared/              # Shared sections (architecture, DB, etc.)
│   ├── architecture.md
│   └── database.md
├── features/
│   ├── sal-sales/
│   │   ├── basic-design.md
│   │   ├── detail-design.md
│   │   └── test-spec.md
│   └── acc-accounting/
│       └── ...
└── translations/
    └── en/
        ├── _index.yaml
        ├── shared/
        └── features/
```

**Benefits:** Smaller AI context per generation call → higher quality. Per-feature export/validation. Feature-grouped sidebar in VitePress preview.

## References

- `references/phase-requirements.md` — Requirements phase: functions-list, requirements, nfr, project-plan
- `references/phase-design.md` — Design phase: basic-design, security-design, detail-design
- `references/phase-test.md` — Test phase: test-plan, ut-spec, it-spec, st-spec, uat-spec
- `references/phase-supplementary.md` — Supplementary: matrix, sitemap, operation-design, migration-design
- `references/utilities.md` — Utilities: validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild
- `references/rfp-command.md` — RFP entrypoint: routing table, UX patterns, delegation model
- `references/rfp-manager.md` — RFP workspace: state management, file persistence, recovery
- `references/rfp-loop.md` — RFP analysis: 6 presales flows, risk detection, Q&A generation
- `references/change-request-command.md` — Change request workflow: impact analysis, propagation, conflict detection
- `references/doc-standards.md` — Japanese documentation standards and column headers
- `references/v-model-guide.md` — V-model workflow and chain-of-documents guide
- `references/plan-orchestrator.md` — Plan orchestration logic for large document generation
