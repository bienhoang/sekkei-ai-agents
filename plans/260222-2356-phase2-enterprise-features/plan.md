---
title: "Phase 2: Enterprise Features"
description: "CLI mode, Excel templates, Word export, cross-ref linker + integrity, Git versioning, completeness checker"
status: complete
priority: P1
effort: 6.5d
branch: main
tags: [cli, export, validation, git, enterprise]
created: 2026-02-23
---

# Phase 2: Enterprise Features

**Work context:** `sekkei/packages/mcp-server/`
**Total effort:** ~6.5d across 6 phases (4 parallel groups)

## Phases

| # | Phase | File | Est. | Group | Deps |
|---|-------|------|------|-------|------|
| 01 | CLI Mode (F1) | [phase-01-cli-mode.md](./phase-01-cli-mode.md) | 1.5d | G5 | All |
| 02 | Excel Template System (D2) | [phase-02-excel-template.md](./phase-02-excel-template.md) | 1d | G1 | — |
| 03 | Word (.docx) Export (D3) | [phase-03-docx-export.md](./phase-03-docx-export.md) | 1d | G1 | — |
| 04 | Cross-Ref Linker + Integrity (B4+2.2) | [phase-04-cross-ref-linker.md](./phase-04-cross-ref-linker.md) | 1.5d | G3 | G2 |
| 05 | Git Versioning + 朱書き (C2) | [phase-05-git-versioning.md](./phase-05-git-versioning.md) | 0.75d | G4 | — |
| 06 | Completeness Checker (2.1) | [phase-06-completeness-checker.md](./phase-06-completeness-checker.md) | 0.75d | G2 | — |
| ~~07~~ | ~~Cross-Ref Integrity~~ | — | — | — | *Merged into Phase 04* |

## Execution Order

```
G1: [02, 03] ─── parallel (exports)
G2: [06]     ─── independent (completeness)
G4: [05]     ─── independent (git)
         ↓
G3: [04]     ─── after G2 (cross-ref linker + integrity)
         ↓
G5: [01]     ─── after all (CLI wraps all tools)
```

## New Dependencies

```json
"docx": "^9.0.0",
"citty": "^0.1.0"
```

xlsx-populate: evaluate ExcelJS `readFile` first; add only if formatting preservation requires it.

## Key Constraints

- ESM only, `.js` import extensions
- stdout = JSON-RPC (CLI uses stderr for logs)
- Zod schemas on all tool inputs
- `SekkeiError` typed codes
- 142+ existing tests must pass
- Files under 200 lines
- Backward compat with `sekkei.config.yaml`

## Validation Log

### Session 1 — 2026-02-22
**Trigger:** Initial plan creation validation before implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Refactor]** Phase 01 requires extracting handle*() pure functions from every tool's register*() wrapper so CLI can call them directly. This is the biggest refactor risk — it touches all 8 tool files. How should we approach this?
   - Options: Extract in Phase 01 (Recommended) | Extract incrementally per phase | CLI wraps MCP client
   - **Answer:** Extract in Phase 01 (Recommended)
   - **Rationale:** CLI is the last phase (G5), so all tools are stable by then. Single-pass refactor is cleaner than incremental extraction across phases. Keeps handler functions as the canonical API.

2. **[Scope]** Phase 04 (validate_chain tool) and Phase 07 (validateFullChain in validator.ts) both analyze cross-references across the document chain. The plan has Phase 04 depending on Phase 07, but their scope overlaps. How should we delineate?
   - Options: Merge into Phase 04 only (Recommended) | Keep both as planned | Merge into Phase 07 only
   - **Answer:** Merge into Phase 04 only (Recommended)
   - **Rationale:** Having two separate phases for chain validation creates unnecessary complexity. Phase 04 (validate_chain tool) handles everything: disk reads, ID graph, gap detection, traceability matrix. Phase 07 is eliminated — reduces total effort and removes a dependency.

3. **[Git]** Phase 05 auto-commits after every document generation. Some users may not want automatic git commits in their workflow. What's the default behavior?
   - Options: Opt-in via config (Recommended) | Always auto-commit | CLI flag only
   - **Answer:** Opt-in via config (Recommended)
   - **Rationale:** Enterprise users need predictable git behavior. Default false in sekkei.config.yaml means no surprise commits. Explicit `autoCommit: true` enables the feature. Safer for adoption.

4. **[Excel]** Phase 02 uses ExcelJS readFile() to open company .xlsx templates and fill data. ExcelJS is known to lose some Excel formatting. How critical is format preservation?
   - Options: ExcelJS is sufficient (Recommended) | Use xlsx-populate instead | Dual engine with fallback
   - **Answer:** ExcelJS is sufficient (Recommended)
   - **Rationale:** Company spec doc templates use simple cell fills, named ranges, basic formatting — no charts/pivots/conditional formatting. ExcelJS covers 90%+ of use cases. Document known limitations instead of adding complexity.

#### Confirmed Decisions
- **Handler refactoring:** All at once in Phase 01 (last phase) — single clean refactor pass
- **Phase 07 merged into Phase 04:** validate_chain tool covers full chain validation + traceability matrix. Phase 07 deleted.
- **Git auto-commit:** Opt-in via `autoCommit: true/false` in sekkei.config.yaml, default false
- **Excel template engine:** ExcelJS only — no xlsx-populate dependency

#### Action Items
- [x] Remove Phase 07 from plan, merge scope into Phase 04
- [x] Update Phase 05: add `autoCommit` config field, default false
- [x] Update execution order: G2 is now Phase 06 only, Phase 04 depends on Phase 06

#### Impact on Phases
- Phase 04: Absorbs Phase 07 scope — add traceability matrix, full chain validation, TraceabilityEntry types
- Phase 05: Change auto-commit from always-on to opt-in via config
- Phase 06: No longer parallel with Phase 07 (07 deleted); runs solo in G2
- Phase 07: DELETED — merged into Phase 04
