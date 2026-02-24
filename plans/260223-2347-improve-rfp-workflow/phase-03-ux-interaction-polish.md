# Phase 3 — UX & Interaction Polish

## Context Links

- Entrypoint spec: `sekkei/packages/skills/content/references/rfp-command.md`
- Manager spec: `sekkei/packages/skills/content/references/rfp-manager.md`
- Routing template: `sekkei/packages/mcp-server/templates/rfp/routing.md`

## Overview

- **Priority:** P2
- **Status:** complete
- **Description:** Improve user experience with progress dashboard, clearer phase prompts, navigation commands, and better error recovery messages

## Key Insights

1. **No progress visibility.** User has no idea how far along the RFP lifecycle they are. Need a visual progress bar or checklist.
2. **Phase prompts are cryptic.** "Client replied? Paste answer or type BUILD_NOW" — unclear what BUILD_NOW means to a first-time user.
3. **No way to see what's been done.** After interruption, user just gets "Phase: X, Next: Y" with no context about what X produced.
4. **Overwrite check is binary.** "Overwrite? [Y/n]" — no option to view diff or merge.
5. **No skip/defer option.** If user wants to skip Q&A and go straight to drafting, the path is unclear.
6. **Error messages lack recovery instructions.** "Workspace inconsistency detected" says what's wrong but not how to fix it.

## Requirements

### Functional

- FR1: Add progress dashboard to startup report showing all phases with completion status
- FR2: Rewrite phase prompts with action descriptions, not just phase names
- FR3: Add `show` command: display summary of current phase's output file
- FR4: Add recovery instructions to error messages (not just "fix required")
- FR5: Document skip paths explicitly in routing (e.g., "type SKIP_QNA to draft immediately")
- FR6: Add diff preview option on overwrite check ("View changes? [Y/n/diff]")

### Non-Functional

- NF1: All UX changes in skill markdown files only (rfp-command.md, rfp-manager.md)
- NF2: Progress dashboard fits in 15 lines max
- NF3: Prompts use Japanese-business-friendly tone (as per existing style)

## Architecture

No code changes. All UX improvements are in the skill reference files that guide the AI's behavior during the `/sekkei:rfp` command execution.

### Progress Dashboard Format

```
=== RFP Lifecycle: {project-name} ===
[*] RFP Received        01_raw_rfp.md (2.1KB)
[*] Analysis             02_analysis.md (4.3KB)
[*] Q&A Generation       03_questions.md (1.8KB)  Round 2
[ ] Client Answers       04_client_answers.md
[ ] Proposal             05_proposal.md
[ ] Scope Freeze         06_scope_freeze.md
---
Current: QNA_GENERATION | Next: Send questions to client
```

### Enhanced Prompt Templates

```
# Instead of: "Client replied? Paste answer or type BUILD_NOW"
# Use:
Client Q&A status:
  Questions sent: 12 (6 critical, 4 architecture, 2 operation)

Options:
  1. Paste client answers (recommended if available)
  2. Type BUILD_NOW to draft proposal with assumptions
  3. Type BACK to regenerate questions
  4. Type SHOW to review current questions
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `skills/content/references/rfp-command.md` — progress dashboard, enhanced prompts, navigation |
| Modify | `skills/content/references/rfp-manager.md` — recovery instructions, show command |
| Modify | `templates/rfp/routing.md` — add skip paths, back navigation |

## Implementation Steps

1. Add progress dashboard template to `rfp-command.md` startup behavior section
2. Rewrite each phase prompt in `rfp-command.md` with numbered options and descriptions
3. Add `SHOW` keyword handling in routing table — displays current phase output summary
4. Add `BACK` keyword handling in routing table — triggers backward transition (Phase 1)
5. Add `SKIP_QNA` keyword for QNA_GENERATION -> DRAFTING shortcut
6. Update `rfp-manager.md` recovery section with step-by-step fix instructions per scenario
7. Add diff preview instruction to overwrite check section
8. Add Q&A round indicator to dashboard when qna_round > 0 (from Phase 1)
9. Update routing.md with new keywords and paths

## Todo List

- [x] Add progress dashboard template to rfp-command.md
- [x] Rewrite all phase prompts with numbered options
- [x] Add SHOW/BACK/SKIP_QNA keyword handling
- [x] Update recovery section with fix instructions
- [x] Add diff preview to overwrite check
- [x] Update routing.md with navigation keywords
- [x] Verify dashboard fits 15-line limit

## Success Criteria

- On startup, user sees visual progress with file sizes and current position
- Each phase prompt has clear numbered options (not just "paste or type X")
- SHOW command displays current output summary
- BACK command works (leveraging Phase 1 backward transitions)
- Recovery messages include actionable fix steps
- First-time user can navigate without reading docs

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many options overwhelm user | Medium | Limit to 3-4 options per prompt; highlight recommended |
| Progress dashboard adds noise | Low | Keep under 15 lines; only show on startup |
| BACK/SKIP shortcuts cause confusion | Low | Always confirm before executing |

## Security Considerations

- No code changes, only skill doc changes
- Navigation keywords are validated against routing table

## Next Steps

- Depends on Phase 1 for backward transition support
- Dashboard format feeds into downstream `/sekkei:status` output
