# Phase 5: SKILL & Adapters

## Context Links

- [Research: Templates & SKILL](reports/researcher-260223-2117-templates-and-skill-structure.md)
- [SKILL.md](../../sekkei/packages/skills/content/SKILL.md) (submodule — read-only reference)
- [Brainstorm: Command naming](../reports/brainstorm-260223-2104-v-model-chain-review.md)

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 3h
- **Completed:** 2026-02-23

Add 8 new sub-command sections to SKILL.md, remove 2, and update adapter files (Cursor, Copilot) to mention new doc types.

## Key Insights

- SKILL.md is in `sekkei/packages/skills/content/SKILL.md` — this is a submodule. Changes require submodule commit.
- Each sub-command section follows pattern: `### /sekkei:{command} [@input]` with interview questions, numbered steps, rules, references.
- Adapter files in `sekkei/packages/mcp-server/adapters/` — cursorrules, copilot-instructions.md. Minimal updates: list new doc types.
- Command naming agreed: `/sekkei:ut-spec`, `/sekkei:it-spec`, `/sekkei:st-spec`, `/sekkei:uat-spec`, `/sekkei:nfr`, `/sekkei:security-design`, `/sekkei:project-plan`, `/sekkei:test-plan`.

## Requirements

### Functional
1. 8 new SKILL.md sub-command sections with interview questions and numbered steps
2. Deprecation notices for `/sekkei:overview` and `/sekkei:test-spec`
3. Updated command listing at top of SKILL.md
4. Updated workflow router section showing new chain order
5. Adapter files updated with new doc type list

### Non-Functional
- SKILL.md stays under 2000 lines total (currently ~600 lines + references)
- Each new command section follows existing pattern exactly

## Architecture

### New Sub-Commands (8)

#### `/sekkei:nfr @requirements`
- **Interview**: Confirm IPA NFUG categories scope, target SLA values
- **Steps**: Read requirements -> load nfr template -> call generate_document(doc_type: "nfr") -> save as 02-nfr.md -> update chain status
- **Rules**: NFR-xxx IDs, each NFR MUST have numeric 目標値, reference IPA 6 categories

#### `/sekkei:security-design @basic-design`
- **Interview**: Auth method (OAuth2/SAML/etc), data classification level, compliance requirements
- **Steps**: Read basic-design -> load security-design template -> call generate_document(doc_type: "security-design") -> save as 03-system/security-design.md
- **Rules**: SEC-xxx IDs, reference OWASP Top 10, cover auth + encryption + audit

#### `/sekkei:project-plan @requirements`
- **Interview**: Team size, timeline constraints, methodology (waterfall/hybrid)
- **Steps**: Read requirements -> load project-plan template -> call generate_document(doc_type: "project-plan") -> save as 02-project-plan.md
- **Rules**: PP-xxx IDs, WBS table, milestone table with dates

#### `/sekkei:test-plan @requirements`
- **Interview**: Test scope (which levels?), CI/CD integration, environment constraints
- **Steps**: Read requirements + basic-design -> load test-plan template -> call generate_document(doc_type: "test-plan") -> save as 08-test/test-plan.md
- **Rules**: TP-xxx IDs, entry/exit criteria per level, risk-based test priority

#### `/sekkei:ut-spec @detail-design`
- **Interview**: Target modules/classes, testing framework, coverage target
- **Steps**: Read detail-design -> load ut-spec template -> call generate_document(doc_type: "ut-spec", source_code_path?) -> save as 08-test/ut-spec.md
- **Rules**: UT-xxx IDs, reference CLS-xxx/DD-xxx, 5+ cases per module, テスト観点: 正常系/異常系/境界値
- **Split mode**: Feature scope supported -> `05-features/{name}/ut-spec.md`

#### `/sekkei:it-spec @basic-design`
- **Interview**: Integration scope (API/screen transitions/data flow), test doubles strategy
- **Steps**: Read basic-design -> load it-spec template -> call generate_document(doc_type: "it-spec") -> save as 08-test/it-spec.md
- **Rules**: IT-xxx IDs, reference API-xxx/SCR-xxx/TBL-xxx, focus on interface contracts
- **Split mode**: Feature scope supported -> `05-features/{name}/it-spec.md`

#### `/sekkei:st-spec @basic-design`
- **Interview**: E2E scenarios, performance test scope, security test scope
- **Steps**: Read basic-design + functions-list -> load st-spec template -> call generate_document(doc_type: "st-spec") -> save as 08-test/st-spec.md
- **Rules**: ST-xxx IDs, reference SCR-xxx/TBL-xxx/F-xxx, E2E + performance + security scenarios
- **No feature scope** (system-level)

#### `/sekkei:uat-spec @requirements`
- **Interview**: Business scenarios, acceptance criteria owner, sign-off process
- **Steps**: Read requirements + nfr -> load uat-spec template -> call generate_document(doc_type: "uat-spec") -> save as 08-test/uat-spec.md
- **Rules**: UAT-xxx IDs, reference REQ-xxx/NFR-xxx, business scenario-based, user-facing language
- **No feature scope** (business-level)

### Removed Commands (v2.0 Clean Break)
<!-- Updated: Validation Session 1 - No deprecation notices, just remove commands entirely -->

Remove `/sekkei:overview` and `/sekkei:test-spec` sections from SKILL.md entirely. No deprecation notices — clean v2.0 break.

### Updated Command List (Top of SKILL.md)

```markdown
## Document Generation Commands

### Requirements Phase
/sekkei:requirements @input     — 要件定義書
/sekkei:nfr @requirements       — 非機能要件定義書 (NEW)
/sekkei:functions-list @input   — 機能一覧
/sekkei:project-plan @req       — プロジェクト計画書 (NEW)

### Design Phase
/sekkei:basic-design @input     — 基本設計書
/sekkei:security-design @bd     — セキュリティ設計書 (NEW)
/sekkei:detail-design @input    — 詳細設計書

### Test Phase
/sekkei:test-plan @req          — テスト計画書 (NEW)
/sekkei:ut-spec @detail-design  — 単体テスト仕様書 (NEW)
/sekkei:it-spec @basic-design   — 結合テスト仕様書 (NEW)
/sekkei:st-spec @basic-design   — システムテスト仕様書 (NEW)
/sekkei:uat-spec @requirements  — 受入テスト仕様書 (NEW)
```

### Updated Workflow Section

Show new V-model chain:

```markdown
## V-Model Chain

RFP (/sekkei:rfp)
  └─► Requirements (/sekkei:requirements)
        ├─► NFR (/sekkei:nfr)
        ├─► Functions List (/sekkei:functions-list)
        ├─► Project Plan (/sekkei:project-plan)  [parallel]
        └─► Glossary seed (/sekkei:glossary seed)
              └─► Basic Design (/sekkei:basic-design)
                    ├─► Security Design (/sekkei:security-design)
                    └─► Detail Design (/sekkei:detail-design)
                          └─► Test Plan (/sekkei:test-plan)
                                ├─► UT Spec (/sekkei:ut-spec)     ← detail-design
                                ├─► IT Spec (/sekkei:it-spec)     ← basic-design
                                ├─► ST Spec (/sekkei:st-spec)     ← basic-design
                                └─► UAT Spec (/sekkei:uat-spec)   ← requirements
```

### Adapter Updates

**Cursor (cursorrules):**
- Update doc type list to include 8 new types
- Update chain description

**Copilot (copilot-instructions.md):**
- Update doc type list to include 8 new types
- Update chain description

Minimal changes — adapters reference SKILL.md, so just update the summary list.

## Related Code Files

### Must Modify
- `sekkei/packages/skills/content/SKILL.md` — 8 new command sections, 2 deprecations, updated list and workflow
- `sekkei/packages/mcp-server/adapters/cursor/cursorrules` — Doc type list update
- `sekkei/packages/mcp-server/adapters/copilot/copilot-instructions.md` — Doc type list update

## Implementation Steps

1. **Update SKILL.md command listing** — Add 8 new commands grouped by phase. Mark overview and test-spec as deprecated.
2. **Add /sekkei:nfr section** — Interview questions, steps, rules. Reference IPA NFUG.
3. **Add /sekkei:security-design section** — Interview, steps, rules. Reference OWASP.
4. **Add /sekkei:project-plan section** — Interview, steps, rules.
5. **Add /sekkei:test-plan section** — Interview, steps, rules. Entry/exit criteria.
6. **Add /sekkei:ut-spec section** — Interview, steps, rules. CLS/DD cross-refs. Feature scope support.
7. **Add /sekkei:it-spec section** — Interview, steps, rules. API/SCR/TBL cross-refs. Feature scope support.
8. **Add /sekkei:st-spec section** — Interview, steps, rules. No feature scope.
9. **Add /sekkei:uat-spec section** — Interview, steps, rules. No feature scope.
10. **Add deprecation notices** for /sekkei:overview and /sekkei:test-spec.
11. **Update V-model workflow section** — New chain diagram.
12. **Update glossary section** — Add seed and finalize actions.
13. **Update Cursor adapter** — Doc type list.
14. **Update Copilot adapter** — Doc type list.
15. **Commit submodule change** — `cd sekkei && git add -A && git commit`.

## Todo List

- [ ] Update SKILL.md command listing with phase groups
- [ ] Add /sekkei:nfr command section
- [ ] Add /sekkei:security-design command section
- [ ] Add /sekkei:project-plan command section
- [ ] Add /sekkei:test-plan command section
- [ ] Add /sekkei:ut-spec command section
- [ ] Add /sekkei:it-spec command section
- [ ] Add /sekkei:st-spec command section
- [ ] Add /sekkei:uat-spec command section
- [ ] Add deprecation notices for overview and test-spec
- [ ] Update V-model workflow diagram
- [ ] Update glossary command with seed/finalize
- [ ] Update Cursor adapter
- [ ] Update Copilot adapter
- [ ] Commit submodule

## Success Criteria

- SKILL.md has 8 new `### /sekkei:{command}` sections
- Each new section has interview questions, numbered steps, cross-ref rules
- Deprecated commands show clear replacement instructions
- V-model workflow diagram matches brainstorm agreed chain
- Adapter files list all new doc types

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SKILL.md too long (>2000 lines) | Medium | Use references/ folder for detailed instruction docs, keep SKILL.md concise |
| Submodule commit conflicts | Low | Coordinate with other sekkei changes; rebase before PR |
| Adapter files out of date | Low | Adapters are secondary; SKILL.md is primary contract |

## Security Considerations

- SKILL.md is a documentation file. No code execution risk.
- Security-design command prompts for auth/encryption patterns — ensure template encourages secure defaults (e.g., bcrypt not MD5, TLS 1.3+).

## Next Steps

- Phase 6 needs SKILL.md finalized to verify command-to-MCP-tool alignment
- Submodule commit must happen before final PR
