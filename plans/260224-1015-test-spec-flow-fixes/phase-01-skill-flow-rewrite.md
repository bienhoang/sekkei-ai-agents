# Phase 1: Skill flow rewrite (phase-test.md)

**File:** `sekkei/packages/skills/content/references/phase-test.md`
**Fixes:** B1, B3, B5, B6

## Changes

### All 4 test spec flows (ut-spec, it-spec, st-spec, uat-spec)

**Prerequisite check — replace manual yaml read with MCP + add test-plan upstream (B5, B6):**

```markdown
**Prerequisite check (MUST run before interview):**
1. Call MCP tool `get_chain_status` with `config_path` — read full chain status
2. If `chain.{primary_upstream}.status` != "complete" → **ABORT**
3. Read {primary_upstream} content from chain output path
4. If `chain.test_plan.status` == "complete" → also read test-plan content (optional upstream)
5. {Load secondary upstreams if applicable}
6. Concatenate all as `upstream_content`
```

**Save + chain update — dynamic output path (B1):**

```markdown
5. Save output:
   - Default: `{output.directory}/08-test/{doc-type}.md`
   - Feature scope (ut-spec/it-spec only): `{output.directory}/05-features/{name}/{doc-type}.md`
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type`,
   `status: "complete"`, `output: <saved_path_from_step_5>`
```

### Per-flow specifics

**ut-spec:**
- Primary: detail-design (ABORT if missing)
- Optional: test-plan
- `upstream_content` = detail-design + test-plan (if available)

**it-spec:**
- Primary: basic-design (ABORT if missing)
- Optional: test-plan
- `upstream_content` = basic-design + test-plan (if available)

**st-spec:**
- Primary: basic-design (ABORT if missing)
- Optional: functions-list, test-plan
- `upstream_content` = basic-design + functions-list (if available) + test-plan (if available)

**uat-spec:**
- Primary: requirements (ABORT if missing)
- Optional: nfr, test-plan
- `upstream_content` = requirements + nfr (if available) + test-plan (if available)

### Document chain diagram fix (B3)

Update diagram at bottom of SKILL.md (skills/content) to show test specs nested under test-plan:

```
└─► Test Plan (テスト計画書)
      ├─► UT Spec  ← detail-design + test-plan
      ├─► IT Spec  ← basic-design + test-plan
      ├─► ST Spec  ← basic-design + functions-list + test-plan
      └─► UAT Spec ← requirements + nfr + test-plan
```

## Checklist

- [ ] ut-spec: MCP prereq + test-plan upstream + dynamic output path
- [ ] it-spec: MCP prereq + test-plan upstream + dynamic output path
- [ ] st-spec: MCP prereq + test-plan upstream
- [ ] uat-spec: MCP prereq + test-plan upstream
- [ ] Update diagram in skills/content/SKILL.md
