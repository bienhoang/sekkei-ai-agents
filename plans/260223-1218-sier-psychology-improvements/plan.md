---
title: "SIer Psychology-Driven Improvements"
description: "14 features across 4 phases targeting Japanese SIer psychological pain points for tool adoption"
status: completed
priority: P1
effort: 32h
branch: main
tags: [sier-psychology, trust, enterprise, v-model, japanese-sier]
created: 2026-02-23
completed: 2026-02-23
---

# SIer Psychology-Driven Improvements

> Core insight: SIer documentation exists for **liability management**, not communication. Every feature must answer: "Can the engineer defend this output in a client review meeting?"

## Phase Overview

| Phase | Name | Features | Priority | Effort | Status |
|-------|------|----------|----------|--------|--------|
| A | [Trust Foundation](./phase-01-trust-foundation.md) | 1-4 | Highest | 10h | Completed ✅ |
| B | [Pain Relief](./phase-02-pain-relief.md) | 5-6 | High | 8h | Completed ✅ |
| C | [Enterprise Adoption](./phase-03-enterprise-adoption.md) | 7-10 | High | 8h | Completed ✅ |
| D | [Growth](./phase-04-growth.md) | 11-14 | Medium | 6h | Completed ✅ |

## Architecture Principles

- All new tools follow `src/tools/{name}.ts` pattern with Zod schemas
- New doc types: add to `DOC_TYPES` + template + generation-instructions + validator
- Python bridge extensions: add to `VALID_ACTIONS` whitelist
- Backward compatible: existing 9 MCP tools unchanged
- Files under 200 lines; split large modules

## Dependencies

```
Phase A (Trust Foundation) ← no deps, start first
Phase B (Pain Relief)      ← depends on A.2 (source traceability IDs)
Phase C (Enterprise)       ← depends on A.3 (lifecycle/approval metadata)
Phase D (Growth)           ← depends on A+B foundations
```

## Key Research

- [Brainstorm Report](../reports/brainstorm-260223-1218-sier-psychology-improvements.md)
- [MCP Architecture](./research/researcher-01-mcp-architecture.md)
- [Tools & Chain](./research/researcher-02-tools-and-chain.md)

## Feature Summary

| # | Feature | New Tool? | New DocType? | Files Touched |
|---|---------|-----------|-------------|---------------|
| 1 | AI Confidence Scoring | No | No | generate.ts, generation-instructions.ts |
| 2 | Source Traceability | No | No | generate.ts, generation-instructions.ts |
| 3 | Human-Approved Watermark | No | No | export.ts, documents.ts |
| 4 | 朱書きDiff Enhancement | No | No | update.ts, python bridge |
| 5 | 仕様変更 Impact Cascade | Yes | No | NEW simulate-impact.ts |
| 6 | テストエビデンス Templates | No | Yes | NEW test-evidence type |
| 7 | Excel Import | No | No | python bridge, NEW import-excel |
| 8 | Ticket Linking | No | No | generate.ts, documents.ts |
| 9 | 議事録 Template | No | Yes | NEW meeting-minutes type |
| 10 | Digital ハンコ Workflow | No | No | documents.ts, export.ts |
| 11 | 画面設計書 Enhancement | No | No | mockup-*.ts, screen-design |
| 12 | 属人化 Prevention | No | Yes | NEW decision-record type |
| 13 | Multi-Vendor Support | No | Yes | NEW interface-spec type |
| 14 | Generational Bridge | No | No | config, generation-instructions |

## Unresolved Questions

1. ~~Should confidence scoring be opt-in via config or always-on?~~ → **Resolved: Always-on**
2. Python `diff_analyzer.py` internal algorithm — section-level or line-level granularity?
3. ~~Excel import: which SIer Excel formats to support first?~~ → **Resolved: Auto-detect with fallback**
4. ~~Digital hanko: legal validity requirements?~~ → **Resolved: Warning only, not blocking**
5. Multi-vendor glossary: separate file per vendor or shared with namespace?

---

## Validation Log

### Session 1 — 2026-02-23
**Trigger:** Initial plan creation validation
**Questions asked:** 6

#### Questions & Answers

1. **[Scope]** Should we implement all 4 phases (A→D, 32h), or start with Phase A+B only (18h) and evaluate adoption before continuing?
   - Options: All 4 phases | Phase A+B first (Recommended) | Phase A only
   - **Answer:** All 4 phases
   - **Rationale:** User wants complete feature set for SIer adoption pitch. Full 32h investment committed.

2. **[Architecture]** Should AI confidence scoring and source traceability be always-on by default, or opt-in via sekkei.config.yaml?
   - Options: Always-on (Recommended) | Opt-in via config | Confidence on, traceability off
   - **Answer:** Always-on (Recommended)
   - **Rationale:** Trust features are the core value prop. SIers always see provenance. Reduces friction of "forgetting to enable."

3. **[Architecture]** For the impact cascade engine (Feature 5), should auto_draft mode call generate_document internally or return instruction text for the skill layer?
   - Options: Instruction text only (Recommended) | Internal generate call | Both modes via flag
   - **Answer:** Instruction text only (Recommended)
   - **Rationale:** Consistent with existing generate/translate pattern. Avoids tool-calls-tool coupling. Simpler implementation.

4. **[Architecture]** For Excel import (Feature 7), should it auto-detect the document type or require explicit doc_type_hint?
   - Options: Auto-detect with fallback (Recommended) | Always require hint | Auto-detect only, fail on unknown
   - **Answer:** Auto-detect with fallback (Recommended)
   - **Rationale:** Best UX for migration. Try known column patterns (機能ID/要件ID), ask user if uncertain. Reduces friction.

5. **[Security]** For read-only export (Feature 13), whitelist or blacklist sanitizer approach?
   - Options: Blacklist (Recommended) | Whitelist | Dual-mode
   - **Answer:** Blacklist (Recommended)
   - **Rationale:** Remove known internal patterns (confidence/source/learn/internal comments). Simpler, preserves unknown content.

6. **[Architecture]** For digital ハンコ (Feature 10), should rejected approval block export or add warning?
   - Options: Warning only (Recommended) | Block export | Configurable per project
   - **Answer:** Warning only (Recommended)
   - **Rationale:** SIers need partial exports for review cycles. "却下あり" warning in header sufficient. Don't block workflow.

#### Confirmed Decisions
- **Scope:** All 4 phases — full 32h implementation
- **Trust defaults:** Always-on confidence + traceability — `include_confidence=true`, `include_traceability=true` by default
- **Impact cascade:** Instruction text only — consistent with existing tool patterns
- **Excel import:** Auto-detect with fallback — try column pattern matching, ask user if uncertain
- **Sanitizer:** Blacklist approach — remove known internal comment patterns
- **ハンコ rejection:** Warning only — don't block exports

#### Action Items
- [ ] Update Phase A: set default `include_confidence=true`, `include_traceability=true`
- [ ] Update Phase B: confirm auto_draft returns instruction text, not internal tool call
- [ ] Update Phase C Feature 7: implement auto-detect with fallback pattern
- [ ] Update Phase C Feature 10: rejection = warning in export header, not blocking
- [ ] Update Phase D Feature 13: blacklist sanitizer approach

#### Impact on Phases
- Phase A: Features 1-2 defaults change from opt-in to always-on
- Phase B: Feature 5 auto_draft confirmed as instruction-text-only mode
- Phase C: Feature 7 import uses auto-detect; Feature 10 rejection = warning only
- Phase D: Feature 13 sanitizer uses blacklist approach

---

## Completion Report

**Status:** All 4 phases completed successfully on 2026-02-23

### Implementation Summary

**14 Features Delivered:**
- Phase A (Trust Foundation): 4 features — confidence scoring, source traceability, approval watermarks, enhanced diff
- Phase B (Pain Relief): 2 features — impact cascade engine, test evidence templates
- Phase C (Enterprise Adoption): 4 features — Excel import, ticket linking, 議事録 template, digital ハンコ workflow
- Phase D (Growth): 4 features — screen design enhancement, decision records, multi-vendor support, generational bridge

**Code Changes:**
- **TypeScript:** 6 new files (simulate-impact.ts, import-document.ts, content-sanitizer.ts, confidence-extractor.ts, traceability-extractor.ts, impact-analyzer.ts) + 10 modified shared files
- **Python:** 2 new files (excel_importer.py, __init__.py in import/) + 2 modified files (python-bridge.ts, cli.py)
- **Templates:** 4 new (test-evidence, meeting-minutes, decision-record, interface-spec) + 1 enhanced (screen-design)
- **Tests:** Comprehensive unit + integration test coverage

**Quality Metrics:**
- Build: ✅ tsc compile successful
- Tests: ✅ 306/306 tests passing
- Code Review: ✅ All high-priority issues addressed
- Backward Compatibility: ✅ All existing features continue to work

**Key Achievements:**
- Zero breaking changes to existing MCP tools (9 tools unchanged)
- All new doc types follow established patterns (DOC_TYPES, templates, generation-instructions, validators)
- Python bridge extended with new import action (within VALID_ACTIONS whitelist)
- New tool: `simulate_change_impact` — critical for SIer adoption
- Learning annotations and simple/power modes enable generational bridge
