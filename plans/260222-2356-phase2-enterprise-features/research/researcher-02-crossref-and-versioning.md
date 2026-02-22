# Research Report: Cross-Reference Validation, Completeness Checking & Git Versioning

**Date:** 2026-02-22
**Scope:** Phase 2 enterprise features for Sekkei MCP server

---

## Topic 1: Cross-Reference Validation in Document Chains

### Current State (What Already Exists)

`id-extractor.ts` already has solid ID extraction:
- `ID_PATTERN` regex: `/\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG)-(\d{1,4})\b/g`
- `CUSTOM_ID_PATTERN`: `/\b([A-Z]{2,5})-(\d{1,4})\b/g` — catches project-specific prefixes
- `validator.ts`: `validateCrossRefs()` does upstream→downstream ID coverage + orphan detection

### Gap: No Multi-Hop Graph Traversal

Current impl checks only one upstream doc at a time (`upstreamContent?: string`). For full V-model traceability (F → REQ → SCR → UT), need a graph that traverses the full chain.

### Recommended Approach: Adjacency Map (No External Lib Needed)

```typescript
// Chain order determines edge direction
const CHAIN: DocType[] = ['functions-list','requirements','basic-design','detail-design','test-spec'];

// Build graph: Map<docType, Set<id>> — in-memory, built from manifest files
// BFS/DFS from any node to find reachable IDs
// Orphan = ID present in doc N that has no ancestor in doc N-1
```

Key insight: The existing `UPSTREAM_ID_TYPES` map in `validator.ts` already encodes the graph edges. Phase 2 just needs to:
1. Load all docs in chain
2. Build `Map<DocType, Set<string>>` of declared IDs
3. Run a single-pass validation across all hops — no external graph library needed (KISS)

### Orphan/Missing Detection Patterns

| Issue | Detection Method |
|-------|-----------------|
| Orphan ID | `currentIds ∌ upstreamIds` — already implemented |
| Missing coverage | `upstreamIds ∌ currentIds` — already implemented |
| Dangling chain gap | ID in doc N not traceable to doc N-2 (multi-hop) — **not yet implemented** |
| Duplicate ID | Same F-001 declared twice in functions-list — **not yet implemented** |

Duplicate detection: single `extractAllIds()` pass; if `ids.size < total matches`, duplicates exist.

---

## Topic 2: Document Completeness Checking

### Current State

`validator.ts` already covers:
- Required sections per `DocType` via `REQUIRED_SECTIONS` (heading presence, regex `^#{1,4}\s+.*{section}`)
- Required table columns via `REQUIRED_COLUMNS`
- YAML frontmatter `status` field check
- Keigo validation (delegated to `keigo-validator.ts`)

### Gaps Identified

**1. Content depth validation** — section presence ≠ section has content.

```typescript
// Pattern: section heading exists but body is empty/placeholder
function validateSectionDepth(content: string, section: string): boolean {
  const idx = content.indexOf(section);
  if (idx < 0) return false;
  // Find next heading; check char count between them
  const nextHeading = content.indexOf('\n#', idx + section.length);
  const body = content.slice(idx, nextHeading > 0 ? nextHeading : undefined).trim();
  return body.split('\n').length > 2; // heading + at least one non-empty line
}
```

**2. Table row count validation** — tables must have N data rows (not just headers).

```typescript
// Count `|` rows excluding separator row (`|---|`)
function countTableRows(content: string): number {
  return content.split('\n')
    .filter(l => l.startsWith('|') && !/^\|[-\s|]+\|$/.test(l))
    .length - 1; // minus header row
}
```

**3. JIS X 0160 / Japanese SI norms** — required sections already encoded in `REQUIRED_SECTIONS` align well with IPA/JIS expectations. The only meaningful additions for Japanese SI:
- `承認欄` must have ≥2 rows (draft + approved)
- `改訂履歴` must have ≥1 data row (not just template placeholder)
- These are already in `STRUCTURAL_SECTIONS` but not depth-checked

### Recommended Additions (YAGNI-compliant)

Only add what Phase 2 actually needs:
- `validateSectionDepth()` — warn if section body < 3 lines
- `validateRevisionHistoryRows()` — error if `改訂履歴` table has 0 data rows
- Both can be added to `validateDocument()` pipeline without new files

---

## Topic 3: Git-Based Versioning and 朱書き (Redline) Revision

### Git Integration Options

| Library | Size | Pro | Con |
|---------|------|-----|-----|
| `simple-git` | ~200KB | Fluent API, well-maintained, types included | Requires git binary |
| `isomorphic-git` | ~1MB | Pure JS, no git binary | Slower, incomplete for porcelain ops |
| `child_process` exec | 0KB | Zero deps | Manual parsing |

**Recommendation: `simple-git`** — the project already uses `child_process` for Python bridge; `simple-git` gives cleaner API for `git diff`, `git log`, `git add`, `git commit` without reinventing the wheel.

### Key APIs for Document Versioning

```typescript
import simpleGit from 'simple-git';
const git = simpleGit(projectDir);

// Auto-commit on generation
await git.add(outputPath);
await git.commit(`[sekkei] ${docType} v${version} generated`);

// Get diff for redline
const diff = await git.diff(['HEAD~1', 'HEAD', '--', outputPath]);
// Or diff between two versions
const diff = await git.diff([`${tagA}..${tagB}`, '--', outputPath]);
```

### 朱書き (Redline) Strategy

Two approaches depending on output format:

**Excel (openpyxl — already in Python layer):**
```python
# diff_analyzer.py already exists — extend it
from openpyxl.styles import Font, PatternFill

RED_FONT = Font(color="FF0000")
STRIKETHROUGH = Font(color="FF0000", strike=True)
YELLOW_FILL = PatternFill("solid", fgColor="FFFF00")

# Parse unified diff → apply RED_FONT to added lines, STRIKETHROUGH to removed lines
```

**Markdown → PDF redline:**
- Parse unified diff output (`+line` / `-line`)
- Wrap added spans in `<ins style="color:red">`, removed in `<del style="color:red;text-decoration:line-through">`
- Pass augmented HTML to existing WeasyPrint PDF exporter

### Auto-Commit Pattern (Best Practices)

```typescript
// Convention: tag each generated version
await git.addTag(`sekkei/${docType}/v${semver}`);

// Commit message convention (follows Conventional Commits):
// "docs(sekkei): generate requirements v1.2.0"
// This allows git log --grep="docs(sekkei)" for audit trail
```

**Important constraint:** Auto-commit only if `git status` shows the file is tracked and the repo is clean (no uncommitted user changes). Use `git status --porcelain` to check before committing.

### Diff Input for Python Bridge

Extend existing `python/cli.py` `diff` action (already whitelisted in `python-bridge.ts`):
```json
{
  "action": "diff",
  "file": "requirements.md",
  "base_ref": "HEAD~1",
  "head_ref": "HEAD",
  "format": "redline-excel"  // or "redline-pdf"
}
```

`diff_analyzer.py` already exists — only needs to accept `base_ref`/`head_ref` and call `git show {ref}:{file}` via subprocess to fetch file contents at each revision.

---

## Summary of Phase 2 Implementation Scope

| Feature | New Files | Changes to Existing |
|---------|-----------|-------------------|
| Multi-hop graph traceability | none | `validator.ts` — add `validateChain()` |
| Duplicate ID detection | none | `id-extractor.ts` — add `findDuplicates()` |
| Section depth validation | none | `validator.ts` — add `validateSectionDepth()` |
| Revision history row check | none | `validator.ts` — extend `validateTableStructure()` |
| Git auto-commit | `lib/git-manager.ts` (new, ~60 lines) | `tools/generate.ts` — call after write |
| Redline Excel/PDF | none | `python/nlp/diff_analyzer.py` — extend |

**All changes are additive. No existing interfaces broken.**

---

## Unresolved Questions

1. Does the project's output directory always reside inside a git repo? If not, `git-manager.ts` needs graceful no-op fallback.
2. Should duplicate IDs be `error` or `warning` severity? (Likely error for F-/REQ-, warning for CLS-/DD-)
3. Is section depth validation (line count heuristic) reliable enough, or does it need NLP-based emptiness detection?
4. `simple-git` adds a runtime dependency — is that acceptable, or prefer raw `child_process` calls for consistency with Python bridge pattern?
