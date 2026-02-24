# V-Model Chain Restructuring: Templates & SKILL.md Structure Analysis

**Date:** 2026-02-23 | **Report:** researcher-02-templates-and-skill-structure

## Executive Summary

Sekkei v1.1.0 already has 16 template types. The current **test-spec.md monolith** contains 4 test levels (UT/IT/ST/UAT) that should split into separate templates. The **overview.md content is already separate** — requirements.md absorbs it via `1. 概要` section. The SKILL.md pattern supports adding new doc types incrementally. Restructuring requires minimal changes: 4 new test templates + updated schema + split config logic.

---

## 1. Test-Spec Template Structure (Current Monolith)

**File:** `sekkei/packages/mcp-server/templates/ja/test-spec.md` (126 lines)

**Current YAML Frontmatter (5 sections declared):**
```yaml
sections:
  - revision-history      # Boilerplate (署名欄) — SHARED
  - approval              # Boilerplate (承認欄) — SHARED
  - distribution          # Boilerplate (配布先) — SHARED
  - glossary              # Boilerplate (用語集) — SHARED
  - test-design           # Section 1: Overview + Strategy + Environment — SHARED
  - test-cases            # Section 2: 2.1-2.4 split by level — PER-LEVEL
  - traceability          # Section 3: Mapping table — COULD BE SHARED OR PER-LEVEL
  - defect-report         # Section 4: Defect template — SHARED/PER-LEVEL
```

**Content Breakdown:**
- **Shared sections (should not split):** revision-history, approval, distribution, glossary
  - These are document administration — common to all test spec variants
- **Test Design (Section 1):** Covers all 4 levels in unified strategy table (1.2)
  - Tables 1.1 (overview), 1.2 (strategy), 1.3 (environment) apply to ALL test levels
  - Could be SHARED across all 4 test specs
- **Test Cases (Section 2):** **PRIMARY SPLIT POINT**
  - 2.1 単体テスト (UT) — Unit Test spec (5+ cases per module)
  - 2.2 結合テスト (IT) — Integration Test spec (API + screen transitions)
  - 2.3 システムテスト (ST) — System Test spec (E2E scenarios, performance, security)
  - 2.4 受入テスト (UAT) — User Acceptance Test spec (business scenarios)
  - **Each subsection has identical structure:** columns for ID/target/aspect/precondition/steps/input/expected/result/verdict/defect/notes
  - **Proposal:** Split into 4 separate templates, each containing only its level
- **Traceability (Section 3):** Maps REQ-xxx → F-xxx → SCR-xxx → UT/IT/ST/UAT-xxx
  - **Strategy:** Keep in test-spec, but per-level (UT-focused for UT-spec, etc.)
  - OR make it a shared summary across all test specs
- **Defect Report (Section 4):** Template table for testers
  - Could be shared or per-level (likely shared, since defects span all levels)

**Proposed 4 Test Templates:**
```
test-spec-unit.md              # UT cases + defect template
test-spec-integration.md       # IT cases + defect template
test-spec-system.md            # ST cases + defect template + full traceability
test-spec-acceptance.md        # UAT cases + defect template
```

---

## 2. Overview Template Structure (Already Separate)

**File:** `sekkei/packages/mcp-server/templates/ja/overview.md` (59 lines)

**YAML Frontmatter (5 sections declared):**
```yaml
sections:
  - project-summary         # 1. プロジェクト概要
  - business-goals          # 2. ビジネス目標
  - system-scope            # 3. システムスコープ
  - stakeholders            # 4. ステークホルダー
  - architecture-overview   # 5. アーキテクチャ概要
```

**Key Finding:** Overview is a **standalone presales document**, NOT merged into requirements. It answers the "why" and "who" at 30,000 feet level.

**Design Pattern:** Overview is input to requirements generation, but they remain separate docs. The requirement template has a distinct "1. 概要" section (1.1-1.4) that **absorbs only portions** of overview (background, scope summary). Requirements adds deeper content (current state problems, detailed constraints).

**No Action Needed:** Overview is correctly positioned as a separate doc type. It's not a split variant — it's a prerequisite doc in the chain.

---

## 3. Requirements Template Structure (Absorbs Overview Context)

**File:** `sekkei/packages/mcp-server/templates/ja/requirements.md` (198 lines)

**YAML Frontmatter (13 sections declared):**
```yaml
sections:
  - revision-history        # Shared boilerplate
  - approval                # Shared boilerplate
  - distribution            # Shared boilerplate
  - glossary                # Shared boilerplate (extracted from content)
  - cover                   # Title page
  - overview                # 1. 概要 (absorbs overview.md context + deeper analysis)
  - current-problems        # 2. 現状課題 (unique to requirements)
  - requirements-definition # 3. 要件の定義 (core + largest section)
  - constraints             # 4. 制約条件・前提条件
  - acceptance-criteria     # 5. 受け入れ基準
  - out-of-scope            # 6. 対象外・今後の検討事項
  - glossary                # 7. 用語定義・参考資料
  - appendices              # 8. 附録
```

**Content Strategy:**
- **Overview section (1.1-1.4)** incorporates:
  - 1.1: Background/purpose (from overview 1.プロジェクト概要)
  - 1.2: Project info (new to requirements)
  - 1.3: Target org/business (new)
  - 1.4: Constraints (synthesized from overview scope + technical constraints)
- **Current Problems (Section 2)** is **unique to requirements:**
  - 2.1: Current system config
  - 2.2: Current business flow
  - 2.3: Pain points & risks
  - 2.4: Improvement targets
- **Requirements Definition (Section 3):** Largest section
  - Functional (REQ-xxx), Non-functional (NFR-xxx)
  - Maps to F-xxx from functions-list
  - Cross-references to downstream design
- **Constraints & Acceptance:** Binding criteria
- **Appendices:** Use cases, business rules, integration specs

**Design Pattern:** Requirements template uses overview as **input context**, not merge target. Sections 1.1-1.4 are written from scratch with overview content in mind, then detailed constraints/problems are added in sections 2-4.

---

## 4. SKILL.md Structure & Pattern for Adding Doc Types

**File:** `sekkei/packages/skills/content/SKILL.md` (First 200 lines)

**Command Pattern (32 sub-commands declared):**
```
/sekkei:rfp @project-name
/sekkei:functions-list @input
/sekkei:requirements @input
/sekkei:basic-design @input
/sekkei:detail-design @input
/sekkei:test-spec @input              ← MONOLITH (to be split)

/sekkei:matrix                        ← No @input (uses config)
/sekkei:sitemap @input
/sekkei:operation-design @input
/sekkei:migration-design @input

/sekkei:validate @doc
/sekkei:status
/sekkei:export @doc --format=xlsx|pdf|docx
/sekkei:translate @doc --lang=en
/sekkei:glossary [add|list|find|export]
/sekkei:update @doc
/sekkei:diff-visual @before @after
/sekkei:plan @doc-type
/sekkei:implement @plan-path
/sekkei:preview
/sekkei:version
/sekkei:uninstall
/sekkei:rebuild
```

**Workflow Router Pattern:**
1. Each sub-command has a dedicated section starting with `### /sekkei:{command-name}`
2. Contains:
   - **Interview questions** (ask user before generating)
   - **Numbered steps** (read input → load config → call MCP → save → update chain status)
   - **Inline rules** (ID format, table structure, required sections)
   - **References** (inline to supporting docs like `references/rfp-command.md`)
   - **Prompts to user** (e.g., "Split mode enabled?")

**Pattern for Adding New Doc Type:**

1. **Add template file:** `sekkei/packages/mcp-server/templates/ja/{new-type}.md`
   - Define YAML frontmatter with `doc_type: {new-type}` and `sections: [...]`
   - Include AI instructions as HTML comments
2. **Add generation handler:** Extend `src/tools/generate.ts`
   - Add Zod schema for new doc_type to enum
   - Implement generation logic (prompt construction, template merge)
3. **Add SKILL.md section:**
   - Create `### /sekkei:{new-command-name} [@input]` section
   - List interview questions, numbered steps, rules, references
   - Define expected output file name and chain status update
4. **Update config schema:** Add entry to `sekkei.config.yaml` chain block
   - Status tracking: `{new-type}.status: pending|in-progress|complete`
   - Output file path tracking (if separate from default)
5. **Update chain flow:**
   - Modify `/sekkei:status` to list new doc type
   - Update `functions-list` logic to optionally trigger new doc generation

**Key Insight:** SKILL.md is **self-documenting contract** — it defines user-facing workflows AND constraints for MCP implementation. Adding new types requires updating both template layer (MD files) and tool layer (TS), with SKILL.md as the alignment spec.

---

## 5. Structure Validator & Required Config

**File:** `sekkei/packages/mcp-server/src/lib/structure-validator.ts` (89 lines)

**Required Files (hardcoded):**
```javascript
const REQUIRED_FILES = [
  "01-overview.md",          // Overview or first-doc placeholder
  "02-requirements.md",      // Requirements or initial requirements
  "04-functions-list.md",    // Functions list
  "10-glossary.md",          // Glossary
];
```

**Required Directories (hardcoded):**
```javascript
const REQUIRED_DIRS = [
  "03-system",               // System architecture (split mode)
  "05-features",             // Features (split mode)
  "06-data",                 // Data design (split mode)
  "07-operations",           // Operations/testing (split mode)
  "08-test",                 // Test specs (split mode)
  "09-ui",                   // UI/screens (split mode)
];
```

**Current Logic:**
- Validates numbered prefix (01-, 02-, etc.)
- Ensures each required DIR contains `index.md`
- Feature folders in `05-features/` must be kebab-case
- Forbids version suffixes (-v1, -final, etc.)
- Forbids non-ASCII filenames

**Impact on Restructuring:**
- Adding 4 test-spec variants: Create `08-test/01-unit.md`, `08-test/02-integration.md`, `08-test/03-system.md`, `08-test/04-acceptance.md` directory structure
- OR keep flat: `08-test-unit.md`, `08-test-integration.md`, etc. (numbered 08, 09, 10, 11?)
- **Decision needed:** Split mode directory nesting vs. flat numeral progression

---

## Summary Table: Content Distribution for Test-Spec Split

| Section | Current | Unit-Spec | Integration-Spec | System-Spec | Acceptance-Spec | Strategy |
|---------|---------|-----------|------------------|-------------|-----------------|----------|
| Revision History | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate (boilerplate) |
| Approval | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate (boilerplate) |
| Distribution | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate (boilerplate) |
| Glossary | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate (boilerplate) |
| Test Strategy (1.1-1.3) | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate or link to shared |
| UT Cases (2.1) | ✓ | ✓ | - | - | - | Move to unit-spec only |
| IT Cases (2.2) | ✓ | - | ✓ | - | - | Move to integration-spec only |
| ST Cases (2.3) | ✓ | - | - | ✓ | - | Move to system-spec only |
| UAT Cases (2.4) | ✓ | - | - | - | ✓ | Move to acceptance-spec only |
| Traceability (3) | ✓ | ✓ (UT focus) | ✓ (IT focus) | ✓ (full) | ✓ (UAT focus) | Per-spec traceability |
| Defect Report (4) | ✓ | ✓ | ✓ | ✓ | ✓ | Duplicate or shared |

---

## Key Files to Modify for Restructuring

1. **Template Files (NEW):**
   - `sekkei/packages/mcp-server/templates/ja/test-spec-unit.md`
   - `sekkei/packages/mcp-server/templates/ja/test-spec-integration.md`
   - `sekkei/packages/mcp-server/templates/ja/test-spec-system.md`
   - `sekkei/packages/mcp-server/templates/ja/test-spec-acceptance.md`
   - DELETE or repurpose: `sekkei/packages/mcp-server/templates/ja/test-spec.md`

2. **MCP Server (TypeScript):**
   - `src/tools/generate.ts` — Add handlers for 4 new doc_types
   - `src/types/documents.ts` — Add enum entries for test types
   - `src/lib/id-extractor.ts` — If UT/IT/ST/UAT IDs need dedicated extractors

3. **SKILL.md:**
   - Replace `/sekkei:test-spec @input` with 4 new commands
   - Add interview questions for each test level
   - Update workflow router to handle split mode for test specs

4. **Config Schema (sekkei.config.yaml):**
   - Add entries for test-spec-unit, test-spec-integration, etc. in chain section
   - Update split config to specify test-spec behavior (shared strategy + per-level cases)

5. **Structure Validator (OPTIONAL):**
   - If adopting directory nesting: Update REQUIRED_DIRS and feature folder validation
   - If keeping flat: Ensure numbered file rules accommodate 08-11 range for test specs

---

## Unresolved Questions

1. **Test-Spec Boilerplate Duplication:** Should shared sections (revision-history, approval, glossary, test-strategy) be:
   - a) Duplicated in all 4 templates (current approach, DRY violation)?
   - b) Included in a shared template file that is composed into each?
   - c) Generated once and referenced by all test specs?

2. **Traceability Matrix Placement:** Should it be:
   - a) Per-spec (each test-spec maps only its level's test cases to requirements)?
   - b) Shared across all test specs (generated once, linked from all)?
   - c) Moved to a dedicated `traceability-matrix.md` doc (already exists in templates!)?

3. **Defect Report Template:** Should defect tracking:
   - a) Exist in all 4 test specs (easier for testers, duplicates structure)?
   - b) Exist only in test-spec-system (central repository)?
   - c) Exist in a separate `defect-log.md` document?

4. **Command Naming:** New sub-commands should be:
   - a) `/sekkei:test-spec-unit`, `/sekkei:test-spec-integration`, etc.?
   - b) `/sekkei:unit-test`, `/sekkei:integration-test`, etc.?
   - c) `/sekkei:test [unit|integration|system|acceptance]` (single command with subtype)?

5. **Config Schema Versioning:** When updating sekkei.config.yaml structure to support test-spec split:
   - a) Increment schema version (backward compatibility concern)?
   - b) Auto-migrate existing configs?
   - c) Keep as optional (old test-spec still works if not split)?

6. **Directory Structure for Split Mode:** When split mode is enabled:
   - a) Nest under `08-test/unit.md`, `08-test/integration.md`, etc. (directory scoping)?
   - b) Keep flat: `08-test-unit.md`, `09-test-integration.md`, etc. (simple numbering)?
   - c) Custom naming per config (most flexible, hardest to validate)?

---

## Next Steps (Recommendation)

1. **Decide on questions 1-6** (architecture decisions)
2. **Create 4 test templates** based on current test-spec, removing subsections per test level
3. **Implement MCP handlers** for 4 new doc_types
4. **Update SKILL.md** with 4 new command workflows
5. **Add config schema entries** for chain status tracking of 4 test specs
6. **Test split mode** with sample project (3+ features) to validate flow
