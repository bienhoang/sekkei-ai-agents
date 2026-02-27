---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: rfp, requirements, functions-list, nfr, project-plan, architecture-design, basic-design, security-design, detail-design, db-design, report-design, batch-design, screen-design, interface-spec, mockup, test-plan, ut-spec, it-spec, st-spec, uat-spec, test-result-report, test-evidence, meeting-minutes, decision-record, matrix, sitemap, operation-design, migration-design, change, validate, status, export, translate, glossary, update, diff-visual, preview, dashboard, plan, implement, version, uninstall, rebuild"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain.

## Output Language

All user-facing output (document content, prompts, confirmations) must use `project.language` from `sekkei.config.yaml`. Default: `"ja"` (Japanese). Override per call with the `language` parameter on `generate_document`.

## Document Generation Commands

### Requirements Phase
- `/sekkei:requirements @input`   — 要件定義書
- `/sekkei:nfr @requirements`     — 非機能要件定義書
- `/sekkei:functions-list @input` — 機能一覧
- `/sekkei:project-plan @req`     — プロジェクト計画書

### Design Phase
- `/sekkei:architecture-design @req` — 方式設計書 (Architecture Design)
- `/sekkei:basic-design @input`     — 基本設計書
- `/sekkei:security-design @bd`     — セキュリティ設計書
- `/sekkei:detail-design @input`    — 詳細設計書
- `/sekkei:db-design @bd`           — データベース設計書 (DB Design)
- `/sekkei:screen-design @bd`       — 画面設計書 (Screen Design)
- `/sekkei:interface-spec @bd`      — IF仕様書 (Interface Spec)
- `/sekkei:report-design @bd`       — 帳票設計書 (Report/Form Design)
- `/sekkei:batch-design @bd`        — バッチ処理設計書 (Batch Design)

### Test Phase
- `/sekkei:test-plan @req`          — テスト計画書
- `/sekkei:ut-spec @detail-design`  — 単体テスト仕様書
- `/sekkei:it-spec @basic-design`   — 結合テスト仕様書
- `/sekkei:st-spec @basic-design`   — システムテスト仕様書
- `/sekkei:uat-spec @requirements`  — 受入テスト仕様書
- `/sekkei:test-result-report @test-specs` — テスト結果報告書 (Test Result Report)
- `/sekkei:test-evidence @test-spec` — テストエビデンス (Test Evidence)

### Management Phase
- `/sekkei:meeting-minutes @notes`  — 議事録 (Meeting Minutes)
- `/sekkei:decision-record @notes`  — 設計判断記録 (Architecture Decision Record)

## Other Commands

- `/sekkei:rfp [@project-name]` — Presales RFP lifecycle (analyze → Q&A → proposal → scope freeze)
- `/sekkei:matrix [crud|traceability]` — Generate CRUD図 or トレーサビリティマトリックス (auto-detect from chain or specify type)
- `/sekkei:sitemap` — Generate サイトマップ (System Structure Map) with page hierarchy
- `/sekkei:mockup` — Generate HTML screen mockups from screen definitions
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
- `/sekkei:preview` — Start Express+React docs preview with WYSIWYG editor (`--guide` for readonly user guide)
- `/sekkei:dashboard` — Start analytics dashboard for workspace-docs overview (chain status, analytics, changes, features)
- `/sekkei:version` — Show version and environment health check
- `/sekkei:uninstall` — Remove Sekkei from Claude Code
- `/sekkei:rebuild` — Rebuild and re-install Sekkei skill + MCP (runs `sekkei update` CLI)

## Workflow Router

When the user invokes a sub-command, load the corresponding reference file and follow its workflow.

### Project Setup (prerequisite)

Before using any sub-command, initialize the project via CLI:

```bash
sekkei init
```

This interactive wizard creates `sekkei.config.yaml`, sets up the output directory, imports industry glossary, and configures Python dependencies for export features. No AI required.

### RFP

→ Read `references/rfp-command.md` (UX, dashboard), `references/rfp-manager.md` (state, actions)

### Requirements Phase

→ Read `references/phase-requirements.md`
Commands: requirements, functions-list, nfr, project-plan

### Design Phase

→ Read `references/phase-design.md`
Commands: architecture-design, basic-design, security-design, detail-design, db-design, screen-design, interface-spec, report-design, batch-design

### Screen Mockups

→ Read `references/mockup-command.md`
→ If non-admin shell type detected (auth, error, onboarding, public, email, print, blank): also read `references/mockup-shells.md`
Commands: mockup

### Test Phase

→ Read `references/phase-test.md`
Commands: test-plan, ut-spec, it-spec, st-spec, uat-spec, test-result-report, test-evidence

### Management Phase

→ Read `references/phase-management.md`
Commands: meeting-minutes, decision-record

### Supplementary

→ Read `references/phase-supplementary.md`
Commands: matrix, sitemap, operation-design, migration-design

### Change Request

→ Read `references/change-request-command.md`
Commands: change

### Utilities

→ Read `references/utilities.md`
Commands: validate, status, export, translate, glossary, update, diff-visual, preview, dashboard, plan, implement, version, uninstall, rebuild

## Document Chain

Documents build on each other. Each downstream document cross-references IDs from upstream documents.

```
RFP (/sekkei:rfp)
  └─► Requirements (/sekkei:requirements)
        ├─► NFR (/sekkei:nfr)
        ├─► Functions List (/sekkei:functions-list)
        ├─► Project Plan (/sekkei:project-plan)
        ├─► Architecture Design (/sekkei:architecture-design) ← req + nfr
        └─► Glossary (/sekkei:glossary import|add)
              └─► Basic Design (/sekkei:basic-design)
                    ├─► Security Design (/sekkei:security-design)
                    ├─► Detail Design (/sekkei:detail-design)
                    ├─► DB Design (/sekkei:db-design)           ← basic-design + nfr
                    ├─► Screen Design (/sekkei:screen-design)   ← basic-design
                    ├─► Interface Spec (/sekkei:interface-spec) ← basic-design + req
                    ├─► Report Design (/sekkei:report-design)   ← basic-design
                    ├─► Batch Design (/sekkei:batch-design)     ← basic-design + functions-list
                    └─► Test Plan (/sekkei:test-plan)           ← req + nfr + basic-design
                          ├─► UT Spec (/sekkei:ut-spec)         ← detail-design + test-plan
                          ├─► IT Spec (/sekkei:it-spec)         ← basic-design + test-plan
                          ├─► ST Spec (/sekkei:st-spec)         ← basic-design + fl + test-plan
                          ├─► UAT Spec (/sekkei:uat-spec)       ← req + nfr + test-plan
                          ├─► Test Evidence (/sekkei:test-evidence) ← test-specs
                          └─► Test Result Report (/sekkei:test-result-report) ← all test-specs
Management (standalone):
  ├─► Meeting Minutes (/sekkei:meeting-minutes)
  └─► Decision Record (/sekkei:decision-record)
```

## Split Mode

When `sekkei.config.yaml` contains a `split` section, generation commands (basic-design, detail-design, test-spec) produce per-feature files instead of monolithic documents.

**Structure:**
```
workspace-docs/
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

**Benefits:** Smaller AI context per generation call → higher quality. Per-feature export/validation. Feature-grouped sidebar in preview.

## References

- `references/phase-requirements.md` — Requirements phase: functions-list, requirements, nfr, project-plan
- `references/phase-design.md` — Design phase: architecture-design, basic-design, security-design, detail-design, db-design, screen-design, interface-spec, report-design, batch-design
- `references/phase-test.md` — Test phase: test-plan, ut-spec, it-spec, st-spec, uat-spec, test-result-report, test-evidence
- `references/phase-management.md` — Management: meeting-minutes, decision-record
- `references/phase-supplementary.md` — Supplementary: matrix, sitemap, operation-design, migration-design
- `references/utilities.md` — Utilities: validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild
- `references/rfp-command.md` — RFP entrypoint: UX patterns, progress dashboard, navigation
- `references/rfp-manager.md` — RFP workspace: file list, status schema, tool actions
- `references/change-request-command.md` — Change request workflow: impact analysis, propagation, conflict detection
- `references/plan-orchestrator.md` — Plan orchestration logic for large document generation
- `references/mockup-command.md` — Screen mockup generation: shell detection, admin-shell skeleton, Chart.js, CSS reference, annotation rules
- `references/mockup-shells.md` — Non-admin shell skeletons: auth, error, onboarding, public, email, print, blank
