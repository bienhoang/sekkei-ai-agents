![Sekkei](./images/logo-mark.svg)

# Sekkei — Hướng dẫn sử dụng

**Sekkei** (設計 - Thiết kế) là một AI agent chuyên dụng để tạo tài liệu đặc tả phần mềm bằng tiếng Nhật theo tiêu chuẩn IPA, được tích hợp trực tiếp trong Claude Code.

Tài liệu hướng dẫn này được biên soạn dành riêng cho các vai trò: **Phân tích nghiệp vụ (BA) · Kinh doanh (Sales) · Quản trị dự án (PM) · Trưởng nhóm kỹ thuật (Dev Lead) · Kiểm thử (QA)**

## Bắt đầu nhanh

> [Sekkei là gì?](./01-introduction.md) — Tổng quan về công cụ, đối tượng sử dụng và lý do vì sao hồ sơ đầu ra cần tuân thủ chuẩn Nhật Bản.
>
> [Quick Start — Hướng dẫn bắt đầu nhanh](./03-quick-start.md) — Các bước từ Cài đặt → Khởi tạo (init) → Tạo **要件定義書 (Định nghĩa yêu cầu)** → Xem trước (preview).

## Bạn là ai?

| Vai trò | Bắt đầu tại | Các lệnh trọng tâm |
|-----------|------------|-----------|
| **Quản trị dự án (PM)** | [Hướng dẫn dành cho PM](./05-roles/01-pm.md) | `sekkei init`, `/sekkei:status`, `/sekkei:validate` |
| **Phân tích nghiệp vụ (BA)** | [Hướng dẫn dành cho BA](./05-roles/02-ba.md) | `/sekkei:requirements`, `/sekkei:functions-list` |
| **Trưởng nhóm kỹ thuật (Dev Lead)** | [Hướng dẫn dành cho Dev Lead](./05-roles/03-dev-lead.md) | `/sekkei:basic-design`, `/sekkei:detail-design` |
| **Kiểm thử (QA)** | [Hướng dẫn dành cho QA](./05-roles/04-qa.md) | `/sekkei:test-plan`, `/sekkei:ut-spec`, `/sekkei:validate` |
| **Kinh doanh (Sales)** | [Hướng dẫn dành cho Sales](./05-roles/05-sales.md) | `/sekkei:rfp` |

## Mục lục chi tiết

### Khái niệm nền tảng

- [Sekkei là gì](./01-introduction.md) — Giá trị cốt lõi và tầm nhìn của công cụ.
- [Mô hình chữ V và các loại tài liệu](./02-v-model-and-documents.md) — Tìm hiểu về 13 loại tài liệu cốt lõi và 9 tài liệu bổ sung.
- [Bắt đầu nhanh](./03-quick-start.md) — Cài đặt, khởi tạo và tạo hồ sơ đầu tiên.

### Quy trình thực thi (Workflow)

- [Tổng quan quy trình](./04-workflow/index.md) — Sơ đồ luồng công việc toàn diện cho một dự án IT.
- [Giai đoạn định nghĩa yêu cầu (Requirements)](./04-workflow/01-requirements.md) — Bao gồm **要件定義書 (Định nghĩa yêu cầu)**, **機能一覧 (Danh sách chức năng)**, các yêu cầu phi chức năng và kế hoạch dự án.
- [Giai đoạn thiết kế (Design)](./04-workflow/02-design.md) — Bao gồm **基本設計書 (Thiết kế cơ bản)**, **セキュリティ設計書 (Thiết kế bảo mật)** và **詳細設計書 (Thiết kế chi tiết)**.
- [Giai đoạn kiểm thử (Test)](./04-workflow/03-testing.md) — Bao gồm **テスト計画書 (Kế hoạch kiểm thử)** và 4 loại đặc tả kiểm thử tương ứng.
- [Tài liệu bổ sung](./04-workflow/04-supplementary.md) — 9 loại tài liệu hỗ trợ tùy chọn khác.
- [Quản lý yêu cầu thay đổi (Change Request)](./04-workflow/05-change-request.md) — Quy trình xử lý các biến động về phạm vi sau khi chốt đặc tả.

### Hướng dẫn theo vai trò cụ thể

- [Quản trị dự án (PM)](./05-roles/01-pm.md) · [Phân tích nghiệp vụ (BA)](./05-roles/02-ba.md) · [Trưởng nhóm kỹ thuật (Dev Lead)](./05-roles/03-dev-lead.md) · [Kiểm thử (QA)](./05-roles/04-qa.md) · [Kinh doanh (Sales)](./05-roles/05-sales.md)

### Sổ tay phối hợp nhóm (Team Playbook)

- [Cấu trúc đội ngũ & Ma trận RACI](./06-team-playbook/index.md) — Phân định rõ trách nhiệm và các điểm bàn giao (handoff).
- [Kịch bản phối hợp thực tế](./06-team-playbook/01-scenarios.md) — 3 kịch bản mẫu từ lúc bắt đầu đến khi bàn giao sản phẩm.
- [Danh sách kiểm tra (Checklists)](./06-team-playbook/02-checklists.md) — Bộ tiêu chuẩn để rà soát chất lượng theo từng chặng.
- [Review & Phê duyệt](./06-team-playbook/03-review-and-approval.md) — Các chốt kiểm soát chất lượng (Quality Gates).

### Tài liệu tham khảo nhanh

- [Tra cứu 30 câu lệnh nhanh](./07-reference/01-commands.md) — Danh mục tổng hợp toàn bộ các lệnh Sekkei.
- [Cấu hình sekkei.config.yaml](./07-reference/02-configuration.md) — Hướng dẫn thiết lập các tham số dự án.
- [Bảng thuật ngữ đa ngôn ngữ](./07-reference/03-glossary.md) — Tra cứu thuật ngữ Việt ↔ Nhật ↔ Anh chuyên ngành IT.

---

> **Phiên bản:** Tài liệu áp dụng cho Sekkei v2.0 trở lên.
> Hãy sử dụng lệnh `/sekkei:version` để xác nhận phiên bản của bạn.
 Proudly presented by Antigravity.
 Proudly presented by Antigravity.
