# Phase 04 — Index Page

**Status:** completed
**Parallelization:** Sequential last — depends on all other phases (navigation links to all 21 files)
**Effort:** ~30min
**Files owned (1):**
- `sekkei/docs/user-guide/index.md`

---

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-1204-sekkei-user-guide-docs.md` — "Key Content per File: index.md"
- All phase files: output from Phases 1, 2A, 2B, 2C, 3 (verify all 21 files exist before writing index)
- Introduction: `sekkei/docs/user-guide/introduction.md` (Phase 1 output)

---

## File 1: `index.md` (~80 lines)

**Purpose:** Landing page for the user guide. Role-based navigation table. Entry point for VitePress.

**Content outline:**

### Hero Section (~10 lines)
```markdown
# Sekkei — Hướng dẫn sử dụng

**Sekkei** (設計) là AI agent tạo tài liệu đặc tả phần mềm tiếng Nhật theo chuẩn IPA — tích hợp trong Claude Code.

Hướng dẫn này dành cho: **BA · Sales · PM · Dev Lead · QA**
```

### Bắt đầu nhanh (2 links prominent)
```markdown
→ [Sekkei là gì?](./introduction.md)
→ [Quick Start — tạo tài liệu đầu tiên](./quick-start.md)
```

### Role Navigation Table (~20 lines)
Primary navigation feature — non-tech users find their path immediately.

| Bạn là... | Bắt đầu tại | Lệnh chính |
|-----------|------------|-----------|
| **PM** | [PM Guide](./roles/pm.md) | `npx sekkei init`, `/sekkei:status`, `/sekkei:validate` |
| **BA** | [BA Guide](./roles/ba.md) | `/sekkei:requirements`, `/sekkei:functions-list` |
| **Dev Lead** | [Dev Lead Guide](./roles/dev-lead.md) | `/sekkei:basic-design`, `/sekkei:detail-design` |
| **QA** | [QA Guide](./roles/qa.md) | `/sekkei:test-plan`, `/sekkei:ut-spec`, `/sekkei:validate` |
| **Sales** | [Sales Guide](./roles/sales.md) | `/sekkei:rfp` |

### Full Navigation Map (~30 lines)
Structured link tree mirroring the file structure:

**Khái niệm cơ bản**
- [Sekkei là gì](./introduction.md) — value prop, who uses it, why Japanese output
- [V-Model và các loại tài liệu](./v-model-and-documents.md) — 13 core + 9 supplementary doc types
- [Quick Start](./quick-start.md) — install, init, first document, preview

**Quy trình làm việc**
- [Tổng quan quy trình](./workflow/index.md) — full project flowchart
- [Phase Requirements](./workflow/requirements.md) — 要件定義書, 機能一覧, NFR, Project Plan
- [Phase Design](./workflow/design.md) — 基本設計書, セキュリティ設計書, 詳細設計書
- [Phase Test](./workflow/testing.md) — テスト計画書 + 4 test specs
- [Tài liệu bổ sung](./workflow/supplementary.md) — 9 supplementary docs
- [Change Request](./workflow/change-request.md) — CR lifecycle

**Hướng dẫn theo vai trò**
- [PM](./roles/pm.md) · [BA](./roles/ba.md) · [Dev Lead](./roles/dev-lead.md) · [QA](./roles/qa.md) · [Sales](./roles/sales.md)

**Team Playbook**
- [Cấu trúc team & RACI](./team-playbook/index.md)
- [Kịch bản thực tế](./team-playbook/scenarios.md)
- [Checklist theo phase](./team-playbook/checklists.md)
- [Review & Approval](./team-playbook/review-and-approval.md)

**Tham khảo**
- [30 lệnh — quick reference](./reference/commands.md)
- [sekkei.config.yaml reference](./reference/configuration.md)
- [Thuật ngữ VI ↔ JP ↔ EN](./reference/glossary.md)

### Version Note (~5 lines)
```markdown
> **Phiên bản:** Hướng dẫn này tương ứng với Sekkei v2.0+.
> Chạy `/sekkei:version` để kiểm tra phiên bản đang dùng.
```

---

## Implementation Steps

1. Verify all 21 other files exist in `sekkei/docs/user-guide/` before writing index
2. Write index.md — keep under 80 lines
3. Verify all relative links are correct (path from `index.md` perspective)
4. Test that role navigation table covers all 5 roles
5. Confirm VitePress will render this as the section landing page

## Todo

- [ ] Verify all 21 files exist across all subdirectories
- [ ] Write `sekkei/docs/user-guide/index.md`
- [ ] Verify all relative links resolve correctly
- [ ] Confirm file is under 80 lines
- [ ] Check VitePress frontmatter requirements (if any — check existing VitePress config)

## Success Criteria

- `index.md` exists, under 80 lines
- Role navigation table: all 5 roles covered with correct link + primary command
- All 21 other files linked (directly or through section pages)
- No broken relative links
- Version note present
- Hero section communicates value in ≤ 3 sentences

## Notes

- If VitePress sidebar config needs updating, that is a separate task (not owned by this phase)
- Index links use relative paths (`./introduction.md`), not absolute
- Do not duplicate content — this file is navigation only, not a summary of all content
