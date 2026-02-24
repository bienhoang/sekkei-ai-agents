# Phase 5: Skill Flow Improvement (#7)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- Skill phase-requirements: `sekkei/packages/skills/content/references/phase-requirements.md`
- Phase 4 (dependency): `plans/260224-0107-sekkei-req-flow-improvements/phase-04-update-chain-status-tool.md`

## Overview

- **Date:** 2026-02-24
- **Priority:** P2
- **Status:** complete
- **Review status:** not started
- **Description:** Add auto-validate step after document generation and switch chain status update to use new MCP tool

## Key Insights

- Generated doc not validated automatically. User must manually run `/sekkei:validate`.
- Adding `validate_document` call after save catches issues immediately. Non-blocking — show warnings, don't abort.
- Chain status update (step 8) currently says "Update chain status" — update to use `update_chain_status` tool from Phase 4.
- Same changes should apply to `/sekkei:functions-list`, `/sekkei:nfr`, `/sekkei:project-plan` sections in the same file.

## Requirements

**Functional:**
- After saving generated document, call `validate_document` MCP tool
- Display validation results (warnings/errors) to user
- Non-blocking: proceed to next steps even if warnings exist
- Replace manual chain status instructions with `update_chain_status` tool call

**Non-functional:**
- Clear output format for validation results
- Keep skill instructions concise

## Architecture

Skill layer only — markdown instructions. No TypeScript changes.

```
Current flow:
  generate → save → "Update chain status" (manual) → suggest next steps

New flow:
  generate → save → update_chain_status tool → validate_document tool → show results → suggest next steps
```

## Related Code Files

**Modify:**
- `sekkei/packages/skills/content/references/phase-requirements.md` — all 4 command sections

## Implementation Steps

### Step 1: Update `/sekkei:requirements` section (lines 36-41)

Replace steps 7-9 with:

```markdown
7. Save output to `{output.directory}/02-requirements/requirements.md`
8. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "requirements"`, `status: "complete"`, `output: "02-requirements/requirements.md"`
9. Call MCP tool `validate_document` with the saved file content and `doc_type: "requirements"`. Show results:
   - If no issues: "Validation passed."
   - If warnings: show them as non-blocking warnings
   - If errors: show them but do NOT abort — document already saved
10. Suggest next steps (can run in parallel):
   > "Requirements complete. Next steps (can run in parallel):
   > - `/sekkei:functions-list` — generate 機能一覧 from requirements
   > - `/sekkei:nfr` — generate detailed 非機能要件 from requirements"
```

### Step 2: Update `/sekkei:functions-list` section (line 62, 67)

Replace step 7 with `update_chain_status` call. Add validate step after save:

```markdown
6. Save output to `{output.directory}/04-functions-list/functions-list.md`
7. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "functions_list"`, `status: "complete"`, `output: "04-functions-list/functions-list.md"`
8. Call MCP tool `validate_document` with saved content and `doc_type: "functions-list"`. Show results as non-blocking.
9. **Count 大分類 feature groups** ...
```

### Step 3: Update `/sekkei:nfr` section (line 109-110)

```markdown
5. Save output to `{output.directory}/02-requirements/nfr.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "nfr"`, `status: "complete"`, `output: "02-requirements/nfr.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "nfr"`. Show results as non-blocking.
```

### Step 4: Update `/sekkei:project-plan` section (line 128-129)

```markdown
5. Save output to `{output.directory}/02-requirements/project-plan.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "project_plan"`, `status: "complete"`, `output: "02-requirements/project-plan.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "project-plan"`. Show results as non-blocking.
```

## Todo

- [ ] Update `/sekkei:requirements` — add validate step, use `update_chain_status`
- [ ] Update `/sekkei:functions-list` — same pattern
- [ ] Update `/sekkei:nfr` — same pattern
- [ ] Update `/sekkei:project-plan` — same pattern
- [ ] Review final file for consistency

## Success Criteria

- All 4 commands in requirements phase use `update_chain_status` tool
- All 4 commands call `validate_document` after saving
- Validation results shown as non-blocking
- No duplicate or conflicting instructions

## Risk Assessment

- **Risk: LOW** — skill markdown changes only. No code logic. If AI misinterprets instructions, worst case: validates unnecessarily or skips validation. Neither causes data loss.

## Security Considerations

None — skill-layer text instructions only.

## Next Steps

- Depends on Phase 4 (update_chain_status tool must exist first)
- No test changes needed — skill behavior tested via integration, not unit tests
