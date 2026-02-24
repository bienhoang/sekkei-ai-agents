---
title: "Phase 3: Intelligence Layer"
description: "AI-powered features: code-aware generation, staleness detection, structural rules, Google export, Backlog sync"
status: complete
priority: P2
effort: 7d
branch: main
tags: [ai, code-aware, staleness, google-sheets, anti-chaos, backlog]
created: 2026-02-23
---

# Phase 3: Intelligence Layer

**Goal:** Ship AI-powered features that differentiate Sekkei from template-only doc generators.
**Prerequisite:** Phase 1 (Foundation) + Phase 2 (Enterprise) complete. 215 tests passing.

## Phases

| # | Phase | Priority | Effort | Status | Deps | Group |
|---|-------|----------|--------|--------|------|-------|
| 01 | [Code-Aware Generation](./phase-01-code-aware-generation.md) | P1 | 2d | complete | none | G1 |
| 02 | [Staleness Detection](./phase-02-staleness-detection.md) | P1 | 1.5d | complete | none | G2 |
| 03 | [Anti-Chaos Rules](./phase-03-anti-chaos-rules.md) | P2 | 1d | complete | none | G3 |
| 04 | [Google Sheets Export](./phase-04-google-export.md) | P2 | 1d | complete | none | G4 |
| 05 | [Backlog Integration](./phase-05-backlog-integration.md) | P3 | 1.5d | deferred | none | G5 |

## Execution Order

```
G1: [phase-01] code-aware generation ──┐
G2: [phase-02] staleness detection ────┤ (parallel, independent)
G3: [phase-03] anti-chaos rules ───────┘
          │
          v
G4: [phase-04] google export (after core AI features)
          │
          v
G5: [phase-05] backlog integration (optional, deferred)
```

## Key Decisions

- **ts-morph** for TypeScript AST parsing (industry-standard, wraps TS compiler)
- **simple-git** for git diff analysis (lightweight, well-maintained)
- **Google Sheets only** — Google Docs dropped (poor table rendering, complex API, users have Word/PDF)
- **Backlog deferred** pending customer validation (ROI risk per researcher-02)
- All new modules follow handler extraction pattern: `handleXxx()` pure functions callable from MCP + CLI

## New Dependencies

| Package | Phase | Purpose |
|---------|-------|---------|
| `ts-morph` | 01 | TypeScript AST parsing |
| `simple-git` | 02 | Git operations wrapper |
| `googleapis` | 04 | Google Sheets API (optional peer dep) |
| `google-auth-library` | 04 | OAuth2/service account auth (optional peer dep) |
| `backlog-js` | 05 | Nulab Backlog API client |

## New Error Codes

`CODE_ANALYSIS_FAILED`, `STALENESS_ERROR`, `STRUCTURE_RULES_ERROR`, `GOOGLE_EXPORT_FAILED`, `BACKLOG_SYNC_FAILED`

## Risk Summary

| Risk | Impact | Mitigation |
|------|--------|------------|
| ts-morph perf on large codebases | Medium | File limit + timeout; lazy loading |
| Google API rate limits | Medium | Batch operations, retry with backoff |
| Backlog low adoption | Low | Defer; validate with customers first |
| Config schema migration | Low | Additive fields only, backward compat |

## Validation Log

### Session 1 — 2026-02-23
**Trigger:** Initial plan creation validation before implementation
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** Phase 01 uses ts-morph for TypeScript AST parsing only. But BrSE/PM at Japanese SI firms (NTT Data, Fujitsu) often work on Java projects. Should Phase 01 MVP include Java support or defer it?
   - Options: TypeScript only (Recommended) | TypeScript + Java in MVP | Use tree-sitter for all languages
   - **Answer:** TypeScript only (Recommended)
   - **Rationale:** YAGNI — ship TS first, validate demand for Java before investing. Tree-sitter adds complexity without proven need.

2. **[Scope]** Phase 04 plans Google Sheets first, then Google Docs. Researcher-02 flags Docs API as complex (3-4d extra). Google Docs table rendering is poor. What's the right scope?
   - Options: Sheets only (Recommended) | Sheets + Docs both | Skip Google export entirely
   - **Answer:** Sheets only (Recommended)
   - **Rationale:** Tabular data (requirements, test matrices) is the primary use case. Full docs already covered by Word/PDF export. Reduces Phase 04 from 2d to 1d.

3. **[Architecture]** Phase 02 requires manual feature_file_map in sekkei.config.yaml to map F-xxx → source files. This is a configuration burden on BrSE/PM. How should file-to-feature mapping work?
   - Options: Manual config (Recommended) | Auto-discover from code | Hybrid: manual + auto-suggest
   - **Answer:** Manual config (Recommended)
   - **Rationale:** Explicit mapping is predictable and debuggable. BrSE/PM configure once during project init. Auto-discovery is fragile and magical.

4. **[Tradeoff]** ts-morph (~15MB) and googleapis (~40MB) are heavy dependencies. For a CLI tool used by BrSE/PM, install size matters. How should these be handled?
   - Options: Optional peer deps (Recommended) | Bundle everything | Dynamic import + install prompt
   - **Answer:** Optional peer deps (Recommended)
   - **Rationale:** Core sekkei stays lightweight. Users opt-in to heavy features. Dynamic import with clear error message when dep missing.

5. **[Scope]** Phase 05 (Backlog Integration) is marked P3/optional with ROI risk. Should it remain in Phase 3 plan or be removed entirely and revisited only after customer demand?
   - Options: Keep as placeholder (Recommended) | Remove from Phase 3 | Replace with Jira integration
   - **Answer:** Keep as placeholder (Recommended)
   - **Rationale:** Keeps Backlog on the radar without committing engineering effort. Customer validation gate prevents wasted work.

6. **[Architecture]** Phase 03 Anti-Chaos Rules has 3 strictness presets (enterprise/standard/agile). Is this granularity needed or is it over-engineering for the current stage?
   - Options: Keep 3 presets (Recommended) | Just strict/lenient (2 levels) | Single mode, no presets
   - **Answer:** Keep 3 presets (Recommended)
   - **Rationale:** Enterprise clients need strict rules (NTT Data audits). Agile teams need flexibility. Aligns with existing template preset system from Phase 1.

#### Confirmed Decisions
- **Code-aware language:** TypeScript only via ts-morph — Java/Python deferred
- **Google export:** Sheets only — Google Docs API dropped (effort reduced 2d → 1d)
- **Feature-file mapping:** Manual config in sekkei.config.yaml, explicit and predictable
- **Heavy deps:** Optional peer deps — core stays lightweight, features opt-in
- **Backlog:** Placeholder, blocked by customer validation gate
- **Anti-chaos presets:** 3 levels (enterprise/standard/agile) — fits existing preset system

#### Action Items
- [x] Update Phase 04: scope to Sheets only, remove google-docs-exporter.ts, reduce effort to 1d
- [x] Update plan.md: total effort 8d → 7d, tags google-docs → google-sheets
- [x] Update Phase 01 & 04: note ts-morph/googleapis as optional peer deps

#### Impact on Phases
- Phase 04: Reduced scope — Sheets only, no Google Docs. Effort 2d → 1d. Remove google-docs-exporter.ts and related tests.
- Phase 01: ts-morph as optional peer dep with dynamic import + clear error when missing
- Phase 04: googleapis as optional peer dep with dynamic import
