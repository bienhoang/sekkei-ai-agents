---
title: "Sekkei User Guide Documentation"
description: "Vietnamese user guide for non-tech teams (BA/Sales/PM/Dev/QA)"
status: completed
priority: P2
effort: 8h
branch: main
tags: [docs, user-guide, vietnamese, sekkei]
created: 2026-02-24
---

# Sekkei User Guide: Implementation Plan

22 Vietnamese markdown files in `sekkei/docs/user-guide/`. Target audience: non-tech mixed team (BA/Sales/PM/Dev Lead/QA). Shipped with VitePress.

## Dependency Graph

```
Phase 1 (sequential)
  └── introduction.md, v-model-and-documents.md, quick-start.md
        ↓ (establishes vocabulary)
Phase 2A ─┐
Phase 2B ─┼── all parallel after Phase 1
Phase 2C ─┘
        ↓
Phase 3 (team-playbook, references role definitions)
        ↓
Phase 4 (index.md — navigation links to all files)
```

## File Ownership Matrix

| Phase | Files | Count |
|-------|-------|-------|
| Phase 1 | introduction.md, v-model-and-documents.md, quick-start.md | 3 |
| Phase 2A | workflow/index.md, workflow/requirements.md, workflow/design.md, workflow/testing.md, workflow/supplementary.md, workflow/change-request.md | 6 |
| Phase 2B | roles/pm.md, roles/ba.md, roles/dev-lead.md, roles/qa.md, roles/sales.md | 5 |
| Phase 2C | reference/commands.md, reference/configuration.md, reference/glossary.md | 3 |
| Phase 3 | team-playbook/index.md, team-playbook/scenarios.md, team-playbook/checklists.md, team-playbook/review-and-approval.md | 4 |
| Phase 4 | index.md | 1 |
| **Total** | | **22** |

## Phases

- [Phase 1 — Foundation Concepts](./phase-01-foundation-concepts.md) `completed`
- [Phase 2A — Workflow Guides](./phase-02a-workflow-guides.md) `completed` — parallel with 2B, 2C
- [Phase 2B — Role Guides](./phase-02b-role-guides.md) `completed` — parallel with 2A, 2C
- [Phase 2C — Reference Section](./phase-02c-reference.md) `completed` — parallel with 2A, 2B
- [Phase 3 — Team Playbook](./phase-03-team-playbook.md) `completed`
- [Phase 4 — Index Page](./phase-04-index.md) `completed`

## Key Sources

- `sekkei/packages/skills/content/SKILL.md` — 30 commands
- `sekkei/packages/skills/content/references/` — phase-specific workflows
- `sekkei/sekkei.config.example.yaml` — config reference
- Research: `plans/260224-1204-sekkei-user-guide-docs/research/`

## Validation Log

### Session 1 — 2026-02-24
**Trigger:** Initial plan validation before implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Tone]** Tone viết cho docs: xưng hô và mức độ trang trọng như thế nào? (Ảnh hưởng lớn đến toàn bộ 22 files)
   - Options: Casual: bạn/mình | Semi-formal: chúng ta | Formal: người dùng
   - **Answer:** Casual: bạn/mình
   - **Rationale:** Non-tech audience cần docs thân thiện, dễ tiếp cận. Casual tone giảm barrier cho BA/Sales chưa quen CLI tools.

2. **[Scope]** Role guides (Phase 2B) và Workflow guides (Phase 2A) có risk overlap. Chiến lược nào?
   - Options: Role = tóm tắt + link | Role = self-contained | Hybrid
   - **Answer:** Role = tóm tắt + link
   - **Rationale:** Tránh duplicate content, giữ role guides ngắn gọn. User đọc role guide để biết "tôi cần làm gì", rồi click vào workflow page cho chi tiết.

3. **[Scope]** Dự án mẫu trong examples/scenarios là gì? (Dùng xuyên suốt docs để nhất quán)
   - Options: E-commerce | SaaS/Internal system | Generic placeholder
   - **Answer:** SaaS/Internal system
   - **Rationale:** Sát thực tế hơn với audience làm offshore Nhật. Dùng "hệ thống quản lý nhân sự" (人事管理システム) xuyên suốt docs.

4. **[Risk]** Các features chưa xác nhận (approval_chain, vi templates, learning_mode) — đưa vào docs thế nào?
   - Options: Đánh dấu [Beta] | Bỏ qua hoàn toàn | Đưa vào như bình thường
   - **Answer:** Đánh dấu [Beta]
   - **Rationale:** User biết feature tồn tại nhưng không expect stable behavior. Tránh surprise khi feature chưa hoạt động hoàn chỉnh.

#### Confirmed Decisions
- **Tone**: Casual "bạn/mình" — tất cả 22 files dùng style thân thiện
- **Overlap**: Role guides tóm tắt + link, không duplicate workflow content
- **Example**: SaaS HR system (人事管理システム) xuyên suốt docs
- **Unverified features**: Đánh dấu `> [!WARNING] **[Beta]**` cho approval_chain, vi templates, learning_mode

#### Action Items
- [ ] Phase 1: Add tone guideline "bạn/mình" to introduction.md writing notes
- [ ] Phase 1: Use HR system (人事管理システム) as example in quick-start.md
- [ ] Phase 2B: Ensure role guides only summarize + link, no workflow duplication
- [ ] Phase 2C: Mark approval_chain as [Beta] in configuration.md
- [ ] Phase 3: Use HR system in all 3 scenarios; mark approval_chain as [Beta] in review-and-approval.md

#### Impact on Phases
- Phase 1: Update writing notes to specify casual "bạn/mình" tone; change example project from e-commerce to SaaS HR system
- Phase 2B: Reinforce "tóm tắt + link" pattern; remove any self-contained workflow descriptions
- Phase 2C: Add [Beta] marker for approval_chain, vi templates, learning_mode in configuration.md
- Phase 3: Change scenario examples to use HR system; add [Beta] warning to approval_chain section in review-and-approval.md
