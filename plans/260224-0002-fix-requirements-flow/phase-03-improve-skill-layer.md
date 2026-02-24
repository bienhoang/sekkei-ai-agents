# Phase 3: Improve Skill Layer

## Context

- Parent: [plan.md](./plan.md)
- Depends on: Phase 1 (code fixes), Phase 2 (docs fixes)

## Overview

- Priority: P2
- Status: complete
- Description: Rewrite phase-requirements.md for explicit 01-rfp input, better interview, parallel next steps

## Key Insights

- Current skill workflow says "RFP, scope freeze, or free-text" — too generic
- No auto-detection of 01-rfp workspace
- Output path still references old `./sekkei-docs/` format
- Next step should suggest PARALLEL `functions-list` + `nfr`

## Related Code Files

### Modify:
1. `sekkei/packages/skills/content/references/phase-requirements.md` — major rewrite of `/sekkei:requirements` section
2. `sekkei/packages/skills/content/SKILL.md` — verify routing still correct

### Verify:
3. `sekkei/packages/skills/content/references/phase-design.md` — check no stale references

## Implementation Steps

### Step 1: Rewrite `/sekkei:requirements @input` in phase-requirements.md

Replace the current section (lines 8-27) with:

```markdown
## `/sekkei:requirements @input`

**Pre-check:**
1. Check if `01-rfp/` workspace exists in `{output.directory}`
2. If exists and @input not provided, auto-load RFP content (02_analysis.md + 06_scope_freeze.md) as primary input
3. If @input provided, use as primary input; RFP content as supplementary context

**Interview questions (ask before generating):**
- What is the project scope? (confirm from RFP or clarify if no RFP)
- Are there compliance/regulatory requirements? (個人情報保護法, SOC2, ISO27001, etc.)
- Performance targets? (response time, concurrent users, uptime SLA)
- Security requirements level? (basic, enterprise, government)
- Target user count and scale? (affects NFR numeric targets)
- Any technology constraints already decided? (platform, language, cloud provider)

1. Read 01-rfp/ workspace content if available (analysis, scope freeze, decisions)
2. If @input provided, merge with RFP content as additional context
3. If `sekkei.config.yaml` exists, load project metadata and `project_type`
4. Call MCP tool `generate_document` with `doc_type: "requirements"`, input content, `project_type`, and `language` from config (default: "ja"). Pass `input_lang` if input not Japanese.
5. Use the returned template + AI instructions to generate the 要件定義書
6. Follow these rules strictly:
   - 10-section structure as defined in the template
   - Functional requirements: REQ-001 format
   - Non-functional requirements: NFR-001 format with measurable targets
   - Trace each requirement back to RFP source via 関連RFP項目 column
   - Do NOT reference F-xxx — functions-list does not exist yet
   - This is the FIRST document after RFP — defines REQ-xxx IDs for all downstream docs
   - Include acceptance criteria for each major requirement
7. Save output to `{output.directory}/02-requirements/requirements.md`
8. Update chain status: `requirements.status: complete`
9. Suggest next steps (can run in parallel):
   > "Requirements complete. Next steps (can run in parallel):
   > - `/sekkei:functions-list` — generate 機能一覧 from requirements
   > - `/sekkei:nfr` — generate detailed 非機能要件 from requirements"
```

### Step 2: Update V2 Chain Order comment

```diff
- **V2 Chain Order:** RFP → requirements → { nfr, functions-list, project-plan }
+ **V2 Chain Order:** RFP → requirements → { functions-list, nfr, project-plan } (parallel after requirements)
```

### Step 3: Verify SKILL.md routing

Check that SKILL.md routes `/sekkei:requirements` to `references/phase-requirements.md` correctly. No change expected.

### Step 4: Verify phase-design.md

Check that phase-design.md `/sekkei:basic-design` still correctly references both requirements and functions-list as upstream. No change expected.

## Todo

- [x] Rewrite `/sekkei:requirements @input` section in phase-requirements.md
- [x] Update V2 chain order comment
- [x] Verify SKILL.md routing (read-only check)
- [x] Verify phase-design.md references (read-only check)

## Success Criteria

- Skill explicitly reads from 01-rfp workspace
- Interview questions are RFP-context-aware (6 questions)
- Output path uses `{output.directory}/02-requirements/requirements.md`
- No F-xxx references in requirements workflow
- Next step suggests PARALLEL functions-list + nfr
- SKILL.md routing still valid

## Risk Assessment

- **Medium risk** — skill rewrite affects AI behavior during generation
- **Mitigation** — changes are instruction text only, no code logic changes
