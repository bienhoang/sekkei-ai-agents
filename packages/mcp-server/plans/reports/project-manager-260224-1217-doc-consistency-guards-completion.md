# Document Consistency Guards — Completion Report

**Date**: 2026-02-24
**Plan**: `plans/260224-1120-doc-consistency-guards/`
**Status**: COMPLETED (all 4 phases)

## Summary

Delivered comprehensive document consistency guards for sekkei MCP Server:
- **Guard A (Staleness Detection)**: Git timestamp comparison in `validate_document` and `validate_chain`
- **Guard B (Pre-Generate Advisory)**: Upstream change warning before regeneration
- **Guard C (Full CHANGELOG Logging)**: All propagated docs logged with extracted versions
- **Guard D (Skill Docs)**: Updated utilities.md with new behaviors

All implementations follow non-blocking advisory pattern. Code review score: 7.5/10 (all fixes applied).

## Phases Completed

### Phase 01: Staleness Detection (Guard A)
**Status**: Completed
**Implementation**:
- Created `sekkei/packages/mcp-server/src/lib/doc-staleness.ts`
  - `checkChainStaleness(configPath)` — detects all stale pairs in chain
  - `checkDocStaleness(configPath, docType)` — detects stale upstreams for single doc
  - `loadChainDocPaths(configPath)` — helper to resolve doc type → file path
  - Uses `simple-git` for git timestamp comparison (ISO format, timezone-safe)
- Extended `ValidationIssue.type` union with `"staleness"` (validator.ts L13)
- Integrated into `validate_chain()` in cross-ref-linker.ts
- Updated `validate-chain.ts` tool output to render staleness section
- Added `config_path` parameter to `validate_document` tool
- All git operations wrapped in try/catch (graceful fallback on unavailable repo)

**Files Modified**:
- `validator.ts` — added "staleness" type
- `cross-ref-linker.ts` — integrated staleness check into validateChain()
- `validate-chain.ts` — renders staleness section in output
- `validate.ts` — accepts optional config_path, calls staleness check

**Files Created**:
- `doc-staleness.ts` — core staleness detection logic
- `doc-staleness.test.ts` — comprehensive unit tests

### Phase 02: Pre-Generate Advisory (Guard B)
**Status**: Completed
**Implementation**:
- Added staleness check in `generate.ts` handleGenerateDocument()
- Condition: only on regeneration (`existing_content` provided)
- Prepends markdown advisory block showing upstream docs that changed since last generation
- `buildStalenessAdvisory()` helper formats warning table
- Non-blocking — generation proceeds regardless of staleness
- Failures in staleness check don't block generation (try/catch wrapper)

**Files Modified**:
- `generate.ts` — added staleness check before template loading, prepends advisory to output

**Files Created**:
- `generate-staleness.test.ts` — unit tests (warning in output, first-time no warning, errors graceful)

### Phase 03: Full CHANGELOG Logging
**Status**: Completed
**Implementation**:
- Added `extractVersionFromContent(content)` to changelog-manager.ts
  - Parses 改訂履歴 table to extract latest 版数 value
  - Mirrors existing `extractRevisionSection()` pattern
  - Returns empty string if table missing or malformed
- Updated `handleComplete()` in cr-actions.ts
  - Now logs ALL propagated docs (not just origin doc)
  - For each propagation_step with status="done", extracts version and appends to CHANGELOG
  - Origin doc also gets version extraction (preserves existing behavior)
- Updated `generate.ts` generate_document handler
  - Extracts version from `existing_content` for regeneration logging
  - Passes correct version to appendGlobalChangelog()
- All file reads bounded to config-resolved paths (security)

**Files Modified**:
- `changelog-manager.ts` — added extractVersionFromContent()
- `cr-actions.ts` — expanded handleComplete() to log all propagated docs with versions
- `generate.ts` — version extraction from existing_content before CHANGELOG logging

**Files Created**:
- `changelog-version.test.ts` — unit tests for version extraction and multi-doc logging

### Phase 04: Skill Documentation Update
**Status**: Completed
**Implementation**:
- Updated `sekkei/packages/skills/content/references/utilities.md`
  - `/sekkei:validate @doc` section: added staleness checking step
  - `/sekkei:validate` chain mode: added staleness warnings mention
  - Added note about CR completion logging all propagated docs with versions
  - Added note about regeneration logging with correct version

**Files Modified**:
- `utilities.md` — documented new staleness and CHANGELOG behaviors

## Code Quality Assessment

**Review Score**: 7.5/10
**Review Fixes Applied**: All

**Key Improvements Made**:
1. **Timezone-Safe Date Comparison**: Changed from string comparison to ISO Date objects
2. **Deduplicated Imports**: Consolidated redundant import statements
3. **Null-Safe Cache Access**: Added proper guards for optional cache in staleness detector
4. **Error Handling**: All git operations wrapped in try/catch with graceful fallbacks
5. **Security Validation**: Config paths validated via existing validateConfigPath()

## Test Coverage

- **doc-staleness.test.ts**: Staleness detection, timestamp comparison, git unavailable
- **generate-staleness.test.ts**: Advisory warning rendering, first-time generation, error gracefully
- **changelog-version.test.ts**: Version extraction, table parsing, multi-doc logging
- All existing tests passing (no regressions)

## Architecture Decisions

1. **Staleness = Git Timestamp Comparison**: Simple, deterministic, works without content hashing
2. **All Guards Are Advisory**: Never block validation, generation, or CR completion
3. **Version Pattern Reuse**: Leverages existing revision section pattern from validator.ts
4. **Non-Blocking Error Handling**: Git operations failure doesn't break tools
5. **Config-Bounded File Access**: Version extraction only reads paths from sekkei.config.yaml

## Integration Points

- **Phase 1 → Phase 2**: `checkDocStaleness()` reused for pre-generate warning
- **Phase 1 → Phase 3**: `loadChainDocPaths()` reused for version file resolution
- **Phase 3 → CHANGELOG**: All propagated docs logged with versions on CR completion
- **Phase 4 → Documentation**: Skill docs reflect all new behaviors

## Dependencies & Technical Debt

**Met Dependencies**:
- `simple-git` (already in package.json) — used for git log operations
- `cross-ref-linker.ts` CHAIN_PAIRS — all upstream/downstream relationships defined
- Existing `appendGlobalChangelog()` API — extended with version parameter

**No Breaking Changes**:
- `validateDocument()` now accepts optional `config_path` (backward compatible)
- CHANGELOG entries now include version (appended after date, existing fields preserved)
- Staleness warnings non-blocking (existing validation behavior unchanged)

## Success Criteria Met

✓ `validate_document` and `validate_chain` report staleness warnings
✓ `generate_document` warns when upstream changed (regeneration only)
✓ CR `handleComplete` logs all propagated docs with extracted versions
✓ `generate_document` logs with extracted version
✓ All existing tests pass; new unit tests for each guard
✓ Code review recommendations implemented

## Next Steps

1. **Merge to main**: All phases complete and tested
2. **Deploy to staging**: Verify staleness detection in multi-doc chains
3. **Monitor CHANGELOG**: Verify version extraction accuracy across projects
4. **Gather feedback**: Monitor false-positive advisory warnings in regeneration
5. **Future enhancement**: Consider content hash fallback if git unavailable

## Files Updated

**Plan Files**:
- `plans/260224-1120-doc-consistency-guards/plan.md` — status: completed, all phases marked complete
- `plans/260224-1120-doc-consistency-guards/phase-01-staleness-detection.md` — status: completed, all todos checked
- `plans/260224-1120-doc-consistency-guards/phase-02-pre-generate-warning.md` — status: completed, all todos checked
- `plans/260224-1120-doc-consistency-guards/phase-03-full-changelog-logging.md` — status: completed, all todos checked
- `plans/260224-1120-doc-consistency-guards/phase-04-skill-docs-update.md` — status: completed, all todos checked

## Unresolved Questions

None. All phases delivered to specification. Ready for merge.
