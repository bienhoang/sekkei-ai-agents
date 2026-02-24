# Phase 02A — Workflow Guides

**Status:** completed
**Parallelization:** Runs in parallel with Phase 2B and 2C — after Phase 1 completes
**Effort:** ~2.5h
**Files owned (6):**
- `sekkei/docs/user-guide/workflow/index.md`
- `sekkei/docs/user-guide/workflow/requirements.md`
- `sekkei/docs/user-guide/workflow/design.md`
- `sekkei/docs/user-guide/workflow/testing.md`
- `sekkei/docs/user-guide/workflow/supplementary.md`
- `sekkei/docs/user-guide/workflow/change-request.md`

---

## Context Links

- Commands research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-01-commands-workflows.md`
- V-model research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-02-vmodel-doctypes.md`
- Phase references: `sekkei/packages/skills/content/references/phase-requirements.md`
- Design references: `sekkei/packages/skills/content/references/phase-design.md`
- Test references: `sekkei/packages/skills/content/references/phase-test.md`
- Supplementary: `sekkei/packages/skills/content/references/phase-supplementary.md`
- CR command: `sekkei/packages/skills/content/references/change-request-command.md`
- Foundation vocab: references terms established in Phase 1 (v-model-and-documents.md)

---

## File 1: `workflow/index.md` (~100 lines)

**Purpose:** High-level project flow overview with Mermaid. Entry point to all workflow sub-pages.

**Content outline:**

### Tổng quan quy trình
One paragraph: full project lifecycle from RFP to delivery.

### Mermaid: Full Project Flowchart
Flowchart TD covering:
```
RFP (tùy chọn) → Requirements
Requirements → functions-list + nfr + project-plan (parallel)
→ basic-design → security-design + detail-design (parallel)
→ test-plan → ut-spec + it-spec + st-spec + uat-spec
→ export/delivery
```
Include phase labels (Phase 1: Requirements, Phase 2: Design, Phase 3: Test)

### Phase Summary Table
| Phase | Tài liệu | Lệnh | Thời gian ước tính |
|-------|----------|------|-------------------|
| Requirements | 4 docs | requirements, functions-list, nfr, project-plan | 2-4h |
| Design | 3 docs | basic-design, security-design, detail-design | 3-6h |
| Test | 5 docs | test-plan + 4 specs | 4-8h |

### Navigation Links
- → [Requirements phase](./requirements.md)
- → [Design phase](./design.md)
- → [Testing phase](./testing.md)
- → [Supplementary docs](./supplementary.md)
- → [Change Request](./change-request.md)

### Công cụ hỗ trợ
- `/sekkei:status` — xem phase hiện tại, doc tiếp theo cần tạo
- `/sekkei:validate` — validate toàn bộ chain

---

## File 2: `workflow/requirements.md` (~200 lines)

**Purpose:** Step-by-step guide for the Requirements phase — 4 documents.

**Source:** `phase-requirements.md`, researcher-01 rows 2-5, researcher-02 Phase 1.

**Content outline:**

### Tổng quan Requirements Phase
- What this phase produces: 4 docs
- Who is involved: BA (R), PM (A), Dev Lead (C)
- Entry criteria: RFP or client brief available
- Exit criteria: All 4 docs validated + PM approval

### Mermaid: Requirements Flow
```
[Input: RFP text] → /sekkei:requirements
→ [要件定義書 created]
→ /sekkei:functions-list (parallel) + /sekkei:nfr (parallel) + /sekkei:project-plan (parallel)
```

### Doc 1: 要件定義書 (Requirements Specification)
- Là gì, ai tạo, khi nào
- **Lệnh:** `/sekkei:requirements @[requirements text hoặc file path]`
- Input: paste requirements text hoặc attach RFP output
- Output: `02-requirements/要件定義書.md` — IDs: REQ-xxx, NFR-xxx
- Gotcha: must read complete before running any downstream docs

### Doc 2: 機能一覧 (Functions List)
- Là gì: master list of features in 3-tier hierarchy (大分類→中分類→小機能)
- **Lệnh:** `/sekkei:functions-list @requirements`
- Output: `04-functions-list/機能一覧.md` — IDs: F-xxx
- Tip: chạy sau requirements, trước basic-design

### Doc 3: 非機能要件定義書 (NFR)
- Là gì: measurable non-functional targets (performance, security, availability)
- Key principle: never vague — always numeric (e.g., "99.9% uptime", "< 2s response")
- **Lệnh:** `/sekkei:nfr @requirements`
- Output: IDs: NFR-xxx

### Doc 4: プロジェクト計画書 (Project Plan)
- Là gì: WBS, milestones, team roles, timeline
- Note: management document, not used as input for design phase
- **Lệnh:** `/sekkei:project-plan @requirements`
- Output: IDs: PP-xxx

### Validation & Next Steps
```
/sekkei:validate @requirements
/sekkei:status   → confirms Phase 2 (Design) is unlocked
```
Link to design.md

---

## File 3: `workflow/design.md` (~200 lines)

**Purpose:** Design phase guide — 3 documents including split mode explanation.

**Source:** `phase-design.md`, researcher-01 rows 6-8, researcher-02 Phase 2-3.

**Content outline:**

### Tổng quan Design Phase
- Entry criteria: requirements + functions-list complete
- 3 docs: basic-design → security-design + detail-design (parallel after basic)
- Who: Dev Lead (R), BA (C), PM (A)

### Mermaid: Design Flow
```
[requirements + functions-list] → /sekkei:basic-design
→ 基本設計書
→ /sekkei:security-design (parallel) + /sekkei:detail-design (parallel)
```

### Doc 5: 基本設計書 (Basic Design)
- Là gì: system architecture — screen list (SCR), table definitions (TBL), API list (API)
- This is the "what" doc — not yet "how"
- **Lệnh:** `/sekkei:basic-design @requirements @functions-list`
- Output: `03-system/基本設計書.md` — IDs: SCR-xxx, TBL-xxx, API-xxx
- **Split mode:** large projects → config has `split: true` → generates per-feature files
  - Export split: prompts "merged or per-feature?"
- Plan/Implement flow for complex projects: `/sekkei:plan @basic-design` → `/sekkei:implement`

### Doc 6: セキュリティ設計書 (Security Design)
- Là gì: authentication flows, data classification, OWASP mitigations, compliance
- **Lệnh:** `/sekkei:security-design @basic-design`
- Output: IDs: SEC-xxx
- Tip: BA cần cung cấp compliance requirements (PCI, HIPAA, etc.) trước khi chạy

### Doc 7: 詳細設計書 (Detail Design)
- Là gì: class specs, module relationships, validation rules, error messages, sequence diagrams — the "how" doc
- **Lệnh:** `/sekkei:detail-design @basic-design`
- Output: IDs: CLS-xxx
- Note: heaviest doc — recommend `/sekkei:plan @detail-design` for projects > 20 features
- Plan/Implement flow: survey → phases → `/sekkei:implement @plan-path`

### Validation & Next Steps
```
/sekkei:validate @basic-design
/sekkei:status   → confirms Phase 3 (Test) is unlocked
```
Link to testing.md

---

## File 4: `workflow/testing.md` (~200 lines)

**Purpose:** Test phase guide — 5 documents (test-plan + 4 specs).

**Source:** `phase-test.md`, researcher-01 rows 9-13, researcher-02 Phase 4.

**Content outline:**

### Tổng quan Test Phase
- Entry criteria: basic-design complete (test-plan); detail-design complete (ut-spec)
- 5 docs: test-plan first, then 4 specs in parallel
- Who: QA (R), Dev Lead (C), BA (C for UAT)

### Mermaid: Test Flow
```
[req + nfr + basic-design] → /sekkei:test-plan → テスト計画書
→ ut-spec (detail-design) + it-spec (basic-design) + st-spec (basic-design+functions-list) + uat-spec (req+nfr)
```

### Doc 8: テスト計画書 (Test Plan)
- Là gì: test strategy, scope, entry/exit criteria for all 4 test levels, CI/CD plan
- **Lệnh:** `/sekkei:test-plan @requirements @nfr @basic-design`
- Output: IDs: TP-xxx
- Must complete before any test spec

### Doc 9: 単体テスト仕様書 — UT Spec
- Là gì: unit-level tests for individual classes/functions
- Pattern: 正常系 (happy path) + 異常系 (error cases) + 境界値 (boundary values), min 5 cases/module
- **Lệnh:** `/sekkei:ut-spec @detail-design @test-plan`
- Output: IDs: UT-xxx

### Doc 10: 結合テスト仕様書 — IT Spec
- Là gì: integration tests — API-to-API flows, screen-to-API contracts
- **Lệnh:** `/sekkei:it-spec @basic-design @test-plan`
- Output: IDs: IT-xxx

### Doc 11: システムテスト仕様書 — ST Spec
- Là gì: end-to-end business scenarios, performance targets, security tests
- **Lệnh:** `/sekkei:st-spec @basic-design @functions-list @test-plan`
- Output: IDs: ST-xxx

### Doc 12: 受入テスト仕様書 — UAT Spec
- Là gì: business-language acceptance scenarios for client sign-off
- Key: written in client-readable language, maps directly to 要件定義書 REQ-xxx
- **Lệnh:** `/sekkei:uat-spec @requirements @nfr @test-plan`
- Output: IDs: UAT-xxx
- Who runs: BA creates, PM approves, client executes

### Traceability Matrix
After all test specs: `/sekkei:matrix` generates Excel traceability: REQ-xxx ↔ F-xxx ↔ test IDs

### Validation & Delivery
```
/sekkei:validate               # full chain validation
/sekkei:export @[doc] --format=xlsx|pdf|docx
```

---

## File 5: `workflow/supplementary.md` (~120 lines)

**Purpose:** Overview of 9 supplementary documents — when and why to use them.

**Source:** researcher-02 "9 Supplementary", `phase-supplementary.md`.

**Content outline:**

### Giới thiệu
Supplementary docs are optional/situational — generated on demand, not part of the core chain.

### Summary Table
| Tài liệu | Khi nào dùng | Lệnh |
|----------|-------------|------|
| CRUD図 / トレーサビリティ | After design, to verify coverage | `/sekkei:matrix` |
| サイトマップ | After basic-design, for sitemap visualization | `/sekkei:sitemap` |
| 運用設計書 | Before go-live, operations runbook | `/sekkei:operation-design @input` |
| 移行設計書 | When migrating from existing system | `/sekkei:migration-design @input` |
| 画面設計書 | Split mode only — per-feature screen layouts | (auto in split mode) |
| 議事録 | Any meeting — not a Sekkei command (manual) | — |
| ADR | Architecture Decision Records (manual) | — |
| テストエビデンス | QA fills during test execution (manual) | — |
| 翻訳 | Any doc to EN/VI | `/sekkei:translate @doc --lang=en` |

### Detail: CRUD図 + Traceability
- `/sekkei:matrix` — auto-generates from existing docs
- Output: Excel with cross-table REQ ↔ F ↔ SCR ↔ test IDs
- When: after basic-design, re-run after any change

### Detail: Export (全ドキュメント)
- `/sekkei:export @doc --format=xlsx|pdf|docx`
- IPA 4-sheet Excel structure, PDF with Noto Sans JP, Word with auto-TOC
- Split mode: prompts merged vs per-feature

### Detail: 翻訳 (Translate)
- `/sekkei:translate @doc --lang=en`
- Preserves all IDs and table structure
- Glossary terms applied automatically

---

## File 6: `workflow/change-request.md` (~150 lines)

**Purpose:** Full Change Request lifecycle guide.

**Source:** `change-request-command.md`, researcher-01 "CR Flow".

**Content outline:**

### Tại sao cần Change Request (CR)
- Thay đổi yêu cầu giữa dự án → ảnh hưởng nhiều tài liệu
- CR flow đảm bảo: impact analysis → approval → propagation → re-validation
- Mỗi CR tạo git checkpoint → có thể rollback

### Mermaid: CR Lifecycle
```
Mô tả thay đổi → /sekkei:change
→ Impact analysis (Mermaid graph hiển thị các doc bị ảnh hưởng)
→ User approve → Propagate step-by-step (từng doc, user confirm)
→ 改訂履歴 tự động insert vào mỗi doc
→ /sekkei:validate → Complete
```

### Tạo Change Request mới
```
/sekkei:change
```
- Describe the change + paste affected IDs (REQ-xxx, F-xxx, etc.)
- Sekkei generates Mermaid impact graph — review trước khi approve
- IDs: CR-xxx

### Resume CR đang dở
```
/sekkei:change --resume CR-001
```

### Xem trạng thái CR
```
/sekkei:change --status
/sekkei:change --list
```

### Cancel / Rollback
```
/sekkei:change --cancel CR-001
/sekkei:change --rollback CR-001   # restores git checkpoint
```
Warning: rollback only works within same git session (before additional commits)

### Propagation Process
Step-by-step: Sekkei shows each affected doc, user confirms `[Proceed / Skip / Stop]`
After each propagation: 改訂履歴 row auto-inserted, version bumped.

### Validate sau CR
```
/sekkei:validate     # verify chain integrity after propagation
```

### Diff Visual
```
/sekkei:diff-visual @before @after
```
Color-coded Excel (朱書き style) showing all changes

### Checklist CR hoàn chỉnh
- [ ] CR created with clear description + affected IDs
- [ ] Impact graph reviewed and approved
- [ ] All affected docs propagated
- [ ] 改訂履歴 verified in each doc
- [ ] Full chain validation passed
- [ ] Export updated docs for client delivery

---

## Implementation Steps

1. Read `phase-requirements.md`, `phase-design.md`, `phase-test.md`, `phase-supplementary.md`
2. Read `change-request-command.md` for CR lifecycle details
3. Write `workflow/index.md` first (Mermaid overview)
4. Write `requirements.md`, `design.md`, `testing.md` in any order (independent)
5. Write `supplementary.md` and `change-request.md` last
6. Cross-link all files: each file links to adjacent phases

## Todo

- [ ] Read phase reference files from `sekkei/packages/skills/content/references/`
- [ ] Create `sekkei/docs/user-guide/workflow/` directory
- [ ] Write `workflow/index.md` with full Mermaid flowchart
- [ ] Write `workflow/requirements.md` (4 docs)
- [ ] Write `workflow/design.md` (3 docs + split mode)
- [ ] Write `workflow/testing.md` (5 docs)
- [ ] Write `workflow/supplementary.md` (9 docs summary)
- [ ] Write `workflow/change-request.md` (CR lifecycle)
- [ ] Verify Mermaid diagrams — v11 syntax, no invalid chars in node labels
- [ ] Verify command syntax against SKILL.md

## Success Criteria

- All 6 files exist with correct content
- Each doc type has: là gì, ai tạo, lệnh, input/output
- CR flow covers complete lifecycle including rollback
- All Mermaid diagrams render (flowchart TD, quoted labels for Japanese)
- Cross-links between workflow pages functional
- No content overlap with Phase 2B or 2C files
