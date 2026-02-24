# Phase 3: Path Standardization (#4)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- resolve-output-path: `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts`
- Skill phase-requirements: `sekkei/packages/skills/content/references/phase-requirements.md`

## Overview

- **Date:** 2026-02-24
- **Priority:** P2
- **Status:** complete
- **Review status:** not started
- **Description:** Standardize functions-list output from flat file to subdirectory, matching all other doc types

## Key Insights

- Current: `functions-list` -> `"04-functions-list.md"` (flat file, only exception)
- All other docs use subdirectories: `02-requirements/requirements.md`, `03-system/`, `06-data/`, `07-operations/`, etc.
- Skill `phase-requirements.md` already instructs saving to `04-functions-list/functions-list.md` (line 61) — skill and MCP are currently inconsistent
- `loadChainDocs` in cross-ref-linker reads from config `chain.functions_list.output` — not hardcoded, so safe to change path suggestion

## Requirements

**Functional:**
- `resolveOutputPath("functions-list")` returns `"04-functions-list/functions-list.md"` instead of `"04-functions-list.md"`

**Non-functional:**
- Document migration note for existing projects
- No breaking change to runtime — path is a suggestion, not enforced

## Architecture

Single line change in `resolve-output-path.ts`. The returned path is a hint used by the skill layer and shown in tool output. Actual file path stored in `sekkei.config.yaml` chain entry, read back by cross-ref linker.

```
resolveOutputPath() → hint in generate_document response
                    → skill uses it for saving
                    → config stores actual path used
                    → cross-ref linker reads config
```

No cascading breakage because cross-ref linker reads config, not this constant.

## Related Code Files

**Modify:**
- `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts` — line 16

**Tests to update (Phase 6):**
- `sekkei/packages/mcp-server/tests/unit/resolve-output-path.test.ts` — line 19

## Implementation Steps

### Step 1: Update resolve-output-path.ts

```typescript
// Before (line 16)
if (docType === "functions-list")      return "04-functions-list.md";

// After
if (docType === "functions-list")      return "04-functions-list/functions-list.md";
```

### Step 2: Verify skill already matches

Confirm `phase-requirements.md` line 61 already says `{output.directory}/04-functions-list/functions-list.md` — yes, it does. No skill change needed.

### Step 3: Compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

## Todo

- [ ] Update `resolve-output-path.ts` line 16
- [ ] Verify skill already uses `04-functions-list/functions-list.md` (confirmed)
- [ ] Run `npm run lint` — no errors

## Success Criteria

- `resolveOutputPath("functions-list")` returns `"04-functions-list/functions-list.md"`
- Skill and MCP now consistent
- `npm run lint` passes

## Risk Assessment

- **Risk: LOW-MEDIUM** — Existing projects with `04-functions-list.md` flat file won't break at runtime (config stores actual path). But new generations will use subdirectory structure.
- **Migration note:** Projects with existing flat `04-functions-list.md` should move file to `04-functions-list/functions-list.md` and update `sekkei.config.yaml` chain entry accordingly. This is a manual one-time action.

## Security Considerations

None — path hint only, no file system writes in this module.

## Next Steps

- Phase 6: update `resolve-output-path.test.ts` expected value
