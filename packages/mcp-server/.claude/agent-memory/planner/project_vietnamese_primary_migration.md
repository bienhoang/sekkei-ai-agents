---
name: project-vietnamese-primary-migration
description: GitHub issue #4 — make Vietnamese the canonical Sekkei template language; Japanese delivered via translate_document (vi→ja), no parallel ja template set maintained.
metadata:
  type: project
---

Sekkei is migrating from Japanese-primary to Vietnamese-primary spec templates (GH issue #4).

**Why:** Vietnamese users find Japanese templates hard to read. Decision: vi is the ONE canonical working language; Japanese/other langs produced afterward via the existing `translate_document` pipeline (translation does NOT load a template, so vi→ja works).

**How to apply (confirmed user decisions, do not re-litigate):**
- Replace `ja/` with Vietnamese as canonical — but KEEP `templates/ja/` physically for back-compat + translation QA (do not delete).
- Validator made language-aware (BY_LANG maps keyed off frontmatter `language:` field), not parallel ja maintenance.
- Global default flips `ja`→`vi`. Resolver fallback base flips `ja`→`vi`.
- Direct `language:ja` generation is deprecated (Japanese only via translate).

**Key technical facts (verified 2026-06-20):**
- 27 templates in `templates/ja/`; no `vi/` or `en/` dir — both en and ja resolve to ja/ via `template-resolver.ts:39-49` fallback today.
- Glossaries `templates/glossaries/*.yaml` already carry ja/en/vi triplets (~3,558 terms) — translation reference but NOT a structural-heading map.
- Keigo validation (`keigo-validator.ts`) is all `severity:"warning"`; Vietnamese yields zero matches (no false errors), but plan gates keigo on `lang==="ja"`.
- #1 correctness risk: template headings must EXACTLY match validator section-name patterns (`validator.ts:38-201`). Single-source ja→vi heading map is the spine.
- Hidden gating Japanese beyond validator: `nfr-classifier.ts:8-15`, `upstream-filter.ts:7-20`, `completeness-rules.ts`, `generate.ts` revision-history regex (`改訂履歴`).

Plan: `plans/260620-0130-vietnamese-primary-templates/` (phases 0-4).
