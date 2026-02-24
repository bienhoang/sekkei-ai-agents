# Phase 02: Pre-Generate Advisory Warning (Guard B)

## Context

- Parent: [plan.md](plan.md)
- Depends on: [Phase 01](phase-01-staleness-detection.md) — reuses `checkDocStaleness()`
- Brainstorm: [brainstorm report](../reports/brainstorm-260224-1120-doc-consistency-gaps.md) — Solution 1, Guard B

## Overview

- **Priority**: P2
- **Status**: completed
- **Description**: Before `generate_document` generates content, check if upstream doc changed since last generation. Advisory warning only, non-blocking. Only triggers on **regeneration** (when `existing_content` is provided).

## Key Insights

- `handleGenerateDocument()` in `generate.ts` L176-381 is the handler
- Regeneration path: `existing_content` param present (L282-287)
- `config_path` already accepted (L300-310) -- needed for staleness check
- `doc_type` maps to upstream via `CHAIN_PAIRS` in `cross-ref-linker.ts`
- Warning should appear in output **before** template/instructions (user sees it first)
- `checkDocStaleness()` from Phase 1 returns `StalenessWarning[]` for the doc's upstreams

## Requirements

### Functional
- FR1: When `existing_content` AND `config_path` provided, check upstream staleness before generation
- FR2: Prepend advisory warning block to generation output if stale upstreams detected
- FR3: Warning format: markdown block with upstream doc types and dates
- FR4: No warning on first-time generation (no `existing_content`)

### Non-Functional
- NFR1: Non-blocking — generation proceeds regardless of staleness
- NFR2: Staleness check failure must not fail generation (try/catch)
- NFR3: Minimal latency — single git operation per upstream (already optimized in Phase 1)

## Architecture

```
handleGenerateDocument(args)
  ├── if existing_content && config_path:
  │    └── checkDocStaleness(configPath, docType) → StalenessWarning[]
  │         └── if warnings.length > 0:
  │              prepend advisory block to output sections[]
  ├── loadTemplate(...)          # existing
  ├── buildInstructions(...)     # existing
  └── return output              # existing
```

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/tools/generate.ts` — add staleness check before generation (around L282-287)

### Read (no modify)
- `sekkei/packages/mcp-server/src/lib/doc-staleness.ts` — reuse `checkDocStaleness()` from Phase 1

### Create
- `sekkei/packages/mcp-server/tests/unit/generate-staleness.test.ts` — unit test for advisory warning

## Implementation Steps

1. **Import `checkDocStaleness` in `generate.ts`**
   ```typescript
   import { checkDocStaleness } from "../lib/doc-staleness.js";
   ```

2. **Add staleness check in `handleGenerateDocument()`**
   - Location: after line ~282 (existing_content check), before template loading
   - Condition: `existing_content && config_path`
   ```typescript
   let stalenessAdvisory = "";
   if (existing_content && config_path) {
     try {
       const warnings = await checkDocStaleness(config_path, doc_type);
       if (warnings.length > 0) {
         stalenessAdvisory = buildStalenessAdvisory(warnings);
       }
     } catch { /* non-blocking */ }
   }
   ```

3. **Create `buildStalenessAdvisory()` helper** (in `generate.ts`)
   ```typescript
   function buildStalenessAdvisory(warnings: StalenessWarning[]): string {
     const lines = [
       "## Advisory: Upstream Changes Detected",
       "",
       "The following upstream documents have changed since this document was last generated:",
       "",
       "| Upstream Doc | Modified |",
       "|-------------|----------|",
     ];
     for (const w of warnings) {
       lines.push(`| ${w.upstream} | ${w.upstreamModified} |`);
     }
     lines.push("", "Consider updating upstream content before regeneration.", "");
     return lines.join("\n");
   }
   ```

4. **Prepend advisory to output sections**
   - Location: at sections array construction (L240-253)
   - Insert after `# Document Generation Context` header, before instructions:
   ```typescript
   if (stalenessAdvisory) {
     sections.push("", stalenessAdvisory);
   }
   ```

5. **Write tests**
   - Mock `checkDocStaleness` to return warnings -> verify advisory in output
   - Mock to return empty -> verify no advisory
   - Mock to throw -> verify generation succeeds without advisory
   - Test first-time generation (no `existing_content`) -> no staleness check called

## Todo

- [x] Import `checkDocStaleness` in `generate.ts`
- [x] Add staleness check conditional (`existing_content && config_path`)
- [x] Create `buildStalenessAdvisory()` helper function
- [x] Prepend advisory to output sections
- [x] Write unit tests for advisory warning
- [x] Verify existing generate tests pass

## Success Criteria

- Regeneration with stale upstream shows advisory block at top of output
- First-time generation has no advisory
- Generation never fails due to staleness check errors
- Existing generate tests unaffected

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Warning fatigue | Low | Only on regeneration + actual drift detected |
| Latency on git operations | Low | 1-3 git log calls, sub-100ms each |
| Missing config_path | None | Advisory silently skipped |

## Security Considerations

- No new user inputs; `config_path` already validated by existing Zod schema (L53-55)
- Git operations read-only

## Next Steps

- Phase 3 adds version extraction and CHANGELOG logging
