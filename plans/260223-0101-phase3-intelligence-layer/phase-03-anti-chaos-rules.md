# Phase 03: Anti-Chaos Structural Rules (ROADMAP 3.1)

## Context Links

- **Parent plan:** [plan.md](./plan.md)
- **Brainstorm:** [brainstorm-260222-1955-sekkei-improvements.md](../../plans/reports/brainstorm-260222-1955-sekkei-improvements.md)
- **Existing validator:** `src/lib/validator.ts`
- **Completeness rules:** `src/lib/completeness-rules.ts`
- **Structure validator:** `src/lib/structure-validator.ts`
- **Validate tool:** `src/tools/validate.ts`
- **Template loader:** `src/lib/template-loader.ts`

## Overview

- **Priority:** P2
- **Status:** complete
- **Effort:** ~1 day
- **Group:** G3 (independent)

Prevent document drift in large projects by enforcing structural conformance against template rules. Auto-detect deviations from preset/template: missing sections, wrong section ordering, unexpected headings, missing required fields in YAML frontmatter. Extends `validate_document` tool with a `check_structure_rules` flag.

## Key Insights

- Existing `structure-validator.ts` checks directory layout; new rules check document *content* structure
- Existing `completeness-rules.ts` checks ID patterns; new rules check section hierarchy + field presence
- Templates have YAML frontmatter with `sections` array — natural source of truth for expected structure
- Presets (enterprise/standard/agile) define strictness levels: enterprise = strict ordering, agile = lenient
- Rules engine should be data-driven (rule definitions, not hardcoded if-else chains)
- Builds on existing `validateDocument()` function in `validator.ts` — add rules as new check category

## Requirements

### Functional

1. New `src/lib/structure-rules.ts` — rule definitions + engine for checking section conformance
2. New `check_structure_rules` flag on `validate_document` tool
3. Rules check: section ordering matches template, required sections present, no unexpected H2/H3 headings
4. Rules check: YAML frontmatter has required fields per doc type (doc_type, version, status)
5. Preset-aware strictness: enterprise=error on deviations, standard=warning, agile=skip ordering check
6. CLI: `sekkei validate --structure-rules` flag
7. Report: list of violations with severity, expected vs. actual section order

### Non-Functional

1. Rule evaluation completes in <100ms per document
2. Rules are data-driven — adding new rules requires no code changes, just entries in rules map
3. No external dependencies (pure TypeScript string/regex operations)
4. Backward compat: without `check_structure_rules` flag, behavior unchanged

## Architecture

```
validate_document tool (check_structure_rules=true)
          │
          ├── Load template for doc_type → extract expected sections from frontmatter
          ├── Parse document content → extract actual H2/H3 headings in order
          │
          ▼
   StructureRulesEngine.check(content, templateSections, preset)
          │
          ├── SectionOrderRule: compare actual heading order vs template order
          ├── RequiredSectionsRule: check all template sections present
          ├── UnexpectedSectionsRule: flag headings not in template
          ├── FrontmatterFieldsRule: check required YAML fields
          ├── NamingConventionRule: check heading text matches expected patterns
          │
          ▼
   StructureViolation[] → formatted report
```

### Data Structures

```typescript
// src/lib/structure-rules.ts

export type ViolationSeverity = "error" | "warning" | "info";

export interface StructureViolation {
  rule: string;
  severity: ViolationSeverity;
  message: string;
  expected?: string;
  actual?: string;
  line?: number;
}

export interface StructureRuleContext {
  content: string;
  docType: string;
  templateSections: string[];     // from template YAML frontmatter
  preset?: "enterprise" | "standard" | "agile";
  frontmatter?: Record<string, unknown>;
}

export interface StructureRule {
  name: string;
  description: string;
  /** Which presets this rule applies to. Empty = all presets */
  presets: string[];
  /** Severity when triggered */
  severity: ViolationSeverity;
  check: (ctx: StructureRuleContext) => StructureViolation[];
}
```

### Rule Definitions

| Rule | Presets | Severity | Description |
|------|---------|----------|-------------|
| `required-sections` | all | error | All template sections must exist as headings |
| `section-ordering` | enterprise, standard | warning | H2 headings match template order |
| `unexpected-sections` | enterprise | warning | Flag H2 not in template |
| `frontmatter-fields` | all | error | Required YAML fields: doc_type, version |
| `frontmatter-status` | enterprise, standard | warning | `status` field present and valid |
| `heading-level-hierarchy` | all | error | No H3 before its parent H2 |
| `empty-sections` | enterprise, standard | warning | Sections with no content after heading |

## Related Code Files

### Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/lib/structure-rules.ts` | Rule definitions + engine | ~180 |
| `tests/unit/structure-rules.test.ts` | Unit tests for all rules | ~180 |

### Modify

| File | Change |
|------|--------|
| `src/tools/validate.ts` | Add `check_structure_rules` + `preset` params; call structure rules engine |
| `src/lib/validator.ts` | Import + invoke structure rules when flag set |
| `src/cli/commands/validate.ts` | Add `--structure-rules` and `--preset` flags |
| `src/lib/errors.ts` | Add `STRUCTURE_RULES_ERROR` error code |
| `src/types/documents.ts` | Export StructureViolation type (or re-export) |

## Implementation Steps

### Step 1: Add error code

In `src/lib/errors.ts`, add `"STRUCTURE_RULES_ERROR"` to `SekkeiErrorCode` union.

### Step 2: Create structure-rules.ts

```typescript
// src/lib/structure-rules.ts
import type { DocType, Preset } from "../types/documents.js";

/** Extract H2/H3 headings from markdown content in order */
export function extractHeadings(content: string): { level: number; text: string; line: number }[] {
  const lines = content.split("\n");
  const headings: { level: number; text: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

/** Extract YAML frontmatter fields from content */
export function extractFrontmatter(content: string): Record<string, unknown> | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  // Parse YAML manually (simple key: value) or use yaml package
  // ...
}

/** Built-in rules registry */
const RULES: StructureRule[] = [
  {
    name: "required-sections",
    description: "All template sections must exist as headings",
    presets: [],  // all
    severity: "error",
    check: (ctx) => {
      const headings = extractHeadings(ctx.content);
      const headingTexts = new Set(headings.map(h => h.text));
      const violations: StructureViolation[] = [];
      for (const section of ctx.templateSections) {
        if (!headingTexts.has(section)) {
          violations.push({
            rule: "required-sections",
            severity: "error",
            message: `Missing required section: "${section}"`,
            expected: section,
          });
        }
      }
      return violations;
    },
  },
  // ... section-ordering, unexpected-sections, frontmatter-fields, etc.
];

/** Run all applicable rules for the given preset */
export function checkStructureRules(ctx: StructureRuleContext): StructureViolation[] {
  const preset = ctx.preset ?? "standard";
  const applicable = RULES.filter(
    r => r.presets.length === 0 || r.presets.includes(preset)
  );
  const violations: StructureViolation[] = [];
  for (const rule of applicable) {
    violations.push(...rule.check(ctx));
  }
  return violations;
}
```

### Step 3: Update validate.ts (tool)

Add to inputSchema:

```typescript
check_structure_rules: z.boolean().optional()
  .describe("Check document structure against template rules (section ordering, required fields)"),
preset: z.enum(["enterprise", "standard", "agile"]).optional()
  .describe("Preset for strictness level (default: standard)"),
```

Add to `ValidateDocumentArgs` interface. In `handleValidateDocument`, when `check_structure_rules` is true:

```typescript
if (check_structure_rules && content && doc_type) {
  const { loadTemplate } = await import("../lib/template-loader.js");
  const { loadConfig } = await import("../config.js");
  const cfg = loadConfig();
  const template = await loadTemplate(cfg.templateDir, doc_type, "ja");
  const ctx: StructureRuleContext = {
    content,
    docType: doc_type,
    templateSections: template.metadata.sections,
    preset: preset ?? "standard",
  };
  const violations = checkStructureRules(ctx);
  // Append to existing issues or return separate section in report
}
```

### Step 4: Update CLI validate command

In `src/cli/commands/validate.ts`, add flags:

```typescript
"structure-rules": { type: "boolean", default: false, description: "Check structure rules" },
preset: { type: "string", description: "Strictness preset: enterprise, standard, agile" },
```

### Step 5: Write tests

`structure-rules.test.ts`:
- Test extractHeadings with various markdown
- Test required-sections rule: missing section → error
- Test section-ordering rule: wrong order → warning (enterprise/standard), skip (agile)
- Test unexpected-sections rule: extra heading → warning (enterprise only)
- Test frontmatter-fields rule: missing doc_type → error
- Test heading-level-hierarchy: H3 before parent H2 → error
- Test empty-sections: heading with no content → warning
- Test preset filtering: agile preset skips ordering check
- Test empty template sections → no violations

## Todo List

- [ ] Add STRUCTURE_RULES_ERROR error code to errors.ts
- [ ] Create `src/lib/structure-rules.ts` with rule engine + 7 built-in rules
- [ ] Update `src/tools/validate.ts` — add check_structure_rules + preset params
- [ ] Update `src/lib/validator.ts` or validate tool to invoke structure rules
- [ ] Update `src/cli/commands/validate.ts` — add --structure-rules and --preset flags
- [ ] Write `tests/unit/structure-rules.test.ts`
- [ ] Run full test suite — verify 215+ tests still pass
- [ ] Run `npm run lint` — verify no type errors

## Success Criteria

1. `validate_document` with `check_structure_rules=true` reports section violations
2. Enterprise preset catches ordering + unexpected sections; agile is lenient
3. Missing YAML frontmatter fields flagged as errors across all presets
4. Without `check_structure_rules`, behavior identical to current (backward compat)
5. `sekkei validate --structure-rules --preset enterprise` works in CLI
6. All new tests pass; existing 215 tests unaffected

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Template sections array not accurate | Medium | Medium | Validate template YAML on load; warn if sections empty |
| Section heading text varies (e.g., with numbering prefix) | Medium | Low | Normalize headings: strip leading numbers/dots before comparison |
| Too many false positives frustrate users | Medium | Medium | Default to "standard" preset (warnings, not errors); allow override |
| Japanese heading matching quirks | Low | Low | Use exact match first; consider fuzzy match later if needed |

## Security Considerations

- No file system writes — pure validation
- Template loaded from validated paths only (existing template-resolver.ts security)
- Preset value constrained by Zod enum — no injection risk
- Content size capped at 500KB (existing inputSchema constraint)

## Next Steps

- Custom rules: allow project-specific rules in `sekkei.config.yaml` structure_rules section
- Auto-fix mode: reorder sections to match template (high effort, defer)
- Integration with Phase 01: validate code-aware generated docs against structure rules
- Dashboard view: aggregate structure compliance across all docs in chain
