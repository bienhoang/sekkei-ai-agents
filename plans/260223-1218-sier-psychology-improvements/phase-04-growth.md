# Phase D: Growth

## Context Links

- [Plan Overview](./plan.md)
- [Phase A — Trust Foundation](./phase-01-trust-foundation.md)
- [Phase B — Pain Relief](./phase-02-pain-relief.md)
- [Phase C — Enterprise Adoption](./phase-03-enterprise-adoption.md)
- [Brainstorm](../reports/brainstorm-260223-1218-sier-psychology-improvements.md)

## Overview

- **Date:** 2026-02-23
- **Priority:** P2 (Medium)
- **Status:** Completed ✅
- **Effort:** 6h (completed on schedule)
- **Depends on:** Phases A, B, C — ALL FULFILLED
- **Description:** Growth features: enhanced screen design, anti-knowledge-silo (ADR), multi-vendor coordination, generational bridge. These expand Sekkei's reach into advanced SIer workflows.

## Key Insights

- Screen design (画面設計書): existing `mockup-*.ts` libs + `screen-design.md` template already exist but aren't in DOC_TYPES
- 属人化 (knowledge silo) is cited as top long-term risk in SIer organizations
- Multi-vendor projects: IF仕様書 single field change = 2 weeks + 5-company sign-off
- Veterans see doc standards as identity; juniors want to escape Excel — bridge both mindsets

---

## Feature 11: 画面設計書 Enhancement

### Requirements

**Functional:**
- Add `"screen-design"` to `DOC_TYPES` (currently template exists but type not registered)
- Screen transition diagram support via Mermaid state diagrams
- Component catalog: reusable UI element definitions
- Screen ↔ API mapping table: auto-link SCR-xxx to API-xxx

**Non-functional:**
- Leverage existing `mockup-parser.ts`, `mockup-renderer.ts`, `mockup-html-builder.ts`
- Existing `screen-design-instructions.ts` already has `buildScreenDesignInstruction()`
- `screen-design.md` template already exists at `templates/ja/`

### Architecture

Promote screen-design from "skill-layer-only" to full MCP tool support. Existing infrastructure does most of the work.

```
CURRENT: screen-design.md exists as reference only (not in DOC_TYPES)
         buildScreenDesignInstruction() used by SKILL.md directly

TARGET:  "screen-design" added to DOC_TYPES
         generate_document(doc_type="screen-design") works
         validate_document supports screen-design validation
         Enhanced: transition diagrams, component catalog, API mapping
```

### Related Code Files

**Modify:**
- `src/types/documents.ts` — add `"screen-design"` to `DOC_TYPES` (NOTE: template exists, just not in enum)
- `src/lib/generation-instructions.ts` — add `GENERATION_INSTRUCTIONS["screen-design"]` + `KEIGO_MAP` entry
- `src/lib/validator.ts` — add `REQUIRED_SECTIONS["screen-design"]`
- `src/lib/completeness-rules.ts` — add screen-design rules
- `templates/ja/screen-design.md` — enhance with transition diagram and component catalog sections

**Existing (no changes needed):**
- `src/lib/mockup-parser.ts` — already works
- `src/lib/mockup-renderer.ts` — already works
- `src/lib/mockup-html-builder.ts` — already works
- `src/lib/screen-design-instructions.ts` — already has `buildScreenDesignInstruction()`

### Implementation Steps

1. Add `"screen-design"` to `DOC_TYPES` array in `documents.ts`

2. Add `GENERATION_INSTRUCTIONS["screen-design"]`:
   - Reference existing `buildScreenDesignInstruction()` or inline equivalent
   - Add transition diagram instruction: "Generate Mermaid stateDiagram-v2 for screen transitions"
   - Add component catalog instruction: "List reusable UI components with IDs"
   - Add API mapping: "Link each screen event to API-xxx endpoints"

3. Add `KEIGO_MAP["screen-design"] = "simple"`

4. Enhance `templates/ja/screen-design.md`: add sections for transition diagram (Mermaid) and component catalog table

5. Add validator rules: screen items required, validation rules required

6. Tests

### Todo

- [ ] Add "screen-design" to DOC_TYPES
- [ ] Add generation instructions
- [ ] Enhance template with transition diagram and component catalog
- [ ] Add validation rules
- [ ] Tests

---

## Feature 12: 属人化 Prevention (Decision Records)

### Requirements

**Functional:**
- New doc type: `decision-record` (ADR — Architecture Decision Record)
- Template: context, options considered, decision, consequences, participants
- Link decisions to affected doc IDs (REQ-xxx, SCR-xxx, etc.)
- Auto-enrichment: glossary tool auto-detects domain terms during generation
- Knowledge transfer report: summary of all decisions for new team members

**Non-functional:**
- ID format: `ADR-001`
- Lightweight: ~30-50 lines per decision record
- Decisions must be immutable once approved (append-only pattern)

### Architecture

Standard new doc type. Intentionally lightweight — each ADR is a short document, not a full spec.

```
generate_document(doc_type="decision-record", input_content="decision discussion notes")
  → GENERATION_INSTRUCTIONS["decision-record"]
  → Structure: context, options, decision, consequences
  → Cross-ref to affected doc IDs
  → Auto-detect and link glossary terms
```

### Related Code Files

**Create:**
- `templates/ja/decision-record.md` — ADR template (~40 lines)

**Modify:**
- `src/types/documents.ts` — add `"decision-record"` to `DOC_TYPES`
- `src/lib/generation-instructions.ts` — add instructions + `KEIGO_MAP`
- `src/lib/id-extractor.ts` — add `"ADR"` to `ID_TYPES`
- `src/lib/validator.ts` — add `REQUIRED_SECTIONS`

### Implementation Steps

1. Add `"decision-record"` to `DOC_TYPES`

2. Create `templates/ja/decision-record.md`:
   ```yaml
   ---
   doc_type: decision-record
   version: "1.0"
   language: ja
   sections: [context, options, decision, consequences, participants]
   status: draft
   ---
   ```
   Sections: background/context, options evaluated (table), decision made, consequences (positive/negative), participants list, affected documents (ID refs)

3. Add `GENERATION_INSTRUCTIONS["decision-record"]`:
   - Structure discussion into ADR format
   - Extract and link affected doc IDs
   - ADR-001 format
   - "Options" table: option name, pros, cons, decision (selected/rejected)

4. Add `KEIGO_MAP["decision-record"] = "simple"`

5. Add `"ADR"` to `ID_TYPES`

6. Add validator: context and decision sections required, at least 2 options listed

7. Tests

### Todo

- [ ] Add "decision-record" to DOC_TYPES
- [ ] Create template
- [ ] Add generation instructions
- [ ] Add ADR to ID_TYPES
- [ ] Add validation rules
- [ ] Tests

---

## Feature 13: Multi-Vendor Support

### Requirements

**Functional:**
- New doc type: `interface-spec` (IF仕様書)
- Template: interface name, owner, consumer, data format, protocol, SLA
- Read-only export mode: flag to strip internal notes, AI confidence scores, draft watermarks
- Shared glossary multi-tenant: namespace terms by vendor (`vendor:term`)

**Non-functional:**
- ID format: `IF-001` (interface specification ID)
- Read-only exports: cannot contain any internal metadata
- Must support vendor-specific template overrides

### Architecture

New doc type + export mode flag.

```
generate_document(doc_type="interface-spec")
  → Interface contract from API definitions
  → Both sides' responsibilities clearly defined

export_document(read_only=true)
  → Strip: AI confidence comments, source traceability, internal notes
  → Strip: draft watermarks (always show as "公開版")
  → Keep: approval chain (if approved), cross-reference IDs
```

### Related Code Files

**Create:**
- `templates/ja/interface-spec.md` — IF仕様書 template (~70 lines)
- `src/lib/content-sanitizer.ts` — strip internal metadata for read-only export (~60 lines)

**Modify:**
- `src/types/documents.ts` — add `"interface-spec"` to `DOC_TYPES`
- `src/lib/generation-instructions.ts` — add instructions + `KEIGO_MAP`
- `src/lib/id-extractor.ts` — add `"IF"` to `ID_TYPES`
- `src/lib/validator.ts` — add `REQUIRED_SECTIONS`
- `src/tools/export.ts` — add `read_only: z.boolean().optional()` param; sanitize content before export

### Implementation Steps

1. Add `"interface-spec"` to `DOC_TYPES`

2. Create `templates/ja/interface-spec.md`:
   ```yaml
   ---
   doc_type: interface-spec
   version: "1.0"
   language: ja
   sections: [interface-overview, data-format, protocol, error-handling, sla, approval]
   status: draft
   ---
   ```

3. Add generation instructions: interface contract structure, both-side responsibilities, data format tables

4. Add `"IF"` to `ID_TYPES`

5. Create `content-sanitizer.ts` (blacklist approach):
   - `sanitizeForReadOnly(content)` — regex-remove known internal patterns:
     - `<!-- confidence: ... -->` comments
     - `<!-- source: ... -->` comments
     - `<!-- learn: ... -->` comments
     - `<!-- internal -->` ... `<!-- /internal -->` blocks
   - Replace draft watermark with "公開版"
   - Preserves all other content including unknown HTML comments
<!-- Updated: Validation Session 1 - Blacklist approach confirmed -->

6. Add `read_only` param to `export_document` — call sanitizer before export

7. Glossary enhancement: support `vendor:` prefix namespace in glossary terms (modify `manage_glossary`)

8. Tests

### Todo

- [ ] Add "interface-spec" to DOC_TYPES
- [ ] Create template
- [ ] Add generation instructions
- [ ] Add IF to ID_TYPES
- [ ] Create content-sanitizer.ts
- [ ] Add read_only param to export_document
- [ ] Glossary vendor namespace
- [ ] Tests

---

## Feature 14: Generational Bridge

### Requirements

**Functional:**
- Progressive disclosure config: `sekkei.config.yaml` → `ui_mode: "simple" | "power"`
  - `simple`: familiar Excel-like format, minimal markdown exposure, no git integration
  - `power`: full markdown, git auto-commit, automation features
- Learning mode: annotate generated docs with explanations of WHY sections exist
  - Format: `<!-- learn: この承認欄はISO 9001品質管理要件に基づく -->` comments
- Config-driven feature gating: hide advanced features in simple mode

**Non-functional:**
- Simple mode is the default (lower barrier to entry)
- Learning annotations stripped from exports (internal-only)
- No code changes needed for mode switching — config-driven

### Architecture

Config-driven feature gating in `generate_document` and generation instructions. No new tools.

```
sekkei.config.yaml:
  ui_mode: simple  # or "power"
  learning_mode: true

generate_document (when learning_mode=true):
  → Inject learning annotation instructions
  → AI adds <!-- learn: explanation --> comments

generate_document (when ui_mode=simple):
  → Suppress split mode options
  → Suppress code analysis options
  → Simpler output format
```

### Related Code Files

**Modify:**
- `src/types/documents.ts` — add `ui_mode?: "simple" | "power"` and `learning_mode?: boolean` to `ProjectConfig`
- `src/tools/generate.ts` — read config mode, conditionally include/exclude advanced features
- `src/lib/generation-instructions.ts` — add learning annotation instruction block
- `src/lib/content-sanitizer.ts` (from Feature 13) — also strip `<!-- learn: -->` comments

### Implementation Steps

1. Add config fields to `ProjectConfig`:
   ```ts
   ui_mode?: "simple" | "power";
   learning_mode?: boolean;
   ```

2. In `generate.ts`: when config loaded and `ui_mode=simple`:
   - Exclude split mode instructions
   - Exclude code analysis context
   - Simplify output format (fewer meta sections)

3. Add learning mode instructions to `generation-instructions.ts`:
   ```
   "## Learning Annotations\nAdd <!-- learn: explanation --> comments explaining WHY each section exists.\nReference: ISO standards, IPA guidelines, SIer conventions."
   ```

4. When `learning_mode=true`, inject learning instructions into generation context

5. Extend `content-sanitizer.ts` to strip `<!-- learn: -->` comments from exports

6. Tests: generate with simple mode vs power mode, verify output differences

### Todo

- [ ] Add ui_mode and learning_mode to ProjectConfig
- [ ] Implement simple mode feature gating in generate.ts
- [ ] Add learning annotation instructions
- [ ] Extend content-sanitizer for learning comments
- [ ] Tests

---

## Success Criteria

- [ ] `generate_document(doc_type="screen-design")` works with full MCP tool support
- [ ] Screen transition diagrams generated as Mermaid stateDiagram-v2
- [ ] `generate_document(doc_type="decision-record")` produces ADR from discussion notes
- [ ] `generate_document(doc_type="interface-spec")` produces IF仕様書
- [ ] `export_document(read_only=true)` strips all internal metadata
- [ ] `ui_mode: simple` gates advanced features in generation
- [ ] `learning_mode: true` adds educational annotations
- [ ] All existing tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| screen-design promotion breaks existing SKILL.md flow | Medium | Ensure `buildScreenDesignInstruction()` still works standalone |
| ADR format unfamiliar to traditional SIers | Low | Frame as "設計判断記録" not "ADR"; use Japanese section names |
| Read-only export sanitizer misses internal comments | High | Comprehensive regex tests; whitelist approach instead of blacklist |
| Simple/power mode creates maintenance burden (two code paths) | Medium | Config flag toggles instructions, not code logic |

## Security Considerations

- Read-only export: MUST strip ALL internal metadata — test with adversarial content
- Content sanitizer: regex-based — test against injection attempts (`<!-- confidence: --> <script>`)
- Interface specs may contain sensitive API contracts — respect existing path validation
- Learning mode annotations: harmless but strip from client-facing exports

## Next Steps

Phase D completes the SIer psychology improvement suite. After all 4 phases:
- Trust: confidence + traceability + approval watermarks + diff
- Pain relief: impact cascade + test evidence
- Enterprise: Excel import + tickets + 議事録 + ハンコ
- Growth: screen design + ADR + multi-vendor + progressive disclosure

Post-implementation:
1. User testing with 2-3 SIer teams (validate assumptions)
2. Documentation: update SKILL.md with new sub-commands
3. Template library: collect company-specific template overrides
4. Analytics: track which features see highest adoption

## Unresolved Questions

1. Should screen-design remain a sub-document of basic-design or become standalone in chain?
2. ADR: should it be auto-generated when decisions appear in 議事録 (Feature 9)?
3. Content sanitizer: whitelist approach (keep only known-safe) vs blacklist (remove known-internal)?
4. Simple mode: should it disable `validate_chain` entirely or simplify its output?
5. Multi-vendor glossary namespace: `vendor:term` syntax or separate glossary files?
6. Learning mode: should annotations reference specific IPA/ISO standard numbers?
