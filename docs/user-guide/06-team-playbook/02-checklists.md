# Checklists — Danh Sách Kiểm Tra Theo Phase

Xem thêm: [Team Playbook](./index.md) | [Scenarios](./01-scenarios.md) | [Review & Approval](./03-review-and-approval.md)

---

Copy-paste từng checklist vào task tracker hoặc comment của PR khi bắt đầu phase tương ứng.

---

## Checklist 0: Project Setup (PM)

Chạy trước khi bất kỳ ai trong team bắt đầu làm việc.

- [ ] `sekkei init` đã chạy thành công — `sekkei.config.yaml` được tạo
- [ ] `sekkei.config.yaml` có `project.name`, `type`, `keigo` level phù hợp với khách hàng
- [ ] Approval chain đã được cấu hình trong config (xem [review-and-approval.md](./03-review-and-approval.md))
- [ ] `/sekkei:version` chạy OK — MCP server connected, Python bridge OK
- [ ] Tất cả thành viên team đã cài Sekkei skill (`~/.claude/skills/sekkei/SKILL.md`)
- [ ] Output directory (`workspace-docs/`) đã được tạo và thêm vào `.gitignore` nếu cần
- [ ] Git repo đã init, commit đầu tiên với config file đã được tạo

---

## Checklist 1: RFP Phase (Sales + PM)

Bắt đầu khi nhận được RFP từ khách hàng Nhật.

- [ ] Text RFP đầy đủ — không bị cắt xén khi paste vào `/sekkei:rfp`
- [ ] `/sekkei:rfp` đã chạy và sinh danh sách Q&A tự động
- [ ] Q&A đã được Sales review — xóa câu thừa, thêm câu domain-specific (HR system: quy tắc lương, chấm công, cơ cấu tổ chức...)
- [ ] Q&A đã gửi cho khách hàng và nhận được câu trả lời đầy đủ
- [ ] Câu trả lời khách hàng đã paste vào `CLIENT_ANSWERED`
- [ ] `SCOPE_FREEZE` đã được confirm — confidence level HIGH hoặc MEDIUM
- [ ] `06_scope_freeze.md` đã export PDF và khách hàng đã ký xác nhận
- [ ] PM đã được thông báo về scope freeze
- [ ] **Handoff cho BA:** `05_proposal.md` + `06_scope_freeze.md` đã bàn giao

---

## Checklist 2: Requirements Phase (BA + PM)

Bắt đầu sau khi nhận handoff từ Sales.

- [ ] `/sekkei:requirements @06_scope_freeze.md` đã chạy và sinh 要件定義書
- [ ] REQ-xxx IDs đã review — không có ID trùng, không có logic gap
- [ ] Business rules trong 要件定義書 khớp với meeting notes / RFP gốc của hệ thống quản lý nhân sự
- [ ] `/sekkei:functions-list @requirements` đã chạy — F-xxx hierarchy có cấu trúc logic
- [ ] `/sekkei:nfr @requirements` đã chạy — tất cả targets có số cụ thể (response time ms/s, uptime %, concurrent users)
- [ ] PM đã chạy `/sekkei:project-plan @requirements`
- [ ] Glossary đã được thêm: tên modules (人事管理モジュール, 給与計算エンジン, 勤怠管理...) và domain terms quan trọng
- [ ] `/sekkei:validate @requirements` pass — không có orphaned IDs
- [ ] `/sekkei:validate @functions-list` pass
- [ ] `/sekkei:validate @nfr` pass
- [ ] PM đã review và approve (Gate 1)
- [ ] `/sekkei:export @requirements --format=pdf` đã gửi stakeholder review
- [ ] **Handoff cho Dev Lead:** 要件定義書 + 機能一覧 + 非機能要件定義書 đã bàn giao

---

## Checklist 3: Design Phase (Dev Lead + PM)

Bắt đầu sau khi nhận handoff từ BA, xác nhận Gate 1 đã pass.

- [ ] Đã confirm BA đã validate requirements (`/sekkei:status` hoặc hỏi trực tiếp)
- [ ] `/sekkei:basic-design @requirements @functions-list` đã chạy
- [ ] SCR-xxx review: đủ screens cho hệ thống quản lý nhân sự (quản lý nhân viên, chấm công, bảng lương, báo cáo HR...)
- [ ] TBL-xxx review: schema hợp lý, primary/foreign keys rõ ràng, quan hệ bảng đúng
- [ ] API-xxx review: RESTful chuẩn, đủ CRUD cho các entity chính (Employee, Attendance, Payroll...)
- [ ] Split mode đã cấu hình nếu dự án > 20 tính năng (`split: true` trong config)
- [ ] `/sekkei:security-design @basic-design` đã chạy (chạy song song với detail design)
- [ ] `/sekkei:detail-design @basic-design` đã chạy (chạy song song với security design)
- [ ] CLS-xxx trong detail design reference đúng API-xxx và TBL-xxx IDs đã có
- [ ] Threat model trong security design đã map vào OWASP Top 10
- [ ] `/sekkei:validate @basic-design` pass
- [ ] `/sekkei:validate @detail-design` pass
- [ ] PM đã review và approve (Gate 2)
- [ ] **Handoff cho QA:** 基本設計書 + セキュリティ設計書 + 詳細設計書 đã bàn giao

---

## Checklist 4: Test Phase (QA + PM)

Bắt đầu sau khi nhận handoff từ Dev Lead, xác nhận Gate 2 đã pass.

- [ ] `/sekkei:test-plan @requirements @nfr @basic-design` đã chạy
- [ ] Test strategy trong テスト計画書 có đủ: scope, approach, entry/exit criteria
- [ ] `/sekkei:ut-spec @detail-design @test-plan` đã chạy
- [ ] `/sekkei:it-spec @basic-design @test-plan` đã chạy
- [ ] `/sekkei:st-spec @basic-design @functions-list @test-plan` đã chạy
- [ ] `/sekkei:uat-spec @requirements @nfr @test-plan` đã chạy — BA đã review UAT scenarios
- [ ] UAT scenarios map đúng về REQ-xxx của hệ thống quản lý nhân sự
- [ ] `/sekkei:matrix` đã chạy — traceability matrix đã được tạo
- [ ] Matrix coverage: mỗi REQ-xxx có ít nhất 1 test case (UT/IT/ST/UAT)
- [ ] `/sekkei:validate` full chain pass — zero warnings, zero errors
- [ ] PM đã review và approve (Gate 3 — final)

---

## Checklist 5: Delivery

Chạy sau khi Gate 3 đã pass.

- [ ] Export toàn bộ tài liệu ra Excel: requirements, nfr, project-plan, basic-design, security-design, detail-design, test-plan, ut-spec, it-spec, st-spec, uat-spec
- [ ] Mỗi file Excel đã kiểm tra đủ 4 sheet: 表紙, 改訂履歴, 目次, 本文
- [ ] 改訂履歴 đầy đủ — mọi version đều có entry, không có khoảng trống
- [ ] Tên tài liệu, version, ngày trên 表紙 nhất quán
- [ ] PDF bundle đã export cho tài liệu dùng trong buổi presentation (requirements + basic-design + uat-spec)
- [ ] Diff-visual đã lưu nếu có Change Request đã được xử lý trong dự án
- [ ] ZIP bundle đã đặt tên rõ ràng: `hr-system-docs-v1.0-YYYYMMDD.zip`
- [ ] PM final approve trước khi gửi
- [ ] Bộ tài liệu đã gửi cho khách hàng Nhật

---

## Checklist 6: Change Request

Chạy mỗi khi có thay đổi yêu cầu sau khi spec freeze.

- [ ] Thay đổi đã được mô tả rõ ràng — có affected IDs cụ thể (REQ-xxx, SCR-xxx, API-xxx...)
- [ ] Git checkpoint đã tạo trước khi bắt đầu: `git commit -m "checkpoint: before CR-xxx"`
- [ ] `/sekkei:change` đã chạy và sinh impact graph
- [ ] Impact graph đã được PM review — scope hợp lý, không có items bị miss
- [ ] PM đã approve propagation (chọn Proceed)
- [ ] Tất cả tài liệu bị ảnh hưởng đã được propagate — không có Skip còn mở
- [ ] 改訂履歴 đã được tự động thêm vào mỗi tài liệu đã cập nhật
- [ ] `/sekkei:validate` chạy clean sau khi propagate xong
- [ ] `/sekkei:matrix` cập nhật — không có coverage gap mới
- [ ] Diff-visual đã tạo nếu cần trình bày thay đổi cho khách hàng: `/sekkei:diff-visual @before @after`
- [ ] Export lại các tài liệu đã thay đổi
- [ ] Email gửi khách hàng ghi rõ CR-xxx đã được áp dụng

---

**Xem thêm:** [Scenarios](./01-scenarios.md) | [Review & Approval](./03-review-and-approval.md)
