# Detail-Design (詳細設計書) Architecture Analysis

> Pipeline analysis for `/sekkei:detail-design` — covering generation flow, validation, cross-references, and gap assessment.

## 1. Pipeline Overview

```
/sekkei:detail-design @input
  → Skill (SKILL.md) routes to phase-design.md
    → Prerequisite check: basic-design must exist
    → Load upstream docs (basic-design + requirements + functions-list)
    → MCP: generate_document(doc_type="detail-design")
      → Template resolution (templates/ja/detail-design.md)
      → Generation instructions assembly (7 context components)
      → Optional: Code analysis (TypeScript AST via ts-morph)
      → AI generates markdown
    → MCP: validate_document
      → Section completeness (8 required sections)
      → Table structure (クラスID + エラーコード columns)
      → Cross-reference coverage (SCR/TBL/API-xxx from upstream)
      → Content depth (CLS-xxx, SCR/TBL/API references)
      → Keigo consistency (である調)
      → Mermaid syntax validation
    → MCP: update_chain_status(detail_design: "complete")
    → Suggest next: /sekkei:ut-spec
```

## 2. V-Model Chain Position

```
requirements ─────┐
functions-list ────┤
basic-design ──────┴→ detail-design ──→ ut-spec
                         ↑                  ↑
                    (also feeds)        (also feeds)
                    from test-plan     from test-plan
```

### Chain Pairs (cross-ref-linker.ts:26-28)
```typescript
["basic-design", "detail-design"]     // primary upstream
["functions-list", "detail-design"]   // feature mapping
["requirements", "detail-design"]     // requirement traceability
["detail-design", "ut-spec"]          // primary downstream
```

### ID System
| Role | Prefixes | Source |
|------|----------|--------|
| **Produces** | `CLS-xxx`, `DD-xxx` | detail-design |
| **Consumes** | `SCR-xxx`, `TBL-xxx`, `API-xxx` | basic-design |
| **Consumes** | `REQ-xxx` | requirements |
| **Consumes** | `F-xxx` | functions-list |
| **Consumed by** | `UT-xxx` → references `CLS-xxx` | ut-spec |

## 3. Core Files

| File | LOC | Responsibility |
|------|-----|----------------|
| `templates/ja/detail-design.md` | 180 | 14-section template + YAML frontmatter |
| `src/tools/generate.ts` | 765 | MCP tool handler, context assembly |
| `src/lib/generation-instructions.ts` | 493 | Base AI instructions per doc type |
| `src/lib/validator.ts` | 696 | Section/table/cross-ref/keigo checks |
| `src/lib/completeness-rules.ts` | 306 | Content depth rules (CLS, SCR, TBL, API) |
| `src/lib/cross-ref-linker.ts` | 387 | ID graph analysis, traceability matrix |
| `src/lib/code-analyzer.ts` | ~150 | TypeScript AST extraction (ts-morph) |
| `src/lib/code-context-formatter.ts` | ~100 | Format code analysis → markdown |
| `src/lib/keigo-validator.ts` | ~130 | Keigo style enforcement |
| `skills/content/references/phase-design.md` | ~250 | Skill workflow orchestration |

## 4. Generation Context Assembly

When generating detail-design, the MCP tool builds context with 7 blocks (generate.ts:530-671):

1. **Base instructions** — module design, class specs, API details, validation rules, error handling (generation-instructions.ts:58-68)
2. **Keigo directive** — `である調` (simple style, KEIGO_MAP line 321)
3. **Output language** — Japanese by default, supports en/vi
4. **Project-type instructions** — currently only `batch` has detail-design specific instructions (generate.ts:197)
5. **Upstream ID constraints** — extracted SCR/TBL/API/REQ/F IDs injected as cross-ref constraints
6. **Code context** — optional TypeScript AST (classes, methods, APIs, DB entities) when `source_code_path` provided
7. **Changelog preservation** — when regenerating, preserves existing 改訂履歴 + appends new row

## 5. Template Structure (14 Sections)

| # | Section | Required Heading | Required Columns |
|---|---------|-----------------|------------------|
| - | 改訂履歴 | Yes | 版数, 日付, 変更内容, 変更者 |
| - | 承認欄 | Yes | - |
| - | 配布先 | Yes | - |
| - | 用語集 | Yes | - |
| 1 | 概要 | Yes | - |
| 2 | モジュール設計 | Yes | モジュールID, name, dependencies, layer |
| 3 | クラス設計 | Yes | CLS-xxx (7 columns) |
| 4 | 画面設計詳細 | Yes | SCR-xxx field specs, validation rules |
| 5 | DB詳細設計 | Yes | TBL-xxx column specs, indexes |
| 6 | API詳細仕様 | Yes | API-xxx endpoint, req/res, errors |
| 7 | 処理フロー | Yes | Mermaid sequence + state diagrams |
| 8 | エラーハンドリング | Yes | Error codes (6 columns) |
| 9 | セキュリティ実装 | No | 4-column table (対策/実装/対象/備考) |
| 10 | パフォーマンス考慮 | No | 4-column table (対策/目標/実装/備考) |

## 6. Validation Rules

### Section Completeness (validator.ts:61-65)
10 required sections: 概要, モジュール設計, クラス設計, 画面設計詳細, DB詳細設計, API詳細仕様, 処理フロー, エラーハンドリング, セキュリティ実装, パフォーマンス考慮 + 4 structural (改訂履歴, 承認欄, 配布先, 用語集)

### Table Structure (validator.ts:152)
Required column sets: `["クラスID"]` and `["エラーコード"]`

### Content Depth (completeness-rules.ts:101-122)
4 checks:
- `CLS-\d+` in table — class IDs present
- `SCR-\d+` anywhere — screen references
- `TBL-\d+` anywhere — table references
- `API-\d+` anywhere — API references

### Cross-Reference Coverage
- Upstream types derived from CHAIN_PAIRS: `["API", "F", "NFR", "PP", "REQ", "RPT", "SCR", "TBL", "TP"]`
- Coverage threshold: 80% (warning if below)

### Keigo
- Style: `simple` → `である調` (validator enforces no `ですます`)

## 7. Split Mode Support

detail-design supports split generation (generate.ts:385):

| Scope | Output Path | ID Scoping |
|-------|------------|------------|
| `shared` | `03-system/` | Standard CLS-xxx, DD-xxx |
| `feature` | `05-features/{feature-id}/detail-design.md` | No feature prefix on CLS/DD |

Feature section validation headings (validator.ts:589): `["概要", "モジュール設計", "クラス設計", "画面設計詳細", "API詳細仕様"]`

---

# GAP ANALYSIS & IMPROVEMENT PROPOSALS

## BUG-01: Instructions Claim "10-section structure" But Template Has 14 Sections

**Location:** `generation-instructions.ts:60`
```
"Follow the 10-section structure defined in the template."
```

**Reality:** Template has 14 sections (4 structural + 10 numbered). The instruction misleads AI, potentially causing it to stop generating after section 10 and skip セキュリティ実装 and パフォーマンス考慮.

**Fix:** Change to "Follow the 14-section structure defined in the template" or "Follow ALL sections defined in the template."

**Severity:** Medium — can cause AI to produce incomplete documents.

## BUG-02: セキュリティ実装 and パフォーマンス考慮 Not in Required Sections

**Location:** `validator.ts:61-65`
```typescript
"detail-design": [
  ...STRUCTURAL_SECTIONS,
  "概要", "モジュール設計", "クラス設計", "画面設計詳細",
  "DB詳細設計", "API詳細仕様", "処理フロー", "エラーハンドリング",
],
```

**Missing:** `"セキュリティ実装"` and `"パフォーマンス考慮"` — sections 9 and 10 of the template. Validator won't flag their absence.

**Impact:** Detail-design documents can pass validation missing 2 important sections.

**Fix:** Add both to REQUIRED_SECTIONS.

## BUG-03: Split Mode CLS/DD IDs Have No Feature Prefix — Collision Risk

**Location:** `generate.ts:414-418`

Split mode generates feature-prefixed SCR/RPT IDs (`SCR-SAL-001`) but CLS/DD IDs remain unprefixed. When multiple features generate detail-designs:
- Feature A: CLS-001, CLS-002
- Feature B: CLS-001, CLS-002 (collision!)

**Impact:** Cross-feature duplicate CLS IDs break ut-spec traceability. The duplicate check in `validateSplitDocument` (validator.ts:653-674) only checks SCR/RPT — not CLS/DD.

**Fix:**
1. Add CLS/DD to split ID scoping instructions: `CLS-{PREFIX}-001`
2. Add CLS/DD to cross-feature duplicate check regex in validator.ts:657-658

## BUG-04: Upstream ID Type Derivation Includes Irrelevant Prefixes

**Location:** `validator.ts:134-139` (UPSTREAM_ID_TYPES computed from CHAIN_PAIRS)

For detail-design, derived upstream types include `PP` (project-plan) and `TP` (test-plan) because:
- `requirements → detail-design` pulls in REQ, NFR
- `functions-list → detail-design` pulls in F
- But also `test-plan → ut-spec` and `project-plan` IDs leak via shared origins

The upstream cross-ref check will flag PP-xxx and TP-xxx as "not referenced" — false positives since detail-design has no obligation to reference project-plan or test-plan IDs.

**Fix:** Add override for detail-design in UPSTREAM_OVERRIDES:
```typescript
"detail-design": ["SCR", "TBL", "API", "REQ", "F", "RPT"],
```

## GAP-01: Only 1 of 11 Project Types Has Detail-Design Instructions

**Location:** `generate.ts:113-382` (PROJECT_TYPE_INSTRUCTIONS)

Only `batch` has detail-design specific instructions:
```
"For each batch process: input/output file specs, error handling procedure, restart procedure..."
```

Missing for real-world scenarios:
| Project Type | Missing Detail-Design Guidance |
|-------------|-------------------------------|
| `saas` | Multi-tenant class design (tenant-scoped services), API pagination patterns |
| `microservice` | Per-service class design, gRPC proto definitions, saga orchestrators |
| `mobile` | ViewModel/Repository pattern, offline sync classes, platform-specific adapters |
| `event-driven` | Event handler classes, consumer/producer patterns, dead-letter handling |
| `ai-ml` | Model serving classes, feature engineering pipeline, inference wrappers |
| `government` | Audit trail classes, PII handling wrappers, accessibility validators |
| `finance` | Transaction classes, idempotency patterns, audit decorators |
| `healthcare` | FHIR resource mappers, consent management services, HL7 adapters |

**Impact:** For non-batch projects, detail-design gets generic instructions only — losing the domain-specific richness that basic-design and security-design already have.

## GAP-02: No Mermaid classDiagram Validation

**Location:** `validator.ts:544-548` — only basic-design gets diagram consistency check

Detail-design template explicitly requests `classDiagram` (section 3.2) and `sequenceDiagram` + `stateDiagram` (section 7), but:
- No validation that classDiagram block exists
- No validation that CLS-xxx from クラス一覧 appear in the diagram
- No validation that sequenceDiagram references actual module/class names

**Fix:** Add `validateDiagramConsistency` call for detail-design (or extend to check classDiagram CLS coverage).

## GAP-03: No JSON Schema Validation in API Section

**Location:** Template section 6 has JSON code blocks for request/response.

No validation checks:
- Whether JSON code blocks parse as valid JSON
- Whether request/response fields match the field definitions
- Whether error response codes are consistent with section 8 error list

**Impact:** AI can generate invalid JSON examples that propagate to ut-spec as test fixtures.

**Recommendation:** Add completeness rule checking at least 1 valid JSON block per API-xxx.

## GAP-04: Code Analysis Limited to TypeScript Only

**Location:** `generate.ts:498-508`, `code-analyzer.ts`

The `source_code_path` feature only analyzes TypeScript via ts-morph. Real-world Japanese enterprise projects commonly use:
- Java (Spring Boot) — most common in SIer projects
- C# (.NET) — enterprise internal systems
- Python (Django/FastAPI) — AI/ML projects
- Go — microservice architectures
- PHP (Laravel) — web systems

**Impact:** Code-aware generation only works for ~20% of potential projects.

**Recommendation:** Priority extension: Java (via java-parser or tree-sitter) > C# > Python. Even basic regex extraction of class/method signatures would help.

## GAP-05: Missing screen-design → detail-design Chain Link

**Location:** `cross-ref-linker.ts:13-65`

`screen-design` is a separate document type that defines detailed screen specs. But there's no chain pair:
```
["screen-design", "detail-design"]  // MISSING
```

When screen-design exists, detail-design section 4 (画面設計詳細) should consume its field definitions. Currently, detail-design only gets SCR-xxx from basic-design, missing the richer screen-design data.

**Fix:** Add chain pair and update phase-design.md upstream loading.

## GAP-06: No Validation for Module-Class Consistency

Template sections 2 and 3 define modules and classes respectively, with explicit "レイヤー" column in modules and "パッケージ" in classes. But no validation checks:
- Every CLS-xxx maps to a defined module
- Layer distribution is reasonable (not all in one layer)
- Module dependency graph has no cycles

**Recommendation:** Add completeness rule checking CLS count >= module count.

## GAP-07: Error Code Consistency Between Section 6 and Section 8

API section (6) defines per-endpoint error responses. Error handling section (8) defines a global error list. No cross-check ensures:
- API error codes exist in the global error list
- Global error codes are referenced by at least one API
- Severity levels are consistent

**Recommendation:** Add cross-section consistency check for error codes.

## GAP-08: No MTD (Method) ID Prefix

The template defines classes with CLS-xxx but individual methods have no ID format. ut-spec needs method-level traceability:
```
DD-xxx → CLS-xxx → MTD-xxx → UT-xxx
```

Currently UT-xxx can only trace to CLS-xxx (class level), not specific methods. This reduces test traceability granularity.

**Recommendation:** Consider adding MTD-xxx to ID_ORIGIN and template if method-level tracing is needed.

## GAP-09: Feature Section Headings Too Permissive

**Location:** `validator.ts:589`
```typescript
"detail-design": ["概要", "モジュール設計", "画面設計詳細"],
```

Only 3 headings required for feature files. Missing: クラス設計, API詳細仕様, 処理フロー — which are core per-feature sections.

**Fix:** Add at least `"クラス設計"` to feature section headings.

## GAP-10: No Downstream Link to it-spec

**Location:** `cross-ref-linker.ts:37-39`

Detail-design only feeds ut-spec. But integration tests (it-spec) also need detail-design data:
- API detail specs for integration test scenarios
- Module call relationships for integration path testing
- Error handling for negative integration tests

Currently it-spec only links to basic-design, missing the richer API specs from detail-design.

**Recommendation:** Add `["detail-design", "it-spec"]` to CHAIN_PAIRS.

## GAP-11: No Batch-Specific Template Sections

For batch projects, `PROJECT_TYPE_INSTRUCTIONS` adds batch-specific guidance but the template itself has no batch-specific sections. AI must create ad-hoc sections for:
- Input/output file specifications
- Job scheduling details
- Restart procedures

**Recommendation:** Consider a `detail-design-batch.md` variant template or conditional sections in YAML frontmatter.

---

## Priority Matrix

| ID | Type | Severity | Effort | Priority |
|----|------|----------|--------|----------|
| BUG-01 | Bug | Medium | Low | P1 |
| BUG-02 | Bug | Medium | Low | P1 |
| BUG-03 | Bug | High | Medium | P1 |
| BUG-04 | Bug | Low | Low | P2 |
| GAP-01 | Enhancement | High | Medium | P1 |
| GAP-02 | Enhancement | Medium | Medium | P2 |
| GAP-03 | Enhancement | Low | Medium | P3 |
| GAP-04 | Limitation | Medium | High | P3 |
| GAP-05 | Enhancement | Medium | Low | P2 |
| GAP-06 | Enhancement | Low | Medium | P3 |
| GAP-07 | Enhancement | Low | Medium | P3 |
| GAP-08 | Enhancement | Low | Medium | P3 |
| GAP-09 | Bug | Medium | Low | P2 |
| GAP-10 | Enhancement | Medium | Low | P2 |
| GAP-11 | Enhancement | Low | Medium | P3 |

## Recommended Action Order

1. **Quick fixes (P1, low effort):** BUG-01 + BUG-02 — fix instruction text and required sections
2. **Split mode fix (P1):** BUG-03 — add CLS/DD feature prefix + duplicate check
3. **Project-type expansion (P1):** GAP-01 — add detail-design instructions for saas, microservice, mobile at minimum
4. **Chain fixes (P2):** GAP-05 + GAP-10 — add screen-design and it-spec chain links
5. **Validation hardening (P2):** GAP-02 + GAP-09 + BUG-04 — diagram validation + feature headings + upstream override
6. **Future (P3):** GAP-03, GAP-04, GAP-06, GAP-07, GAP-08, GAP-11

---

## Implementation Tracker

| ID | Type | Category | Description | Status |
|----|------|----------|-------------|--------|
| BUG-01 | Bug | Instructions | "10-section" text misleads AI (template has 14) | done |
| BUG-02 | Bug | Validation | セキュリティ実装 + パフォーマンス考慮 missing from REQUIRED_SECTIONS | done |
| BUG-03 | Bug | Split Mode | CLS/DD IDs no feature prefix → collision in multi-feature | done |
| BUG-04 | Bug | Cross-Ref | Upstream ID derivation includes irrelevant PP/TP prefixes | done |
| GAP-01 | Enhancement | Instructions | Only batch has project-type detail-design instructions (10/11 missing) | done |
| GAP-02 | Enhancement | Validation | No Mermaid classDiagram validation for detail-design | done |
| GAP-05 | Enhancement | Chain | Missing screen-design → detail-design chain link | done |
| GAP-09 | Bug | Validation | Feature section headings only require 3/8 (too permissive) | done |
| GAP-10 | Enhancement | Chain | Missing detail-design → it-spec chain link | done |

### Deferred (P3 — future consideration)
| ID | Type | Description | Status |
|----|------|-------------|--------|
| GAP-03 | Enhancement | No JSON schema validation in API section | deferred |
| GAP-04 | Limitation | Code analysis limited to TypeScript only | deferred |
| GAP-06 | Enhancement | No module-class consistency validation | deferred |
| GAP-07 | Enhancement | No error code cross-section consistency check | deferred |
| GAP-08 | Enhancement | No MTD (method) ID prefix for method-level traceability | deferred |
| GAP-11 | Enhancement | No batch-specific template variant | deferred |

---

## Unresolved Questions

1. Should MTD-xxx (method ID) be a first-class ID prefix, or is CLS-xxx granularity sufficient for most projects?
2. Should detail-design have variant templates per project-type (like batch), or keep one template with conditional AI instructions?
3. How should cross-feature CLS references work in split mode? (e.g., Feature B's class extends Feature A's base class)
4. Should code analysis support be prioritized for Java given the SIer target audience?
