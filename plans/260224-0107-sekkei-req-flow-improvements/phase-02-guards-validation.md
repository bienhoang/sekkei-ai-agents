# Phase 2: Guards & Validation (#3, #5)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- Skill phase-requirements: `sekkei/packages/skills/content/references/phase-requirements.md`
- Generate tool: `sekkei/packages/mcp-server/src/tools/generate.ts`

## Overview

- **Date:** 2026-02-24
- **Priority:** P1
- **Status:** complete
- **Review status:** not started
- **Description:** Add prerequisite guard in skill and split mode allowlist in generate tool

## Key Insights

- Skill instructions are markdown consumed by Claude Code — not TypeScript. Guard is a text instruction, not code logic.
- `scope` param accepted for ALL doc types currently. Only `basic-design`, `detail-design`, `ut-spec`, `it-spec` support split. Others monolithic.
- Guard must fire before interview questions to avoid wasting user time.

## Requirements

**Functional:**
- #3: Abort `/sekkei:requirements` if no `@input` and no `01-rfp/` workspace
- #5: Reject `scope` param for doc types not in split allowlist

**Non-functional:**
- #3: Clear error message guiding user to run `/sekkei:rfp` first
- #5: Return `isError: true` with descriptive message

## Architecture

### Change #3: Prerequisite guard (skill layer)

Add before interview section in `phase-requirements.md`:

```markdown
**Prerequisite check (MUST run first):**
1. Check if @input argument provided → proceed
2. If no @input, check if `{output.directory}/01-rfp/` directory exists with files → proceed, auto-load
3. If neither → STOP. Tell user:
   > "No input source found. Please provide @input or run `/sekkei:rfp` first to create RFP workspace."
```

### Change #5: Split mode allowlist (MCP layer)

```typescript
const SPLIT_ALLOWED: Set<DocType> = new Set([
  "basic-design", "detail-design", "ut-spec", "it-spec",
]);

// In handleGenerateDocument, before buildSplitInstructions:
if (scope && !SPLIT_ALLOWED.has(doc_type)) {
  throw new SekkeiError(
    "INVALID_DOC_TYPE",
    `Split mode (scope) not supported for ${doc_type}. Supported: ${[...SPLIT_ALLOWED].join(", ")}`
  );
}
```

## Related Code Files

**Modify:**
- `sekkei/packages/skills/content/references/phase-requirements.md` — add guard before interview
- `sekkei/packages/mcp-server/src/tools/generate.ts` — add allowlist + validation

**Tests to add (Phase 6):**
- `sekkei/packages/mcp-server/tests/unit/tools.test.ts` — scope rejection test

## Implementation Steps

### Step 1: Add prerequisite guard in skill (#3)

In `phase-requirements.md`, insert BEFORE the interview questions block (before line 15 "**Interview questions**"):

```markdown
**Prerequisite check (MUST run before interview):**
1. If `@input` argument provided by user → input source confirmed, proceed
2. If no `@input`:
   a. Check if `{output.directory}/01-rfp/` directory exists and contains `.md` files
   b. If exists → auto-load `02_analysis.md` + `06_scope_freeze.md` as input, proceed
3. If neither condition met → **ABORT**. Do NOT proceed to interview. Tell user:
   > "No input source available. Either provide input with `@input` or run `/sekkei:rfp` first to create the RFP workspace in `01-rfp/`."
```

### Step 2: Add SPLIT_ALLOWED constant in generate.ts

Add after line 98 (after `PROJECT_TYPE_INSTRUCTIONS`):

```typescript
/** Doc types that support split generation (scope param) */
const SPLIT_ALLOWED: ReadonlySet<DocType> = new Set([
  "basic-design", "detail-design", "ut-spec", "it-spec",
]);
```

### Step 3: Add scope validation in handleGenerateDocument

In `handleGenerateDocument`, right after destructuring args (line 153), before template loading:

```typescript
if (scope && !SPLIT_ALLOWED.has(doc_type)) {
  throw new SekkeiError(
    "INVALID_DOC_TYPE",
    `Split mode (scope) not supported for ${doc_type}. Supported: ${[...SPLIT_ALLOWED].join(", ")}`
  );
}
```

### Step 4: Compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

## Todo

- [ ] Add prerequisite guard text in `phase-requirements.md`
- [ ] Add `SPLIT_ALLOWED` constant in `generate.ts`
- [ ] Add scope validation in `handleGenerateDocument`
- [ ] Run `npm run lint` — no errors
- [ ] Run `npm test` — existing tests pass

## Success Criteria

- Skill instructions include prerequisite abort before interview
- `generate_document` with `scope: "shared"` + `doc_type: "requirements"` returns error
- `generate_document` with `scope: "shared"` + `doc_type: "basic-design"` still works
- `npm run lint` and `npm test` pass

## Risk Assessment

- **#3 risk: LOW** — text change in skill markdown, no code logic
- **#5 risk: LOW** — additive validation, only rejects previously-undefined behavior

## Security Considerations

- #5 prevents potential misuse of split mode on unsupported doc types (defense-in-depth)

## Next Steps

- Phase 6: add test for scope rejection on non-split doc types
