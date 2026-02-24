# Phase 6: Tests & Migration

## Context Links

- [Test files](../../sekkei/packages/mcp-server/tests/unit/)
- [Config example](../../sekkei/sekkei.config.example.yaml)
- [Phase 1: config-migrator](phase-01-type-system-and-config.md)
- [Phase 4: validation rules](phase-04-validation.md)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Completed:** 2026-02-23

Update all existing tests for new doc types, write new tests for added functionality, create config migration script, and verify mandatory migration end-to-end.

## Key Insights

- 28 existing test files in `tests/unit/`. Key files that MUST be updated:
  - `validator.test.ts` — tests UPSTREAM_ID_TYPES, REQUIRED_SECTIONS, REQUIRED_COLUMNS
  - `resolve-output-path.test.ts` — tests path resolution per doc type
  - `chain-status-tool.test.ts` — tests chain display output
  - `cross-ref-linker.test.ts` — tests CHAIN_PAIRS, ID_ORIGIN, traceability
  - `structure-validator.test.ts` — tests REQUIRED_FILES/REQUIRED_DIRS
  - `completeness-checker.test.ts` — tests depth rules
  - `id-extractor.test.ts` — tests ID_PATTERN for new prefixes
  - `glossary.test.ts` — tests glossary actions (add seed/finalize)
  - `tools.test.ts` — tests generate_document tool routing
  - `template-loader.test.ts` — tests template loading for new types
- Config migration needs its own test file.
- Existing tests MUST still pass — backward compat is critical.

## Requirements

### Functional
1. All existing tests pass without modification (backward compat)
2. New tests for each new doc type in relevant test files
3. Config migration script tested with sample old/new configs
4. Deprecation behavior tested (overview -> warning, test-spec -> warning)
5. V-model cross-ref validation tested for each test level

### Non-Functional
- Test suite runs in <30s total
- Migration script testable without real filesystem (pure function)

## Architecture

### Test Update Map

| Test File | What Changes | New Test Cases |
|-----------|-------------|----------------|
| `validator.test.ts` | Add entries for 8 types | UPSTREAM_ID_TYPES for ut/it/st/uat-spec, REQUIRED_SECTIONS for all 8 |
| `resolve-output-path.test.ts` | Add 8 new type paths | All 8 types + feature scope for ut-spec/it-spec |
| `chain-status-tool.test.ts` | Phase grouping | Config with new chain -> phase-grouped output |
| `cross-ref-linker.test.ts` | Branching pairs | DD->UT, BD->IT, BD->ST, REQ->UAT pairs |
| `structure-validator.test.ts` | Remove 01-overview.md | New required files list, 08-test/ content |
| `completeness-checker.test.ts` | New depth rules | NFR, security-design, ut/it/st/uat-spec |
| `id-extractor.test.ts` | New prefixes | SEC-001, PP-001, TP-001 extraction |
| `glossary.test.ts` | Seed/finalize | Seed from requirements content, finalize validation |
| `tools.test.ts` | Deprecation + new types | Overview deprecation, test-spec deprecation, new type generation |
| `template-loader.test.ts` | New templates | Load all 8 new templates successfully |

### New Test File

**`tests/unit/config-migrator.test.ts`**

```typescript
describe("config-migrator", () => {
  it("migrates old config with overview and test_spec", () => {
    const old = `
chain:
  rfp: "rfp.md"
  overview: { status: complete, output: "01-overview.md" }
  functions_list: { status: complete, output: "04-functions-list.md" }
  requirements: { status: complete, output: "02-requirements.md" }
  basic_design: { status: pending }
  detail_design: { status: pending }
  test_spec: { status: pending, global_output: "08-test/" }
`;
    const result = migrateConfig(old);
    // overview removed, test_spec split into 4
    expect(result).not.toContain("overview:");
    expect(result).toContain("ut_spec:");
    expect(result).toContain("it_spec:");
    expect(result).toContain("st_spec:");
    expect(result).toContain("uat_spec:");
    expect(result).toContain("nfr:");
  });

  it("is idempotent — running twice produces same result", () => {
    const old = `...`;
    const first = migrateConfig(old);
    const second = migrateConfig(first);
    expect(first).toEqual(second);
  });

  it("preserves non-chain config", () => {
    const old = `
project:
  name: "Test"
  type: web
chain:
  rfp: ""
  overview: { status: pending }
`;
    const result = migrateConfig(old);
    expect(result).toContain('name: "Test"');
    expect(result).toContain("type: web");
  });
});
```

### Cross-Ref Validation Tests (V-Model Symmetry)

```typescript
describe("V-model symmetric validation", () => {
  it("ut-spec validates against CLS/DD from detail-design only", () => {
    const utContent = "UT-001 tests CLS-001 method validate()";
    const ddContent = "CLS-001: UserValidator class\nDD-001: validation logic";
    const report = validateCrossRefs(utContent, ddContent, "ut-spec");
    expect(report.coverage).toBeGreaterThan(0);
    // Should NOT expect REQ or F IDs
  });

  it("uat-spec validates against REQ/NFR from requirements only", () => {
    const uatContent = "UAT-001 verifies REQ-001 login scenario\nUAT-002 checks NFR-001 response time";
    const reqContent = "REQ-001: User login\nNFR-001: Response < 2s";
    const report = validateCrossRefs(uatContent, reqContent, "uat-spec");
    expect(report.missing).toHaveLength(0);
    // Should NOT expect SCR or API IDs
  });

  it("it-spec validates against API/SCR/TBL from basic-design only", () => {
    const itContent = "IT-001 tests API-001 endpoint\nIT-002 verifies SCR-001 transition";
    const bdContent = "API-001: POST /users\nSCR-001: Login screen\nTBL-001: users table";
    const report = validateCrossRefs(itContent, bdContent, "it-spec");
    expect(report.coverage).toBeGreaterThan(0);
  });

  it("st-spec validates against SCR/TBL/F from basic-design + functions-list", () => {
    const stContent = "ST-001 E2E for F-001 via SCR-001";
    const upstream = "F-001: User management\nSCR-001: User list screen";
    const report = validateCrossRefs(stContent, upstream, "st-spec");
    expect(report.coverage).toBeGreaterThan(0);
  });
});
```

### Migration Script (CLI)

Create `sekkei/packages/mcp-server/bin/migrate-config.ts`:

```typescript
#!/usr/bin/env node
/**
 * Migrate sekkei.config.yaml from v1 (overview + test-spec) to v2 (new chain).
 * Usage: npx tsx bin/migrate-config.ts path/to/sekkei.config.yaml
 */
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { migrateConfig } from "../src/lib/config-migrator.js";

const configPath = process.argv[2];
if (!configPath) {
  console.error("Usage: migrate-config <path-to-sekkei.config.yaml>");
  process.exit(1);
}

// Backup
copyFileSync(configPath, configPath + ".bak");
console.log(`Backup created: ${configPath}.bak`);

const old = readFileSync(configPath, "utf-8");
const migrated = migrateConfig(old);
writeFileSync(configPath, migrated, "utf-8");
console.log(`Config migrated successfully: ${configPath}`);
```

### Migration Validation Tests (v2.0 Clean Break)
<!-- Updated: Validation Session 1 - No backward compat tests. Migration is mandatory. -->

```typescript
describe("v2.0 migration", () => {
  it("config with old overview key fails validation with helpful message", () => {
    // Zod schema rejects overview key, migration script provides fix
  });

  it("config with old test_spec key fails validation with helpful message", () => {
    // Zod schema rejects test_spec key, migration script provides fix
  });

  it("generate_document rejects doc_type=overview via Zod enum", () => {
    // Zod enum validation catches removed types before handler runs
  });

  it("generate_document rejects doc_type=test-spec via Zod enum", () => {
    // Same — Zod catches at schema level
  });
});
```

## Related Code Files

### Must Modify
- `tests/unit/validator.test.ts`
- `tests/unit/resolve-output-path.test.ts`
- `tests/unit/chain-status-tool.test.ts`
- `tests/unit/cross-ref-linker.test.ts`
- `tests/unit/structure-validator.test.ts`
- `tests/unit/completeness-checker.test.ts`
- `tests/unit/id-extractor.test.ts`
- `tests/unit/glossary.test.ts`
- `tests/unit/tools.test.ts`
- `tests/unit/template-loader.test.ts`

### Must Create
- `tests/unit/config-migrator.test.ts`
- `sekkei/packages/mcp-server/bin/migrate-config.ts`

## Implementation Steps

1. **Update id-extractor.test.ts** — Add tests for SEC-001, PP-001, TP-001 extraction.
2. **Update resolve-output-path.test.ts** — Add 8 new path assertions + feature scope for ut-spec/it-spec.
3. **Update validator.test.ts** — Add UPSTREAM_ID_TYPES tests for all 8 types. Add REQUIRED_SECTIONS spot checks. Add cross-ref tests for V-model symmetry.
4. **Update cross-ref-linker.test.ts** — Add branching chain pair tests. Verify ID_ORIGIN changes.
5. **Update structure-validator.test.ts** — Update expected REQUIRED_FILES (no 01-overview.md).
6. **Update completeness-checker.test.ts** — Add depth rules for new types.
7. **Update glossary.test.ts** — Add seed and finalize action tests.
8. **Update chain-status-tool.test.ts** — Test phase-grouped output. Test deprecated key handling.
9. **Update tools.test.ts** — Test deprecation responses for overview and test-spec. Test new type generation routing.
10. **Update template-loader.test.ts** — Test loading all 8 new templates.
11. **Create config-migrator.test.ts** — Migration, idempotency, preservation tests.
12. **Create bin/migrate-config.ts** — CLI migration script.
13. **Run full test suite** — `npm test`. Fix any failures.
14. **Run lint** — `npm run lint`. Fix any type errors.

## Todo List

- [ ] Update id-extractor tests (SEC, PP, TP)
- [ ] Update resolve-output-path tests (8 new paths)
- [ ] Update validator tests (V-model cross-refs)
- [ ] Update cross-ref-linker tests (branching pairs)
- [ ] Update structure-validator tests (no overview)
- [ ] Update completeness-checker tests
- [ ] Update glossary tests (seed/finalize)
- [ ] Update chain-status tests (phase grouping)
- [ ] Update tools tests (deprecation)
- [ ] Update template-loader tests (8 new templates)
- [ ] Create config-migrator tests
- [ ] Create migrate-config CLI script
- [ ] Full test suite passes
- [ ] Lint passes

## Success Criteria

- `npm test` — ALL tests pass (existing + new)
- `npm run lint` — zero errors
- Config migration tested: old -> new, idempotent, preserves non-chain data
- Deprecation behavior tested for both overview and test-spec
- V-model symmetric cross-ref validation tested for all 4 test levels
- Glossary seed extracts terms, finalize validates coverage

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing tests break from enum/type changes | High | Phase 1 keeps deprecated types in enum — existing tests should compile |
| Test count explosion (8 new types x N test dimensions) | Medium | Test new types in batches; use parameterized tests where possible |
| Migration script data loss | High | Backup file before migration; idempotency test |
| Template-loader tests fail if templates not created yet | Medium | Phase 2 must complete before Phase 6 template-loader tests run |

## Security Considerations

- Migration script reads/writes config files. Validate paths (no traversal).
- Test fixtures should not contain real credentials or API keys.

## Next Steps

- After all tests pass, create PR with full change set
- Update project documentation (docs/ folder) via docs-manager
- Tag release as v2.0.0 (breaking change)

## Unresolved Questions

1. **Test fixture strategy**: Should we create minimal fixture configs in `tests/fixtures/` or inline YAML strings in tests? Recommendation: Inline strings for unit tests (self-contained), fixture files for integration tests.
2. **Migration script packaging**: Should `bin/migrate-config.ts` be a standalone npm script (`npm run migrate`) or a separate CLI? Recommendation: Add as npm script in package.json for now.
3. **Snapshot testing**: Should chain-status output use Jest snapshots for regression? Recommendation: Yes, snapshot the markdown output for 1-2 representative configs. Update snapshots when format changes.
