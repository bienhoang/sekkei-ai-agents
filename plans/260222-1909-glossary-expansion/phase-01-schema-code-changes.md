# Phase 1: Schema + Code Changes

## Context Links

- [Plan Overview](./plan.md)
- [Brainstorm](../reports/brainstorm-260222-1909-glossary-expansion.md)
- [glossary.ts](../../sekkei/packages/mcp-server/src/tools/glossary.ts)
- [glossary.py](../../sekkei/packages/mcp-server/python/nlp/glossary.py)
- [SKILL.md](../../sekkei/packages/skills/content/SKILL.md)

## Overview

- **Priority:** P1 -- blocks all other phases
- **Status:** completed
- **Effort:** 30min
- **Description:** Update TS Zod enum, Python allowlist/logic, and SKILL.md to support 14 industries + `vi` field

## Key Insights

- Current `INDUSTRIES` enum is hardcoded to 4 values in both TS and Python
- Python `add_term()`, `find_term()`, `export_as_markdown()`, `handle_import()` all need `vi` support
- TS `inputSchema` needs `vi` optional field added (same pattern as `ja`/`en`)
- TS `callPython` passthrough needs `vi` added to the data object
- SKILL.md references industry list in `/sekkei:init` (line ~44) and `/sekkei:glossary` (line ~412)

## Requirements

### Functional
- FR-1: TS Zod `INDUSTRIES` enum accepts all 14 industry values
- FR-2: TS `inputSchema` includes optional `vi` field for add action
- FR-3: TS passes `vi` to Python bridge
- FR-4: Python `ALLOWED_INDUSTRIES` set contains all 14 values
- FR-5: Python `add_term()` stores `vi` field
- FR-6: Python `find_term()` searches `vi` field
- FR-7: Python `export_as_markdown()` outputs 4-column table (ja/en/vi/context)
- FR-8: Python `handle_import()` copies `vi` field from template
- FR-9: SKILL.md lists all 14 industries in `/sekkei:init` and `/sekkei:glossary`

### Non-Functional
- NFR-1: Backward compat -- existing project glossaries without `vi` must not crash on `list`/`find`/`export`
- NFR-2: `vi` defaults to empty string if not provided (same as `context`)

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/tools/glossary.ts` -- Zod enum + inputSchema + callPython
- `sekkei/packages/mcp-server/python/nlp/glossary.py` -- ALLOWED_INDUSTRIES + 4 functions
- `sekkei/packages/skills/content/SKILL.md` -- industry list + glossary docs

### No changes needed
- `sekkei/packages/mcp-server/src/lib/python-bridge.ts` -- generic passthrough, no changes
- YAML glossary files -- handled in Phase 2/3

## Implementation Steps

### 1. Update `glossary.ts` (TypeScript)

**1a.** Replace `INDUSTRIES` const (line 11):
```typescript
const INDUSTRIES = [
  "finance", "medical", "manufacturing", "real-estate",
  "logistics", "retail", "insurance", "education",
  "government", "construction", "telecom", "automotive",
  "energy", "food-service", "common",
] as const;
<!-- Updated: Validation Session 1 - Added "common" for V-model/universal terms glossary -->
```

**1b.** Add `vi` to `inputSchema` (after `en` field, ~line 19):
```typescript
vi: z.string().optional().describe("Vietnamese term (for add action)"),
```

**1c.** Add `vi` to callPython data object (inside the handler, ~line 37):
```typescript
vi: vi ?? "",
```

**1d.** Update handler destructuring to include `vi` (~line 30):
```typescript
async ({ action, project_path, ja, en, vi, context, query, industry }) => {
```

### 2. Update `glossary.py` (Python)

**2a.** Replace `ALLOWED_INDUSTRIES` set (line 10):
```python
ALLOWED_INDUSTRIES = {
    "finance", "medical", "manufacturing", "real-estate",
    "logistics", "retail", "insurance", "education",
    "government", "construction", "telecom", "automotive",
    "energy", "food-service", "common",
}
<!-- Updated: Validation Session 1 - Added "common" to Python allowlist -->
```

**2b.** Update `add_term()` (line 31) -- add `vi` parameter, store in dict:
```python
def add_term(glossary: dict, ja: str, en: str, vi: str = "", context: str = "") -> dict:
    for term in glossary.get("terms", []):
        if term.get("ja") == ja:
            term["en"] = en
            if vi:
                term["vi"] = vi
            if context:
                term["context"] = context
            return glossary
    glossary.setdefault("terms", []).append({"ja": ja, "en": en, "vi": vi, "context": context})
    return glossary
```

**2c.** Update `find_term()` (line 45) -- search `vi` field too:
```python
def find_term(glossary: dict, query: str) -> list[dict]:
    results = []
    q = query.lower()
    for term in glossary.get("terms", []):
        if (q in term.get("ja", "").lower()
            or q in term.get("en", "").lower()
            or q in term.get("vi", "").lower()):
            results.append(term)
    return results
```

**2d.** Update `export_as_markdown()` (line 55) -- 4-column table:
```python
def export_as_markdown(glossary: dict) -> str:
    lines = [
        f"# 用語集 — {glossary.get('project', '')}",
        "",
        "| 日本語 | English | Tiếng Việt | コンテキスト |",
        "|--------|---------|------------|-------------|",
    ]
    for t in glossary.get("terms", []):
        lines.append(
            f"| {t.get('ja', '')} | {t.get('en', '')} | {t.get('vi', '')} | {t.get('context', '')} |"
        )
    return "\n".join(lines)
```

**2e.** Update `handle_import()` (line 94) -- copy `vi` field:
```python
glossary.setdefault("terms", []).append({
    "ja": ja,
    "en": term.get("en", ""),
    "vi": term.get("vi", ""),
    "context": term.get("context", ""),
})
```

**2f.** Update `handle_action()` add branch (line 111) -- pass `vi`:
```python
glossary = add_term(glossary, data["ja"], data["en"], data.get("vi", ""), data.get("context", ""))
```

### 3. Update `SKILL.md`

**3a.** In `/sekkei:init` step 4 (~line 43), replace industry list:
```
finance / medical / manufacturing / real-estate / logistics / retail / insurance / education / government / construction / telecom / automotive / energy / food-service / none
```

**3b.** In `/sekkei:glossary` section (~line 405-412), add `vi` mention:
- `add`: "ask for JP term, EN term, VI term, context"
- `import`: update industry list to show all 14

### 4. Build + Lint check

Run `npm run lint` from mcp-server to verify TS compiles.

## Todo List

- [ ] Update `INDUSTRIES` const in glossary.ts
- [ ] Add `vi` to inputSchema in glossary.ts
- [ ] Add `vi` passthrough in callPython data
- [ ] Update handler destructuring for `vi`
- [ ] Update `ALLOWED_INDUSTRIES` in glossary.py
- [ ] Update `add_term()` with vi parameter
- [ ] Update `find_term()` to search vi
- [ ] Update `export_as_markdown()` to 4-column
- [ ] Update `handle_import()` to copy vi
- [ ] Update `handle_action()` add branch for vi
- [ ] Update SKILL.md /sekkei:init industry list
- [ ] Update SKILL.md /sekkei:glossary docs
- [ ] Add unit tests for vi field: add_term, find_term, export, import (tests/unit/glossary.test.ts or inline in tools.test.ts)
- [ ] Run `npm run lint` -- verify no TS errors
- [ ] Run `npm test` -- verify unit tests pass
<!-- Updated: Validation Session 1 - Added unit test creation -->

## Success Criteria

- `npm run lint` passes with updated glossary.ts
- Python `glossary.py` handles all 14 industries
- `find_term()` matches on vi field
- `export_as_markdown()` produces 4-column table
- SKILL.md lists all 14 industries

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing project glossaries lack `vi` field | Medium | `term.get("vi", "")` defaults to empty string -- no crash |
| TS `vi` naming conflict with reserved words | Low | `vi` is not a TS reserved word |

## Next Steps

- After this phase, Phases 2 and 3 can start in parallel
- Phase 2 modifies existing YAML files (adds vi + expands terms)
- Phase 3 creates 10 new YAML files
