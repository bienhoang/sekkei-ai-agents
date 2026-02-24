# Phase 02: Code Change -> Doc Staleness Detection (C4 / ROADMAP 3.3)

## Context Links

- **Parent plan:** [plan.md](./plan.md)
- **Research:** [researcher-01-code-aware-and-staleness.md](./research/researcher-01-code-aware-and-staleness.md)
- **Existing update tool:** `src/tools/update.ts`
- **Cross-ref linker:** `src/lib/cross-ref-linker.ts` (loadChainDocs pattern)
- **Config types:** `src/types/documents.ts` (ProjectConfig)
- **Git committer:** `src/lib/git-committer.ts`

## Overview

- **Priority:** P1
- **Status:** complete
- **Effort:** ~1.5 days
- **Group:** G2 (independent, can parallel with G1)

Detect when source code changes make existing documentation stale. Analyze git diffs, map changed files to feature IDs (F-xxx, REQ-xxx) via config mapping, score staleness, and report which documents need updating. Extends the existing `analyze_update` tool and adds a new `sekkei watch` CLI command.

## Key Insights

- Three-level detection: file-level -> feature-level -> document-level (researcher-01)
- `simple-git` npm package wraps git commands cleanly; avoids raw `execFile` boilerplate
- Feature-to-file mapping stored in `sekkei.config.yaml` keeps mapping co-located with project config
- Staleness scoring: days since last doc update + number of changed files + change magnitude
- Existing `analyze_update` tool compares doc versions; new tool compares code versions against docs
- CI/CD use case: `sekkei watch --ci` exits non-zero when stale docs found

## Requirements

### Functional

1. New `feature_file_map` section in `sekkei.config.yaml` — maps feature IDs to source files/globs
2. New `src/lib/staleness-detector.ts` — git diff analysis + staleness scoring
3. Extend `analyze_update` tool with `check_staleness` mode (accepts config_path instead of doc content)
4. New CLI command: `sekkei watch` — check staleness and print report
5. Staleness report: per-feature score (0-100), affected doc types, days since last doc update
6. Support `--since <ref>` flag to compare against specific git ref (default: last tag or 30 days)

### Non-Functional

1. Git operations complete within 5s for repos up to 10,000 commits
2. No git write operations — read-only (log, diff, show)
3. Graceful handling when not in a git repo or no git installed
4. Backward compat: existing config files without `feature_file_map` still work

## Architecture

```
sekkei watch (CLI)  /  analyze_update --check-staleness (MCP)
          │
          ▼
   StalenessDetector.detect(configPath, opts)
          │
          ├── Load sekkei.config.yaml → feature_file_map
          ├── simple-git: diff --name-only <since>..HEAD
          ├── simple-git: log --format=%H,%aI for doc files
          │
          ▼
   MapChangesToFeatures(changedFiles, featureFileMap)
          │
          ├── Match changed files to feature IDs via glob patterns
          ├── Score: staleness = f(daysSinceDocUpdate, changedFileCount, linesChanged)
          │
          ▼
   StalenessReport { features: [...], overallScore, staleDocTypes }
```

### Config Extension

```yaml
# sekkei.config.yaml — new optional section
feature_file_map:
  F-001:
    label: "ユーザー認証"
    files:
      - "src/auth/**/*.ts"
      - "src/middleware/auth.ts"
  F-002:
    label: "商品管理"
    files:
      - "src/products/**/*.ts"
      - "src/models/product.ts"
  REQ-003:
    label: "検索機能"
    files:
      - "src/search/**/*.ts"
```

### Data Structures

```typescript
// src/lib/staleness-detector.ts

export interface FeatureFileMapping {
  label: string;
  files: string[];  // glob patterns
}

export interface StalenessEntry {
  featureId: string;
  label: string;
  score: number;           // 0-100 (0=fresh, 100=critically stale)
  changedFiles: string[];
  linesChanged: number;
  lastDocUpdate: string | null;  // ISO date or null if never committed
  daysSinceDocUpdate: number;
  affectedDocTypes: string[];
}

export interface StalenessReport {
  repoRoot: string;
  sinceRef: string;
  scanDate: string;
  features: StalenessEntry[];
  overallScore: number;
  staleCount: number;
  summary: string;
}

export interface StalenessOptions {
  since?: string;   // git ref: tag, branch, commit, or "30d" relative
  threshold?: number;  // score above which = stale (default: 50)
}
```

## Related Code Files

### Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/lib/staleness-detector.ts` | Git diff analysis, file-to-feature mapping, scoring | ~180 |
| `src/lib/staleness-formatter.ts` | Format StalenessReport into markdown table | ~60 |
| `src/cli/commands/watch.ts` | `sekkei watch` CLI command | ~80 |
| `tests/unit/staleness-detector.test.ts` | Unit tests for detection + scoring | ~150 |
| `tests/unit/staleness-formatter.test.ts` | Unit tests for report formatting | ~60 |

### Modify

| File | Change |
|------|--------|
| `src/tools/update.ts` | Add `check_staleness` + `config_path` params to inputSchema; branch to staleness mode |
| `src/cli/main.ts` | Register `watch` subcommand |
| `src/lib/errors.ts` | Add `STALENESS_ERROR` error code |
| `src/types/documents.ts` | Add `feature_file_map` to `ProjectConfig` interface |
| `package.json` | Add `simple-git` dependency |

## Implementation Steps

### Step 1: Install simple-git

```bash
cd sekkei/packages/mcp-server && npm install simple-git
```

### Step 2: Add error code

In `src/lib/errors.ts`, add `"STALENESS_ERROR"` to `SekkeiErrorCode` union.

### Step 3: Extend ProjectConfig

In `src/types/documents.ts`, add to `ProjectConfig`:

```typescript
/** Feature-to-file mapping for staleness detection */
feature_file_map?: Record<string, { label: string; files: string[] }>;
```

### Step 4: Create staleness-detector.ts

Core algorithm:

```typescript
// src/lib/staleness-detector.ts
import simpleGit from "simple-git";
import { minimatch } from "simple-git"; // or use built-in glob matching
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";
import type { ProjectConfig } from "../types/documents.js";

export async function detectStaleness(
  configPath: string,
  opts: StalenessOptions = {}
): Promise<StalenessReport> {
  // 1. Load config, extract feature_file_map
  // 2. Init simple-git at repo root
  // 3. Resolve `since` ref: tag, branch, or relative ("30d" → git log --since)
  // 4. git diff --name-only --stat <since>..HEAD → changedFiles + lineStats
  // 5. For each feature in map:
  //    a. Match changedFiles against feature glob patterns
  //    b. git log -1 --format=%aI for last doc commit touching that feature's output
  //    c. Calculate daysSinceDocUpdate
  //    d. Score = clamp(0-100): weight(daysSince, 0.4) + weight(changedFiles, 0.3) + weight(lines, 0.3)
  // 6. Determine affected doc types by ID prefix (F-xxx → functions-list, requirements)
  // 7. Return StalenessReport
}
```

Scoring formula:

```
ageScore = min(daysSinceDocUpdate / 90, 1.0) * 100  // 90 days = max age
fileScore = min(changedFileCount / 10, 1.0) * 100    // 10+ files = max
lineScore = min(linesChanged / 500, 1.0) * 100       // 500+ lines = max
finalScore = round(ageScore * 0.4 + fileScore * 0.3 + lineScore * 0.3)
```

### Step 5: Create staleness-formatter.ts

```typescript
// src/lib/staleness-formatter.ts
export function formatStalenessReport(report: StalenessReport): string {
  // Build markdown:
  // # Staleness Report
  // **Repo:** {repoRoot} | **Since:** {sinceRef} | **Date:** {scanDate}
  // **Overall Score:** {overallScore}/100 | **Stale Features:** {staleCount}
  //
  // | Feature | Label | Score | Changed Files | Days Since Doc Update | Status |
  // |---------|-------|-------|---------------|----------------------|--------|
  // (per entry: score >= threshold → "STALE", else "OK")
  //
  // ## Recommended Actions
  // (list stale features with affected doc types to regenerate)
}
```

### Step 6: Extend analyze_update tool

In `src/tools/update.ts`, add to inputSchema:

```typescript
check_staleness: z.boolean().optional()
  .describe("Check code-to-doc staleness via git diff analysis (requires config_path)"),
config_path: z.string().max(500).optional()
  .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
  .describe("Path to sekkei.config.yaml (required for check_staleness mode)"),
since: z.string().max(100).optional()
  .describe("Git ref to compare against (tag, branch, commit, or relative like '30d')"),
```

Branch logic: if `check_staleness` is true, call `detectStaleness(config_path, { since })` instead of Python diff.

### Step 7: Create watch CLI command

```typescript
// src/cli/commands/watch.ts
import { defineCommand } from "citty";
import { detectStaleness } from "../../lib/staleness-detector.js";
import { formatStalenessReport } from "../../lib/staleness-formatter.js";
import { cliLogger } from "../cli-logger.js";

export const watchCommand = defineCommand({
  meta: { name: "watch", description: "Check documentation staleness against code changes" },
  args: {
    config: { type: "string", default: "sekkei.config.yaml", description: "Config file path" },
    since: { type: "string", description: "Git ref to compare (default: auto-detect last tag)" },
    threshold: { type: "string", default: "50", description: "Staleness threshold (0-100)" },
    ci: { type: "boolean", default: false, description: "CI mode: exit 1 if stale docs found" },
  },
  async run({ args }) {
    const report = await detectStaleness(args.config, {
      since: args.since,
      threshold: parseInt(args.threshold, 10),
    });
    cliLogger.log(formatStalenessReport(report));
    if (args.ci && report.staleCount > 0) process.exit(1);
  },
});
```

### Step 8: Register watch in CLI main

In `src/cli/main.ts`, add:

```typescript
import { watchCommand } from "./commands/watch.js";
// In subCommands:
watch: watchCommand,
```

### Step 9: Write tests

`staleness-detector.test.ts`:
- Mock simple-git responses (diff output, log dates)
- Test file-to-feature matching with globs
- Test scoring formula with known inputs
- Test missing config section → empty report
- Test not-a-git-repo → graceful error

`staleness-formatter.test.ts`:
- Test markdown table output
- Test stale vs. OK status labels
- Test empty report formatting

## Todo List

- [ ] Install simple-git dependency
- [ ] Add STALENESS_ERROR error code to errors.ts
- [ ] Add feature_file_map to ProjectConfig in documents.ts
- [ ] Create `src/lib/staleness-detector.ts` with detectStaleness()
- [ ] Create `src/lib/staleness-formatter.ts` with formatStalenessReport()
- [ ] Extend `src/tools/update.ts` — add check_staleness mode
- [ ] Create `src/cli/commands/watch.ts` — sekkei watch command
- [ ] Register watch command in `src/cli/main.ts`
- [ ] Write `tests/unit/staleness-detector.test.ts`
- [ ] Write `tests/unit/staleness-formatter.test.ts`
- [ ] Run full test suite — verify 215+ tests still pass
- [ ] Run `npm run lint` — verify no type errors

## Success Criteria

1. `analyze_update` with `check_staleness=true` returns staleness report for mapped features
2. `sekkei watch` prints staleness report to stdout
3. `sekkei watch --ci` exits 1 when stale docs found (CI integration)
4. Repos without `feature_file_map` config → empty report, no errors
5. Non-git directories → graceful SekkeiError, not crash
6. All new tests pass; existing 215 tests unaffected

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| simple-git fails on shallow clones | Medium | Low | Detect shallow, warn user to unshallow |
| Glob matching edge cases | Low | Low | Use picomatch (bundled with simple-git) for consistency |
| Large repos with 10k+ files in diff | Low | Medium | Limit diff output; summarize at file level |
| No tags in repo → since ref fails | Medium | Low | Fallback to `--since="30 days ago"` relative date |

## Security Considerations

- config_path validated: no `..` traversal, must end `.yaml/.yml`
- simple-git runs read-only git commands only (diff, log, describe)
- No remote git operations (fetch, pull, push)
- Feature file patterns validated against repo root (no absolute paths)

## Next Steps

- CI/CD example: GitHub Actions workflow step using `sekkei watch --ci`
- Auto-regeneration: after staleness detected, optionally trigger `generate_document` for stale doc types
- Webhook mode: file watcher using chokidar for real-time dev feedback (deferred)
- Integration with Phase 01: if code-aware generation is available, auto-suggest regeneration with `--source-code`
