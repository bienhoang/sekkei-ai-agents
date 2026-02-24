---
title: "Numbered Documentation Structure Refactor"
description: "Refactor Sekkei output to numbered NN-prefix structure with feature-first organization"
status: complete
priority: P1
effort: 12h
branch: main
tags: [refactor, output-structure, breaking-change]
created: 2026-02-21
completed: 2026-02-21
---

# Numbered Documentation Structure Refactor

Refactor Sekkei doc generator to output Japanese SI-style `NN-` prefix structure instead of flat `sekkei-docs/`. Breaking change affecting all layers: MCP server, templates, config schema, and SKILL.md.

## Research

- [MCP Server Internals](./research/researcher-01-mcp-server-internals.md)
- [SKILL.md & Templates](./research/researcher-02-skill-and-templates.md)
- [Brainstorm](../reports/brainstorm-260221-1557-numbered-doc-structure-refactor.md)
- [Spec](../../refactor-1.md)

## Target Structure

```
{output-dir}/
  01-overview.md
  02-requirements.md
  03-system/index.md + {section}.md files
  04-functions-list.md
  05-features/{kebab-name}/index.md + basic-design.md + detail-design.md + test-spec.md
  06-data/index.md
  07-operations/index.md
  08-test/index.md
  09-ui/index.md
  10-glossary.md
```

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Config & Types](./phase-01-config-and-types.md) | 2h | ✅ complete |
| 2 | [Init Scaffold](./phase-02-init-scaffold.md) | 2h | ✅ complete |
| 3 | [Generate Path Routing](./phase-03-generate-path-routing.md) | 3h | ✅ complete |
| 4 | [Manifest & Merge](./phase-04-manifest-and-merge.md) | 2h | ✅ complete |
| 5 | [Validation & Status](./phase-05-validation-and-status.md) | 1.5h | ✅ complete |
| 6 | [SKILL.md & Templates](./phase-06-skill-and-templates.md) | 1.5h | ✅ complete |
| 7 | [Tests](./phase-07-tests.md) | 2h | ✅ complete |

## Key Dependencies

- Phase 1 must complete before all others (types + config are the foundation)
- Phase 2 depends on Phase 1 (needs new config schema)
- Phase 3 depends on Phase 1 (needs new doc types)
- Phase 4 depends on Phase 1 + 3 (manifest paths reference generated paths)
- Phase 5 depends on Phase 1–4 (validates the full structure)
- Phase 6 depends on Phase 1–3 (SKILL.md workflow references new paths)
- Phase 7 depends on all previous phases

## Validation Log

### Session 1 — 2026-02-21
**Trigger:** Initial plan validation before implementation
**Questions asked:** 6

#### Questions & Answers

1. **[Risk]** The plan removes MonolithicDocument entirely (Phase 1). Existing projects using flat sekkei-docs/ structure will break. How should we handle backward compatibility?
   - Options: Clean break (Recommended) | Add migration script | Keep both modes temporarily
   - **Answer:** Clean break
   - **Rationale:** No existing production users yet. Document as breaking change in CHANGELOG. Avoids complexity of dual-mode support.

2. **[Tradeoff]** Glossary format: plan changes from glossary.yaml (YAML) to 10-glossary.md (Markdown). But the manage_glossary MCP tool uses Python NLP on YAML. Should we change the format?
   - Options: Keep YAML internally | Switch to Markdown | Both files
   - **Answer:** Switch to Markdown
   - **Rationale:** 10-glossary.md becomes source of truth. manage_glossary MCP tool + Python glossary.py must be updated to parse Markdown tables. Adds scope to Phase 4/6.

3. **[Scope]** Per-feature completion tracking: chain-status currently shows ⏳ for ALL features. Should config track per-feature doc status explicitly?
   - Options: Config-level tracking (Recommended) | Filesystem-based | Keep simple
   - **Answer:** Keep simple
   - **Rationale:** Users run `/sekkei:validate --structure` for per-file status. Avoids config bloat. YAGNI.

4. **[Architecture]** resolveOutputPath() is defined inside generate.ts (Phase 3) but Phase 7 notes it needs extraction to lib/ for testability. Should we put it in lib/resolve-output-path.ts from the start?
   - Options: Yes, lib/ from start (Recommended) | No, keep in generate.ts
   - **Answer:** Yes, lib/ from start
   - **Rationale:** Clean separation, testable, one less refactor later.

5. **[Assumption]** Phase 3 maps crud-matrix → 03-system/crud-matrix.md and traceability-matrix → 08-test/traceability-matrix.md. The original spec doesn't mention matrices. Are these placements correct?
   - Options: Correct placement | Both in 03-system/ | Skip for now
   - **Answer:** Correct placement
   - **Rationale:** CRUD is system-wide (03-system). Traceability is test-related (08-test). Confirmed.

6. **[Architecture]** validate.ts will be ~180 LOC with structural validation. Should validateNumberedStructure() go in lib/structure-validator.ts from the start?
   - Options: Yes, extract to lib/ (Recommended) | No, keep inline
   - **Answer:** Yes, extract to lib/
   - **Rationale:** Keeps validate.ts as thin tool layer. Structure validation is reusable logic.

#### Confirmed Decisions
- Migration: Clean break, no migration tool — document as breaking change
- Glossary: Switch to Markdown (10-glossary.md is source of truth)
- Feature tracking: Keep simple — no per-feature config tracking
- resolveOutputPath: lib/resolve-output-path.ts from start
- Matrix routing: crud→03-system, traceability→08-test confirmed
- Structure validator: lib/structure-validator.ts from start

#### Action Items
- [ ] Phase 3: Move resolveOutputPath to `lib/resolve-output-path.ts`, import in generate.ts
- [ ] Phase 4/6: Update manage_glossary tool + Python glossary.py to parse Markdown tables
- [ ] Phase 5: Extract validateNumberedStructure to `lib/structure-validator.ts`
- [ ] Phase 5: Remove per-feature status from chain-status (keep ⏳ default, point to validate)
- [ ] Phase 7: Test resolve-output-path.ts and structure-validator.ts as separate modules

#### Impact on Phases
- Phase 3: resolveOutputPath moves to `lib/resolve-output-path.ts` (new file). generate.ts imports it.
- Phase 4: Add glossary.py Markdown parsing update scope (manage_glossary tool + Python NLP layer)
- Phase 5: validateNumberedStructure extracted to `lib/structure-validator.ts`. chain-status keeps simple (no per-feature tracking).
- Phase 6: glossary sub-command path confirmed as `10-glossary.md` (Markdown source of truth)
- Phase 7: Test imports from lib/ modules directly
