---
title: "Phase 1 Foundation Fix"
description: "Enterprise-ready setup, export, templates, keigo validation, lifecycle status"
status: complete
priority: P1
effort: "5d"
branch: main
tags: [enterprise, foundation, export, keigo, templates]
created: 2026-02-22
---

# Phase 1: Foundation Fix

Goal: make existing features production-quality for BrSE/PM adoption at Japanese SI firms.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 01 | `npx sekkei init` Interactive Wizard | 0.5d | ✅ complete | [phase-01-init-wizard.md](./phase-01-init-wizard.md) |
| 02 | Node.js Excel Exporter (replace Python openpyxl) | 1d | ✅ complete | [phase-02-excel-exporter.md](./phase-02-excel-exporter.md) |
| 03 | Playwright PDF Exporter (replace Python WeasyPrint) | 1d | ✅ complete | [phase-03-pdf-exporter.md](./phase-03-pdf-exporter.md) |
| 04 | 3 Template Presets (enterprise / standard / agile) | 1d | ✅ complete | [phase-04-template-presets.md](./phase-04-template-presets.md) |
| 05 | Keigo Validation Layer | 0.75d | ✅ complete | [phase-05-keigo-validation.md](./phase-05-keigo-validation.md) |
| 06 | Document Lifecycle Status | 0.75d | ✅ complete | [phase-06-lifecycle-status.md](./phase-06-lifecycle-status.md) |

## Key Dependencies

- Phase 02 + 03 must come before Phase 01 (init wizard warns about Chromium install)
- Phase 05 and 06 can run in parallel (no dependency between them)
- Phase 04 must be compatible with Phase 01 (preset selection in wizard)
- All phases: must not break 142 existing passing tests

## Architecture Constraints

- ESM throughout; `.js` import extensions
- stdout = JSON-RPC only; all logs → stderr via pino
- Zod schemas on all tool inputs
- `SekkeiError` with typed codes; `toClientMessage()` for client output
- Python bridge remains for `glossary` and `diff` actions only

## New Dependencies to Add

```json
"exceljs": "^4.4.0",
"@clack/prompts": "^0.9.0"
```

Playwright `^1.58.2` already present. No other new deps.

## Research Reports

- [Node.js Export & Tooling](./research/researcher-01-node-export-and-tooling.md)
- [JP SI Standards & Keigo](./research/researcher-02-jp-si-standards.md)
- [Brainstorm](../reports/brainstorm-260222-1955-sekkei-improvements.md)

## Validation Log

### Session 1 — 2026-02-22
**Trigger:** Initial plan creation validation
**Questions asked:** 7

#### Questions & Answers

1. **[Architecture]** Noto Sans JP font (~8MB) nên được bundle trực tiếp trong npm package hay download lần đầu chạy?
   - Options: Bundle in package | Download on first run | Use system fonts only
   - **Answer:** Download on first run
   - **Rationale:** Keeps npm package small; BrSE/PM environment likely has internet. Phase 03 must implement font download + cache logic.

2. **[Architecture]** Markdown → HTML conversion cho PDF: dùng regex đơn giản hay markdown parser có sẵn?
   - Options: marked (already in deps) | Simple regex | mistune (Python bridge)
   - **Answer:** marked (already in deps)
   - **Rationale:** `marked` already in codebase, handles GFM tables + nested lists correctly. Avoid reinventing markdown parsing.

3. **[Architecture]** CRUD/Traceability matrix export: chung code với regular Excel export hay tách riêng?
   - Options: Shared with flag | Separate function
   - **Answer:** Shared with flag
   - **Rationale:** Less code duplication. Use `isMatrix` param to toggle rendering mode within `exportToExcel()`.

4. **[Assumptions]** Enterprise preset: keigo level cho テスト仕様書 (test-spec) là gì?
   - Options: 丁寧語 (enterprise standard) | any (flexible) | 常体 (common practice)
   - **Answer:** 丁寧語 (enterprise standard)
   - **Rationale:** Enterprise = consistent formal style across ALL docs. Keeps the preset logic clean and predictable.

5. **[Scope]** .docx export hiện tại nên xử lý thế nào khi chuyển sang Node.js?
   - Options: Skip for now | Include in Phase 1 | Remove docx support
   - **Answer:** Skip for now
   - **Rationale:** YAGNI — focus on Excel + PDF which are the primary SI firm formats. DOCX stays on Python bridge or deferred to Phase 2.

6. **[Risk]** Khi Playwright Chromium chưa được install, export PDF nên xử lý thế nào?
   - Options: Clear error + auto-install hint | Auto-install on first use | Fallback to Python
   - **Answer:** Auto-install on first use
   - **Rationale:** Best UX for BrSE/PM who don't want manual setup steps. Accept ~100MB download on first PDF export.

7. **[Tradeoff]** Execution order: Phase 05 (keigo) plan nói phụ thuộc Phase 06 (lifecycle) vì `LifecycleStatus` type. Thực sự có cần không?
   - Options: Remove dependency | Keep dependency
   - **Answer:** Remove dependency
   - **Rationale:** Keigo validator doesn't use LifecycleStatus type. Phase 05+06 can run in parallel.

#### Confirmed Decisions
- **Font strategy:** Download on first run — implement font download + cache in Phase 03
- **MD→HTML:** Use `marked` package — no custom regex parser
- **Matrix export:** Shared `exportToExcel()` with `isMatrix` flag
- **Enterprise test-spec keigo:** 丁寧語 — consistent with enterprise = formal everywhere
- **DOCX:** Deferred to Phase 2 — keep on Python bridge for now
- **Chromium missing:** Auto-install via `playwright install chromium` on first PDF export
- **Phase order:** Phase 05+06 are independent — can run in parallel

#### Action Items
- [ ] Phase 03: Replace font bundling with download-on-first-run + cache in `~/.cache/sekkei/fonts/`
- [ ] Phase 03: Use `marked` instead of custom regex for MD→HTML
- [ ] Phase 03: Implement auto-install Chromium via `execFile('npx', ['playwright', 'install', 'chromium'])` when browser launch fails
- [ ] Phase 02: DOCX format stays routed to Python bridge (`export-docx` remains in VALID_ACTIONS)
- [ ] Phase 02: `exportToExcel()` handles both regular docs and matrices via `isMatrix` param
- [ ] Phase 05: Confirm enterprise test-spec entry = `"teineigo"` in `EXPECTED_KEIGO` matrix
- [ ] plan.md: Update dependency list (Phase 05↔06 no longer linked)

#### Impact on Phases
- Phase 02: Keep `export-docx` in Python VALID_ACTIONS; matrix uses shared `exportToExcel(input, { isMatrix: true })`
- Phase 03: Major change — no bundled fonts; add font download + cache logic; use `marked` for HTML; add Chromium auto-install
- Phase 05: Confirm `EXPECTED_KEIGO["test-spec"].enterprise = "teineigo"`; remove Phase 06 dependency note
- plan.md: Update Key Dependencies section (done)
