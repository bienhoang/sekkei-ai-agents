# V-Model Chain Audit — Brainstorm Report

**Date:** 2026-02-24 | **Scope:** Full V-model definition, chain flow, gaps, improvements

---

## 1. V-Model Definition — Correctness Assessment

### Chain Topology (53 CHAIN_PAIRS)

The V-model is defined as a directed acyclic graph (DAG) of 53 edges in `cross-ref-linker.ts`. This is the **single source of truth** used by all chain-aware subsystems.

**Left side (design/specification):**
```
RFP → requirements → { nfr, functions-list, project-plan }
                   → basic-design → { security-design, detail-design }
```

**Right side (testing/verification):**
```
requirements + nfr + basic-design → test-plan → { ut-spec, it-spec, st-spec, uat-spec }
detail-design → ut-spec    (unit tests verify detail design)
basic-design  → it-spec    (integration tests verify basic design)
basic-design  → st-spec    (system tests verify basic design)
requirements  → uat-spec   (UAT verifies requirements)
```

**Supplementary:**
```
requirements + nfr → operation-design
basic-design + requirements + operation-design → migration-design
functions-list + basic-design → crud-matrix
requirements + basic-design → traceability-matrix
functions-list → sitemap
```

### Verdict: MOSTLY CORRECT ✓

The chain correctly follows V-model principles:
- Left side: progressive refinement (requirements → design → detail)
- Right side: each test level maps back to its specification level
- Cross-references enforce traceability (ID prefixes bind docs together)

### Issues Found

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| D1 | `screen-design` + `interface-spec` orphaned from chain | **Medium** | In `DOC_TYPES` (22 types) and have templates, but **not in CHAIN_PAIRS** (53 edges). `screen-design` has `parent: basic-design` in frontmatter but nothing reads this field. They exist in template system but have no chain validation, no staleness detection, no CR propagation. |
| D2 | `test-evidence`, `meeting-minutes`, `decision-record` orphaned | **Low** | In `DOC_TYPES` but not in `CHAIN_PAIRS`. These are meta-docs that arguably don't need chain relationships, but they **also missing from `CHAIN_DISPLAY_ORDER`** — `chain_status` tool won't show them. |
| D3 | Missing `nfr → basic-design` chain pair | **Medium** | NFR feeds into basic-design (non-functional requirements shape system architecture), but there's no `["nfr", "basic-design"]` pair. NFR → security-design exists, NFR → test-plan exists, but basic-design only pulls from requirements + functions-list. |
| D4 | `functions-list → test-plan` missing | **Low** | Functions-list feeds into st-spec directly but not test-plan. Test planning typically needs function inventory to estimate test scope. |

---

## 2. Chain Flow — Operational Assessment

### Generation Flow

```
generate_document(doc_type, input_content, upstream_content)
  → buildUpstreamIdsBlock(upstream_content)   // extract IDs as hard constraints
  → load template from templates/ja/{doc_type}.md
  → assemble prompt context (12+ sections)
  → return context to MCP client (AI generates actual content)
```

**Verdict: WORKING BUT ADVISORY-ONLY**

The upstream ID constraint is an AI instruction ("use ONLY these IDs"), not a hard enforcement. Nothing prevents the AI from inventing IDs — validation is a separate step.

### Validation Flow

```
validate_document(content, doc_type, upstream_content)
  → validateFrontmatterStatus
  → validateCompleteness (required sections per doc type)
  → validateTableStructure (required columns per doc type)
  → validateKeigo
  → validateContentDepth (optional, ID density rules)
  → validateCrossRefs (if upstream provided)
```

**Verdict: COMPREHENSIVE BUT OPT-IN**

Validation is never called automatically after generation. The skill flow docs suggest calling validate, but nothing enforces it.

### Chain Validation Flow

```
validate_chain(config_path)
  → loadChainDocs from sekkei.config.yaml
  → buildIdGraph (extract all IDs per doc)
  → analyzeGraph (per CHAIN_PAIR: find orphaned/missing IDs)
  → buildTraceabilityMatrix
  → checkChainStaleness (git timestamp comparison)
```

**Verdict: SOLID ✓** — Full graph analysis with traceability output.

### Change Request Flow

```
create → analyze (BFS impact) → approve (conflict check) → propagate_next (loop) → validate → complete
```

**Verdict: WELL-DESIGNED ✓** — Git checkpoint for rollback, BFS propagation, advisory conflict detection.

### Plan Management Flow

```
detect (split-mode?) → create (phases) → execute (per-phase) → update (completion)
```

**Verdict: FUNCTIONAL BUT LIMITED** — Only 3 doc types (basic-design, detail-design, test-spec). No cancel action despite `cancelled` status existing.

---

## 3. Gaps and Bugs

### Critical Bugs

| # | Bug | Impact | Location |
|---|-----|--------|----------|
| B1 | `handleList` in plan-actions uses `generatePlanId(p.doc_type)` which always generates today's date — returns wrong `plan_id` for plans created on previous days | Plan listing broken for non-today plans | `tools/plan-actions.ts` |

### Significant Gaps

| # | Gap | Impact | Detail |
|---|-----|--------|--------|
| G1 | **No automatic post-generation validation** | Generated docs may have structural issues undetected | Validation is a separate manual step. Skill flows suggest it but don't enforce. |
| G2 | **Dual ID extraction inconsistency** | Cross-ref may miss custom IDs or double-count | `extractAllIds` (CUSTOM_ID_PATTERN) vs `extractIds` (standard ID_PATTERN) used in different code paths. `buildUpstreamIdsBlock` uses `extractAllIds`, `buildIdGraph` uses both, validator's `extractIds` uses standard only. |
| G3 | **CHAIN_PAIRS ↔ UPSTREAM_ID_TYPES maintained separately** | Topology drift risk | Both model the same V-model relationships but in different representations. If a chain pair is added/removed, the other may not be updated. |
| G4 | **Split-doc staleness uses directory timestamp** | Inaccurate staleness for individual features | `doc-staleness.ts` uses `system_output` dir as representative for split docs — individual feature files may have different timestamps. |
| G5 | **No plan cancel action** | Can't cancel in-progress plans | `PlanStatus` includes `cancelled` but no `cancel` handler in `PLAN_ACTIONS`. |
| G6 | **15 source files with zero test coverage** | Untested code paths | `translate.ts`, `simulate-impact.ts`, `import-document.ts`, `confidence-extractor.ts`, `keigo-validator.ts`, `impact-analyzer.ts`, `content-sanitizer.ts`, `traceability-extractor.ts`, `preset-resolver.ts`, `config-migrator.ts`, `screen-design-instructions.ts`, `google-auth.ts`, `font-manager.ts`, `watch.ts`, `cr-propagation-actions.ts` |
| G7 | **Export only tests input validation** | No end-to-end export verification | xlsx/pdf/docx export assertions only cover input validation, not actual file output content. |
| G8 | **`screen-design` and `interface-spec` have no chain integration** | Chain validation, staleness, CR propagation all ignore these doc types | Templates exist, skill commands exist, but chain graph excludes them. |
| G9 | **YAML config uses underscore, code uses hyphen** | Naming inconsistency | `functions_list` in config vs `functions-list` in CHAIN_PAIRS. Explicit mapping exists in `cross-ref-linker.ts` but fragile. |
| G10 | **No max-steps guard on `propagate_next`** | Infinite loop risk if agent misbehaves | Agent must call `propagate_next` repeatedly with no timeout or max iteration. |
| G11 | **`nfr → basic-design` missing from chain** | NFR requirements not validated against basic-design | Non-functional requirements (performance, scalability) should influence system architecture but the chain pair is absent. |

### Dead/Unused Code Suspicion

| # | File | Status |
|---|------|--------|
| U1 | `confidence-extractor.ts` | No call site found — potentially dead code |
| U2 | `screen-design` `parent: basic-design` frontmatter | Field not read by any code |

---

## 4. Improvement Recommendations

### Priority 1 — Fix Bugs

| # | Action | Effort |
|---|--------|--------|
| P1.1 | Fix `handleList` plan_id generation — use directory name instead of `generatePlanId()` | Small |
| P1.2 | Add `cancel` action to plan management | Small |
| P1.3 | Add `nfr → basic-design` chain pair | Small |

### Priority 2 — Close Critical Gaps

| # | Action | Effort |
|---|--------|--------|
| P2.1 | Unify ID extraction — single function used everywhere, with custom prefix support | Medium |
| P2.2 | Derive `UPSTREAM_ID_TYPES` from `CHAIN_PAIRS` + `ID_ORIGIN` programmatically (eliminate dual maintenance) | Medium |
| P2.3 | Add `screen-design` and `interface-spec` to CHAIN_PAIRS | Small |
| P2.4 | Add `propagate_next` max-steps guard (fail-safe at 2× expected steps) | Small |

### Priority 3 — Strengthen Quality

| # | Action | Effort |
|---|--------|--------|
| P3.1 | Optional auto-validation after generation (config flag `autoValidate: true`) | Medium |
| P3.2 | Fix split-doc staleness to check individual feature files | Medium |
| P3.3 | Add tests for untested tools: `translate`, `simulate-impact`, `import-document` | Medium |
| P3.4 | Add end-to-end export tests (at least xlsx with content assertions) | Medium |

### Priority 4 — Nice-to-Have

| # | Action | Effort |
|---|--------|--------|
| P4.1 | Auto-populate `chain` section in `sekkei.config.yaml` on first generate | Small |
| P4.2 | Add `functions-list → test-plan` chain pair | Small |
| P4.3 | Normalize underscore/hyphen naming in config (breaking change, needs migration) | Large |
| P4.4 | Add `CHAIN_DISPLAY_ORDER` entries for meta-docs (test-evidence, meeting-minutes, decision-record) | Small |

---

## Summary Score

| Area | Score | Notes |
|------|-------|-------|
| V-Model Definition | **8/10** | Solid DAG, correct V-model symmetry. Missing 2-3 chain pairs (nfr→basic-design, screen-design, interface-spec). |
| Chain Flow | **7/10** | Generation + validation + CR + plan all functional. Advisory-only constraints, no automatic post-gen validation. |
| Test Coverage | **6/10** | 41 unit test files but 15 source files untested. Export tests are shallow. |
| Code Quality | **8/10** | Clean separation (schema/dispatch/handler), YAML persistence, no TODOs/FIXMEs. Few `as any` casts (all justified). |
| Overall | **7.25/10** | Mature system with solid architecture. Main risks: dual-maintenance of chain topology, missing chain pairs for 5 doc types, plan_id bug. |

---

## Unresolved Questions

1. Is `confidence-extractor.ts` dead code or wired in somewhere not found by scouts?
2. Should `screen-design` and `interface-spec` be full chain members or stay supplementary?
3. Is the underscore/hyphen naming inconsistency (`functions_list` vs `functions-list`) worth a breaking migration?
4. Should `propagate_next` have automatic retry/timeout, or is agent-driven loop the intended UX?
