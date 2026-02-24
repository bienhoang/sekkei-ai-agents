# Phase 2: Version Extraction Fixes (Medium — G3/G9)

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: Phase 1 (shared `extractRevisionSection`)

## Overview
- **Priority:** P1 — Medium
- **Status:** completed
- **Description:** Fix global CHANGELOG version extraction bug (uses old version) and harden `extractVersionFromContent()` against format variations.

## Key Insights
- **G3 bug:** `generate.ts` L380 calls `extractVersionFromContent(existing_content)` — extracts version from OLD document, not the regenerated output. Global CHANGELOG logs stale version.
- **G9 fragility:** `extractVersionFromContent()` only matches `^\|\s*(\d+\.\d+)\s*\|`. Fails silently on `v1.0`, `版数 1.0`, etc.

## Related Code Files
- **Modify:** `sekkei/packages/mcp-server/src/tools/generate.ts` (L376-391)
- **Modify:** `sekkei/packages/mcp-server/src/lib/changelog-manager.ts` (extractVersionFromContent)

## Implementation Steps

### G3 Fix: Correct version in global CHANGELOG

In `generate.ts` L376-391, the version should reflect the NEW state (after preservation instruction adds +0.1 row). Two options:

**Chosen approach:** Compute next version locally instead of extracting from old content.

```typescript
// generate.ts L376-391 — replace existing block
if (existing_content && config_path) {
  try {
    const { extractVersionFromContent } = await import("../lib/changelog-manager.js");
    const oldVersion = extractVersionFromContent(existing_content);
    // Compute next version (+0.1) to match what AI will write
    const nextVersion = incrementVersion(oldVersion);
    const workspacePath = dirname(config_path);
    await appendGlobalChangelog(workspacePath, {
      date: new Date().toISOString().slice(0, 10),
      docType: doc_type,
      version: nextVersion,
      changes: "Regenerated from upstream",
      author: "",
      crId: "",
    });
  } catch { /* non-blocking */ }
}
```

Add helper in `changelog-manager.ts`:
```typescript
/** Increment version by 0.1 (e.g., "1.0" → "1.1", "2.9" → "3.0") */
export function incrementVersion(version: string): string {
  if (!version) return "1.0";
  const [major, minor] = version.split(".").map(Number);
  const nextMinor = minor + 1;
  if (nextMinor >= 10) return `${major + 1}.0`;
  return `${major}.${nextMinor}`;
}
```

### G9 Fix: Harden extractVersionFromContent()

```typescript
export function extractVersionFromContent(content: string): string {
  const lines = content.split("\n");
  let capturing = false;
  let lastVersion = "";
  for (const line of lines) {
    if (/^#{1,4}\s+改訂履歴/.test(line)) { capturing = true; continue; }
    if (capturing && /^#{1,4}\s/.test(line)) break;
    if (capturing) {
      // Try standard: | 1.0 |
      const match = line.match(/^\|\s*v?(\d+\.\d+)\s*\|/);
      if (match) { lastVersion = match[1]; continue; }
      // Try inline header: | 版数 1.0 |
      const altMatch = line.match(/^\|\s*版数\s*(\d+\.\d+)\s*\|/);
      if (altMatch) { lastVersion = altMatch[1]; }
    }
  }
  if (!lastVersion) {
    logger.warn("extractVersionFromContent: no version found in 改訂履歴");
  }
  return lastVersion;
}
```

## Todo
- [ ] Add `incrementVersion()` to changelog-manager.ts
- [ ] Fix generate.ts L376-391 to use `incrementVersion(oldVersion)` instead of old version
- [ ] Harden `extractVersionFromContent()` with alternative patterns + warning log
- [ ] Build passes

## Success Criteria
- Global CHANGELOG logs version N+0.1 (not old version N)
- `extractVersionFromContent("| v1.0 |")` returns "1.0"
- Empty/malformed table logs warning and returns ""
- `incrementVersion("1.9")` returns "2.0"

## Risk Assessment
- **Low:** `incrementVersion()` is pure function, easy to test
- **Edge case:** version "9.9" → "10.0" — handle with split+math

## Next Steps
→ Phase 3: MCP auto-insert (uses `incrementVersion`)
