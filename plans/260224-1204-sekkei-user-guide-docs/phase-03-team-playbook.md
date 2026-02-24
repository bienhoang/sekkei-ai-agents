# Phase 03 — Team Playbook

**Status:** completed
**Parallelization:** Sequential after Phases 2A+2B+2C complete — references role definitions from Phase 2B
**Effort:** ~1.5h
**Files owned (4):**
- `sekkei/docs/user-guide/team-playbook/index.md`
- `sekkei/docs/user-guide/team-playbook/scenarios.md`
- `sekkei/docs/user-guide/team-playbook/checklists.md`
- `sekkei/docs/user-guide/team-playbook/review-and-approval.md`

---

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-1204-sekkei-user-guide-docs.md` — RACI matrix + 3 scenarios
- Commands research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-01-commands-workflows.md`
- V-model research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-02-vmodel-doctypes.md`
- Role guides: `sekkei/docs/user-guide/roles/` (Phase 2B output — reference for role definitions)
- Config example: `sekkei/sekkei.config.example.yaml` — approval_chain config

---

## File 1: `team-playbook/index.md` (~100 lines)

**Purpose:** Team structure overview, RACI matrix, how the team uses Sekkei together.

**Content outline:**

### Giới thiệu Team Playbook
Sekkei is a team tool — multiple roles contribute different docs in sequence. This playbook defines who does what and when.

### Mermaid: Team Structure Diagram
Org chart or swimlane showing 5 roles and their primary phases:
```
Sales → [RFP phase]
PM → [all phases: setup, gate approvals, delivery]
BA → [requirements phase + UAT spec]
Dev Lead → [design phase]
QA → [test phase]
```

### RACI Matrix
Full table from brainstorm report:

| Phase / Doc | PM | BA | Dev Lead | QA | Sales |
|------------|----|----|----------|----|----|
| RFP | A | R | C | - | R |
| Requirements | A | R | C | I | - |
| Functions List | I | R | C | I | - |
| NFR | A | R | C | I | - |
| Project Plan | R | C | C | - | - |
| Basic Design | A | C | R | I | - |
| Security Design | I | - | R | C | - |
| Detail Design | I | - | R | C | - |
| Test Plan | A | C | C | R | - |
| UT/IT/ST Spec | I | - | C | R | - |
| UAT Spec | A | C | - | R | - |
| Review/Approve | R | C | C | C | - |
| Export/Delivery | R | - | - | C | C |

R=Responsible, A=Accountable, C=Consulted, I=Informed

### Tool Setup per Role
Who needs what installed:
| Role | Cần thiết | Optional |
|------|----------|---------|
| PM | `npx sekkei init`, Claude Code | Preview |
| BA | Claude Code + Sekkei skill | Preview --edit |
| Dev Lead | Claude Code + Sekkei skill | Preview --edit |
| QA | Claude Code + Sekkei skill | Preview |
| Sales | Claude Code + Sekkei skill | Preview |

### Handoff Points
Key handoffs between roles:
1. **Sales → BA:** Scope freeze document (01-rfp/06_scope_freeze.md) → input for requirements
2. **BA → Dev Lead:** Validated requirements + functions-list + NFR
3. **Dev Lead → QA:** Validated basic-design + detail-design
4. **QA → PM:** Full chain validated → export for client delivery

### Links
→ [RACI detail: PM guide](../roles/pm.md) | → [Scenarios](./scenarios.md) | → [Checklists](./checklists.md)

---

## File 2: `team-playbook/scenarios.md` (~200 lines)

**Purpose:** 3 real-world scenarios showing Sekkei in action from start to finish.

**Source:** Brainstorm "3 Real-world Scenarios", researcher-01 workflow summaries.

**Content outline:**

### Scenario 1: Dự án mới từ đầu (~70 lines)
**Situation:** Team nhận được RFP cho hệ thống quản lý nhân sự (人事管理システム) từ khách hàng Nhật. Cần tạo full spec chain từ đầu.

**Timeline:** 2-3 weeks for a mid-size project (20-30 features)
<!-- Updated: Validation Session 1 - Example project set to SaaS HR system -->

**Step-by-step walkthrough:**

**Week 1 — RFP & Requirements:**
1. Sales: `/sekkei:rfp` → paste RFP → Q&A generated → send to client
2. Client answers → Sales: paste answers → `SCOPE_FREEZE`
3. BA: `/sekkei:requirements @scope-freeze` → review 要件定義書
4. BA (parallel): `/sekkei:functions-list` + `/sekkei:nfr` + PM: `/sekkei:project-plan`
5. PM: `/sekkei:validate @requirements` → gate approval
6. PM: `/sekkei:export @requirements --format=pdf` → client review copy

**Week 2 — Design:**
7. Dev Lead: `/sekkei:basic-design @requirements @functions-list`
8. Dev Lead (parallel): `/sekkei:security-design` + `/sekkei:detail-design`
   - Large project: use `/sekkei:plan @basic-design` + `/sekkei:implement`
9. PM: `/sekkei:validate @basic-design` → gate approval

**Week 3 — Test Specs:**
10. QA: `/sekkei:test-plan @requirements @nfr @basic-design`
11. QA (parallel): ut-spec + it-spec + st-spec + uat-spec
12. QA: `/sekkei:matrix` → traceability matrix
13. Full validate: `/sekkei:validate`

**Delivery:**
14. Export all docs: `/sekkei:export @[doc] --format=xlsx` for each
15. Optional: PDF bundle for client presentation

**Commands used:** rfp, requirements, functions-list, nfr, project-plan, basic-design, security-design, detail-design, test-plan, ut-spec, it-spec, st-spec, uat-spec, matrix, validate, export

---

### Scenario 2: Thay đổi giữa dự án (~70 lines)
**Situation:** Sau khi design hoàn chỉnh, client yêu cầu thêm tính năng đăng nhập bằng SNS (thay đổi REQ-012).

**Impact:** REQ-012 → F-045, F-046 (new) → SCR-023, API-018 (modified) → SEC-007 (new) → CLS-031 (new) → IT-019, ST-022, UAT-015 (modified)

**Step-by-step:**
1. BA identifies change: REQ-012 needs updating
2. BA/PM: `/sekkei:change` → describe: "Thêm SNS login (Google + LINE) vào yêu cầu xác thực"
3. Sekkei generates impact Mermaid graph — shows all affected IDs
4. PM reviews graph → approves propagation
5. Sekkei propagates step-by-step:
   - 要件定義書: `[Proceed]` → REQ-012 updated, 改訂履歴 row added
   - 機能一覧: `[Proceed]` → F-045, F-046 added
   - 基本設計書: `[Proceed]` → SCR-023, API-018 updated
   - セキュリティ設計書: `[Proceed]` → SEC-007 added
   - 詳細設計書: `[Proceed]` → CLS-031 added
   - Test specs: `[Proceed]` for each affected spec
6. `/sekkei:validate` → full chain check
7. `/sekkei:diff-visual @before @after` → 朱書き Excel for client review
8. Export updated docs

**Key points:**
- Git checkpoint created at step 2 → rollback available if needed
- Each doc's 更新履歴 auto-bumped with version + date + author
- Traceability preserved: all new IDs reference upstream correctly

---

### Scenario 3: Chuẩn bị audit (~60 lines)
**Situation:** Project sắp delivery, khách hàng Nhật yêu cầu audit toàn bộ tài liệu trước acceptance.

**Step-by-step:**
1. PM: `/sekkei:validate` → full chain validation report
   - Fix any broken cross-references flagged
   - Ensure all 改訂履歴 rows present and consistent
2. QA: `/sekkei:matrix` → generate traceability matrix
   - Verify 100% REQ-xxx coverage in UAT
   - Verify all F-xxx covered in ST
3. Export all documents:
   ```
   /sekkei:export @requirements --format=xlsx
   /sekkei:export @functions-list --format=xlsx
   /sekkei:export @basic-design --format=xlsx
   /sekkei:export @detail-design --format=xlsx
   /sekkei:export @test-plan --format=xlsx
   /sekkei:export @ut-spec --format=xlsx
   /sekkei:export @it-spec --format=xlsx
   /sekkei:export @st-spec --format=xlsx
   /sekkei:export @uat-spec --format=xlsx
   /sekkei:export @matrix --format=xlsx
   ```
4. Review exported Excel: verify IPA 4-sheet structure (表紙, 更新履歴, 目次, 本文)
5. Optional: `/sekkei:translate @uat-spec --lang=en` if client needs English UAT
6. Deliver as ZIP or project folder

**Audit checklist:**
- [ ] All docs pass `/sekkei:validate`
- [ ] Traceability matrix: 100% REQ-xxx → UAT-xxx coverage
- [ ] All Excel files have 4-sheet IPA structure
- [ ] 更新履歴 consistent across all docs
- [ ] Version numbers synchronized

---

## File 3: `team-playbook/checklists.md` (~150 lines)

**Purpose:** Phase-by-phase checklists with checkbox format — one per phase, organized by role.

**Content outline:**

### Hướng dẫn dùng checklists
Copy relevant checklist into your project task tracker (Jira, Notion, etc.). Mark off as you go.

### Checklist 0: Project Setup
**PM:**
- [ ] `npx sekkei init` — sekkei.config.yaml created
- [ ] `project.name`, `project.type`, `project.language` configured
- [ ] `approval_chain` configured for your team
- [ ] `output.directory` set
- [ ] All team members have Claude Code + Sekkei skill installed
- [ ] `/sekkei:version` passes on all machines

### Checklist 1: RFP Phase (Sales + PM)
- [ ] RFP text complete và đầy đủ
- [ ] `/sekkei:rfp` run, Q&A generated
- [ ] Q&A reviewed — irrelevant questions removed
- [ ] Q&A sent to client
- [ ] Client answers received và pasted
- [ ] Proposal draft reviewed
- [ ] Scope freeze confirmed with client (06_scope_freeze.md)
- [ ] Scope freeze doc handed off to BA

### Checklist 2: Requirements Phase (BA + PM)
- [ ] `/sekkei:requirements` completed, 要件定義書 reviewed
- [ ] All REQ-xxx IDs logical and complete
- [ ] `/sekkei:functions-list` completed, 3-tier hierarchy correct
- [ ] All F-xxx IDs reference correct REQ-xxx
- [ ] `/sekkei:nfr` completed — all NFR-xxx targets numeric (not vague)
- [ ] `/sekkei:project-plan` completed
- [ ] Glossary terms added: `/sekkei:glossary add` for domain terms
- [ ] `/sekkei:validate @requirements` passed
- [ ] PM approval received
- [ ] Handoff to Dev Lead: requirements + functions-list + NFR validated

### Checklist 3: Design Phase (Dev Lead + PM)
- [ ] `/sekkei:basic-design` completed
- [ ] SCR-xxx screen list complete and accurate
- [ ] TBL-xxx table definitions complete
- [ ] API-xxx API list complete
- [ ] `/sekkei:security-design` completed, OWASP mitigations mapped
- [ ] `/sekkei:detail-design` completed (or plan/implement for large projects)
- [ ] CLS-xxx reference correct SCR/TBL/API IDs
- [ ] `/sekkei:validate @basic-design` passed
- [ ] PM approval received
- [ ] Handoff to QA: basic-design + detail-design validated

### Checklist 4: Test Phase (QA + PM)
- [ ] `/sekkei:test-plan` completed with entry/exit criteria
- [ ] `/sekkei:ut-spec` — all CLS-xxx covered, min 5 cases/module
- [ ] `/sekkei:it-spec` — all API-xxx integration flows covered
- [ ] `/sekkei:st-spec` — all F-xxx system scenarios covered
- [ ] `/sekkei:uat-spec` — all REQ-xxx have acceptance scenarios (business language)
- [ ] `/sekkei:matrix` — traceability matrix generated
- [ ] Full `/sekkei:validate` passed — no broken cross-refs
- [ ] PM approval received

### Checklist 5: Delivery
- [ ] All docs exported: `/sekkei:export @[doc] --format=xlsx` for each
- [ ] Excel files verified: 4-sheet IPA structure present
- [ ] 更新履歴 rows complete in all docs
- [ ] Client review copy prepared (PDF for presentation)
- [ ] `/sekkei:diff-visual` prepared if change requests were processed

### Checklist 6: Change Request (any phase)
- [ ] Change description clear + affected IDs identified
- [ ] `/sekkei:change` run, impact graph reviewed
- [ ] Propagation approved by PM
- [ ] All affected docs propagated (none skipped without reason)
- [ ] 改訂履歴 auto-inserted in each propagated doc
- [ ] `/sekkei:validate` full chain passed after propagation
- [ ] Updated docs exported for client

---

## File 4: `team-playbook/review-and-approval.md` (~100 lines)

**Purpose:** Review rules, approval chain configuration, quality gates between phases.

**Content outline:**

### Quy tắc Review

**AI output LUÔN cần human review:**
- AI tạo structure và format chuẩn — nhưng domain knowledge là của team
- BA review: REQ-xxx logic và completeness
- Dev Lead review: technical accuracy của design docs
- QA review: test coverage đủ và realistic
- PM review: consistency, completeness trước khi approve

**Review không nghĩa là rewrite:**
- Fix AI errors, không viết lại từ đầu
- Focus on: missing information, wrong IDs, unrealistic NFR targets, technical inaccuracies

### Approval Chain Configuration

Cấu hình trong `sekkei.config.yaml`:
```yaml
approval_chain:
  要件定義書: [pm, ba]
  機能一覧: [pm, ba, dev-lead]
  非機能要件定義書: [pm, ba]
  基本設計書: [pm, dev-lead]
  セキュリティ設計書: [dev-lead]
  詳細設計書: [dev-lead]
  テスト計画書: [pm, qa]
  単体テスト仕様書: [dev-lead, qa]
  結合テスト仕様書: [dev-lead, qa]
  システムテスト仕様書: [pm, qa]
  受入テスト仕様書: [pm, ba, qa]
```
Note: `approval_chain` triggers digital approval workflow.
> [!WARNING] **[Beta]** — Tính năng `approval_chain` có thể chưa hoạt động hoàn chỉnh trong phiên bản hiện tại.
<!-- Updated: Validation Session 1 - approval_chain marked as [Beta] -->

### Quality Gates (Phase-exit Criteria)

**Gate 1: Requirements → Design**
- [ ] `/sekkei:validate @requirements` passed
- [ ] PM approved 要件定義書
- [ ] BA approved 機能一覧 (F-xxx IDs complete)
- [ ] NFR targets all numeric

**Gate 2: Design → Test**
- [ ] `/sekkei:validate @basic-design` passed
- [ ] PM + Dev Lead approved 基本設計書
- [ ] Detail design covers all CLS-xxx

**Gate 3: Test → Delivery**
- [ ] Full `/sekkei:validate` passed (entire chain)
- [ ] Traceability matrix: 100% coverage
- [ ] PM final approval

### Validate Command Reference
```bash
/sekkei:validate              # full chain — run before every gate
/sekkei:validate @requirements    # single doc
/sekkei:validate @basic-design    # single doc
```

Validate checks:
- Cross-reference IDs exist and are consistent
- Required sections present in each doc
- Upstream docs not marked stale (use `/sekkei:update` if flagged)
- 更新履歴 version consistent

### When to use `/sekkei:update`
When upstream doc changed AFTER downstream was generated:
```
/sekkei:update @[downstream-doc]
```
- Sekkei detects upstream changes (via git diff)
- Auto-inserts 改訂履歴 row with change summary
- User confirms before saving

---

## Implementation Steps

1. Read brainstorm RACI matrix section for complete responsibility data
2. Read researcher-01 workflow summaries for scenario command sequences
3. Write `team-playbook/index.md` first (RACI matrix + team structure)
4. Write `scenarios.md` — most content-heavy, use command sequences from research
5. Write `checklists.md` — systematic, one checklist per phase
6. Write `review-and-approval.md` — reference approval_chain config + quality gates

## Todo

- [ ] Read brainstorm RACI matrix section
- [ ] Create `sekkei/docs/user-guide/team-playbook/` directory
- [ ] Write `team-playbook/index.md` with RACI + Mermaid team structure
- [ ] Write `team-playbook/scenarios.md` (3 scenarios with full command sequences)
- [ ] Write `team-playbook/checklists.md` (6 phase checklists)
- [ ] Write `team-playbook/review-and-approval.md` (gates + config)
- [ ] Verify RACI matrix against Phase 2B role guides (no contradictions)
- [ ] Verify all commands in scenarios exist in SKILL.md

## Success Criteria

- All 4 files exist with correct content
- RACI matrix matches role guide responsibilities (Phase 2B)
- Scenario 1 walkthrough covers full project lifecycle end-to-end
- Scenario 2 covers complete CR flow with realistic IDs (REQ-012 etc.)
- Scenario 3 is actionable: could be used directly by a PM preparing for audit
- Checklists are copy-paste ready (checkbox format, role-organized)
- Approval chain config example is valid YAML
- No content overlap with workflow/* or roles/* files
