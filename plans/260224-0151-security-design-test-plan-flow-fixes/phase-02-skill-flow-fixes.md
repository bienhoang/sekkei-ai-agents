# Phase 2: Skill Flow Fixes

**Parent:** [plan.md](./plan.md)
**Brainstorm:** `plans/reports/brainstorm-260224-0151-security-design-test-plan-flow-review.md`

## Overview
- **Priority:** P1
- **Status:** complete
- **Description:** Fix 9 issues in phase-design.md and phase-test.md skill workflows

## Related Code Files

| File | Action |
|------|--------|
| `sekkei/packages/skills/content/references/phase-design.md` | Edit security-design section (L93-109) |
| `sekkei/packages/skills/content/references/phase-test.md` | Edit test-plan section (L6-22) |

## Implementation Steps

### phase-design.md: `/sekkei:security-design` (FIX-4,6,8,11,13)

Replace L93-109 with expanded workflow:

```markdown
## `/sekkei:security-design @basic-design`

**Prerequisite check (MUST run before interview):**
1. Check `{output.directory}/03-system/basic-design.md` exists (or check `chain.basic_design.status`)
   - If missing → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. Read basic-design content as primary upstream
3. Optionally load requirements + nfr for fuller cross-referencing:
   - If `chain.requirements.output` exists → read as additional upstream
   - If `chain.nfr.output` exists → read as additional upstream
4. Concatenate all as `upstream_content` (requirements + nfr + basic-design)

**Interview questions (ask before generating):**
- Authentication method? (OAuth2, SAML, OpenID Connect, custom)
- Data classification levels? (公開, 社内, 機密, 極秘)
- Applicable compliance? (個人情報保護法, PCI-DSS, HIPAA, ISMS)

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "security-design"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `SEC-001`
   - Address OWASP Top 10 risks explicitly
   - Specify TLS 1.3+ for all transport, bcrypt (cost≥12) or Argon2id for passwords
   - Cross-reference REQ-xxx, NFR-xxx IDs from requirements/nfr
   - Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from 基本設計書
5. Save output to `{output.directory}/03-system/security-design.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "security_design"`,
   `status: "complete"`, `output: "03-system/security-design.md"`
7. Call MCP tool `validate_document` with saved content and `doc_type: "security-design"`.
   Show results as non-blocking.
8. Suggest next steps:
   > "Security design complete. Next steps:
   > - `/sekkei:detail-design` — generate 詳細設計書
   > - `/sekkei:validate @security-design` — validate cross-references"
```

### phase-test.md: `/sekkei:test-plan` (FIX-5,7,9,12)

Replace L6-22 with expanded workflow:

```markdown
## `/sekkei:test-plan @requirements`

**Prerequisite check (MUST run before interview):**
1. Load `sekkei.config.yaml` — read `chain.requirements.status`
2. If `chain.requirements.status` != "complete" → **ABORT**. Tell user:
   > "Requirements not complete. Run `/sekkei:requirements` first."
3. Read requirements content from `chain.requirements.output`
4. Check `chain.nfr.status` — if "complete", also read nfr content
5. Check `chain.basic_design.status` — if "complete", also read basic-design content
6. Concatenate all as `upstream_content` (requirements + nfr + basic-design, in that order)

**Interview questions (ask before generating):**
- Test scope and what is out of scope?
- CI/CD integration and automation strategy?
- Environment constraints? (staging, UAT env, data masking)
- Testing tools and frameworks?

1. Use `upstream_content` prepared in prerequisite check above
2. Load `sekkei.config.yaml` — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "test-plan"`, `upstream_content`, and `language` from config
4. Follow these rules strictly:
   - ID format: `TP-001`
   - Define entry criteria and exit criteria for each test level (UT, IT, ST, UAT)
   - Cross-reference REQ-xxx, F-xxx, NFR-xxx IDs from upstream
5. Save output to `{output.directory}/08-test/test-plan.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "test_plan"`,
   `status: "complete"`, `output: "08-test/test-plan.md"`
7. Call MCP tool `validate_document` with saved content, `doc_type: "test-plan"`,
   and `upstream_content`. Show results as non-blocking.
8. Suggest next steps:
   > "Test plan complete. Next steps (based on V-model):
   > - `/sekkei:ut-spec @detail-design` — generate 単体テスト仕様書
   > - `/sekkei:it-spec @basic-design` — generate 結合テスト仕様書
   > - `/sekkei:st-spec @basic-design` — generate システムテスト仕様書
   > - `/sekkei:uat-spec @requirements` — generate 受入テスト仕様書"
```

## Todo

- [ ] FIX-6: Add prerequisite check for security-design
- [ ] FIX-13: Load requirements + nfr + basic-design as upstream
- [ ] FIX-4: Update cross-ref to include REQ/NFR + API/SCR/TBL
- [ ] FIX-8: Add validate_document step
- [ ] FIX-11: Add next steps
- [ ] FIX-7: Add prerequisite check for test-plan
- [ ] FIX-5: Add F-xxx to test-plan cross-ref
- [ ] FIX-9: Add validate_document step for test-plan
- [ ] FIX-12: Add next steps for test-plan

## Success Criteria
- security-design section: prerequisite → interview → 8 steps (was 6)
- test-plan section: prerequisite → interview → 8 steps (was 6)
- Cross-ref lists match validator.ts UPSTREAM_ID_TYPES exactly
