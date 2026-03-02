# Project Changelog

All notable changes to Sekkei are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [2.11.0] — 2026-03-02

### Added
- **Semantic versioning system** — `manage_version` MCP tool for version bumps, release management, Git tagging, and release notes generation
- **Version display on exports** — PDF, Excel, and DOCX exports now show document version from frontmatter
- **Frontmatter version parsing** — `frontmatter-parser.ts` extracts version metadata from document headers

---

## [2.10.0] — 2026-03-02

### Added
- **Per-feature auto-detection** — per-feature generation now activates automatically when `functions-list.md` exists with features. No manual config needed.

### Changed
- **Per-feature config removed** — `split:` section removed from `sekkei.config.yaml`; `readSplitConfig()` replaced with hardcoded `SHARED_SECTIONS` / `FEATURE_SECTIONS` constants
- **Terminology renamed** — "split mode" renamed to "per-feature" across entire codebase (code, docs, skills, config)
- **`sekkei init` wizard** — no longer asks about per-feature generation preferences (auto-detected)

### Fixed
- **Mockup prerequisite checks** — `/sekkei:mockup` now aborts with clear message when prerequisite documents missing; removed stale dual-mode references
- **`/sekkei:status` display** — full MCP response now displayed verbatim with all 6 columns
- **Dashboard CLI command** — `sekkei-dashboard` binary corrected to use scoped package name `@bienhoang/sekkei-dashboard`
- **CLI test suite** — removed stale `glossary` subcommand assertion; increased `doctor` test timeout

---

## [2.9.0] — 2026-02-28

### Added
- Token optimization for per-feature generation (smart upstream filtering, 60-75% context reduction)
- Token budget estimator — predicts output tokens, recommends strategy
- Session recovery checkpoints for plan management
- Translation pipeline: SHA-256 hash-based incremental tracking, structural validation

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
