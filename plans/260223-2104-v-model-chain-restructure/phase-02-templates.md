# Phase 2: Templates

## Context Links

- [Brainstorm](../reports/brainstorm-260223-2104-v-model-chain-review.md)
- [Research: Templates](reports/researcher-260223-2117-templates-and-skill-structure.md)
- [Current test-spec.md](../../sekkei/packages/mcp-server/templates/ja/test-spec.md)
- [Current overview.md](../../sekkei/packages/mcp-server/templates/ja/overview.md)

## Overview

- **Priority:** P1 (chain logic depends on templates existing)
- **Status:** completed
- **Effort:** 5h
- **Completed:** 2026-02-23

Create 8 new Japanese markdown templates. Delete overview.md and test-spec.md (clean v2.0 break).

## Key Insights

- Existing test-spec.md has 4 sections (UT/IT/ST/UAT) — split into 4 separate templates.
- Each test template duplicates boilerplate (revision-history, approval, distribution, glossary, test-strategy, defect-report) — agreed KISS approach.
- overview.md remains on disk with deprecation header for backward compat. Not deleted.
- All templates follow same pattern: YAML frontmatter + AI comments + markdown sections.
- NFR template should reference IPA NFUG 6-category framework (already referenced in requirements generation instructions).

## Requirements

### Templates to Create (8)

| Template File | doc_type | ID Prefix | Japanese Name | Upstream Input |
|---------------|----------|-----------|---------------|----------------|
| `nfr.md` | nfr | NFR- | 非機能要件定義書 | requirements |
| `security-design.md` | security-design | SEC- | セキュリティ設計書 | basic-design |
| `project-plan.md` | project-plan | PP- | プロジェクト計画書 | requirements (parallel) |
| `test-plan.md` | test-plan | TP- | テスト計画書 | requirements + basic-design |
| `ut-spec.md` | ut-spec | UT- | 単体テスト仕様書 | detail-design |
| `it-spec.md` | it-spec | IT- | 結合テスト仕様書 | basic-design |
| `st-spec.md` | st-spec | ST- | システムテスト仕様書 | basic-design + functions-list |
| `uat-spec.md` | uat-spec | UAT- | 受入テスト仕様書 | requirements + nfr |

### Templates to Delete (2)
<!-- Updated: Validation Session 1 - Clean v2.0 break: delete, not deprecate -->

| Template File | Action |
|---------------|--------|
| `overview.md` | DELETE — content absorbed into requirements Section 1 |
| `test-spec.md` | DELETE — split into ut-spec, it-spec, st-spec, uat-spec |

## Architecture

### Template YAML Frontmatter Pattern

All 8 new templates follow existing convention:

```yaml
---
doc_type: {type}
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - {type-specific sections...}
status: draft
author: ""
reviewer: ""
approver: ""
---
```

### Test Spec Template Structure (4 files)

Each test-level template contains:
1. **Boilerplate** (duplicated per KISS decision): revision-history, approval, distribution, glossary
2. **Test Design** (scoped to level): overview, strategy for this level only, environment
3. **Test Cases** (level-specific): one 12-column table for that level only
4. **Traceability** (scoped): maps THIS level's test IDs to its specific upstream IDs
5. **Defect Report** (duplicated): standard defect template

### Cross-Reference Scope Per Test Template

```
ut-spec.md:
  - Upstream: CLS-xxx, DD-xxx from detail-design
  - Traceability: DD-xxx → CLS-xxx → UT-xxx

it-spec.md:
  - Upstream: API-xxx, SCR-xxx, TBL-xxx from basic-design
  - Traceability: API-xxx → SCR-xxx → IT-xxx

st-spec.md:
  - Upstream: SCR-xxx, TBL-xxx from basic-design + F-xxx from functions-list
  - Traceability: F-xxx → SCR-xxx → ST-xxx

uat-spec.md:
  - Upstream: REQ-xxx from requirements + NFR-xxx from nfr
  - Traceability: REQ-xxx → NFR-xxx → UAT-xxx
```

### NFR Template Sections

Based on IPA NFUG 6-category framework:
1. 可用性 (Availability)
2. 性能・拡張性 (Performance/Scalability)
3. 運用・保守性 (Operability/Maintainability)
4. 移行性 (Migration)
5. セキュリティ (Security)
6. システム環境・エコロジー (Environment/Ecology)

### Security Design Template Sections

1. セキュリティ方針 (Security Policy)
2. 認証・認可設計 (Authentication/Authorization)
3. データ保護 (Data Protection) — encryption at rest/transit
4. 通信セキュリティ (Communication Security) — TLS, mTLS
5. 脆弱性対策 (Vulnerability Countermeasures) — OWASP Top 10
6. 監査ログ (Audit Logging)
7. インシデント対応 (Incident Response)

### Project Plan Template Sections

1. プロジェクト概要 (Project Overview)
2. WBS・スケジュール (WBS/Schedule)
3. 体制 (Team Structure)
4. リソース計画 (Resource Planning)
5. リスク管理 (Risk Management)
6. 品質管理 (Quality Management)
7. コミュニケーション計画 (Communication Plan)

### Test Plan Template Sections

1. テスト方針 (Test Policy)
2. テスト戦略 (Test Strategy) — scope, levels, entry/exit criteria per level
3. テスト環境 (Test Environment)
4. テストスケジュール (Test Schedule)
5. 体制・役割 (Team/Roles)
6. リスクと対策 (Risk & Mitigation)
7. 完了基準 (Exit Criteria)

### Template Deletion (v2.0 Clean Break)
<!-- Updated: Validation Session 1 - Delete files, no deprecation markers -->

Delete `overview.md` and `test-spec.md` from `templates/ja/`. No deprecation markers — files are simply removed. Migration docs explain the change.

## Related Code Files

### Must Create (in `sekkei/packages/mcp-server/templates/ja/`)
- `nfr.md`
- `security-design.md`
- `project-plan.md`
- `test-plan.md`
- `ut-spec.md`
- `it-spec.md`
- `st-spec.md`
- `uat-spec.md`

### Must Modify
- `sekkei/packages/mcp-server/templates/ja/overview.md` — Add deprecation header
- `sekkei/packages/mcp-server/templates/ja/test-spec.md` — Add deprecation header

## Implementation Steps

1. **Create ut-spec.md** — Extract UT section (2.1) from test-spec.md. Add boilerplate, scoped traceability (DD/CLS -> UT), defect report.
2. **Create it-spec.md** — Extract IT section (2.2). Scoped traceability (API/SCR -> IT).
3. **Create st-spec.md** — Extract ST section (2.3). Scoped traceability (SCR/TBL/F -> ST).
4. **Create uat-spec.md** — Extract UAT section (2.4). Scoped traceability (REQ/NFR -> UAT).
5. **Create nfr.md** — IPA NFUG 6-category structure. Table with NFR-xxx IDs, measurable targets.
6. **Create security-design.md** — 7 sections covering auth, encryption, OWASP, audit.
7. **Create project-plan.md** — WBS, schedule, team structure, risk management.
8. **Create test-plan.md** — Strategy, entry/exit criteria per level, environment, schedule.
9. **Deprecate overview.md** — Add `deprecated: true` to frontmatter + deprecation comment.
10. **Deprecate test-spec.md** — Same deprecation pattern.
11. **Verify all templates load** — Run template-loader against each new file.

## Todo List

- [ ] Create ut-spec.md template
- [ ] Create it-spec.md template
- [ ] Create st-spec.md template
- [ ] Create uat-spec.md template
- [ ] Create nfr.md template
- [ ] Create security-design.md template
- [ ] Create project-plan.md template
- [ ] Create test-plan.md template
- [ ] Add deprecation markers to overview.md
- [ ] Add deprecation markers to test-spec.md
- [ ] Verify template-loader loads all 8 new templates

## Success Criteria

- All 8 new templates have valid YAML frontmatter with correct `doc_type`
- Each test template has exactly ONE test level (not 4)
- Each test template has scoped traceability section
- Deprecated templates have `deprecated: true` in frontmatter
- `loadTemplate()` successfully loads each new template
- All AI comment instructions reference correct upstream ID prefixes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template content quality for non-test types | Medium | Research IPA/JUAS templates for nfr, security-design, project-plan |
| Boilerplate duplication across 4 test templates | Low | Agreed to duplicate (KISS). Can extract shared partial later if needed |
| Missing AI instructions for new types | Medium | Phase 3 adds GENERATION_INSTRUCTIONS entries |

## Security Considerations

- Templates are static markdown. No injection risk.
- Security-design template content covers auth/encryption patterns — ensure template prompts correct practices.

## Next Steps

- Phase 3 needs templates to exist for `loadTemplate()` calls
- Phase 4 needs template section names for `REQUIRED_SECTIONS` mapping
