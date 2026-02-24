# Phase 05: Backlog Integration (D4) — Optional/Deferred

## Context Links

- **Parent plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-google-docs-and-backlog.md](./research/researcher-02-google-docs-and-backlog.md)
- **Existing export tool:** `src/tools/export.ts`
- **Cross-ref linker:** `src/lib/cross-ref-linker.ts` (ID extraction patterns)
- **ID extractor:** `src/lib/id-extractor.ts`
- **Config types:** `src/types/documents.ts` (ProjectConfig)

## Overview

- **Priority:** P3 (optional, deferred pending customer validation)
- **Status:** deferred
- **Effort:** ~1.5 days
- **Group:** G5 (last, after all core features)

Bidirectional sync between Sekkei document IDs (REQ-xxx, F-xxx, UT-xxx) and Nulab Backlog issues. Push requirements as Backlog issues; pull issue status updates back into documents. Enables BrSE/PM to track spec implementation progress in the same tool their Japanese SI partners use.

**IMPORTANT:** Researcher-02 flags ROI risk. Backlog is popular in Japanese startups/mid-market but SI firm adoption is unclear. This phase should NOT be built until at least one paying customer confirms Backlog usage. Consider community contribution model.

## Key Insights

- `backlog-js` npm package: official Nulab TypeScript client, full API v2 coverage
- Auth: API key (simplest) or OAuth2 token
- Bidirectional sync is complex (state machine for conflict resolution) — start with push-only MVP
- REQ-xxx → Backlog issue is natural mapping; test cases as subtasks
- Webhook support enables real-time sync but adds infrastructure complexity
- Japanese text in issue titles/descriptions is natively supported

## Requirements

### Functional (MVP — Push Only)

1. New MCP tool: `sync_backlog` — push Sekkei IDs to Backlog as issues
2. Config: `backlog.space_key`, `backlog.project_key`, `backlog.api_key` in sekkei.config.yaml
3. Push REQ-xxx → Backlog issue with title: `[REQ-001] 要件名`
4. Push UT/IT/ST-xxx → Backlog subtask under parent REQ issue
5. Store Backlog issue ID in document YAML frontmatter or sidecar `.backlog.yaml`
6. CLI: `sekkei sync-backlog --push`

### Functional (Future — Bidirectional)

7. Pull: read Backlog issue status → update document lifecycle status
8. Webhook listener: auto-trigger doc regeneration on issue close
9. Conflict resolution: Backlog wins for status, Sekkei wins for content

### Non-Functional

1. API key never logged or included in MCP output
2. Batch issue creation to minimize API calls
3. Idempotent: re-running push doesn't create duplicate issues (check by title prefix)
4. Rate limiting: Backlog API limits vary by plan; respect 429 responses

## Architecture

```
sync_backlog tool (push mode)
          │
          ├── Load sekkei.config.yaml → backlog config
          ├── Load document chain → extract IDs + labels
          │
          ▼
   BacklogSyncManager.push(config, docs)
          │
          ├── backlog-js client init (API key auth)
          ├── For each REQ-xxx:
          │     ├── Check if issue exists (search by title prefix)
          │     ├── Create issue if not exists
          │     └── Store mapping: REQ-xxx → issue_id
          ├── For each UT/IT/ST-xxx:
          │     ├── Find parent REQ issue
          │     ├── Create subtask under parent
          │     └── Store mapping
          │
          ▼
   BacklogSyncReport { created, skipped, errors, mappingFile }
```

### Config Extension

```yaml
# sekkei.config.yaml — new optional section
backlog:
  space_key: "mycompany"           # Backlog space (mycompany.backlog.com)
  project_key: "PROJ"              # Project key in Backlog
  api_key_env: "BACKLOG_API_KEY"   # Env var name (NOT the key itself)
  issue_type_id: 123               # Default issue type ID
  sync_mode: "push"                # "push" (MVP) or "bidirectional" (future)
```

**Note:** API key stored in environment variable, not in config file. Config only stores the env var name.

### Data Structures

```typescript
// src/lib/backlog-sync.ts

export interface BacklogConfig {
  space_key: string;
  project_key: string;
  api_key_env: string;
  issue_type_id?: number;
  sync_mode: "push" | "bidirectional";
}

export interface IdToIssueMapping {
  sekkei_id: string;        // REQ-001, UT-001, etc.
  backlog_issue_key: string; // PROJ-123
  backlog_issue_id: number;
  title: string;
  status: string;
  last_synced: string;       // ISO date
}

export interface BacklogSyncReport {
  created: IdToIssueMapping[];
  skipped: { sekkei_id: string; reason: string }[];
  errors: { sekkei_id: string; error: string }[];
  mapping_file: string;
  total: number;
}
```

### Mapping File

Store sync state in `.backlog-sync.yaml` alongside sekkei.config.yaml:

```yaml
# .backlog-sync.yaml (auto-generated, gitignored)
last_sync: "2026-02-23T10:00:00Z"
mappings:
  REQ-001:
    issue_key: "PROJ-45"
    issue_id: 12345
    status: "Open"
  UT-001:
    issue_key: "PROJ-46"
    issue_id: 12346
    parent_key: "PROJ-45"
    status: "Open"
```

## Related Code Files

### Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/lib/backlog-sync.ts` | Backlog API wrapper + push logic | ~180 |
| `src/lib/backlog-id-mapper.ts` | Extract IDs from docs + map to issue titles | ~80 |
| `src/tools/sync-backlog.ts` | MCP tool registration | ~80 |
| `src/cli/commands/sync-backlog.ts` | CLI command | ~60 |
| `tests/unit/backlog-sync.test.ts` | Unit tests (mocked API) | ~120 |
| `tests/unit/backlog-id-mapper.test.ts` | Unit tests for ID extraction | ~60 |

### Modify

| File | Change |
|------|--------|
| `src/tools/index.ts` | Register sync_backlog tool |
| `src/cli/main.ts` | Register sync-backlog subcommand |
| `src/lib/errors.ts` | Add `BACKLOG_SYNC_FAILED` error code |
| `src/types/documents.ts` | Add `backlog` section to ProjectConfig |
| `package.json` | Add `backlog-js` dependency |

## Implementation Steps

### Step 1: Customer validation gate

Before any code:
- Confirm at least one target customer uses Nulab Backlog
- Document their Backlog workflow (issue types, custom fields, project structure)
- If no customer validation, skip this phase entirely

### Step 2: Install backlog-js

```bash
cd sekkei/packages/mcp-server && npm install backlog-js
```

### Step 3: Add error code + config types

In `src/lib/errors.ts`, add `"BACKLOG_SYNC_FAILED"` to `SekkeiErrorCode` union.

In `src/types/documents.ts`, add to `ProjectConfig`:

```typescript
/** Nulab Backlog integration config */
backlog?: {
  space_key: string;
  project_key: string;
  api_key_env: string;
  issue_type_id?: number;
  sync_mode: "push" | "bidirectional";
};
```

### Step 4: Create backlog-id-mapper.ts

```typescript
// src/lib/backlog-id-mapper.ts
import { extractAllIds } from "./id-extractor.js";

export interface DocIdEntry {
  id: string;
  label: string;       // extracted from table row or heading context
  docType: string;
  parentId?: string;    // UT-001 → parent REQ-xxx via cross-ref
}

/** Extract IDs from chain docs with their labels/context */
export function extractIdsWithLabels(
  docs: Map<string, string>
): DocIdEntry[] {
  // For each doc:
  //   Extract IDs using existing extractAllIds
  //   Look for table rows containing the ID → extract adjacent cell as label
  //   Determine parentId for test IDs by finding referenced REQ in same row/section
  // Return sorted list
}
```

### Step 5: Create backlog-sync.ts

```typescript
// src/lib/backlog-sync.ts
import { Backlog } from "backlog-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

export async function pushToBacklog(
  configPath: string,
  entries: DocIdEntry[]
): Promise<BacklogSyncReport> {
  // 1. Load backlog config from sekkei.config.yaml
  // 2. Read API key from env var (config.api_key_env)
  // 3. Init backlog-js client: new Backlog({ host, apiKey })
  // 4. Load existing mappings from .backlog-sync.yaml
  // 5. For each entry:
  //    a. Skip if already mapped (idempotent)
  //    b. Search existing issues by title prefix "[{id}]"
  //    c. If found, update mapping; if not, create issue
  //    d. For test IDs, create as subtask under parent issue
  // 6. Write updated .backlog-sync.yaml
  // 7. Return report
}

function buildIssueTitle(entry: DocIdEntry): string {
  return `[${entry.id}] ${entry.label}`;
}

function buildIssueDescription(entry: DocIdEntry): string {
  return [
    `**Sekkei ID:** ${entry.id}`,
    `**Document Type:** ${entry.docType}`,
    entry.parentId ? `**Parent:** ${entry.parentId}` : "",
    "",
    "This issue was auto-created by Sekkei documentation agent.",
  ].filter(Boolean).join("\n");
}
```

### Step 6: Create sync-backlog.ts tool

```typescript
// src/tools/sync-backlog.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  config_path: z.string().max(500)
    .refine((p) => /\.ya?ml$/i.test(p), { message: "Must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml with backlog config"),
  mode: z.enum(["push"]).default("push")
    .describe("Sync mode: push Sekkei IDs to Backlog"),
  doc_types: z.array(z.string()).optional()
    .describe("Limit sync to specific doc types (default: all)"),
  dry_run: z.boolean().default(false)
    .describe("Preview changes without creating issues"),
};

export async function handleSyncBacklog(args: {
  config_path: string;
  mode: "push";
  doc_types?: string[];
  dry_run?: boolean;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  // 1. Load chain docs using loadChainDocs from cross-ref-linker
  // 2. Extract IDs with labels using backlog-id-mapper
  // 3. Filter by doc_types if specified
  // 4. If dry_run, format report without API calls
  // 5. Otherwise, call pushToBacklog
  // 6. Format and return report
}
```

### Step 7: Create CLI command + register

```typescript
// src/cli/commands/sync-backlog.ts
import { defineCommand } from "citty";

export const syncBacklogCommand = defineCommand({
  meta: { name: "sync-backlog", description: "Sync Sekkei document IDs to Nulab Backlog issues" },
  args: {
    config: { type: "string", default: "sekkei.config.yaml" },
    "dry-run": { type: "boolean", default: false, description: "Preview without creating issues" },
    "doc-types": { type: "string", description: "Comma-separated doc types to sync" },
  },
  async run({ args }) { /* ... */ },
});
```

Register in `src/cli/main.ts` and `src/tools/index.ts`.

### Step 8: Write tests

Mock `backlog-js` client in all tests.

`backlog-sync.test.ts`:
- Test issue creation call shape
- Test idempotent skip when mapping exists
- Test subtask creation under parent
- Test API key from env var
- Test missing config → SekkeiError
- Test dry-run mode

`backlog-id-mapper.test.ts`:
- Test ID extraction with labels from markdown tables
- Test parent ID resolution for test cases
- Test empty docs → empty entries

## Todo List

- [ ] **GATE:** Validate customer Backlog usage before proceeding
- [ ] Install backlog-js dependency
- [ ] Add BACKLOG_SYNC_FAILED error code to errors.ts
- [ ] Add backlog config section to ProjectConfig in documents.ts
- [ ] Create `src/lib/backlog-id-mapper.ts` — ID extraction with labels
- [ ] Create `src/lib/backlog-sync.ts` — push logic
- [ ] Create `src/tools/sync-backlog.ts` — MCP tool
- [ ] Create `src/cli/commands/sync-backlog.ts` — CLI command
- [ ] Register tool in `src/tools/index.ts`
- [ ] Register command in `src/cli/main.ts`
- [ ] Write `tests/unit/backlog-sync.test.ts`
- [ ] Write `tests/unit/backlog-id-mapper.test.ts`
- [ ] Run full test suite — verify 215+ tests still pass
- [ ] Run `npm run lint` — verify no type errors

## Success Criteria

1. `sync_backlog` with push mode creates Backlog issues for all REQ-xxx, UT-xxx IDs
2. Re-running push doesn't duplicate issues (idempotent)
3. Test cases created as subtasks under correct parent requirement
4. Dry-run mode previews changes without API calls
5. Missing Backlog config → clear error message
6. `.backlog-sync.yaml` persists mapping state
7. All new tests pass; existing 215 tests unaffected

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Low customer adoption of Backlog | **High** | High | Customer validation gate before implementation |
| Bidirectional sync conflicts | Medium | High | MVP is push-only; bidirectional deferred |
| Backlog API rate limits (plan-dependent) | Medium | Medium | Batch operations; configurable delay between calls |
| backlog-js package maintenance | Low | Medium | Small wrapper; easy to replace with raw fetch |
| Custom field requirements per org | Medium | Medium | Start with standard fields; custom field mapping in config later |

## Security Considerations

- API key stored in environment variable, never in config file or git
- API key env var name validated: must match `^[A-Z_]+$` pattern
- API key never logged (pino redaction for `apiKey` field)
- `.backlog-sync.yaml` should be gitignored (contains issue IDs, not secrets)
- config_path validated: no `..` traversal
- Backlog API calls over HTTPS only

## Next Steps

- **Immediate:** Customer interviews to validate Backlog usage
- **If validated:** Implement push-only MVP (this phase)
- **Later:** Bidirectional sync with webhook listener
- **Later:** Jira integration as alternative (broader market, similar architecture)
- **Community:** Consider making this a plugin/extension rather than core feature
