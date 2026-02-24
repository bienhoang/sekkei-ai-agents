# Phase 5: Testing

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: All previous phases
- Test patterns: `mcp-server/tests/unit/tools.test.ts`, `mcp-server/tests/unit/validator.test.ts`

## Overview
- **Priority:** Medium
- **Status:** pending
- **Effort:** 0.5h
- **Description:** Unit tests for schema validation, YAML parsing, HTML building, and renderer

## Key Insights
- Existing tests use Jest with ESM (`--experimental-vm-modules`)
- Tests access tool handlers via `(server as any)._registeredTools[name].handler(args, {})`
- Test tmp files go in `tests/tmp/` and cleaned in `afterAll`
- `dirname(fileURLToPath(import.meta.url))` for `__dirname` in ESM
- Playwright tests can be skipped in CI if chromium not installed (conditional `describe`)

## Requirements

### Functional
- Test `mockup-schema.ts`: valid/invalid YAML validation, duplicate `n` detection
- Test `mockup-parser.ts`: YAML extraction from markdown, multi-screen parsing
- Test `mockup-html-builder.ts`: HTML output contains key elements (CSS, annotations, components)
- Test `mockup-renderer.ts`: PNG file created (integration test, skip if no Playwright)

### Non-Functional
- Fast: unit tests run without Playwright
- Integration test (renderer) is conditional on Playwright availability
- Cleanup temp files

## Related Code Files

### New Files
| File | Purpose | LOC Est |
|------|---------|---------|
| `mcp-server/tests/unit/mockup-schema.test.ts` | Schema + parser unit tests | ~100 |
| `mcp-server/tests/unit/mockup-renderer.test.ts` | HTML builder + renderer tests | ~80 |

## Implementation Steps

1. **Create `mockup-schema.test.ts`**:

   a. **Schema validation tests**:
   - Valid form layout → parses without error
   - Missing `layout_type` → Zod error
   - Invalid component type → Zod error
   - Duplicate `n` values → refinement error
   - Unknown region names → passes (record type accepts any key)
   - Empty components array → passes
   - `n` must be positive integer → rejects 0, -1, 1.5

   b. **Parser tests**:
   - Markdown with YAML block → extracts correctly
   - Markdown without YAML block → returns null / empty array
   - Multiple screens (multiple `## 1.` sections) → returns array
   - Malformed YAML → throws SekkeiError("MOCKUP_ERROR")

   Sample test fixture:
   ```markdown
   # 画面設計書 — ログイン画面 (SCR-AUTH-001)

   ## 1. 画面レイアウト

   ```yaml
   layout_type: form
   viewport: desktop
   regions:
     main:
       style: centered-form
       components:
         - {n: 1, type: text-input, label: メールアドレス, required: true}
         - {n: 2, type: password-input, label: パスワード, required: true}
         - {n: 3, type: button, label: ログイン, variant: primary}
   ```

   ## 2. 画面項目定義
   | # | 項目ID | 項目名 | ...
   ```

2. **Create `mockup-renderer.test.ts`**:

   a. **HTML builder tests**:
   - Output contains `<!DOCTYPE html>`
   - Output contains Google Fonts link for Noto Sans JP
   - Output contains `.annotation` CSS class
   - Output contains component labels from input
   - Output contains circled number characters (①②③)
   - `circledNumber(1)` → `①`, `circledNumber(20)` → `⑳`, `circledNumber(21)` → `21`

   b. **Renderer integration tests** (conditional):
   ```typescript
   const hasPlaywright = await isPlaywrightAvailable();
   (hasPlaywright ? describe : describe.skip)("Playwright renderer", () => {
     it("renders PNG file", async () => {
       const html = buildMockupHtml(sampleLayout);
       const tmpDir = await mkdtemp(...);
       const outPath = join(tmpDir, "test.png");
       await renderMockupPng(html, "desktop", outPath);
       expect(existsSync(outPath)).toBe(true);
       const stats = statSync(outPath);
       expect(stats.size).toBeGreaterThan(1000); // PNG should have real content
     });
   });
   ```

3. **Run tests**: `npm test` from mcp-server/

## Todo List
- [ ] Create `mockup-schema.test.ts` — schema + parser unit tests
- [ ] Create `mockup-renderer.test.ts` — HTML builder + conditional renderer tests
- [ ] All existing tests still pass
- [ ] New tests pass
- [ ] Cleanup temp files in afterAll

## Success Criteria
- All schema validation edge cases covered
- Parser handles well-formed and malformed markdown
- HTML builder output verified for key CSS classes and content
- Renderer test skipped gracefully if Playwright not installed
- `npm test` passes with 0 failures
- Existing tests unaffected

## Risk Assessment
- **Playwright not in CI**: Renderer test auto-skips, unit tests still run
- **YAML fixture gets out of sync with schema**: Use schema to type-check fixtures in test

## Security Considerations
- Test fixtures are static, no user input
- Temp dirs cleaned up in afterAll

## Next Steps
- After all tests pass: feature is ready for code review
- Future: add visual regression tests (compare PNG snapshots)
