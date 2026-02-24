# Phase 4: New MCP Tool — update_chain_status (#6)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- Pattern reference: `sekkei/packages/mcp-server/src/tools/chain-status.ts`
- Tool registry: `sekkei/packages/mcp-server/src/tools/index.ts`
- Types: `sekkei/packages/mcp-server/src/types/documents.ts`
- Errors: `sekkei/packages/mcp-server/src/lib/errors.ts`

## Overview

- **Date:** 2026-02-24
- **Priority:** P1
- **Status:** complete
- **Review status:** not started
- **Description:** Create `update_chain_status` MCP tool for atomic chain status updates, replacing AI-dependent YAML editing

## Key Insights

- Current flow: skill instructs AI to edit `sekkei.config.yaml` directly. AI can skip or malform the YAML.
- New tool reads YAML, updates single doc's status + optional output path, writes back.
- Pattern from `chain-status.ts`: Zod input schema, `handleX` function, `registerXTool` function. Follow same structure.
- `ChainEntry.status` is `"pending" | "in-progress" | "complete"`. Chain keys use underscores: `functions_list`, `basic_design`, etc.
- Must handle both `ChainEntry` (single file) and `SplitChainEntry` (split docs) — but status field is same.

## Requirements

**Functional:**
- Accept: `config_path`, `doc_type`, `status`, optional `output`
- Read YAML, update matching chain entry's status (and output if provided), write back
- Return success message with updated status
- Error if config not found, chain section missing, or doc_type not in chain

**Non-functional:**
- Atomic: read -> parse -> modify -> stringify -> write (single writeFile call)
- Path validation: no `..`, must end `.yaml`/`.yml`
- File size cap: reject > 100KB configs (same as chain-status.ts)

## Architecture

```
Skill calls update_chain_status(config_path, doc_type, status, output?)
  → handleUpdateChainStatus()
    → readFile(config_path) → parseYaml → modify chain[key] → stringifyYaml → writeFile
    → return success text
```

### Input Schema

```typescript
const inputSchema = {
  config_path: z.string()
    .refine(p => /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
    .refine(p => !p.includes(".."), { message: "must not contain .." })
    .describe("Path to sekkei.config.yaml"),
  doc_type: z.string()
    .describe("Document type key (underscore format: requirements, functions_list, basic_design, etc.)"),
  status: z.enum(["pending", "in-progress", "complete"])
    .describe("New chain status"),
  output: z.string().max(500).optional()
    .describe("Output file path relative to config dir"),
};
```

### Doc type key mapping

The tool accepts underscore-format keys matching YAML structure: `requirements`, `nfr`, `functions_list`, `project_plan`, `basic_design`, etc. This avoids needing a kebab-to-underscore conversion layer.

## Related Code Files

**Create:**
- `sekkei/packages/mcp-server/src/tools/update-chain-status.ts`

**Modify:**
- `sekkei/packages/mcp-server/src/tools/index.ts` — add import + register call

**Tests to create (Phase 6):**
- `sekkei/packages/mcp-server/tests/unit/update-chain-status-tool.test.ts`

## Implementation Steps

### Step 1: Create update-chain-status.ts

File: `sekkei/packages/mcp-server/src/tools/update-chain-status.ts`

```typescript
/**
 * update_chain_status MCP tool — atomically updates a document's
 * chain status in sekkei.config.yaml.
 */
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger.js";

const CHAIN_STATUSES = ["pending", "in-progress", "complete"] as const;

const inputSchema = {
  config_path: z.string()
    .refine((p) => /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
    .refine((p) => !p.includes(".."), { message: "config_path must not contain '..'" })
    .describe("Path to sekkei.config.yaml"),
  doc_type: z.string()
    .regex(/^[a-z][a-z_]{1,30}$/, "doc_type must be lowercase with underscores")
    .describe("Chain key (e.g. requirements, functions_list, basic_design)"),
  status: z.enum(CHAIN_STATUSES)
    .describe("New chain status for the document"),
  output: z.string().max(500).optional()
    .describe("Output file path relative to config directory"),
};

export interface UpdateChainStatusArgs {
  config_path: string;
  doc_type: string;
  status: typeof CHAIN_STATUSES[number];
  output?: string;
}

export async function handleUpdateChainStatus(
  args: UpdateChainStatusArgs
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { config_path, doc_type, status, output } = args;
  logger.info({ config_path, doc_type, status }, "Updating chain status");

  // Read
  let raw: string;
  try {
    raw = await readFile(config_path, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    const msg = code === "ENOENT"
      ? `Config not found: ${config_path}`
      : "Failed to read config file";
    return { content: [{ type: "text", text: `[CONFIG_ERROR] ${msg}` }], isError: true };
  }

  if (raw.length > 100_000) {
    return {
      content: [{ type: "text", text: "[CONFIG_ERROR] Config file too large (>100KB)" }],
      isError: true,
    };
  }

  // Parse
  const config = parseYaml(raw);
  if (!config?.chain || typeof config.chain !== "object") {
    return {
      content: [{ type: "text", text: "[CONFIG_ERROR] No chain section in config" }],
      isError: true,
    };
  }

  const chain = config.chain as Record<string, unknown>;
  if (!(doc_type in chain)) {
    return {
      content: [{ type: "text", text: `[CONFIG_ERROR] doc_type "${doc_type}" not found in chain` }],
      isError: true,
    };
  }

  // Update
  const entry = (chain[doc_type] ?? {}) as Record<string, unknown>;
  entry.status = status;
  if (output !== undefined) entry.output = output;
  chain[doc_type] = entry;

  // Write
  const updated = stringifyYaml(config, { lineWidth: 120 });
  await writeFile(config_path, updated, "utf-8");

  const msg = output
    ? `Updated ${doc_type}: status=${status}, output=${output}`
    : `Updated ${doc_type}: status=${status}`;
  return { content: [{ type: "text", text: msg }] };
}

export function registerUpdateChainStatusTool(server: McpServer): void {
  server.tool(
    "update_chain_status",
    "Atomically update a document's chain status in sekkei.config.yaml",
    inputSchema,
    async ({ config_path, doc_type, status, output }) => {
      return handleUpdateChainStatus({ config_path, doc_type, status, output });
    }
  );
}
```

~90 lines. Well under 200 LOC limit.

### Step 2: Register in index.ts

Add import and register call:

```typescript
// Add import
import { registerUpdateChainStatusTool } from "./update-chain-status.js";

// Add in registerAllTools body
registerUpdateChainStatusTool(server);
```

### Step 3: Compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

## Todo

- [ ] Create `update-chain-status.ts` with Zod schema, handler, register function
- [ ] Add import + register call in `index.ts`
- [ ] Run `npm run lint` — no type errors
- [ ] Run `npm test` — existing tests pass

## Success Criteria

- Tool registered as `update_chain_status` on MCP server
- Reads config, updates specified chain entry status, writes back
- Returns clear error for missing config, missing chain section, missing doc_type
- File size < 200 LOC
- `npm run lint` passes

## Risk Assessment

- **Risk: MEDIUM** — YAML write could corrupt file on crash mid-write. Mitigation: single `writeFile` call (atomic on most filesystems for small files). For production hardening, could add write-to-temp-then-rename, but YAGNI for now.
- **Risk: LOW** — `yaml` library's `stringify` preserves structure well. Comments in YAML will be lost — acceptable since sekkei.config.yaml is machine-managed.

## Security Considerations

- Path validation: no `..` traversal, must end `.yaml`/`.yml`
- File size cap: 100KB max
- `doc_type` regex: `^[a-z][a-z_]{1,30}$` prevents injection
- No shell execution — pure fs read/write

## Next Steps

- Phase 5: update skill to call `update_chain_status` instead of manual YAML edit
- Phase 6: create `update-chain-status-tool.test.ts`
