# Research: V-Model, Document Types, IPA Standards
Date: 2026-02-24 | Sources: sekkei/packages/skills/content/references/

---

## V-Model Chain Diagram

```
LEFT SIDE (Spec)                    RIGHT SIDE (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
要件定義 (Requirements)    ←────────→  UAT (受入テスト)
  基本設計 (Basic Design)  ←────────→  ST (システムテスト)
    詳細設計 (Detail)       ←────────→  IT (結合テスト)
      実装 (Code)           ←────────→  UT (単体テスト)
```

**Generation order (strict):**
```
RFP → requirements
        ↓ (then in parallel)
        ├── functions-list
        ├── nfr
        └── project-plan
              ↓
           basic-design
              ↓
           detail-design
              ↓
           test-specs (ut / it / st / uat)
```

---

## 13 Core Document Types

### Phase 1: Requirements

| # | Japanese Name | Purpose | Upstream | Downstream | ID Prefix |
|---|---------------|---------|----------|------------|-----------|
| 1 | 要件定義書 | Defines what the system must do — functional & non-functional requirements from client's perspective | RFP | functions-list, basic-design, all docs | REQ-xxx, NFR-xxx |
| 2 | 機能一覧 | Master list of all system features organized in 3-tier hierarchy (大分類→中分類→小機能) | requirements | basic-design, test-specs | F-xxx (or subsystem prefix) |
| 3 | 非機能要件定義書 (NFR) | Measurable targets for performance, availability, security, maintainability — never vague, always numeric | requirements | basic-design, test-specs | NFR-xxx |
| 4 | プロジェクト計画書 | WBS task breakdown, milestones, team roles, timeline — project management document | requirements + functions-list | (management reference) | PP-xxx |

### Phase 2: Basic Design (基本設計)

| # | Japanese Name | Purpose | Upstream | Downstream | ID Prefix |
|---|---------------|---------|----------|------------|-----------|
| 5 | 基本設計書 | System architecture: screen list, table definitions, API list — "what" the system looks like | requirements + functions-list | detail-design, test-specs | SCR-xxx, TBL-xxx, API-xxx |
| 6 | セキュリティ設計書 | Authentication flows, data classification, OWASP mitigations, compliance mapping | requirements + basic-design | detail-design | SEC-xxx |

### Phase 3: Detail Design (詳細設計)

| # | Japanese Name | Purpose | Upstream | Downstream | ID Prefix |
|---|---------------|---------|----------|------------|-----------|
| 7 | 詳細設計書 | Class specs, module call relationships, validation rules per field, error message catalog, sequence diagrams — "how" the system works internally | basic-design | ut-spec, it-spec | CLS-xxx |

### Phase 4: Test Specifications

| # | Japanese Name | Purpose | Upstream | Downstream | ID Prefix |
|---|---------------|---------|----------|------------|-----------|
| 8 | テスト計画書 | Test strategy, scope, entry/exit criteria for all 4 test levels, CI/CD plan | requirements + nfr + basic-design | all test-specs | TP-xxx |
| 9 | 単体テスト仕様書 (UT) | Tests for individual classes/functions. Maps to: 詳細設計書. 正常系/異常系/境界値 coverage, min 5 cases/module | detail-design | (traceability matrix) | UT-xxx |
| 10 | 結合テスト仕様書 (IT) | Tests for API integrations, screen-to-API flows, interface contracts | basic-design | (traceability) | IT-xxx |
| 11 | システムテスト仕様書 (ST) | End-to-end business scenario tests, performance targets, security tests. System-level only | basic-design + functions-list | (traceability) | ST-xxx |
| 12 | 受入テスト仕様書 (UAT) | Business-language acceptance scenarios for client sign-off. Maps to: 要件定義書. System-level only | requirements + nfr | (client approval) | UAT-xxx |
| 13 | テスト仕様書 (general) | Shared template for any test level — traceability matrix links all test IDs to requirements | varies | (reporting) | varies |

---

## Cross-Reference ID System

**How IDs link documents together:**

```
要件定義書:  REQ-001 "Customer Search"
                ↓ referenced by
機能一覧:    F-001 (or SAL-001) → references REQ-001
                ↓ referenced by
基本設計書:  SCR-001 → references F-001 + REQ-001
             TBL-001 → references F-001
             API-001 → references REQ-001
                ↓ referenced by
詳細設計書:  CLS-001 → references SCR-001, TBL-001, API-001
                ↓ referenced by
テスト:      UT-001 → references CLS-001
             IT-001 → references API-001, SCR-001
             ST-001 → references F-001, SCR-001
             UAT-001 → references REQ-001, NFR-001
```

**Full ID prefix table:**

| Prefix | Document | Format |
|--------|----------|--------|
| REQ- | 機能要件 | REQ-001 |
| NFR- | 非機能要件 | NFR-001 |
| F- | 機能一覧 | F-001 (or subsystem: SAL-001) |
| SCR- | 画面一覧 | SCR-001 (split: SCR-AUTH-001) |
| TBL- | テーブル定義 | TBL-001 |
| API- | API一覧 | API-001 |
| CLS- | クラス仕様 | CLS-001 |
| SEC- | セキュリティ | SEC-001 |
| PP- | プロジェクト計画 | PP-001 |
| TP- | テスト計画 | TP-001 |
| UT- | 単体テスト | UT-001 |
| IT- | 結合テスト | IT-001 |
| ST- | システムテスト | ST-001 |
| UAT- | 受入テスト | UAT-001 |

**Key rule:** IDs are stable once assigned — never change across versions. When a requirement changes, all downstream docs referencing that ID must be updated (bump 更新履歴 version).

---

## IPA Document Standards

**IPA** = 情報処理推進機構 (Information-technology Promotion Agency, Japan). Sets national templates for software spec docs.

**Standard 4-sheet Excel structure** (every document):
1. **表紙** — Cover page (project name, version, date, authors)
2. **更新履歴** — Change history (version, date, author, changes)
3. **目次** — Table of contents
4. **本文** — Main content (document-specific sheets)

**Processing types (処理分類):**
- 入力 — Data entry
- 照会 — Search/display
- 帳票 — Report/export
- バッチ — Scheduled/background

**Priority/Difficulty (優先度・難易度):** 高 / 中 / 低

**Keigo levels:**
- 丁寧語 (です/ます) — standard specs, most common
- 謙譲語 — formal client-facing docs
- simple — internal/technical docs

---

## 9 Supplementary Document Types (brief)

| Document | Purpose |
|----------|---------|
| RFPワークスペース | Client RFP intake: raw analysis + scope freeze decisions, used as input to 要件定義書 |
| 画面設計書 (screen-design) | Per-feature screen layouts, field definitions, validation, transitions (split mode only) |
| 変更要求書 (change-request) | Formal change request: impact analysis, affected docs, approval tracking |
| 翻訳 (translate) | Translated version of any doc (ja↔en↔vi) |
| 用語集 (glossary) | Project-specific term definitions and abbreviations |
| インポート (import) | Docs imported from external Excel/Word into Sekkei's chain |
| トレーサビリティマトリクス | Cross-table: REQ-xxx ↔ F-xxx ↔ SCR-xxx ↔ UT/IT/ST/UAT coverage map |
| 差分レポート (diff) | Comparison between doc versions highlighting changes |
| エクスポート (export) | Output to Excel/PDF/Word for client delivery |

---

## Unresolved Questions

- No 13th "general test-spec" — the 13th MCP tool is `manage_rfp_workspace`; test-spec count may be 12 not 13 core types
- Sekkei skills reference `manage_change_request` but change-request doc type not in core chain — confirm if it's supplementary or core
