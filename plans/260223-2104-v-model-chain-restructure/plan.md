---
title: "V-Model Document Chain Restructure"
description: "Reorder chain, add 8 doc types, split test-spec into 4 levels, remove overview — clean v2.0 break"
status: completed
priority: P1
effort: 24h
branch: kai/feat/v-model-chain-restructure
tags: [v-model, chain, templates, breaking-change]
created: 2026-02-23
completed: 2026-02-23
---

# V-Model Chain Restructure

## Summary

Align Sekkei's document chain with real SIer V-model practices. Reorder chain (requirements before functions-list), add 8 new doc types (NFR, security-design, project-plan, test-plan, ut-spec, it-spec, st-spec, uat-spec), deprecate overview and test-spec with backward compat, introduce glossary seed/finalize lifecycle.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Type System & Config](phase-01-type-system-and-config.md) | completed | 4h | 3 modify, 1 create |
| 2 | [Templates](phase-02-templates.md) | completed | 5h | 8 create, 2 delete |
| 3 | [Chain Logic](phase-03-chain-logic.md) | completed | 4h | 4 modify |
| 4 | [Validation](phase-04-validation.md) | completed | 4h | 5 modify |
| 5 | [SKILL & Adapters](phase-05-skill-and-adapters.md) | completed | 3h | 3 modify |
| 6 | [Tests & Migration](phase-06-tests-and-migration.md) | completed | 4h | 10+ modify/create |

## Dependencies

```
Phase 1 (types) ─► Phase 2 (templates) ─► Phase 3 (chain) ─► Phase 4 (validation)
                                                                      │
Phase 1 ──────────────────────────────────────► Phase 5 (skill) ◄─────┘
                                                      │
Phase 3 + Phase 4 ──────────────────────────► Phase 6 (tests)
```

## Key Decisions (Agreed)

1. **Test boilerplate**: Duplicate shared sections in all 4 test templates (KISS)
2. **Traceability**: Per-spec scoped traceability; keep existing traceability-matrix.md as full view
3. **Defect report**: Include in all 4 test specs
4. **Commands**: `/sekkei:ut-spec`, `/sekkei:it-spec`, `/sekkei:st-spec`, `/sekkei:uat-spec`
5. **Clean v2.0 break**: Remove overview + test-spec entirely (no backward compat)
6. **Directory nesting**: `02-requirements/` for req phase, `08-test/` for test phase, `03-system/` for security-design
7. **Phase grouping**: Simple display enum for chain-status, not deep architectural change
8. **Feature scope**: UT/IT per-feature, ST/UAT global only
9. **Security-design**: Lives in `03-system/security-design.md`

## Breaking Changes (v2.0)

- Chain order in `sekkei.config.yaml` completely reordered
- DocType enum: +8 new, 2 REMOVED (overview, test-spec)
- `02-requirements.md` → `02-requirements/requirements.md` (directory nesting)
- Cross-ref validation: per-test-level upstream rules
- Output paths: new directory-nested paths
- SKILL.md: 8 new commands, 2 removed
- Config migration is MANDATORY (no fallback for old format)

## Validation Log

### Session 1 — 2026-02-23
**Trigger:** Initial plan validation after creation
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** Phase 3 assigns `02-nfr.md` and `02-project-plan.md` as output paths, but `02-requirements.md` already uses the `02-` prefix. Three files can't share the same number. How should we renumber?
   - Options: Renumber everything | Nest under directories | Use sub-numbering
   - **Answer:** Nest under directories
   - **Rationale:** Groups related req-phase docs under `02-requirements/`. Cleaner than renumbering all paths. Consistent with existing `03-system/` and `08-test/` patterns.

2. **[Assumption]** Research found overview.md is a standalone presales doc — requirements already absorbs its context. Should we really deprecate overview or keep it as optional?
   - Options: Deprecate as planned | Keep but optional | Merge into RFP output
   - **Answer:** Deprecate as planned
   - **Rationale:** /sekkei:rfp covers presales. Overview is redundant. Requirements Section 1 covers the same content.

3. **[Architecture]** ut-spec/it-spec have feature scope, st-spec/uat-spec don't. Correct V-model behavior?
   - Options: Correct as planned | All 4 should have feature scope | Only UT has feature scope
   - **Answer:** Correct as planned
   - **Rationale:** UT tests specific modules (per-feature). IT tests interfaces (per-feature). ST tests entire system. UAT tests business acceptance. V-model symmetry preserved.

4. **[Tradeoff]** Backward compat adds ~15% complexity. Clean v2.0 break or invest in backward compat?
   - Options: Keep backward compat | Clean break v2.0 | Soft deprecation only
   - **Answer:** Clean break v2.0
   - **Rationale:** Simpler codebase. Mandatory migration script. Enterprise users can handle a major version bump with clear migration docs.

5. **[Architecture]** Should security-design go in `03-system/`, `02-requirements/`, or its own directory?
   - Options: In 03-system/ | In 02-requirements/ | Own directory
   - **Answer:** In 03-system/
   - **Rationale:** Security design is system-level design, extending basic-design. Lives alongside system-architecture.md.

6. **[Scope]** Confirm clean v2.0 means: hard remove overview + test-spec from enum, delete templates, mandatory migration, no deprecation warnings?
   - Options: Yes, hard remove | Keep soft deprecation
   - **Answer:** Yes, hard remove
   - **Rationale:** No half-measures. Users get clear migration script + v2.0 changelog.

7. **[Architecture]** After removing overview, `01-` slot is empty. What to do?
   - Options: Shift everything up | Leave gap | Use 01- for RFP
   - **Answer:** Use `01-rfp/` for /sekkei:rfp workspace output
   - **Custom input:** "ok with rfp. but use rfp folder that generate by /sekkei:rfp. make it prefix to 01"
   - **Rationale:** Chain starts with RFP. /sekkei:rfp already generates workspace files. `01-rfp/` makes them part of the numbered output structure.

#### Confirmed Decisions
- **01-rfp/**: RFP workspace folder from /sekkei:rfp as first entry
- **Directory nesting**: `02-requirements/` and `08-test/` group related docs
- **Clean break**: overview + test-spec removed entirely, not deprecated
- **Security placement**: `03-system/security-design.md`
- **Feature scope**: UT/IT per-feature, ST/UAT global
- **Overview removal**: Confirmed redundant with /sekkei:rfp

#### Action Items
- [ ] Update Phase 1: Remove DEPRECATED_DOC_TYPES. Remove overview/test-spec from DOC_TYPES entirely.
- [ ] Update Phase 2: DELETE overview.md and test-spec.md templates (not deprecate). Effort reduced.
- [ ] Update Phase 3: Fix output paths to use `02-requirements/` nesting. Place security-design in `03-system/`. Remove deprecation handler from generate.ts.
- [ ] Update Phase 3: Update structure-validator for `02-requirements/` dir instead of `02-requirements.md` file.
- [ ] Update Phase 5: Remove deprecation notices from SKILL.md. Just remove old commands.
- [ ] Update Phase 6: Remove backward compat tests. Add mandatory migration tests only.

#### Impact on Phases
- Phase 1: Remove DEPRECATED_DOC_TYPES map. Remove overview/test-spec from DOC_TYPES. Simplifies type system.
- Phase 2: Delete templates instead of deprecating. Reduced from "2 deprecate" to "2 delete". Less effort.
- Phase 3: Major path changes — `02-requirements/` directory, security in `03-system/`, no deprecation handler. Structure validator update.
- Phase 5: Simpler — no deprecation notices, just remove old commands.
- Phase 6: Remove backward compat tests. Simpler migration tests (mandatory conversion only).
