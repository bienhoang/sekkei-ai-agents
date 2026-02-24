# Phase 4: Validation

## Context Links

- [Plan Overview](./plan.md)
- [Phase 1](./phase-01-schema-code-changes.md) -- code changes
- [Phase 2](./phase-02-expand-existing-glossaries.md) -- expanded 4 existing files
- [Phase 3](./phase-03-create-new-glossaries.md) -- created 10 new files
- [glossary.py](../../sekkei/packages/mcp-server/python/nlp/glossary.py)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 30min
- **Description:** Validate all 14 glossary files for structure, counts, duplicates. Test import flow end-to-end.

## Key Insights

- YAML parse errors are the most likely issue (malformed unicode, bad indentation)
- Cross-industry duplicate `ja` terms are acceptable (same concept in different industries)
- Within-industry duplicate `ja` terms are NOT acceptable (causes `add_term` update-instead-of-add)
- Empty `vi` fields indicate missed translations -- must be caught
- `handle_import()` is the critical code path to test for all 14 industries

## Requirements

### Functional
- FR-1: All 14 YAML files parse without error via `yaml.safe_load()`
- FR-2: Each file has 200-300 terms
- FR-3: No duplicate `ja` values within any single file
- FR-4: Every term has non-empty `ja`, `en`, `vi`, `context` fields
- FR-5: `manage_glossary import` succeeds for all 14 industries
- FR-6: `manage_glossary find` searches `vi` field correctly
- FR-7: `manage_glossary export` produces 4-column markdown table

### Non-Functional
- NFR-1: TS `npm run lint` passes
- NFR-2: No regression in existing glossary operations (add, list, find, export)

## Related Code Files

### Validate (read-only)
- `sekkei/packages/mcp-server/templates/glossaries/*.yaml` -- all 14 files
- `sekkei/packages/mcp-server/src/tools/glossary.ts` -- updated TS
- `sekkei/packages/mcp-server/python/nlp/glossary.py` -- updated Python

## Implementation Steps

### 1. YAML Structure Validation

Write/run a quick validation script (Python one-liner or small script) against all 14 files:

```python
import yaml, sys
from pathlib import Path

glossaries_dir = Path("sekkei/packages/mcp-server/templates/glossaries")
errors = []

for f in sorted(glossaries_dir.glob("*.yaml")):
    data = yaml.safe_load(f.read_text(encoding="utf-8"))
    terms = data.get("terms", [])
    industry = data.get("industry", "MISSING")
    count = len(terms)

    # Check count range
    if count < 200 or count > 300:
        errors.append(f"{f.name}: {count} terms (expected 200-300)")

    # Check required fields
    seen_ja = set()
    for i, t in enumerate(terms):
        for field in ["ja", "en", "vi", "context"]:
            if not t.get(field):
                errors.append(f"{f.name}[{i}]: empty '{field}' -- ja={t.get('ja','?')}")
        ja = t.get("ja", "")
        if ja in seen_ja:
            errors.append(f"{f.name}[{i}]: duplicate ja='{ja}'")
        seen_ja.add(ja)

    print(f"OK: {f.name} -- {industry} -- {count} terms")

if errors:
    print(f"\nERRORS ({len(errors)}):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\nAll 14 files valid.")
```

### 2. Term Count Summary

Generate a summary table:

| Industry | File | Terms | Sub-contexts | Avg/context |
|----------|------|-------|-------------|-------------|
| finance | finance.yaml | ~250 | 8 | ~31 |
| medical | medical.yaml | ~250 | 8 | ~31 |
| manufacturing | manufacturing.yaml | ~250 | 8 | ~31 |
| real-estate | real-estate.yaml | ~250 | 8 | ~31 |
| logistics | logistics.yaml | ~250 | 8 | ~31 |
| retail | retail.yaml | ~250 | 8 | ~31 |
| insurance | insurance.yaml | ~250 | 8 | ~31 |
| education | education.yaml | ~250 | 8 | ~31 |
| government | government.yaml | ~250 | 8 | ~31 |
| construction | construction.yaml | ~250 | 8 | ~31 |
| telecom | telecom.yaml | ~250 | 8 | ~31 |
| automotive | automotive.yaml | ~250 | 8 | ~31 |
| energy | energy.yaml | ~250 | 8 | ~31 |
| food-service | food-service.yaml | ~250 | 8 | ~31 |
| **Total** | **14 files** | **~3,500** | **112** | -- |

### 3. Cross-Industry Duplicate Check (informational only)

Check for `ja` terms appearing in multiple industries. These are expected (e.g., "API連携" in many industries) but worth logging for awareness:

```python
from collections import Counter
all_ja = Counter()
for f in glossaries_dir.glob("*.yaml"):
    data = yaml.safe_load(f.read_text(encoding="utf-8"))
    for t in data.get("terms", []):
        all_ja[t.get("ja", "")] += 1
dupes = {k: v for k, v in all_ja.items() if v > 1}
print(f"Cross-industry shared terms: {len(dupes)}")
```

### 4. Import Flow Test

Test `manage_glossary import` for each of the 14 industries:

```bash
# From mcp-server directory
cd sekkei/packages/mcp-server

# Test each industry import into a temp glossary file
for industry in finance medical manufacturing real-estate logistics retail insurance education government construction telecom automotive energy food-service; do
  echo "{\"action\":\"import\",\"project_path\":\"/tmp/test-glossary-${industry}.yaml\",\"industry\":\"${industry}\"}" | \
    python3 python/nlp/glossary.py
  echo "Import $industry: $?"
done
```

Verify each returns `{"success": true, "imported": N, "skipped": 0}` where N matches term count.

### 5. Find + Export Test

Test that `vi` field works in find and export:

```bash
# Test find with Vietnamese query
echo '{"action":"find","project_path":"/tmp/test-glossary-finance.yaml","query":"tài khoản"}' | \
  python3 python/nlp/glossary.py
# Should return matches

# Test export produces 4-column table
echo '{"action":"export","project_path":"/tmp/test-glossary-finance.yaml"}' | \
  python3 python/nlp/glossary.py
# Should show: | 日本語 | English | Tiếng Việt | コンテキスト |
```

### 6. TypeScript Lint Check

```bash
cd sekkei/packages/mcp-server
npm run lint
```

Verify no TS compilation errors from glossary.ts changes.

### 7. Cleanup

Remove temp test files:
```bash
rm -f /tmp/test-glossary-*.yaml
```

## Todo List

- [ ] Run YAML structure validation script on all 14 files
- [ ] Verify each file has 200-300 terms
- [ ] Verify no within-industry duplicate `ja` values
- [ ] Verify no empty `ja`/`en`/`vi`/`context` fields
- [ ] Run cross-industry duplicate check (informational)
- [ ] Test `manage_glossary import` for all 14 industries
- [ ] Test `manage_glossary find` with Vietnamese query
- [ ] Test `manage_glossary export` produces 4-column table
- [ ] Run `npm run lint` -- verify TS compiles
- [ ] Clean up temp test files
- [ ] Fix any errors found and re-validate

## Success Criteria

- All 15 YAML files pass structure validation (0 errors)
- Total term count: 3,050-4,500 range (14 x 200-300 + ~50 common)
- Unit tests pass (`npm test`)
<!-- Updated: Validation Session 1 - Updated to 15 files, added unit test check -->
- Import succeeds for all 14 industries
- Find returns results when searching Vietnamese terms
- Export markdown has 4 columns (ja/en/vi/context)
- `npm run lint` passes
- No regression: existing add/list operations still work

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unicode encoding issues in YAML | Medium | Ensure UTF-8 encoding; test with `yaml.safe_load()` |
| Python import path issues when testing | Low | Run from mcp-server directory; use absolute paths |
| Validation script misses edge cases | Low | Manual spot-check 2-3 files after script passes |

## Next Steps

- After validation passes, the glossary expansion is complete
- Update plan.md status to `completed`
- Consider adding glossary tests to the existing test suite (future improvement)
