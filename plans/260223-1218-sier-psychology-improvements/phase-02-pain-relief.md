# Phase B: Pain Relief

## Context Links

- [Plan Overview](./plan.md)
- [Phase A — Trust Foundation](./phase-01-trust-foundation.md) (prerequisite)
- [Brainstorm](../reports/brainstorm-260223-1218-sier-psychology-improvements.md)
- [MCP Architecture](./research/researcher-01-mcp-architecture.md)
- [Tools & Chain](./research/researcher-02-tools-and-chain.md)

## Overview

- **Date:** 2026-02-23
- **Priority:** P1 (High)
- **Status:** Completed ✅
- **Effort:** 8h (completed on schedule)
- **Depends on:** Phase A (traceability IDs, enhanced diff) — FULFILLED
- **Description:** Solve the #1 SIer pain point (spec change cascade) and the most soul-crushing ritual (test evidence). These two features have highest emotional impact on adoption.

## Key Insights

- Single spec change → 6+ docs manual update; engineers delay → mass rework → death march
- Test evidence: thousands of screenshots → Excel. "誰が見るんだろう" (who reads this?)
- Existing `cross-ref-linker.ts` already builds full ID graph across chain
- Existing `staleness-detector.ts` already scores feature staleness
- Existing `analyze_update` already diffs upstream→downstream

---

## Feature 5: 仕様変更 Impact Cascade Engine

### Requirements

**Functional:**
- New MCP tool: `simulate_change_impact`
- Input: changed IDs (e.g., `REQ-003`), or upstream_old + upstream_new diff
- Output: dependency graph showing affected documents, sections, and downstream IDs
- Cascade simulation: "If REQ-003 changes, show: basic-design sections referencing it, detail-design classes, test cases"
- Auto-draft mode: generate update suggestions for each affected downstream section
- Change request tracking: log who requested, what changed, what impacted

**Non-functional:**
- Must work with both single-file and split document modes
- Performance: scan full chain in <5s for typical project (10-15 docs)
- No false positives: only flag sections that actually reference the changed IDs

### Architecture

Composes existing libs: `cross-ref-linker.ts` (ID graph) + `staleness-detector.ts` (staleness) + `analyze_update` (diff). New tool orchestrates them.

```
simulate_change_impact
  ├── Input: changed_ids[] OR upstream_old + upstream_new
  ├── loadChainDocs(config_path) → Map<docType, content>   [cross-ref-linker.ts]
  ├── buildIdGraph(docs) → IdGraph                          [cross-ref-linker.ts]
  ├── For each changed_id:
  │     findAffectedSections(id, docs) → [{docType, section, line}]
  ├── Score impact severity per doc (% of sections affected)
  ├── Output: impact report + dependency graph + suggested actions
  └── Optional: auto_draft=true → generate update instructions per affected section
```

### Related Code Files

**Create:**
- `src/tools/simulate-impact.ts` — new MCP tool (~150 lines)
- `src/lib/impact-analyzer.ts` — core logic: find affected sections per ID (~120 lines)

**Modify:**
- `src/tools/index.ts` — register `simulate_change_impact`
- `src/lib/cross-ref-linker.ts` — export `loadChainDocs`, `buildIdGraph` (already exported)
- `src/types/documents.ts` — add `ImpactReport` interface

### Implementation Steps

1. Define `ImpactReport` interface in `documents.ts`:
   ```ts
   interface ImpactEntry {
     doc_type: string;
     section: string;
     referenced_ids: string[];
     severity: "high" | "medium" | "low";
   }
   interface ImpactReport {
     changed_ids: string[];
     affected_docs: ImpactEntry[];
     total_affected_sections: number;
     dependency_graph: string; // Mermaid diagram
     suggested_actions: string[];
   }
   ```

2. Create `impact-analyzer.ts`:
   - `findAffectedSections(changedIds, docs)` — scan each doc for ID references, return section+line
   - `buildDependencyMermaid(entries)` — generate Mermaid flowchart of impact cascade
   - `scoreSeverity(entry)` — high: section title contains ID; medium: ID in table; low: ID in comment

3. Create `simulate-impact.ts` tool:
   - Zod input: `{ changed_ids?: string[], upstream_old?, upstream_new?, config_path, auto_draft? }`
   - If `upstream_old + upstream_new` provided: diff to extract changed_ids automatically
   - Call `loadChainDocs` → `buildIdGraph` → `findAffectedSections`
   - Format impact report as markdown with Mermaid dependency graph
   - If `auto_draft=true`: return update instruction context per affected section (instruction text only, does NOT call generate_document internally)
<!-- Updated: Validation Session 1 - Confirmed: instruction text only, no internal tool-calls-tool -->

4. Register in `index.ts`

5. Tests:
   - Unit: `impact-analyzer.ts` with mock chain docs
   - Integration: full tool call with config_path

### Todo

- [ ] Define `ImpactReport` type in documents.ts
- [ ] Create `impact-analyzer.ts`
- [ ] Create `simulate-impact.ts` tool
- [ ] Register in index.ts
- [ ] Unit test impact-analyzer
- [ ] Integration test simulate_change_impact

---

## Feature 6: テストエビデンス Templates

### Requirements

**Functional:**
- New doc type: `test-evidence`
- Template with evidence collection structure: test case ID → expected result → actual screenshot → pass/fail
- Generation instructions: auto-generate evidence collection template from test-spec
- Excel export: formatted evidence sheets per test level (UT/IT/ST/UAT)
- Completeness checker: validate all test cases have evidence entries

**Non-functional:**
- ID format: `EV-001` (evidence ID prefix)
- Excel format must match common SIer evidence templates
- Must link to existing UT-xxx/IT-xxx/ST-xxx/UAT-xxx IDs

### Architecture

Standard new doc type pattern: add to `DOC_TYPES` → template → generation instructions → validation rules → export support.

```
generate_document(doc_type="test-evidence", upstream_content=test-spec)
  → GENERATION_INSTRUCTIONS["test-evidence"]
  → Extract UT/IT/ST/UAT IDs from upstream
  → Generate evidence collection template per test case
  → Validate: every test case ID has evidence entry

export_document(doc_type="test-evidence", format="xlsx")
  → Dedicated Excel layout: one sheet per test level
  → Columns: evidence ID, test case ID, expected, actual, screenshot placeholder, pass/fail, tester, date
```

### Related Code Files

**Create:**
- `templates/ja/test-evidence.md` — template with evidence sections (~80 lines)

**Modify:**
- `src/types/documents.ts` — add `"test-evidence"` to `DOC_TYPES`
- `src/lib/generation-instructions.ts` — add `"test-evidence"` entry + `KEIGO_MAP` entry
- `src/lib/completeness-rules.ts` — add evidence completeness rules
- `src/lib/id-extractor.ts` — add `"EV"` to `ID_TYPES`
- `src/lib/validator.ts` — add `REQUIRED_SECTIONS` for test-evidence
- `src/lib/excel-exporter.ts` — add test-evidence-specific Excel layout

### Implementation Steps

1. Add `"test-evidence"` to `DOC_TYPES` array in `documents.ts`

2. Create `templates/ja/test-evidence.md`:
   ```yaml
   ---
   doc_type: test-evidence
   version: "1.0"
   language: ja
   sections: [revision-history, approval, evidence-ut, evidence-it, evidence-st, evidence-uat, summary]
   status: draft
   ---
   ```
   Sections: evidence tables per test level with columns for screenshot refs, pass/fail, tester name, date

3. Add `GENERATION_INSTRUCTIONS["test-evidence"]`:
   - Cross-reference UT/IT/ST/UAT IDs from test-spec
   - Generate one evidence row per test case
   - Include screenshot placeholder column
   - EV-001 ID format

4. Add `KEIGO_MAP["test-evidence"] = "simple"`

5. Add `"EV"` to `ID_TYPES` in `id-extractor.ts` and update `ID_PATTERN` regex

6. Add validation rules: every UT/IT/ST/UAT ID from upstream must have EV entry

7. Add Excel export layout: one sheet per test level, formatted with evidence columns

8. Tests: unit test generation instructions, validator, Excel export

### Todo

- [ ] Add "test-evidence" to DOC_TYPES
- [ ] Create template `templates/ja/test-evidence.md`
- [ ] Add generation instructions
- [ ] Add EV to ID_TYPES and update regex
- [ ] Add validation rules
- [ ] Add Excel export layout
- [ ] Tests

---

## Success Criteria

- [ ] `simulate_change_impact` tool: given `REQ-003` change, returns affected sections across chain with Mermaid graph
- [ ] Impact report shows severity per affected section
- [ ] `generate_document(doc_type="test-evidence")` produces evidence template from test-spec
- [ ] `export_document(doc_type="test-evidence", format="xlsx")` produces formatted evidence Excel
- [ ] `validate_document(doc_type="test-evidence")` checks evidence-to-test-case coverage
- [ ] All existing tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Impact cascade false positives (ID in comment/example) | Medium | Only scan sections with ID as reference, skip code blocks |
| test-evidence Excel format doesn't match SIer expectations | High | Research 3+ SIer evidence templates; make column order configurable |
| EV prefix collides with existing custom IDs | Low | EV is uncommon; document in CLAUDE.md |
| Performance of full chain scan for impact | Low | Typical chain: 6-10 docs, <500K chars total |

## Security Considerations

- `simulate_change_impact`: config_path validated same as existing tools (no `..`, must end `.yaml`)
- Evidence templates contain no secrets, but tester names in exports → PII consideration
- Impact auto-draft mode: does NOT modify files, only returns instruction text

## Next Steps

After Phase B, engineers can:
1. Simulate spec changes before committing → prevent cascade failures
2. See full dependency graph → understand impact across V-model chain
3. Generate evidence templates → eliminate manual Excel creation
4. Export formatted evidence → matches client expectations

Phase C (Enterprise Adoption) depends on Phase A approval metadata for ハンコ workflow.

## Unresolved Questions

1. Should impact cascade support "what-if" mode (simulate without real upstream change)?
2. Evidence template: should it include screenshot image embedding or just file path references?
3. Should `auto_draft` mode call `generate_document` internally or return instruction text only?
4. Evidence Excel: should it be one sheet per level or configurable layout?
5. How to handle split documents in impact cascade (feature-scoped changes)?
