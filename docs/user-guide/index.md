# Sekkei — Hướng dẫn sử dụng

**Sekkei** (設計) là AI agent tạo tài liệu đặc tả phần mềm tiếng Nhật theo chuẩn IPA — tích hợp trong Claude Code.

Hướng dẫn này dành cho: **BA · Sales · PM · Dev Lead · QA**

## Bắt đầu nhanh

> [Sekkei là gì?](./introduction.md) — Tổng quan, ai dùng được, tại sao output tiếng Nhật
>
> [Quick Start — tạo tài liệu đầu tiên](./quick-start.md) — Cài đặt → init → tạo 要件定義書 → preview

## Bạn là ai?

| Bạn là... | Bắt đầu tại | Lệnh chính |
|-----------|------------|-----------|
| **PM** | [PM Guide](./roles/pm.md) | `npx sekkei init`, `/sekkei:status`, `/sekkei:validate` |
| **BA** | [BA Guide](./roles/ba.md) | `/sekkei:requirements`, `/sekkei:functions-list` |
| **Dev Lead** | [Dev Lead Guide](./roles/dev-lead.md) | `/sekkei:basic-design`, `/sekkei:detail-design` |
| **QA** | [QA Guide](./roles/qa.md) | `/sekkei:test-plan`, `/sekkei:ut-spec`, `/sekkei:validate` |
| **Sales** | [Sales Guide](./roles/sales.md) | `/sekkei:rfp` |

## Mục lục

### Khái niệm cơ bản

- [Sekkei là gì](./introduction.md) — value prop, ai dùng, tại sao tiếng Nhật
- [V-Model và các loại tài liệu](./v-model-and-documents.md) — 13 core + 9 supplementary doc types
- [Quick Start](./quick-start.md) — install, init, tạo doc đầu tiên, preview

### Quy trình làm việc

- [Tổng quan quy trình](./workflow/index.md) — full project flowchart
- [Phase Requirements](./workflow/requirements.md) — 要件定義書, 機能一覧, NFR, Project Plan
- [Phase Design](./workflow/design.md) — 基本設計書, セキュリティ設計書, 詳細設計書
- [Phase Test](./workflow/testing.md) — テスト計画書 + 4 test specs
- [Tài liệu bổ sung](./workflow/supplementary.md) — 9 supplementary docs
- [Change Request](./workflow/change-request.md) — CR lifecycle

### Hướng dẫn theo vai trò

- [PM](./roles/pm.md) · [BA](./roles/ba.md) · [Dev Lead](./roles/dev-lead.md) · [QA](./roles/qa.md) · [Sales](./roles/sales.md)

### Team Playbook

- [Cấu trúc team & RACI](./team-playbook/index.md) — ai làm gì, handoff points
- [Kịch bản thực tế](./team-playbook/scenarios.md) — 3 scenarios end-to-end
- [Checklist theo phase](./team-playbook/checklists.md) — copy-paste ready
- [Review & Approval](./team-playbook/review-and-approval.md) — quality gates

### Tham khảo

- [30 lệnh — quick reference](./reference/commands.md) — tra cứu nhanh
- [sekkei.config.yaml reference](./reference/configuration.md) — tất cả config keys
- [Thuật ngữ VI ↔ JP ↔ EN](./reference/glossary.md) — bảng thuật ngữ 3 ngôn ngữ

---

> **Phiên bản:** Hướng dẫn này tương ứng với Sekkei v2.0+.
> Chạy `/sekkei:version` để kiểm tra phiên bản đang dùng.
