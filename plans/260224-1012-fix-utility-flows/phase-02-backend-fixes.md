# Phase 2: Backend Fixes

## Context

- Parent: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260224-1012-validate-glossary-update-flows.md`
- Bugs: B8 (Python/TS ID regex mismatch), B9 (staleness git.log not per-feature)
- Improvements: IMP-U2, IMP-U3

## Overview

- **Priority:** Medium
- **Status:** complete
- **Description:** Fix Python ID regex to match TS whitelist; fix staleness detector to use per-feature doc paths instead of whole outputDir.
- **Parallel with Phase 1:** Yes — no file overlap

## Key Insights

- TS `id-extractor.ts` L18 uses whitelisted prefixes: `F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG|EV|MTG|ADR|IF|PG`
- Python `diff_analyzer.py` L33 uses `r"\b[A-Z]{1,5}-\d{1,4}\b"` — catches everything including `JP-001`, `AWS-123`
- Staleness `git.log({ file: outputDir })` at L187-188 queries entire output dir, giving all features same `lastDocUpdate`
- `getAffectedDocTypes()` at L69-83 maps feature ID prefixes to doc types — can derive per-feature doc paths

## Related Code Files

**Modify:**
- `sekkei/packages/mcp-server/python/nlp/diff_analyzer.py` L31-33 — ID regex
- `sekkei/packages/mcp-server/src/lib/staleness-detector.ts` L185-201 — git.log scope

**Reference (read-only):**
- `sekkei/packages/mcp-server/src/lib/id-extractor.ts` L7-14 — ID_TYPES whitelist
- `sekkei/packages/mcp-server/tests/unit/staleness-detector.test.ts` — existing tests

## Implementation Steps

### S1: Sync Python ID regex with TS whitelist (B8, IMP-U2)

**File:** `sekkei/packages/mcp-server/python/nlp/diff_analyzer.py`

Replace L31-33:
```python
def extract_ids(content: str) -> set[str]:
    """Extract all cross-reference IDs from content."""
    return set(re.findall(r"\b[A-Z]{1,5}-\d{1,4}\b", content))
```

With:
```python
# Whitelisted ID prefixes — must match id-extractor.ts ID_TYPES
_ID_PREFIXES = (
    "F", "REQ", "NFR", "SCR", "TBL", "API",
    "CLS", "DD", "TS",
    "UT", "IT", "ST", "UAT",
    "SEC", "PP", "TP",
    "OP", "MIG",
    "EV", "MTG", "ADR", "IF", "PG",
)
_ID_PATTERN = re.compile(
    r"\b(" + "|".join(_ID_PREFIXES) + r")-\d{1,4}\b"
)

def extract_ids(content: str) -> set[str]:
    """Extract all cross-reference IDs from content.
    Uses whitelisted prefixes matching id-extractor.ts ID_TYPES.
    """
    return set(_ID_PATTERN.findall_with_full_match(content))
```

**Note:** `re.findall` with groups returns group matches, not full match. Use a non-capturing group:
```python
_ID_PATTERN = re.compile(
    r"\b(?:" + "|".join(_ID_PREFIXES) + r")-\d{1,4}\b"
)

def extract_ids(content: str) -> set[str]:
    """Extract all cross-reference IDs from content.
    Uses whitelisted prefixes matching id-extractor.ts ID_TYPES.
    """
    return set(_ID_PATTERN.findall(content))
```

### S2: Fix staleness detector per-feature doc paths (B9, IMP-U3)

**File:** `sekkei/packages/mcp-server/src/lib/staleness-detector.ts`

Replace L185-201 (the `git.log` block inside the feature loop):

```typescript
// BEFORE (B9 bug — queries entire outputDir):
const logResult = await git.log({
  file: outputDir,
  maxCount: 1,
  format: { aI: "%aI" },
});
```

With per-feature doc path resolution:

```typescript
// Get doc types affected by this feature for per-feature doc tracking
const affectedTypes = getAffectedDocTypes(featureId);
const featureDocPaths = affectedTypes.map((dt) =>
  resolve(outputDir, dt.replace(/-/g, "-"), `${dt}.md`)
);

// Query git log for feature-specific doc paths only
const logResult = await git.log({
  file: featureDocPaths.length === 1 ? featureDocPaths[0] : outputDir,
  maxCount: 1,
  format: { aI: "%aI" },
  // simple-git doesn't support multiple --follow paths;
  // use raw for multi-path
});
```

**Better approach** — use `git.raw()` for multiple paths:

```typescript
const affectedTypes = getAffectedDocTypes(featureId);
// Build doc paths: outputDir/xx-doc-type/doc-type.md
const featureDocPaths = affectedTypes.map((dt) => {
  const dirPrefix = DOC_DIR_MAP[dt] ?? dt;
  return `${outputDir}/${dirPrefix}/${dt}.md`;
});

try {
  // git log with multiple paths
  const logOutput = await git.raw([
    "log", "-1", "--format=%aI", "--", ...featureDocPaths,
  ]);
  const trimmed = logOutput.trim();
  if (trimmed) {
    lastDocUpdate = trimmed;
    const docDate = new Date(lastDocUpdate).getTime();
    daysSinceDocUpdate = Math.round((Date.now() - docDate) / 86_400_000);
  }
} catch {
  daysSinceDocUpdate = 90; // assume worst case
}
```

Need a `DOC_DIR_MAP` constant mapping doc types to directory names. Check if `resolve-output-path.ts` has this — reuse if possible. Otherwise define minimal map:

```typescript
const DOC_DIR_MAP: Record<string, string> = {
  "requirements": "02-requirements",
  "functions-list": "03-functions-list",
  "basic-design": "03-basic-design",
  "detail-design": "05-features",
  // etc. — or import from resolve-output-path
};
```

**Preferred:** Import path resolution from existing `resolveOutputPath()` if it returns directory info. Check at implementation time.

## Todo

- [x] S1: Sync Python ID regex with TS whitelist in diff_analyzer.py
- [x] S2: Fix staleness-detector.ts to use per-feature doc paths via git.raw()

## Success Criteria

- Python `extract_ids("AWS-123 REQ-001")` returns only `{"REQ-001"}`, not `{"AWS-123", "REQ-001"}`
- Staleness detector gives different `lastDocUpdate` values for features that have different doc update times
- All existing tests still pass
- Build + lint clean

## Risk Assessment

- **Python regex change:** May break diff results if any real doc uses non-standard IDs. Low risk — standard Sekkei docs only use whitelisted prefixes.
- **Staleness git.raw:** `git log -1 --format=%aI -- path1 path2` works with multiple paths. If doc paths don't exist in git history, returns empty string (handled).
- **DOC_DIR_MAP:** Must match actual directory structure. Prefer importing from existing path resolver.

## Next Steps

- Phase 3: Tests for both backend changes
