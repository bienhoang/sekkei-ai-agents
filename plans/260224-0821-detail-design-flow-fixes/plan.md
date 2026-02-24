---
status: pending
created: 2026-02-24
report: plans/reports/brainstorm-260224-0815-detail-design-flow-review.md
---

# Plan: Detail-Design Flow Fixes (D1-D7 + IMP-1, IMP-3)

## Overview

Fix 7 bugs + 2 improvements found in brainstorm review of `/sekkei:detail-design` flow.
Skip IMP-2 (split shared sections) and IMP-4 (DD-xxx scope) — low priority, needs design first.

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `sekkei/packages/skills/content/references/phase-design.md` | D1-D6 (skill flow) |
| 2 | `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md` | Mirror D1-D6 |
| 3 | `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts` | IMP-3 (monolithic path) |
| 4 | `sekkei/packages/mcp-server/src/lib/completeness-rules.ts` | IMP-1 (depth rules) |
| 5 | `sekkei/packages/mcp-server/tests/unit/resolve-output-path.test.ts` | Update test for IMP-3 |

## Phase 1: Skill Flow Fixes (phase-design.md)

Replace lines 128-170 with corrected detail-design flow:

### D1 — Prerequisite guard
Add before interview questions:
```
**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/03-system/basic-design.md` exists (or `chain.basic_design.status == "complete"`)
   - If missing → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. Read basic-design content as primary upstream
3. Optionally load additional upstream:
   - If `chain.requirements.output` exists → read as additional upstream
   - If `chain.functions_list.output` exists → read as additional upstream
4. Concatenate all as `upstream_content` (basic-design + requirements + functions-list)
```

### D2 — Upstream content loading
Step 5a (monolithic) change to:
```
a. Use `upstream_content` prepared in prerequisite check above
b. Call MCP tool `generate_document` with doc_type: "detail-design",
   language from config, input_content: @input, upstream_content: upstream
```
Step 4 (split) also add upstream loading:
```
a. Use `upstream_content` from prerequisite check
b. Read functions-list → extract feature groups (大分類)
... (pass upstream_content to each generate_document call)
```

### D3 — validate_document call
Add step 7:
```
7. Call MCP tool `validate_document` with saved content and `doc_type: "detail-design"`.
   Show results as non-blocking.
```

### D4 — update_chain_status format
Replace step 6:
```
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "detail_design"`,
   `status: "complete"`, `output: "05-features/detail-design.md"`
```

### D5 — Next steps suggestion
Add step 8:
```
8. Suggest next steps:
   > "Detail design complete. Next steps:
   > - `/sekkei:ut-spec` — generate 単体テスト仕様書
   > - `/sekkei:validate @detail-design` — validate cross-references"
```

### D6 — Output path
Change monolithic save from `./sekkei-docs/detail-design.md` to:
```
d. Save output to `{output.directory}/05-features/detail-design.md`
```

## Phase 2: Backend Code Fixes

### IMP-3 — resolve-output-path.ts
Add monolithic fallback for detail-design:
```typescript
if (docType === "detail-design") {
  if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
  return "05-features/detail-design.md";  // ← ADD monolithic default
}
```

### IMP-1 — completeness-rules.ts
Add depth rules for detail-design:
```typescript
"detail-design": [
  {
    check: "class table",
    test: (c) => /\|\s*CLS-\d+/.test(c),
    message: "詳細設計書: クラス一覧テーブルにCLS-xxxが必要です",
  },
],
```

## Phase 3: Tests

### resolve-output-path.test.ts
Change existing test:
```typescript
// FROM:
it("returns undefined for detail-design without scope", () => {
  expect(resolveOutputPath("detail-design")).toBeUndefined();
});
// TO:
it("returns 05-features/detail-design.md for detail-design monolithic", () => {
  expect(resolveOutputPath("detail-design")).toBe("05-features/detail-design.md");
});
```

## Phase 4: Adapter Sync + Build Verify

1. Mirror all phase-design.md changes to `adapters/claude-code/SKILL.md`
2. Run `npm run lint` in mcp-server/
3. Run `npm run test:unit` in mcp-server/

## Success Criteria
- [ ] Prerequisite guard blocks if basic-design missing
- [ ] Upstream content explicitly loaded (bd + req + fl)
- [ ] validate_document called after generation
- [ ] Output path uses `{output.directory}/05-features/`
- [ ] resolve-output-path returns `05-features/detail-design.md` for monolithic
- [ ] completeness-rules checks CLS-xxx presence
- [ ] All tests pass
- [ ] Adapter SKILL.md mirrored
