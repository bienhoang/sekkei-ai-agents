# Architecture Analysis: sekkei:functions-list (機能一覧)

> Date: 2026-02-25 | Scope: End-to-end architecture of the functions-list generation pipeline

## 1. Architecture Overview

### Data Flow

```
User runs /sekkei:functions-list @input
  │
  ▼
┌─────────────────────────────────────────────┐
│  SKILL LAYER (packages/skills/)             │
│  phase-requirements.md → Interview (3 Qs)   │
│  → Read upstream requirements               │
│  → Call generate_document MCP tool           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  MCP TOOL LAYER (tools/generate.ts)         │
│  1. Validate doc_type, reject scope param   │
│  2. Resolve template path                   │
│  3. Load GENERATION_INSTRUCTIONS             │
│  4. Extract upstream IDs (REQ-xxx)          │
│  5. Apply KEIGO_MAP → 丁寧語               │
│  6. Return assembled context string         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  TEMPLATE LAYER (templates/ja/)             │
│  functions-list.md → 7 sections, 11 cols    │
│  AI comments embedded for generation rules  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  AI GENERATION (LLM)                        │
│  Generates markdown with F-xxx IDs          │
│  Saves to 04-functions-list/functions-list.md│
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  POST-GENERATION                            │
│  1. update_chain_status (functions_list)     │
│  2. validate_document                       │
│  3. Count 大分類 → split mode prompt (≥3)   │
│  4. If split: create feature dirs + manifest│
└─────────────────────────────────────────────┘
```

### Chain Position (V-Model)

```
             requirements
            /     |      \
     nfr   functions-list  project-plan
            |    |    |   \    \     \
      basic-design  detail-design  st-spec  crud-matrix  sitemap  test-plan
```

**Upstream:** `requirements` (provides REQ-xxx IDs)
**Downstream (8 docs):** basic-design, detail-design, project-plan, st-spec, crud-matrix, sitemap, test-plan, traceability-matrix

---

## 2. Component Breakdown

### Layer 1: Skill Definition

| File | Role |
|------|------|
| `packages/skills/content/SKILL.md` | Command registration: `/sekkei:functions-list @input` |
| `packages/skills/content/references/phase-requirements.md` | 12-step workflow with interview, generation, validation, split-mode |
| `packages/skills/content/references/doc-standards.md` | Column format spec, ID prefix table |
| `packages/skills/content/references/v-model-guide.md` | REQ→F→SCR traceability chain |

**Workflow (12 steps):**
1. Interview (subsystems, batch jobs, priority scheme)
2. Read upstream requirements
3. Call `generate_document` with `doc_type: "functions-list"`
4. AI generates 3-tier hierarchy, 10+ functions, cross-ref REQ-xxx
5. Save to `04-functions-list/functions-list.md`
6. Call `update_chain_status`
7. Call `validate_document`
8. Count 大分類 groups
9. If ≥3: prompt split mode
10-12. If split confirmed: create dirs, write `_index.yaml` manifest

### Layer 2: MCP Tool Handler

| File | Role |
|------|------|
| `packages/mcp-server/src/tools/generate.ts` | Main handler — `handleGenerateDocument` |
| `packages/mcp-server/src/lib/generation-instructions.ts` | 8 AI instruction lines for functions-list |
| `packages/mcp-server/src/lib/resolve-output-path.ts` | Maps to `04-functions-list/functions-list.md` |

**Key behaviors:**
- `scope` param rejected — `functions-list` not in `SPLIT_ALLOWED`
- Upstream IDs extracted via `extractAllIds()` → injected as context
- Keigo forced to `丁寧語` (ですます調)

### Layer 3: Template

| File | Details |
|------|---------|
| `packages/mcp-server/templates/ja/functions-list.md` | YAML frontmatter (7 sections), 11-column table |

**Sections:** revision-history, approval, distribution, glossary, project-info, functions-table, summary

**Table columns (11):** No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考

**Processing types:** 入力 / 照会 / 帳票 / バッチ (4 types only)

### Layer 4: Validation

| File | What it checks |
|------|----------------|
| `src/lib/validator.ts` | Required sections: `[改訂履歴, 承認欄, 配布先, 用語集, 機能一覧]` |
| `src/lib/validator.ts` | Required columns: `[大分類, 中分類, 機能ID, 機能名, 関連要件ID]` (5 of 11) |
| `src/lib/completeness-rules.ts` | Content depth: regex `/\|\s*F-\d{3}/` → warning severity only |
| `src/lib/keigo-validator.ts` | Keigo: enterprise/standard→丁寧語, agile→常体 |
| `src/lib/structure-validator.ts` | Directory: expects `04-functions-list/` |

### Layer 5: Chain Integration

| File | Role |
|------|------|
| `src/lib/cross-ref-linker.ts` | 8 downstream chain pairs from functions-list |
| `src/lib/id-extractor.ts` | Extracts `F-xxx` + custom `[A-Z]{2,5}-NNN` into OTHER bucket |
| `src/lib/staleness-detector.ts` | F-xxx change → marks [functions-list, basic-design] stale |
| `src/lib/plan-state.ts` | `assembleUpstream` reads both requirements + functions-list |
| `src/lib/doc-staleness.ts` | Tracks `functions_list` (underscore) in staleness path |

---

## 3. Strengths

1. **Well-defined chain position** — clear upstream (requirements) and 8 downstream consumers
2. **Embedded AI comments in template** — generation rules live with the template, not scattered
3. **Split-mode detection** — automatic prompt when ≥3 feature groups detected
4. **Cross-reference extraction** — `extractAllIds()` constrains downstream docs to valid IDs
5. **Keigo enforcement** — per-project-type keigo level prevents style mixing
6. **Staleness propagation** — F-xxx changes automatically flag dependent docs

---

## 4. Identified Bugs

### BUG-1: ID Format Inconsistency (Critical)

**Conflict between 3 sources:**

| Source | Says |
|--------|------|
| `generation-instructions.ts:14` | `F-001, F-002... sequential, NOT prefix-based` |
| `phase-requirements.md:68` | `[PREFIX]-001 (derive prefix from 大分類)` |
| `doc-standards.md` | `F- or subsystem prefix`, example: `SAL-001` |

**Impact:** AI receives contradictory instructions. MCP tool says "F-001 sequential", but skill layer says "[PREFIX]-001 from 大分類". The `id-extractor.ts` catches custom prefixes (SAL-001) into an "OTHER" bucket, but the completeness check (`completeness-rules.ts:46`) only validates `/\|\s*F-\d{3}/` — so custom-prefix IDs like SAL-001 would **pass extraction but fail completeness check**.

**Fix:** Align all 3 sources. Recommend: keep `F-001` as default, allow `[PREFIX]-001` as opt-in via config. Update completeness regex to also match custom prefixes.

### BUG-2: Chain Key Naming Mismatch

**Two naming conventions coexist:**

| Context | Key used |
|---------|----------|
| MCP tool params (`doc_type`) | `"functions-list"` (hyphen) |
| Config YAML chain key | `functions_list` (underscore) |
| `update_chain_status` in skill flow | `doc_type: "functions_list"` (underscore) |
| `doc-staleness.ts` | `chain.functions_list` (underscore) |

**Impact:** The skill flow passes `functions_list` (underscore) to `update_chain_status`, but the MCP tool schema uses `DocType` enum which only accepts `functions-list` (hyphen). If the tool handler doesn't normalize, this could silently fail or throw a Zod validation error.

**Fix:** Audit `update_chain_status` handler — add normalization (underscore→hyphen) or document the correct convention clearly.

### BUG-3: Validation Gap — Required Columns Incomplete

**Validator checks only 5 of 11 columns:** `[大分類, 中分類, 機能ID, 機能名, 関連要件ID]`

**Missing from validation:** 機能概要, 処理分類, 優先度, 難易度, 備考, No.

**Impact:** A generated document could pass validation with empty 処理分類 or 優先度 columns. These are business-critical fields — a functions-list without priority assignments is unusable for project planning.

**Fix:** Add 処理分類 and 優先度 to required columns at minimum. Consider adding a content-depth rule that validates enum values (入力/照会/帳票/バッチ for 処理分類, 高/中/低 for 優先度).

---

## 5. Uncovered Real-World Cases

### CASE-1: API-Centric Systems (Microservices)

**Gap:** Processing types limited to 入力/照会/帳票/バッチ. Modern systems need:
- **API** — REST/GraphQL endpoints
- **WebSocket** — real-time bidirectional
- **イベント** — event-driven (Kafka, SQS)
- **スケジューラ** — cron/scheduled jobs
- **Webhook** — external callbacks

**Impact:** API gateway or microservice projects can't accurately classify ~60% of their functions.

### CASE-2: Multi-Tenant SaaS

**Gap:** No column for tenant isolation level or feature flags. In multi-tenant SaaS:
- Some functions are tenant-specific (custom workflow)
- Some are shared (billing, auth)
- Feature flags control availability per plan tier

**Impact:** Functions-list can't express "this function exists only for Enterprise tier" — critical for SaaS scoping.

### CASE-3: Large-Scale Projects (100+ Functions)

**Gap:** Template generates a flat table. At 100+ rows:
- Markdown table becomes unreadable
- Split mode only creates per-feature *directories*, doesn't split the functions-list itself
- No pagination, sub-tables, or section-per-大分類 support

**Impact:** Enterprise projects with 5+ subsystems produce a single 200+ row table that's impractical to review.

### CASE-4: Agile/Iterative Projects

**Gap:** No sprint/iteration column. The `preset: agile` config only affects keigo (常体 instead of 丁寧語) but doesn't change the table structure.

Missing for agile teams:
- Sprint/iteration assignment
- Story points or T-shirt sizing
- Epic/theme grouping
- MVP vs later-phase tagging

### CASE-5: Mobile + Cross-Platform

**Gap:** No platform column. A mobile app project needs to distinguish:
- iOS-only functions
- Android-only functions
- Shared (cross-platform)
- Web admin-only
- Backend/API functions

Functions with the same name (e.g., "プッシュ通知設定") may have different implementations per platform.

### CASE-6: Migration/Legacy Modernization

**Gap:** No status column for migration phase. Legacy modernization projects need:
- AS-IS (current legacy function)
- TO-BE (new implementation)
- 廃止 (deprecated/removed)
- 移行対象 (migration target)
- 新規 (net-new)

Without this, the functions-list can't serve as a migration tracking tool.

### CASE-7: Non-Functional Functions (Infrastructure)

**Gap:** Processing types assume business logic only. Missing infrastructure functions:
- Monitoring/alerting
- Log aggregation
- Backup/restore
- CI/CD pipeline operations
- Health check endpoints

These are critical functions that need tracking but don't fit 入力/照会/帳票/バッチ.

### CASE-8: External System Integration

**Gap:** No column for external system dependency. Real projects need to track:
- Which external API each function depends on
- Integration pattern (sync/async/file-based)
- SLA dependency chain

This is crucial for risk assessment and test planning.

---

## 6. Improvement Proposals

### P1 (Critical) — Fix ID Format Inconsistency

**Priority:** Critical | **Effort:** 1h | **Files:** 3

Align `generation-instructions.ts`, `phase-requirements.md`, `doc-standards.md` to a single convention:
- Default: `F-001` (sequential)
- Optional: `[PREFIX]-001` when `split_id_prefix: true` in config
- Update `completeness-rules.ts` regex to `/\|\s*([A-Z]{1,5})-\d{3}/`

### P2 (Critical) — Fix Chain Key Normalization

**Priority:** Critical | **Effort:** 30min | **Files:** 2

Add key normalization in `update_chain_status` handler:
```
doc_type = doc_type.replace(/_/g, "-")
```
Or update skill flow to always pass hyphenated form. Document the convention.

### P3 (High) — Expand Processing Types

**Priority:** High | **Effort:** 2h | **Files:** 4

Add to template and generation instructions:
```
処理分類: 入力/照会/帳票/バッチ/API/イベント/スケジューラ/Webhook
```

Update:
- `templates/ja/functions-list.md` — AI comment
- `generation-instructions.ts` — instruction text
- `completeness-rules.ts` — add enum validation rule
- `doc-standards.md` — reference table

### P4 (High) — Strengthen Validation

**Priority:** High | **Effort:** 2h | **Files:** 2

Add to `validator.ts` and `completeness-rules.ts`:
1. Required columns: add 処理分類, 優先度 to the check
2. Enum validation: 処理分類 must be one of valid values
3. Count check: at least 10 functions (matches generation instruction)
4. REQ-xxx cross-ref: every F-xxx must have ≥1 REQ-xxx in 関連要件ID
5. Duplicate ID check: no two rows with same 機能ID

### P5 (Medium) — Section-Per-大分類 for Large Projects

**Priority:** Medium | **Effort:** 3h | **Files:** 3

When function count > 30, auto-split the table by 大分類:
```markdown
## 機能一覧表 — ユーザー管理
| No. | 中分類 | 機能ID | ... |

## 機能一覧表 — 受注管理
| No. | 中分類 | 機能ID | ... |
```

This keeps each sub-table readable while maintaining one file.

### P6 (Medium) — Optional Extended Columns

**Priority:** Medium | **Effort:** 2h | **Files:** 3

Support optional columns via config:
```yaml
# sekkei.config.yaml
functions_list:
  extra_columns: [platform, sprint, external_system]
```

Available extensions:
- `platform`: iOS/Android/Web/Backend/Shared
- `sprint`: Sprint/iteration number
- `external_system`: External API dependency
- `migration_status`: AS-IS/TO-BE/新規/廃止
- `feature_flag`: Feature flag name for SaaS

### P7 (Medium) — Export Optimization for 11-Column Table

**Priority:** Medium | **Effort:** 2h | **Files:** 2

Add functions-list specific export config:
- Excel: auto-column-width, freeze header row, alternating row colors
- PDF: landscape orientation for 11 columns
- Add column-width hints to template frontmatter

### P8 (Low) — Summary Section Enhancement

**Priority:** Low | **Effort:** 1h | **Files:** 2

Enhance 集計 section with:
- Count by 処理分類 (not just 優先度)
- REQ coverage metric: `{matched REQ count}/{total REQ count}`
- Complexity index: weighted score from 難易度 distribution
- This provides project managers with an at-a-glance assessment

---

## 7. Test Coverage Assessment

| Area | Test File | Coverage |
|------|-----------|----------|
| Template loading | `tools.test.ts` | OK — get_template returns 機能一覧 |
| Generation context | `tools.test.ts` | OK — returns instructions |
| Scope rejection | `tools.test.ts` | OK — scope param rejected |
| Section validation | `validator.test.ts` | OK — required sections |
| Column validation | `validator.test.ts` | OK — required columns |
| Completeness (F-xxx) | `completeness-checker.test.ts` | Partial — only checks F-xxx regex |
| Cross-ref graph | `cross-ref-linker.test.ts` | OK — orphaned F-xxx detection |
| Staleness | `staleness-detector.test.ts` | OK — F-xxx change propagation |
| Plan split detection | `plan-tool.test.ts` | OK — ≥3 headers triggers split |
| Upstream assembly | `plan-state.test.ts` | OK — includes functions-list |

**Gaps:**
- No test for custom-prefix IDs (SAL-001) in validation flow
- No test for 処理分類/優先度 enum values
- No test for duplicate 機能ID detection
- No integration test for full generate→validate→chain-update flow

---

## 8. File Reference Map

```
packages/mcp-server/
├── templates/ja/functions-list.md          # Template (11-col table)
├── src/
│   ├── tools/generate.ts                   # Tool handler
│   ├── tools/plan-actions.ts               # Split mode detection
│   ├── lib/
│   │   ├── generation-instructions.ts:11   # AI instructions (8 lines)
│   │   ├── validator.ts:39                 # Required sections
│   │   ├── completeness-rules.ts:46        # F-xxx depth rule
│   │   ├── keigo-validator.ts              # 丁寧語 enforcement
│   │   ├── cross-ref-linker.ts:16          # 8 downstream pairs
│   │   ├── id-extractor.ts:8              # F prefix + OTHER bucket
│   │   ├── staleness-detector.ts           # F-xxx change impact
│   │   ├── resolve-output-path.ts          # → 04-functions-list/
│   │   ├── plan-state.ts                   # upstream assembly
│   │   └── structure-validator.ts          # dir structure check
│   └── types/documents.ts                  # DocType enum, PHASE_MAP
├── tests/unit/
│   ├── tools.test.ts                       # Template + generation tests
│   ├── validator.test.ts                   # Section + column tests
│   ├── completeness-checker.test.ts        # F-xxx depth tests
│   ├── cross-ref-linker.test.ts            # Chain pair tests
│   ├── staleness-detector.test.ts          # Staleness propagation
│   ├── plan-tool.test.ts                   # Split mode detection
│   └── plan-state.test.ts                  # Upstream assembly
packages/skills/
├── content/SKILL.md                        # Command registration
├── content/references/
│   ├── phase-requirements.md:55            # 12-step workflow
│   ├── doc-standards.md                    # Column spec, ID table
│   ├── v-model-guide.md                    # Traceability chain
│   ├── phase-design.md                     # basic-design reads FL
│   ├── phase-supplementary.md              # crud-matrix, sitemap
│   └── phase-test.md                       # st-spec reads FL
```

---

## 9. Unresolved Questions

1. **Should custom ID prefixes be first-class?** Current design treats SAL-001 as "OTHER". If we want split-mode features to have their own prefix, the completeness rule, staleness detector, and cross-ref linker all need updates.

2. **What about functions-list versioning?** When a change request adds functions, the current system regenerates the entire document. Should we support incremental updates (append-only) to preserve human review approvals on existing rows?

3. **Is the 10-function minimum appropriate for all project types?** A small microservice might have only 5-6 functions. Should this be configurable per project type?

4. **Should functions-list support hierarchical IDs?** E.g., `F-001-01` for sub-functions of F-001. Current regex only matches `F-NNN` (1-4 digits), no nested format.

---

## 10. Implementation Tracker

### Bugs

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-1 | ID format inconsistency (F-001 vs [PREFIX]-001) | Critical | completed | Aligned to F-001 default, custom prefix opt-in |
| BUG-2 | Chain key naming mismatch (underscore vs hyphen) | Critical | completed | Auto-normalize hyphens to underscores |
| BUG-3 | Validation checks only 5/11 columns | Medium | completed | Added 処理分類, 優先度 (now 7 columns) |

### Improvements

| ID | Title | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| P1 | Fix ID format — align 3 sources | Critical | completed | Regex accepts [A-Z]{1,5}-\d{3} |
| P2 | Fix chain key normalization | Critical | completed | Both hyphen/underscore accepted |
| P3 | Expand processing types (+4 types) | High | completed | 8 types across 4 files |
| P4 | Strengthen validation (enum, count, dedup) | High | completed | 5 new completeness rules |
| P5 | Section-per-大分類 for large projects | Medium | completed | Instruction + template comment |
| P6 | Optional extended columns via config | Medium | completed | functions_list.extra_columns config |
| P7 | Export optimization for 11-col table | Medium | completed | export_hints in frontmatter |
| P8 | Summary section enhancement | Low | completed | 処理分類 count + REQ coverage |

### Uncovered Real-World Cases

| ID | Case | Status | Resolution |
|----|------|--------|------------|
| CASE-1 | API-centric / microservices | completed | Covered by P3 |
| CASE-2 | Multi-tenant SaaS | completed | Covered by P6 (feature_flag column) |
| CASE-3 | Large-scale 100+ functions | completed | Covered by P5 |
| CASE-4 | Agile/iterative projects | completed | Covered by P6 (sprint column) |
| CASE-5 | Mobile / cross-platform | completed | Covered by P6 (platform column) |
| CASE-6 | Migration / legacy modernization | completed | Covered by P6 (migration_status) |
| CASE-7 | Non-functional / infrastructure | completed | Covered by P3 |
| CASE-8 | External system integration | completed | Covered by P6 (external_system) |
