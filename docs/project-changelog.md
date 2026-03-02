# Project Changelog

All notable changes to Sekkei are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [2.9.x] — 2026-03-01

### Changed
- **Per-feature config removed** — `split:` section removed from `sekkei.config.yaml`. Per-feature generation is now fully automatic based on `functions-list.md` existence. No manual configuration needed.
  - `sekkei init` wizard no longer asks about per-feature generation preferences
  - `readSplitConfig()` deleted from `plan-actions.ts`; replaced with hardcoded `SHARED_SECTIONS` / `FEATURE_SECTIONS` constants
  - `handleDetect()` activates per-feature generation when `04-functions-list/functions-list.md` exists and `featureCount > 0` (previous threshold of ≥ 3 removed)
  - `sekkei.config.example.yaml` per-feature generation block removed

### Fixed
- **`/sekkei:status` display** — Full MCP response now displayed verbatim with all 6 columns (Document, Chain Status, Dependencies, Lifecycle, Version, Output). Previously AI reformatted into simplified 2-column tables.
- **Dashboard CLI command** — `sekkei-dashboard` binary corrected to use scoped package name `@bienhoang/sekkei-dashboard`. `npx sekkei-dashboard` previously returned 404 due to incorrect unscoped name.

---

## [2.9.0] — 2026-02-28

### Added
- Version bump to v2.9.0

---

## [2.8.0] — 2026-02-25

### Added
- Token optimization for per-feature generation (smart upstream filtering via `upstream-filter.ts`, 60-75% context reduction per feature)
- Token budget estimator (`token-budget-estimator.ts`) — predicts output tokens, recommends strategy (single-call/progressive/plan_required)
- Session recovery checkpoints: `manage_plan(action="update_section")` and `manage_plan(action="get_checkpoint")`
- Translation pipeline improvements: SHA-256 hash-based incremental tracking for delta-only retranslation, post-translation structural validation

### Fixed
- Translation validator: ID preservation, table row count, heading count checks

---

## [2.7.x and earlier]

See git log for earlier changes: `git log --oneline ce0aa12..HEAD`
