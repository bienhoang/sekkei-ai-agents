<p align="center">
  <img src="../../assets/logo-mark.svg" alt="Sekkei" width="80">
</p>

# Sekkei — Hướng dẫn sử dụng

**Sekkei** (設計) là AI agent tạo tài liệu đặc tả phần mềm tiếng Nhật theo chuẩn IPA — tích hợp trong Claude Code.

Hướng dẫn này dành cho: **BA · Sales · PM · Dev Lead · QA**

## Bắt đầu nhanh

> [Sekkei là gì?](./01-introduction.md) — Tổng quan, ai dùng được, tại sao output tiếng Nhật
>
> [Quick Start — tạo tài liệu đầu tiên](./03-quick-start.md) — Cài đặt → init → tạo 要件定義書 → preview

## Bạn là ai?

| Bạn là... | Bắt đầu tại | Lệnh chính |
|-----------|------------|-----------|
| **PM** | [PM Guide](./05-roles/01-pm.md) | `sekkei init`, `/sekkei:status`, `/sekkei:validate` |
| **BA** | [BA Guide](./05-roles/02-ba.md) | `/sekkei:requirements`, `/sekkei:functions-list` |
| **Dev Lead** | [Dev Lead Guide](./05-roles/03-dev-lead.md) | `/sekkei:basic-design`, `/sekkei:detail-design` |
| **QA** | [QA Guide](./05-roles/04-qa.md) | `/sekkei:test-plan`, `/sekkei:ut-spec`, `/sekkei:validate` |
| **Sales** | [Sales Guide](./05-roles/05-sales.md) | `/sekkei:rfp` |

## Mục lục

### Khái niệm cơ bản

- [Sekkei là gì](./01-introduction.md) — value prop, ai dùng, tại sao tiếng Nhật
- [V-Model và các loại tài liệu](./02-v-model-and-documents.md) — 13 core + 9 supplementary doc types
- [Quick Start](./03-quick-start.md) — install, init, tạo doc đầu tiên, preview

### Quy trình làm việc

- [Tổng quan quy trình](./04-workflow/index.md) — full project flowchart
- [Phase Requirements](./04-workflow/01-requirements.md) — 要件定義書, 機能一覧, NFR, Project Plan
- [Phase Design](./04-workflow/02-design.md) — 基本設計書, セキュリティ設計書, 詳細設計書
- [Phase Test](./04-workflow/03-testing.md) — テスト計画書 + 4 test specs
- [Tài liệu bổ sung](./04-workflow/04-supplementary.md) — 9 supplementary docs
- [Change Request](./04-workflow/05-change-request.md) — CR lifecycle

### Hướng dẫn theo vai trò

- [PM](./05-roles/01-pm.md) · [BA](./05-roles/02-ba.md) · [Dev Lead](./05-roles/03-dev-lead.md) · [QA](./05-roles/04-qa.md) · [Sales](./05-roles/05-sales.md)

### Team Playbook

- [Cấu trúc team & RACI](./06-team-playbook/index.md) — ai làm gì, handoff points
- [Kịch bản thực tế](./06-team-playbook/01-scenarios.md) — 3 scenarios end-to-end
- [Checklist theo phase](./06-team-playbook/02-checklists.md) — copy-paste ready
- [Review & Approval](./06-team-playbook/03-review-and-approval.md) — quality gates

### Tham khảo

- [30 lệnh — quick reference](./07-reference/01-commands.md) — tra cứu nhanh
- [sekkei.config.yaml reference](./07-reference/02-configuration.md) — tất cả config keys
- [Thuật ngữ VI ↔ JP ↔ EN](./07-reference/03-glossary.md) — bảng thuật ngữ 3 ngôn ngữ

---

> **Phiên bản:** Hướng dẫn này tương ứng với Sekkei v2.0+.
> Chạy `/sekkei:version` để kiểm tra phiên bản đang dùng.
