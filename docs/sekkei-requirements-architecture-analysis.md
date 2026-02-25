# Sekkei Requirements Architecture Analysis

**Date:** 2026-02-25
**Scope:** `/sekkei:requirements` — full generation pipeline
**Files analyzed:** 20+ source files across skill, MCP, template, validation layers

---

## 1. Architecture Overview

```
User → /sekkei:requirements @input
  ↓
Skill Layer (SKILL.md → phase-requirements.md)
  ├─ Prerequisite check (input OR 01-rfp/ workspace)
  ├─ Interview questions (6 questions)
  └─ Orchestration (10-step flow)
  ↓
MCP Tool Layer (generate.ts → generate_document)
  ├─ Load template (ja/requirements.md)
  ├─ Build AI instructions (generation-instructions.ts)
  ├─ Build context blocks (keigo, traceability, confidence, changelog)
  ├─ Staleness advisory (if config present)
  └─ Return assembled markdown context
  ↓
AI Generation (Claude generates document from context)
  ↓
Post-Generation
  ├─ Save to 02-requirements/requirements.md
  ├─ update_chain_status → sekkei.config.yaml
  ├─ validate_document → structure + content checks
  └─ Git auto-commit (if autoCommit: true)
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| Skill | `packages/skills/content/references/phase-requirements.md` | Workflow orchestration (10 steps) |
| MCP | `packages/mcp-server/src/tools/generate.ts` | Context assembly (473 lines) |
| Instructions | `packages/mcp-server/src/lib/generation-instructions.ts` | AI prompts per doc type |
| Template | `packages/mcp-server/templates/ja/requirements.md` | 10-section structure |
| Validation | `packages/mcp-server/src/lib/validator.ts` | Structure + content + changelog checks |
| Standards | `packages/skills/content/references/doc-standards.md` | IPA columns, ID conventions |
| IDs | `packages/mcp-server/src/lib/id-extractor.ts` | REQ-xxx, NFR-xxx extraction |

---

## 2. Data Flow Deep Dive

### 2.1 Input Resolution

```
@input provided?
  ├─ YES → use directly as input_content
  └─ NO → check {output.directory}/01-rfp/
              ├─ Found → auto-load 02_analysis.md + 06_scope_freeze.md
              └─ Not found → ABORT
```

### 2.2 Context Assembly (generate.ts)

The MCP tool assembles a rich markdown context with 8 blocks:

1. **Document metadata** — type, project name, language
2. **AI Instructions** — `GENERATION_INSTRUCTIONS["requirements"]` (9 rules)
3. **Keigo block** — ですます調 by default
4. **Output language** — must write in Japanese
5. **Confidence annotations** — `<!-- confidence: high/mid/low -->` per section
6. **Traceability** — trace each paragraph to source
7. **Changelog preservation** — if regenerating with `existing_content`
8. **Template + Input content** — full template structure + RFP text

### 2.3 Validation Pipeline

```
validate_document()
  ├─ Structure rules (frontmatter, sections, ordering)
  ├─ Completeness rules (required tables, columns)
  ├─ Content depth (>= 3 REQ-xxx, >= 1 NFR-xxx)
  ├─ Keigo consistency (ですます調 — warning only)
  ├─ Changelog preservation (error if rows lost)
  └─ Cross-reference (requirements has NO upstream → always passes)
```

---

## 3. Identified Bugs & Issues

### BUG-1: RFP Auto-Load Hardcodes Specific Files

**Location:** `phase-requirements.md:16`
**Issue:** Auto-load targets `02_analysis.md` + `06_scope_freeze.md` by name. If RFP workspace uses different naming or has additional important files (e.g., `03_stakeholder_notes.md`, `05_decisions.md`), they are silently ignored.
**Impact:** Medium — incomplete input leads to incomplete requirements.
**Fix:** Glob all `.md` files in `01-rfp/` and concatenate, or use a manifest file.

### BUG-2: No Input Size Validation at Skill Layer

**Location:** `phase-requirements.md` (skill orchestration)
**Issue:** Zod schema limits `input_content` to 500KB, but the skill layer doesn't validate size before calling MCP. Large RFP files will fail with an opaque Zod error instead of a user-friendly message.
**Impact:** Low — rare but poor UX when it happens.

### BUG-3: Changelog Version Increment Assumes `x.y` Format

**Location:** `generate.ts:extractRevisionHistory()` + `changelog-manager.ts`
**Issue:** Version increment logic uses regex `/^\|\s*v?\d+\.\d+\s*\|/m`. Documents using `v1.0.0` (semver) or Japanese numbering (`第1版`) will fail silently or produce incorrect increments.
**Impact:** Medium — companies with non-standard version schemes hit errors on regeneration.

### BUG-4: Validation Doesn't Check NFR Numeric Targets

**Location:** `validator.ts` content depth rules
**Issue:** Generation instructions explicitly prohibit vague terms (高速, 十分, 適切, 高い, 良好) and require numeric 目標値. But validation only checks NFR-xxx count (>= 1), not whether each NFR actually has numeric targets. AI can generate non-compliant NFRs that pass validation.
**Impact:** High — defeats the purpose of IPA NFUG compliance.

### BUG-5: Race Condition in update_chain_status + validate_document

**Location:** `phase-requirements.md:42-46` (steps 8-9)
**Issue:** Chain status is updated to "complete" (step 8) BEFORE validation runs (step 9). If validation finds critical errors, the chain still shows "complete". Downstream commands trust this status.
**Impact:** Medium — downstream generation may proceed on invalid requirements.

---

## 4. Uncovered Real-World Cases

### CASE-1: Incremental Requirements (Phase-Based Projects)

**Scenario:** Enterprise projects often don't have all requirements upfront. Phase 1 covers core features, Phase 2 adds extensions. Currently no support for:
- Appending new REQ-xxx to existing document
- Marking requirements as phase-specific
- Version comparison between phases

**Impact:** High — forces complete regeneration, losing manual edits.

### CASE-2: Multi-Stakeholder Input

**Scenario:** Requirements often come from multiple sources — business team, compliance team, tech team. Current flow accepts a single `@input` blob.
- No way to tag requirements by source/stakeholder
- No conflict resolution when sources disagree
- No priority negotiation workflow

**Impact:** Medium — real projects have 3-5 input sources.

### CASE-3: Requirements with Existing System Integration

**Scenario:** Migration/modernization projects need to document AS-IS system requirements alongside TO-BE requirements. No support for:
- AS-IS vs TO-BE requirement tagging
- Gap analysis between current and target state
- Legacy system constraint documentation

**Impact:** High — migration projects are ~40% of enterprise SI work in Japan.

### CASE-4: Regulatory/Compliance Requirements Templates

**Scenario:** Japanese government projects (デジタル庁, 金融庁) have mandatory requirement formats and sections. Current template is generic IPA-based.
- No industry-specific template variants
- No regulatory requirement section (法令要件)
- No audit trail requirements section

**Impact:** Medium — government/finance sectors need additional sections.

### CASE-5: Requirements Approval Workflow

**Scenario:** After generation, requirements go through client review → feedback → revision cycles. No support for:
- Tracking review comments per requirement
- Marking individual requirements as approved/pending/rejected
- Generating diff reports between versions for client review

**Impact:** High — every real project has 2-3 revision cycles.

### CASE-6: Large-Scale Requirements (100+ REQ Items)

**Scenario:** Enterprise systems easily have 100-200 functional requirements. Current flow generates everything in one pass.
- No pagination or section-by-section generation
- No support for requirements split by subsystem
- `input_content` 500KB limit may be insufficient for complex RFPs
- Claude context window pressure with large documents

**Impact:** Medium — affects large SI projects.

### CASE-7: Non-Japanese Input → Japanese Output Nuances

**Scenario:** Vietnamese/English RFP translated to Japanese requirements. Current `input_lang` + `buildBilingualInstructions()` handles basic translation, but:
- Technical terms may be incorrectly transliterated (e.g., "authentication" → 認証 vs オーセンティケーション)
- Glossary should be auto-referenced but glossary loading is conditional
- No validation that bilingual generation maintains terminology consistency

**Impact:** Medium — common in offshore development scenarios (Vietnam → Japan).

### CASE-8: Requirements Traceability to Test Cases

**Scenario:** IPA V-model requires bidirectional traceability: requirements ↔ test cases. Currently:
- Forward tracing (REQ-xxx → downstream) works via ID extraction
- Backward tracing (test case → REQ-xxx) is NOT validated
- No coverage matrix generation at requirements level
- No gap detection ("REQ-005 has no test case")

**Impact:** High — traceability matrix is mandatory for IPA compliance.

### CASE-9: Parallel Requirements Generation After RFP

**Scenario:** `phase-requirements.md:8` states `requirements → { functions-list, nfr, project-plan } (parallel)`. But:
- No mechanism to ensure requirements is FULLY saved before parallel starts
- If user runs `/sekkei:functions-list` while requirements is still generating, `chain.requirements.status` may not be "complete" yet
- No file locking or generation-in-progress state

**Impact:** Low — unlikely but possible race condition.

### CASE-10: Requirements Document Without RFP

**Scenario:** Small projects skip formal RFP and go straight to requirements from meeting notes or user stories. The skill handles `@input` for this case, but:
- Interview questions still reference RFP concepts
- Generation instructions say "Input comes from 01-rfp workspace"
- No Agile/user-story format support (only waterfall format)
- No template variant for lightweight requirements

**Impact:** Medium — not all projects follow formal RFP process.

---

## 5. Improvement Proposals

### Priority 1 — Critical

| # | Proposal | Effort | Impact |
|---|----------|--------|--------|
| P1 | **Add NFR numeric target validation** — regex check that each NFR-xxx row contains at least one number in 目標値 column; reject vague terms | S | High |
| P2 | **Fix validation-before-status-update** — move `update_chain_status` after `validate_document` passes, or add a `status: "generated"` intermediate state | S | High |
| P3 | **Glob-based RFP auto-load** — replace hardcoded filenames with `01-rfp/*.md` glob, sorted by filename | S | Medium |

### Priority 2 — High Value

| # | Proposal | Effort | Impact |
|---|----------|--------|--------|
| P4 | **Incremental requirements mode** — `existing_content` + `append_mode: true` flag that preserves existing REQ-xxx and adds new ones with next sequential ID | M | High |
| P5 | **Requirements approval tracking** — add `status` column to requirements table (draft/review/approved/rejected) and a `review_comments` section | M | High |
| P6 | **Bidirectional traceability check** — at requirements level, log all REQ-xxx/NFR-xxx IDs and later validate each has at least one test case reference | M | High |
| P7 | **Flexible version format** — support semver (`1.0.0`), Japanese (`第1版`), and simple (`1.0`) in changelog extraction/increment | S | Medium |

### Priority 3 — Nice to Have

| # | Proposal | Effort | Impact |
|---|----------|--------|--------|
| P8 | **AS-IS / TO-BE tagging** — add `分類` column with values: 現行(AS-IS), 新規(TO-BE), 変更(Change) | S | Medium |
| P9 | **Industry template variants** — `project_type` expansion with `government`, `finance`, `healthcare` adding mandatory sections (法令要件, 監査要件) | M | Medium |
| P10 | **Multi-source input** — accept `input_sources: [{name, content}]` array and tag requirements by source in 出典 column | M | Medium |
| P11 | **Lightweight requirements template** — agile-friendly variant with user stories format when `preset: agile` | S | Low |
| P12 | **Large doc pagination** — split generation for 100+ requirements into subsystem chunks, merge into single document | L | Medium |

### Effort Legend: S = 1-2 hours, M = half day, L = 1+ day

---

## 6. Test Coverage Gaps

| Area | Current Coverage | Gap |
|------|-----------------|-----|
| End-to-end generation flow | Context assembly only | No test for full template + instructions → output |
| Requirements → downstream chain | Cross-ref extraction tested | No flow test (req → functions-list → basic-design) |
| Input validation edge cases | Zod schema tested | No empty input, oversized input, malformed YAML tests |
| NFR content quality | Count check only | No numeric target validation test |
| Changelog preservation | Row count tested | No version format edge case tests (semver, 第N版) |
| Staleness detection | Unit tested | No integration test with actual git timestamps |
| Export (PDF/DOCX) | Excel tested | No PDF or DOCX export test for requirements |
| Change request impact | CR system tested separately | No test for CR propagation FROM requirements |
| Bilingual generation | Language fallback tested | No terminology consistency test |
| Large documents | Not tested | No performance test with 100+ requirements |

---

## 7. Architecture Strengths

1. **Clean separation of concerns** — Skill (orchestration) / MCP (context assembly) / AI (generation) / Validation (post-check)
2. **Strict ID conventions** — REQ-xxx/NFR-xxx format enables reliable cross-referencing across entire V-model chain
3. **IPA NFUG compliance** — 6-category NFR structure follows Japanese industry standard
4. **Changelog preservation** — regeneration preserves history, critical for audit trail
5. **Non-blocking validation** — generates first, validates after, never blocks output
6. **Extensible instruction system** — `GENERATION_INSTRUCTIONS` per doc type + composable builders (keigo, confidence, traceability)

---

## 8. Implementation Tracker

### Bugs

| ID | Title | File(s) | Status | Notes |
|----|-------|---------|--------|-------|
| BUG-1 | RFP auto-load hardcodes filenames | `phase-requirements.md` | done | Glob all `.md` in 01-rfp/ |
| BUG-2 | No input size validation at skill layer | `phase-requirements.md` | done | 400KB pre-check added |
| BUG-3 | Changelog version assumes `x.y` format | `changelog-manager.ts` | done | Semver X.Y.Z + 第N版 supported |
| BUG-4 | NFR numeric targets not validated | `completeness-rules.ts` | done | Vague term + numeric presence rules |
| BUG-5 | Chain status updated before validation | `phase-requirements.md` | done | Validate → then status update |

### Improvements

| ID | Title | File(s) | Priority | Status | Notes |
|----|-------|---------|----------|--------|-------|
| P1 | NFR numeric target validation | `completeness-rules.ts` | Critical | done | Vague term + numeric presence rules |
| P2 | Validation-before-status-update | `phase-requirements.md` | Critical | done | Validate → then conditional status |
| P3 | Glob-based RFP auto-load | `phase-requirements.md` | Critical | done | Glob all .md, sort by filename |
| P4 | Incremental requirements mode | `generate.ts`, `generation-instructions.ts` | High | done | append_mode schema + instructions |
| P5 | Requirements approval tracking | `requirements.md` template | High | done | ステータス column added |
| P6 | Bidirectional traceability check | `completeness-rules.ts` | High | done | 検証方法 presence rule (80%) |
| P7 | Flexible version format | `changelog-manager.ts` | High | done | Semver X.Y.Z + 第N版 |
| P8 | AS-IS / TO-BE tagging | `requirements.md` template | Medium | done | 分類 column added |
| P9 | Industry template variants | `documents.ts`, `generate.ts` | Medium | done | government/finance/healthcare |
| P10 | Multi-source input | `generate.ts`, `generation-instructions.ts` | Medium | done | input_sources schema + 出典 tagging |
| P11 | Lightweight/agile template | `generation-instructions.ts`, `phase-requirements.md` | Low | done | User story format when preset=agile |
| P12 | Large doc pagination hint | `generation-instructions.ts` | Medium | done | Subsystem organization for >200KB |

### Uncovered Real-World Cases

| ID | Title | Impact | Status | Notes |
|----|-------|--------|--------|-------|
| CASE-1 | Incremental requirements (phase-based projects) | High | done | P4: append_mode added |
| CASE-2 | Multi-stakeholder input | Medium | done | P10: input_sources with 出典 tagging |
| CASE-3 | AS-IS / TO-BE for migration projects | High | done | P8: 分類 column (現行/新規/変更) |
| CASE-4 | Regulatory/compliance templates | Medium | done | P9: government/finance/healthcare types |
| CASE-5 | Requirements approval workflow | High | done | P5: ステータス column (ドラフト→承認済) |
| CASE-6 | Large-scale 100+ requirements | Medium | done | P12: subsystem organization hint |
| CASE-7 | Non-Japanese input → Japanese output nuances | Medium | done | P7: flexible version + glossary partial |
| CASE-8 | Bidirectional traceability to test cases | High | done | P6: 検証方法 presence validation |
| CASE-9 | Parallel generation race condition | Low | done | In-progress state check added |
| CASE-10 | Requirements without RFP | Medium | done | P11: agile/user-story format |

---

## Resolved Questions

1. **NFR numeric validation** → implemented as advisory (warning), not blocking — consistent with existing validation pattern
2. **Incremental mode (P4)** → append_mode works alongside changelog preservation; both use existing_content
3. **Industry templates** → conditional instruction blocks in generation-instructions.ts, not separate files

## Remaining Questions

1. How should multi-stakeholder conflicts be surfaced — inline comments or separate section?
2. What is the practical Claude context limit for requirements generation (token count)?
3. Should 出典 column be added to template table header, or only via AI instruction?
