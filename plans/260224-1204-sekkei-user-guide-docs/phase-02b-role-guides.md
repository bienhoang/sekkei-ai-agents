# Phase 02B — Role Guides

**Status:** completed
**Parallelization:** Runs in parallel with Phase 2A and 2C — after Phase 1 completes
**Effort:** ~1.5h
**Files owned (5):**
- `sekkei/docs/user-guide/roles/pm.md`
- `sekkei/docs/user-guide/roles/ba.md`
- `sekkei/docs/user-guide/roles/dev-lead.md`
- `sekkei/docs/user-guide/roles/qa.md`
- `sekkei/docs/user-guide/roles/sales.md`

---

## Context Links

- Commands research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-01-commands-workflows.md`
- V-model research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-02-vmodel-doctypes.md`
- RACI matrix: `plans/reports/brainstorm-260224-1204-sekkei-user-guide-docs.md` (Team Playbook section)
- RFP command: `sekkei/packages/skills/content/references/rfp-command.md`
- Plan orchestrator: `sekkei/packages/skills/content/references/plan-orchestrator.md`

---

## Role Guide Template (apply to all 5 files)

Each role guide follows the same structure:
1. **Role overview** — what this person does on a Sekkei project
2. **Lệnh thường dùng** — commands relevant to this role (not all 30)
3. **Quy trình làm việc** — brief summary (3-5 lines) + link to workflow page for details. **DO NOT duplicate workflow content.**
4. **Checklist** — checkbox list per phase
5. **Liên kết chi tiết** — links to relevant workflow pages

**IMPORTANT:** Role guides are "tóm tắt + link" — they summarize what this role does and link to workflow pages for how-to details. No workflow duplication.
**Tone:** Casual "bạn/mình" throughout all 5 files.
<!-- Updated: Validation Session 1 - Role guides set to "tóm tắt + link" pattern; casual tone confirmed -->

---

## File 1: `roles/pm.md` (~120 lines)

**Role:** Project Manager — sets up projects, tracks progress, approves deliverables.

**Content outline:**

### PM làm gì với Sekkei
- Khởi tạo project (init)
- Theo dõi chain status
- Configure approval workflow
- Approve deliverables before export

### Lệnh PM thường dùng
| Lệnh | Mục đích |
|------|----------|
| `npx sekkei init` | Tạo sekkei.config.yaml cho project mới |
| `/sekkei:status` | Xem tiến độ chain — doc nào xong, doc nào chưa |
| `/sekkei:validate` | Validate toàn bộ chain trước khi delivery |
| `/sekkei:export @doc --format=pdf` | Xuất PDF để gửi khách hàng |
| `/sekkei:version` | Health check môi trường |

### Quy trình PM: Dự án mới
1. **Init project:** `npx sekkei init` — configure project name, type, team size, output dir
2. **Configure approval chain** in `sekkei.config.yaml` (approval_chain section)
3. **Monitor:** `/sekkei:status` weekly to see chain progress
4. **Gate approvals:** Before each phase export, run `/sekkei:validate`
5. **Delivery:** `/sekkei:export @[doc] --format=xlsx` for each deliverable

### Config quan trọng cho PM
```yaml
approval_chain:
  要件定義書: [pm, ba]
  基本設計書: [pm, dev-lead]
  受入テスト仕様書: [pm, qa, ba]
```
Source: researcher-01 Configuration section

### Checklist PM
- [ ] sekkei.config.yaml tạo và configured
- [ ] Approval chain configured
- [ ] Requirements phase validated trước khi bắt đầu design
- [ ] Design phase validated trước khi bắt đầu test
- [ ] Full chain validation trước delivery
- [ ] Tất cả docs exported đúng format cho client

### Links
→ [Quick start](../quick-start.md) | → [Team Playbook](../team-playbook/index.md)

---

## File 2: `roles/ba.md` (~150 lines)

**Role:** Business Analyst — core user; creates requirements docs, validates against client needs.

**Content outline:**

### BA làm gì với Sekkei
- Chuyển đổi yêu cầu khách hàng → 要件定義書 + 機能一覧 + 非機能要件
- Review và validate output của AI
- Maintain glossary project-specific terms
- Create UAT spec với PM

### Lệnh BA thường dùng
| Lệnh | Mục đích |
|------|----------|
| `/sekkei:requirements @input` | Tạo 要件定義書 từ yêu cầu |
| `/sekkei:functions-list @req` | Tạo 機能一覧 |
| `/sekkei:nfr @requirements` | Tạo 非機能要件 |
| `/sekkei:uat-spec @requirements` | Tạo UAT Spec |
| `/sekkei:validate @requirements` | Validate doc |
| `/sekkei:glossary add` | Thêm thuật ngữ project |
| `/sekkei:translate @doc --lang=en` | Dịch doc sang tiếng Anh |
| `/sekkei:update @requirements` | Update khi upstream thay đổi |

### Quy trình BA: Tạo Requirements
1. Thu thập yêu cầu từ client (interview, workshop, existing docs)
2. Paste yêu cầu vào `/sekkei:requirements @[text]`
3. Review output — thêm missing context, fix AI errors
4. Run `/sekkei:functions-list` và `/sekkei:nfr` in parallel
5. Add project-specific terms: `/sekkei:glossary add`
6. Validate: `/sekkei:validate @requirements`
7. Handoff to Dev Lead for design phase

### Tips cho BA
- **Review là bắt buộc:** AI output cần BA domain review — đặc biệt REQ-xxx IDs và NFR numeric targets
- **Glossary quan trọng:** Import industry glossary sau init (`/sekkei:glossary import`)
- **Update flow:** Khi client thay đổi yêu cầu → `/sekkei:update @requirements` → `/sekkei:change` nếu design đã bắt đầu

### Checklist BA
- [ ] Requirements text đầy đủ trước khi chạy lệnh
- [ ] Tất cả REQ-xxx IDs reviewed và chính xác
- [ ] NFR targets cụ thể (numeric, không vague)
- [ ] 機能一覧 3-tier hierarchy logic hợp lý
- [ ] Glossary terms added cho domain-specific terms
- [ ] UAT Spec mapped chính xác với REQ-xxx

### Links
→ [Requirements workflow](../workflow/requirements.md) | → [V-model docs](../v-model-and-documents.md)

---

## File 3: `roles/dev-lead.md` (~120 lines)

**Role:** Dev Lead / Tech Lead — creates design docs, reviews technical accuracy.

**Content outline:**

### Dev Lead làm gì với Sekkei
- Tạo 基本設計書, セキュリティ設計書, 詳細設計書
- Review technical accuracy của AI output
- Configure split mode cho large projects
- Use plan/implement flow cho complex docs

### Lệnh Dev Lead thường dùng
| Lệnh | Mục đích |
|------|----------|
| `/sekkei:basic-design @req @functions` | Tạo 基本設計書 |
| `/sekkei:security-design @basic-design` | Tạo セキュリティ設計書 |
| `/sekkei:detail-design @basic-design` | Tạo 詳細設計書 |
| `/sekkei:plan @basic-design` | Survey + tạo phased plan cho complex projects |
| `/sekkei:implement @plan-path` | Execute plan phase-by-phase |
| `/sekkei:validate @basic-design` | Validate design docs |
| `/sekkei:diff-visual @before @after` | Review changes với 朱書き |

### Quy trình Dev Lead: Design Phase
1. Confirm requirements + functions-list validated (BA handoff)
2. Run `/sekkei:basic-design @requirements @functions-list`
3. Review: SCR-xxx screen list, TBL-xxx table defs, API-xxx API list — fix tech errors
4. For large projects: check `split` config; consider `/sekkei:plan @basic-design`
5. Run security + detail design in parallel (separate Claude sessions or sequential)
6. `/sekkei:validate @basic-design` before test phase starts

### Split Mode config
```yaml
# sekkei.config.yaml
split:
  basic-design: true
  detail-design: true
```
Split mode generates per-feature files — better quality for > 20 features

### Plan/Implement Flow
For complex docs (> 20 features or multi-subsystem):
```
/sekkei:plan @basic-design
→ feature survey → complexity survey → plan files created
/sekkei:implement @plans/basic-design-plan.md
→ phase-by-phase: [Proceed / Skip / Stop]
```

### Checklist Dev Lead
- [ ] 基本設計書: SCR, TBL, API sections complete và accurate
- [ ] Security design: OWASP mitigations mapped to SEC-xxx
- [ ] 詳細設計書: class specs + sequence diagrams per module
- [ ] All CLS-xxx IDs reference correct SCR/TBL/API IDs
- [ ] Split mode configured if project > 20 features

### Links
→ [Design workflow](../workflow/design.md) | → [Supplementary docs](../workflow/supplementary.md)

---

## File 4: `roles/qa.md` (~120 lines)

**Role:** QA Engineer — creates test specs, validates chain, runs acceptance.

**Content outline:**

### QA làm gì với Sekkei
- Tạo テスト計画書 và 4 test specs
- Validate chain integrity
- Export test specs cho client review
- Generate traceability matrix

### Lệnh QA thường dùng
| Lệnh | Mục đích |
|------|----------|
| `/sekkei:test-plan @req @nfr @basic-design` | Tạo テスト計画書 |
| `/sekkei:ut-spec @detail-design @test-plan` | Tạo 単体テスト仕様書 |
| `/sekkei:it-spec @basic-design @test-plan` | Tạo 結合テスト仕様書 |
| `/sekkei:st-spec @basic-design @functions-list @test-plan` | Tạo システムテスト仕様書 |
| `/sekkei:uat-spec @requirements @nfr @test-plan` | Tạo 受入テスト仕様書 |
| `/sekkei:matrix` | Generate traceability matrix |
| `/sekkei:validate` | Full chain validation |
| `/sekkei:export @[spec] --format=xlsx` | Export test spec cho client |

### Quy trình QA: Test Phase
1. Confirm basic-design validated (Dev Lead handoff)
2. Tạo テスト計画書 trước — defines strategy for all 4 levels
3. Tạo 4 test specs (có thể song song nếu detail-design sẵn sàng):
   - UT: cần detail-design
   - IT, ST: cần basic-design
   - UAT: cần requirements
4. Generate traceability matrix: `/sekkei:matrix`
5. Full validate: `/sekkei:validate` — fix any broken cross-refs
6. Export: `/sekkei:export @[spec] --format=xlsx` cho từng spec

### Coverage Standards (theo IPA)
- UT: min 5 test cases/module, cover 正常系 + 異常系 + 境界値
- IT: all API integrations + screen-to-API flows
- ST: all business scenarios từ 機能一覧
- UAT: all REQ-xxx items có acceptance scenario

### Checklist QA
- [ ] テスト計画書 complete với entry/exit criteria cho cả 4 test levels
- [ ] UT: tất cả CLS-xxx có ít nhất 5 test cases
- [ ] IT: tất cả API-xxx có integration test
- [ ] ST: tất cả F-xxx có system test scenario
- [ ] UAT: tất cả REQ-xxx có acceptance scenario — written in business language
- [ ] Traceability matrix: coverage 100% REQ-xxx
- [ ] Full chain validate passed

### Links
→ [Testing workflow](../workflow/testing.md) | → [Change Request](../workflow/change-request.md)

---

## File 5: `roles/sales.md` (~120 lines)

**Role:** Sales / Presales — uses RFP workflow for client proposals; demo guide.

**Content outline:**

### Sales làm gì với Sekkei
- Phân tích RFP từ khách hàng Nhật
- Tạo danh sách câu hỏi cho client
- Tạo proposal draft sau khi client trả lời
- Export đẹp để demo cho client

### Lệnh Sales thường dùng
| Lệnh | Mục đích |
|------|----------|
| `/sekkei:rfp` | Start RFP analysis workflow |
| `/sekkei:export @doc --format=pdf` | Xuất PDF professional |
| `/sekkei:translate @doc --lang=en` | Dịch nếu client cần EN version |
| `/sekkei:preview` | Demo docs trực tiếp trong browser |
| `/sekkei:version` | Kiểm tra môi trường trước demo |

### Quy trình Sales: RFP Workflow
Source: researcher-01 "RFP Flow", `rfp-command.md`

1. **Nhận RFP từ client:** Paste toàn bộ RFP text vào `/sekkei:rfp`
2. **Phase ANALYZING:** Sekkei phân tích và tạo Q&A list
3. **Phase QNA_GENERATION:** Review Q&A → gửi cho client
4. **Phase WAITING_CLIENT:** Chờ client trả lời
5. **Phase CLIENT_ANSWERED:** Paste câu trả lời của client
6. **Phase DRAFTING:** Sekkei tạo proposal draft
7. **Phase SCOPE_FREEZE:** Review + confirm scope với client

**Navigation keywords trong RFP flow:**
- `SHOW` — xem output hiện tại
- `BUILD_NOW` — skip Q&A và draft ngay với assumptions
- `SKIP_QNA` — bỏ qua Q&A phase
- `BACK` — quay lại phase trước

**Output files:** `sekkei-docs/01-rfp/<project-name>/` (01_raw_rfp.md … 06_scope_freeze.md)

### Demo Guide cho Sales
1. Khởi động preview: `/sekkei:preview`
2. Mở `localhost:5173` — navigate đến generated docs
3. Export PDF cho slide demo: `/sekkei:export @requirements --format=pdf`
4. Key talking points cho client:
   - IPA standard format → được acceptance ngay tại Nhật
   - Cross-reference IDs → traceability, audit-ready
   - Version history tự động (更新履歴)

### Presales Lifecycle
```
RFP received → /sekkei:rfp → Q&A → client answers → proposal
→ scope freeze → handoff to BA (→ requirements phase)
```

### Checklist Sales
- [ ] RFP text đầy đủ trước khi chạy `/sekkei:rfp`
- [ ] Q&A list reviewed (relevant questions only — remove irrelevant AI-generated ones)
- [ ] Client answers pasted đầy đủ
- [ ] Scope freeze confirmed với client trước handoff
- [ ] PDF export clean trước khi gửi client

### Links
→ [RFP workflow detail](../workflow/index.md) | → [Introduction](../introduction.md)

---

## Implementation Steps

1. Read `rfp-command.md` for Sales RFP phase details
2. Read `plan-orchestrator.md` for Dev Lead plan/implement flow
3. Read brainstorm RACI matrix for role responsibility confirmation
4. Write all 5 files (independent — can write in any order)
5. Each file: same template structure, different content
6. Keep each file focused — link to workflow pages for deep detail

## Todo

- [ ] Read `rfp-command.md` and `plan-orchestrator.md`
- [ ] Create `sekkei/docs/user-guide/roles/` directory
- [ ] Write `roles/pm.md`
- [ ] Write `roles/ba.md`
- [ ] Write `roles/dev-lead.md`
- [ ] Write `roles/qa.md`
- [ ] Write `roles/sales.md`
- [ ] Verify command syntax against SKILL.md for each role
- [ ] Verify all links point to correct relative paths

## Success Criteria

- All 5 role files exist, each 120-150 lines
- Each file has: role overview, commands table, workflow steps, checklist, links
- Commands listed per role are subset of the 30 total — not duplicated across roles unnecessarily
- Sales file covers full RFP lifecycle with navigation keywords
- Dev Lead file explains split mode and plan/implement flow
- No overlap with workflow/* files (role files summarize; workflow files detail)
