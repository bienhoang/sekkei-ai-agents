# Sekkei Commands & Workflows Research
Date: 2026-02-24 | For: Vietnamese user guide (non-tech audience)

---

## Prerequisites

**One-time setup** (before any command):
```bash
npx sekkei init
```
Interactive wizard — creates `sekkei.config.yaml`, output dir, glossary import, Python deps. No AI needed.

---

## All 30 Commands

### Document Generation (13 commands)

| # | Command | Syntax | Input Required | Output Document | Prerequisite |
|---|---------|--------|----------------|-----------------|--------------|
| 1 | `rfp` | `/sekkei:rfp [@project-name]` | RFP text (paste) | 6 files in `01-rfp/` | None |
| 2 | `requirements` | `/sekkei:requirements @input` | RFP/input text | 要件定義書 | RFP complete |
| 3 | `functions-list` | `/sekkei:functions-list @input` | requirements | 機能一覧 | requirements |
| 4 | `nfr` | `/sekkei:nfr @requirements` | requirements doc | 非機能要件定義書 | requirements |
| 5 | `project-plan` | `/sekkei:project-plan @req` | requirements doc | プロジェクト計画書 | requirements |
| 6 | `basic-design` | `/sekkei:basic-design @input` | requirements + functions-list | 基本設計書 | requirements + functions-list |
| 7 | `security-design` | `/sekkei:security-design @bd` | basic-design doc | セキュリティ設計書 | basic-design |
| 8 | `detail-design` | `/sekkei:detail-design @input` | basic-design doc | 詳細設計書 | basic-design |
| 9 | `test-plan` | `/sekkei:test-plan @req` | req + nfr + basic-design | テスト計画書 | basic-design |
| 10 | `ut-spec` | `/sekkei:ut-spec @detail-design` | detail-design + test-plan | 単体テスト仕様書 | detail-design + test-plan |
| 11 | `it-spec` | `/sekkei:it-spec @basic-design` | basic-design + test-plan | 結合テスト仕様書 | basic-design + test-plan |
| 12 | `st-spec` | `/sekkei:st-spec @basic-design` | basic-design + functions-list + test-plan | システムテスト仕様書 | basic-design + test-plan |
| 13 | `uat-spec` | `/sekkei:uat-spec @requirements` | requirements + nfr + test-plan | 受入テスト仕様書 | requirements + test-plan |

### Supplementary Documents (4 commands)

| # | Command | Syntax | Input Required | Output Document | Prerequisite |
|---|---------|--------|----------------|-----------------|--------------|
| 14 | `matrix` | `/sekkei:matrix` | existing docs | CRUD図 / トレーサビリティマトリックス (Excel) | basic-design |
| 15 | `sitemap` | `/sekkei:sitemap` | existing docs | サイトマップ | basic-design |
| 16 | `operation-design` | `/sekkei:operation-design @input` | input text | 運用設計書 | basic-design |
| 17 | `migration-design` | `/sekkei:migration-design @input` | input text | 移行設計書 | basic-design |

### Utility Commands (13 commands)

| # | Command | Syntax | Key Options | What It Does |
|---|---------|--------|-------------|--------------|
| 18 | `validate` | `/sekkei:validate @doc` | no arg = full chain | Check completeness, cross-refs, staleness |
| 19 | `status` | `/sekkei:status` | — | Show chain progress, suggest next doc |
| 20 | `export` | `/sekkei:export @doc --format=xlsx\|pdf\|docx` | default: xlsx | Export to Excel/PDF/Word |
| 21 | `translate` | `/sekkei:translate @doc --lang=en` | `--lang=en` | Translate doc preserving IDs + tables |
| 22 | `glossary` | `/sekkei:glossary [add\|list\|find\|export\|import]` | subcommands | Manage project terminology (ja/en/vi) |
| 23 | `change` | `/sekkei:change` | `--resume CR-ID`, `--status`, `--list`, `--cancel`, `--rollback` | Change request lifecycle |
| 24 | `update` | `/sekkei:update @doc` | `--since <git-ref>` | Detect upstream changes, auto-insert 改訂履歴 row |
| 25 | `diff-visual` | `/sekkei:diff-visual @before @after` | — | Color-coded revision Excel (朱書き) |
| 26 | `plan` | `/sekkei:plan @doc-type` | — | Survey + create phased generation plan |
| 27 | `implement` | `/sekkei:implement @plan-path` | — | Execute plan phase by phase |
| 28 | `preview` | `/sekkei:preview` | `--edit`, `--docs`, `--port` | Start VitePress preview server |
| 29 | `version` | `/sekkei:version` | `--json` | Health check + version info |
| 30 | `uninstall` / `rebuild` | `/sekkei:uninstall` / `/sekkei:rebuild` | — | Remove or rebuild Sekkei |

---

## Key Workflow Summaries

### 1. RFP Flow (Presales)
```
/sekkei:rfp → paste RFP → auto-analysis → Q&A generated → send to client
→ paste client answers → proposal draft → scope freeze
→ /sekkei:functions-list (V-model starts)
```
**Phases**: RFP_RECEIVED → ANALYZING → QNA_GENERATION → WAITING_CLIENT → CLIENT_ANSWERED → DRAFTING → PROPOSAL_UPDATE → SCOPE_FREEZE

**Navigation keywords**: `SHOW` (view current output), `BACK` (previous phase), `BUILD_NOW` (skip Q&A, draft with assumptions), `SKIP_QNA`

**Files saved**: `sekkei-docs/01-rfp/<project-name>/` (01_raw_rfp.md … 06_scope_freeze.md)

---

### 2. V-Model Document Chain (Normal Flow)
```
requirements → functions-list + nfr + project-plan
             → basic-design → security-design + detail-design
                            → test-plan → ut-spec + it-spec + st-spec + uat-spec
```
Each command reads upstream docs automatically. Run `/sekkei:status` anytime to see what's next.

---

### 3. Change Request (CR) Flow
```
/sekkei:change → describe change + affected IDs
→ impact analysis (shows Mermaid graph)
→ approve → propagate step-by-step (each doc, user confirms)
→ validate chain → complete
```
**Resume**: `/sekkei:change --resume CR-ID`
**Rollback**: `/sekkei:change --rollback CR-ID` (restores git checkpoint)
**Auto**: inserts 改訂履歴 row in each propagated document

---

### 4. Plan/Implement Flow (Large Docs)
```
/sekkei:plan @doc-type → feature survey (multiSelect) → complexity survey
→ plan files created → /sekkei:implement @plan-path
→ phase-by-phase: [Proceed / Skip / Stop] → auto-validate on finish
```
Use for: basic-design, detail-design, test-spec on large projects.

---

### 5. Export Flow
```
/sekkei:export @doc --format=xlsx|pdf|docx
```
- **xlsx**: 4-sheet IPA structure (表紙, 更新履歴, 目次, 本文), JP formatting
- **pdf**: Noto Sans JP, A4 landscape, TOC, page numbers
- **docx**: Cover page, auto-TOC (Ctrl+A → F9 in Word), MS Mincho JP

Split mode: prompts "merged or per-feature?"

---

### 6. Preview Flow
```
npx sekkei-preview          → read-only at localhost:5173
npx sekkei-preview --edit   → WYSIWYG editing (Milkdown), Ctrl+S to save
npx sekkei-preview build    → static site
```

---

## Configuration (`sekkei.config.yaml`)

| Key | Values | Description |
|-----|--------|-------------|
| `project.name` | string | Project name |
| `project.type` | web \| mobile \| api \| desktop \| lp \| internal-system \| saas \| batch | System type |
| `project.language` | ja \| en \| vi | Output language |
| `project.keigo` | 丁寧語 \| 謙譲語 \| simple | Japanese politeness level |
| `project.industry` | finance \| medical \| manufacturing \| real-estate | Industry preset (optional) |
| `project.team_size` | number | Team size |
| `project.stack` | list | Tech stack |
| `output.directory` | path | Doc output dir (default: `docs/`) |
| `export.excel_template` | path | Company Excel template (optional) |
| `autoCommit` | boolean | Auto-commit docs to git |
| `approval_chain` | map of doc→[roles] | Digital ハンコ approval workflow |
| `chain.*` | status + output paths | Per-doc chain status tracking |

**Output dir structure (v2.0)**:
```
01-rfp/ | 02-requirements/ | 03-system/ | 04-functions-list/
05-features/ | 06-data/ | 07-operations/ | 08-test/ | 09-ui/ | 10-glossary.md
```

---

## Gotchas / Important Notes for End Users

1. **Order matters** — cannot run `basic-design` without `requirements` + `functions-list` complete. Check `/sekkei:status`.
2. **Split mode** — triggered by `split` section in config; generates per-feature files instead of one big doc. Better quality, but export prompts differ.
3. **改訂履歴 auto-insert** — `update` and `change` commands automatically add revision history rows; user confirms before saving.
4. **RFP is optional** — can start at `/sekkei:requirements` directly if you have requirements text.
5. **Glossary terms** — apply automatically during translate; import industry glossary via `/sekkei:glossary import` after init.
6. **Rollback window** — CR rollback only works while within same git session (before additional commits).
7. **Preview edit mode** — YAML frontmatter not shown but preserved automatically; Japanese IME supported.
8. **Python deps required for export** — `openpyxl`, `weasyprint`, `mistune`, `pyyaml` installed during `npx sekkei init`.
9. **Rebuild after update** — after running `/sekkei:rebuild`, must restart Claude Code to activate new version.
10. **`validate` without args** = full chain validation; with `@doc` = single document only.

---

## Unresolved Questions

- Exact syntax for `@input` argument — is it a file path, pasted text, or a doc-type string? Needs clarification per phase command.
- `vi` language support in `project.language` — are all templates available in Vietnamese or just Japanese/English?
- `approval_chain` digital ハンコ — is this implemented in current version or roadmap only?
- `learning_mode` and `preset` config keys marked as commented-out — are they active features?
