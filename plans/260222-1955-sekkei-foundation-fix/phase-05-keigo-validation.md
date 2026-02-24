# Phase 05: Keigo Validation Layer

## Context Links

- Research: [researcher-01-node-export-and-tooling.md](./research/researcher-01-node-export-and-tooling.md) §3
- Research: [researcher-02-jp-si-standards.md](./research/researcher-02-jp-si-standards.md) §2
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §B2
- Phase 04: [phase-04-template-presets.md](./phase-04-template-presets.md) — preset affects expected keigo per doc-type
- Phase 06: [phase-06-lifecycle-status.md](./phase-06-lifecycle-status.md) — independent; no type dependency
<!-- Updated: Validation Session 1 - Removed Phase 06 dependency; Phase 05+06 can run in parallel -->
- Existing validator: `sekkei/packages/mcp-server/src/lib/validator.ts`
- Existing validate tool: `sekkei/packages/mcp-server/src/tools/validate.ts`
- Types: `sekkei/packages/mcp-server/src/types/documents.ts` (`KeigoLevel`, `DocType`)

---

## Overview

- **Priority:** P1 — keigo inconsistency is a primary quality complaint from BrSE/PM
- **Status:** pending
- **Description:** Create `src/lib/keigo-validator.ts` with regex-based keigo detection. Integrate into `validate_document` tool as an additional check. Returns keigo issues as `ValidationIssue` entries with `type: "keigo_violation"`. Warning-only mode (no auto-fix).

---

## Key Insights

From researcher-01 (no viable npm package for keigo; custom regex is the only practical approach):
- Regex patterns reliable enough for formal spec docs (docs should be uniformly one style)
- False positives exist (e.g., `する。` can appear in teineigo context mid-sentence) — use *dominant count* heuristic, not per-sentence classification
- Mixed detection: flag when both 丁寧語 and 常体 indicators appear in significant quantities

From researcher-02 (keigo by doc type):
- `requirements` → 丁寧語 (client-facing; stakeholders sign off)
- `basic-design` → 丁寧語 (standard/enterprise) or mixed (acceptable)
- `detail-design` → 常体 (developer-only; brevity preferred)
- `test-spec` → 常体 (table-heavy; labels and 体言止め)
- `functions-list`, `overview` → 丁寧語

From Phase 04 (preset interaction):
- Enterprise preset: 丁寧語 for ALL doc types
- Standard preset: matches per-doc-type defaults above
- Agile preset: 常体 for ALL doc types

Existing `validator.ts` already has `keigo_violation` in `ValidationIssue.type` union and imports `KEIGO_MAP` from `generation-instructions.ts` — scaffold exists, just not implemented.

---

## Requirements

### Functional
- Detect keigo level in document content: `teineigo` | `keigo` | `joutai` | `mixed`
- Compare detected level against expected level for (doc_type × preset)
- Return `ValidationIssue[]` with `type: "keigo_violation"`, `severity: "warning"`
- Issues include: detected level, expected level, dominant pattern counts
- Mixed keigo within same document flagged as separate issue
- Common BrSE mistakes flagged as specific warnings:
  - Over-keigo in 詳細設計書 (e.g., `〜させていただきます` in developer-only doc)
  - Verbose nominalization: `削除処理を行う` pattern
  - `処理` overuse (>5 occurrences per 500 chars)
- `validate_document` tool: keigo check runs automatically when `doc_type` provided
- No auto-fix — warning-only (flag for human review)

### Non-functional
- Pure TypeScript, no external deps
- Regex patterns compiled once at module load (not per call)
- Keigo check adds <10ms overhead to validation
- File under 200 lines

---

## Architecture

```
src/lib/keigo-validator.ts        (NEW)
  ├── KEIGO_PATTERNS               (compiled regex map)
  ├── EXPECTED_KEIGO               (doc_type × preset → expected level)
  ├── detectKeigoLevel()           (count matches → classify)
  ├── detectMixedKeigo()           (flag when both teineigo + joutai significant)
  ├── detectBrseMistakes()         (over-keigo, verbose nominalization, 処理 overuse)
  └── validateKeigo()              (main export → ValidationIssue[])

src/lib/validator.ts              (MODIFY)
  └── validateDocument()           (call validateKeigo(), merge issues)

src/tools/validate.ts             (no change needed — issues surface via existing result)
```

### Keigo Pattern Map

```ts
const KEIGO_PATTERNS = {
  teineigo: [
    /です[。\n]/g,        // desu
    /ます[。\s\n]/g,       // masu
    /ました[。\n]/g,        // mashita
    /ません[。\n]/g,        // masen
    /でしょう[。\n]/g,      // deshou
  ],
  keigo: [
    /いたします/g,          // itashimasu
    /ございます/g,          // gozaimasu
    /申し上げます/g,         // moushiagemasu
    /させていただ/g,         // sasete itadaku
    /拝察/g,
  ],
  joutai: [
    /である[。\n]/g,        // de aru
    /とする[。\n]/g,        // to suru
    /できる[。\n]/g,        // dekiru (plain)
    /ない[。\n]/g,          // nai
    /べき[。\n]/g,          // beki
  ],
  verbose_patterns: [
    /削除処理を行う/g,
    /更新処理を行う/g,
    /検索処理を行う/g,
    /〜を行っていただく/g,
    /〜となります/g,
  ],
} as const;
```

### Expected Keigo Matrix

```ts
const EXPECTED_KEIGO: Record<DocType, Record<Preset | "default", "teineigo" | "joutai" | "any">> = {
  "requirements":   { enterprise: "teineigo", standard: "teineigo", agile: "joutai",   default: "teineigo" },
  "basic-design":   { enterprise: "teineigo", standard: "any",      agile: "joutai",   default: "any" },
  "detail-design":  { enterprise: "teineigo", standard: "joutai",   agile: "joutai",   default: "joutai" },
  "test-spec":      { enterprise: "teineigo", standard: "joutai",   agile: "joutai",   default: "joutai" }, // Validated: enterprise=teineigo confirmed
  <!-- Updated: Validation Session 1 - Enterprise test-spec keigo confirmed as 丁寧語 -->
  "functions-list": { enterprise: "teineigo", standard: "teineigo", agile: "joutai",   default: "teineigo" },
  "overview":       { enterprise: "teineigo", standard: "teineigo", agile: "any",      default: "teineigo" },
  // matrices, operation-design, migration-design → "any"
};
```

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/lib/validator.ts` — import `validateKeigo`; call in `validateDocument()` when `doc_type` provided; append keigo issues to result
- `sekkei/packages/mcp-server/src/types/documents.ts` — `KeigoLevel` already has `"丁寧語" | "謙譲語" | "simple"`; add `"mixed"` to detected level type (internal, not exposed in MCP schema)

### Create
- `sekkei/packages/mcp-server/src/lib/keigo-validator.ts` — keigo detection + validation (≤200 lines)

### Tests to Create
- `sekkei/packages/mcp-server/tests/unit/keigo-validator.test.ts`

---

## Implementation Steps

1. **Create `src/lib/keigo-validator.ts`:**
   - Define `KEIGO_PATTERNS` constant (compiled regex arrays as shown above)
   - Define `EXPECTED_KEIGO` matrix
   - `detectKeigoLevel(text: string): { level: 'teineigo'|'keigo'|'joutai'|'mixed', counts: Record<string,number> }`:
     - Count matches for each pattern group
     - `keigo` counts fold into `teineigo` (keigo is a superset of teineigo for our purposes)
     - Detect mixed: `joutai > 3 && teineigo > 3` → `mixed`
     - Otherwise: return dominant (highest count)
   - `detectBrseMistakes(text: string, docType: DocType): ValidationIssue[]`:
     - Over-keigo in 詳細設計書: detect `させていただ` in `detail-design` or `test-spec`
     - Verbose nominalization: detect `verbose_patterns` matches
     - `処理` density: count `/処理/g` matches; flag if > 5 per 500 chars
   - `validateKeigo(text: string, docType: DocType, preset?: Preset): ValidationIssue[]`:
     - Get expected level from `EXPECTED_KEIGO[docType][preset ?? 'default']`
     - If expected is `"any"`: skip level check, still run BrSE mistake detection
     - Detect actual level
     - If `mixed`: add `keigo_violation` warning "混在した敬語レベルが検出されました"
     - If actual ≠ expected (and expected ≠ "any"): add `keigo_violation` warning with detected/expected
     - Run `detectBrseMistakes()`; append those issues
     - Return all issues

2. **Update `src/lib/validator.ts`:**
   - Import `validateKeigo` from `./keigo-validator.js`
   - In `validateDocument(content, docType, upstreamContent)`: after existing checks, call `validateKeigo(content, docType)` and push results into `result.issues`
   - Note: preset not available in `validateDocument` signature currently — for now, use `"default"` preset; future: add optional `preset` param

3. **Write tests `tests/unit/keigo-validator.test.ts`:**
   ```ts
   // Test cases:
   // teineigo text detected as teineigo
   // joutai text detected as joutai
   // mixed text flagged as mixed
   // requirements doc with joutai → keigo_violation warning
   // detail-design doc with teineigo → keigo_violation warning
   // enterprise preset: detail-design with joutai → NO violation (expected teineigo? test enterprise=teineigo)
   // BrSE mistake: させていただ in detail-design → violation
   // verbose pattern: 削除処理を行う → violation
   // empty text → no issues
   ```

4. **`npm run lint`** — verify no TS errors
5. **`npm test`** — 142 existing + new keigo tests pass

---

## Todo List

- [ ] Create `src/lib/keigo-validator.ts`
  - [ ] `KEIGO_PATTERNS` compiled regex map
  - [ ] `EXPECTED_KEIGO` matrix (all doc types × presets)
  - [ ] `detectKeigoLevel()` with count heuristic
  - [ ] `detectBrseMistakes()` (over-keigo, verbose, 処理 density)
  - [ ] `validateKeigo()` main export
- [ ] Update `src/lib/validator.ts` — call `validateKeigo()` in `validateDocument()`
- [ ] Write `tests/unit/keigo-validator.test.ts` (≥8 test cases)
- [ ] `npm run lint` passes
- [ ] `npm test` passes (142 existing + new tests)

---

## Success Criteria

- `validate_document` on a 要件定義書 written in 常体 returns at least 1 `keigo_violation` warning
- `validate_document` on a 詳細設計書 written in 常体 returns 0 keigo violations (expected joutai)
- Mixed keigo (です + である in same doc) flagged as `keigo_violation` with "混在" message
- `させていただ` in 詳細設計書 flagged as over-keigo
- All 142 existing tests still pass
- Keigo check adds <10ms to validation (no regex catastrophic backtracking)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives in joutai detection: `する。` appears in teineigo docs (e.g., "利用する。のは可能です") | Medium | Require ≥3 matches before flagging; tune threshold with real doc samples |
| Regex backtracking on very large documents (>100KB) | Low | All patterns are simple non-nested; no catastrophic backtracking risk |
| `EXPECTED_KEIGO` matrix incomplete for `crud-matrix`, `traceability-matrix` | Low | Default to `"any"` for matrix types — skip keigo check |
| Adding keigo issues changes validation output → breaks existing `validate-tool.test.ts` | Medium | Check existing tests; keigo issues are `severity: "warning"` so `result.valid` unchanged for warning-only |

---

## Security Considerations

- Pure regex on user-provided content — no eval, no external calls
- Large input (>500KB) already blocked by Zod `max(500_000)` in validate tool schema

---

## Next Steps

- Phase 04 (presets): once preset is passed into validator, `EXPECTED_KEIGO` matrix becomes fully used
- Future: add `--fix` mode that auto-rewrites 〜します → 〜する for 常体 docs (Phase 2 roadmap)
- Future: `処理` over-use warning can suggest specific replacements using glossary (Phase 2)
