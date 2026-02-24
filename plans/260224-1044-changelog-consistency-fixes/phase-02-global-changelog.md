# Phase 2: Global Changelog File

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-preserve-changelog.md) (reuses extraction helpers)

## Overview

- **Priority:** P2
- **Status:** completed
- **Description:** Create `changelog-manager.ts` library and `sekkei-docs/CHANGELOG.md` that auto-tracks all document changes across the project.

## Key Insights

- Currently no aggregated view of all document changes
- CR files track per-CR, not per-project
- User wants markdown table format for readability
- Must auto-append from: generate_document (regen), CR complete, analyze_update confirm

## Requirements

### Functional
- FR1: `changelog-manager.ts` module with `appendGlobalChangelog()` function
- FR2: Creates `sekkei-docs/CHANGELOG.md` if not exists (with header)
- FR3: Appends row: 日付 | 文書 | 版数 | 変更内容 | 変更者 | CR-ID
- FR4: Called from generate.ts when regenerating (existing_content provided)
- FR5: Called from cr-propagation-actions.ts on CR complete
- FR6: Returns the appended row for downstream use

### Non-functional
- NFR1: File I/O only — no database, no complex state
- NFR2: Thread-safe append (use atomic write pattern)

## Architecture

```
changelog-manager.ts
  ├── appendGlobalChangelog(entry: ChangelogEntry): Promise<void>
  ├── readGlobalChangelog(configPath: string): Promise<ChangelogEntry[]>
  └── formatChangelogRow(entry: ChangelogEntry): string

ChangelogEntry {
  date: string;      // YYYY-MM-DD
  docType: string;   // e.g., "requirements"
  version: string;   // e.g., "1.1"
  changes: string;   // brief summary
  author: string;    // empty if unknown
  crId?: string;     // CR-260224-001 or empty
}
```

## Related Code Files

| File | Change |
|------|--------|
| `src/lib/changelog-manager.ts` | NEW — core module |
| `src/tools/generate.ts` | Import + call appendGlobalChangelog on regen |
| `src/tools/cr-propagation-actions.ts` | Call appendGlobalChangelog on CR complete |

## Implementation Steps

### Step 1: Create `changelog-manager.ts`

```typescript
// src/lib/changelog-manager.ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "./logger.js";

export interface ChangelogEntry {
  date: string;
  docType: string;
  version: string;
  changes: string;
  author: string;
  crId: string;
}

const HEADER = [
  "# 変更履歴 (Global Changelog)",
  "",
  "| 日付 | 文書 | 版数 | 変更内容 | 変更者 | CR-ID |",
  "|------|------|------|----------|--------|-------|",
].join("\n");

function formatRow(e: ChangelogEntry): string {
  return `| ${e.date} | ${e.docType} | ${e.version} | ${e.changes} | ${e.author} | ${e.crId} |`;
}

export async function appendGlobalChangelog(
  workspacePath: string,
  entry: ChangelogEntry,
): Promise<void> {
  const changelogPath = join(workspacePath, "sekkei-docs", "CHANGELOG.md");
  try {
    await mkdir(dirname(changelogPath), { recursive: true });
    let content: string;
    try {
      content = await readFile(changelogPath, "utf-8");
    } catch {
      content = HEADER;
    }
    const row = formatRow(entry);
    const updated = content.trimEnd() + "\n" + row + "\n";
    await writeFile(changelogPath, updated, "utf-8");
    logger.info({ docType: entry.docType, version: entry.version }, "Global changelog updated");
  } catch (err) {
    logger.warn({ err }, "Failed to update global changelog — non-blocking");
  }
}
```

### Step 2: Integrate with generate.ts

In `handleGenerateDocument()`, after autoCommit block (~line 318), add:
```typescript
if (existing_content && config_path) {
  try {
    const raw = await readFile(config_path, "utf-8");
    const projectCfg = parseYaml(raw) as ProjectConfig;
    const workspacePath = dirname(config_path);
    await appendGlobalChangelog(workspacePath, {
      date: new Date().toISOString().slice(0, 10),
      docType: doc_type,
      version: "",  // extracted from AI output later
      changes: `Regenerated from upstream`,
      author: "",
      crId: "",
    });
  } catch { /* non-blocking */ }
}
```

### Step 3: Integrate with CR complete action

In `cr-propagation-actions.ts`, in the complete handler, after transitioning to COMPLETED:
```typescript
await appendGlobalChangelog(workspacePath, {
  date: new Date().toISOString().slice(0, 10),
  docType: cr.origin_doc,
  version: "",
  changes: cr.description,
  author: "",
  crId: cr.id,
});
```

## Todo

- [x] Create `src/lib/changelog-manager.ts` with ChangelogEntry type + appendGlobalChangelog()
- [x] Import and call from generate.ts (on regeneration)
- [x] Import and call from cr-propagation-actions.ts (on CR complete)
- [x] Write unit test for appendGlobalChangelog (create + append scenarios)
- [x] Build & lint check

## Success Criteria

- `sekkei-docs/CHANGELOG.md` auto-created on first document change
- Rows auto-appended on: regeneration, CR completion
- Existing file content preserved (append-only)
- Non-blocking: failures logged but don't break main flow

## Risk Assessment

- **LOW:** Race condition on concurrent writes → mitigated by sequential skill flow
- **LOW:** Large changelog file → append-only, grows slowly

## Next Steps

→ Phase 3: Skill flows reference global changelog in user-facing output
