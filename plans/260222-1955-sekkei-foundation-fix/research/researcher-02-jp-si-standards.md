# Research Report: Japanese SI Documentation Standards & Keigo Conventions

**Date:** 2026-02-22
**Report path:** `plans/260222-1955-sekkei-foundation-fix/research/researcher-02-jp-si-standards.md`

---

## 1. Document Structure Standards

### 基本設計書 (Basic Design / External Design)

Standard sections used across NTT Data, Fujitsu-adjacent, and mid-tier SI:

| Section | Japanese | Notes |
|---|---|---|
| Document control table | 改版管理表 | Version, date, author, reason |
| Purpose / Scope | 目的・適用範囲 | Mandatory |
| System overview | システム概要 | Often a block diagram |
| Feature inventory | 機能一覧 | F-xxx IDs; clarifies what is in scope |
| Business flow | 業務フロー図 | Cross-system swimlane diagrams |
| Screen design | 画面設計書 | Wireframes + field specs |
| Report / output design | 帳票設計書 | Print layout specs |
| Batch processing design | バッチ設計図 | Schedule + processing sequence |
| DB / data model | データベース設計書 | ER + table definitions |
| External IF | 外部インターフェース設計書 | File transfer, API, MQ specs |
| Non-functional requirements | 非機能要件 | Performance, security, availability |

### 詳細設計書 (Detailed Design / Internal Design)

Builds on 基本設計書; targets developers only:

| Section | Japanese | Notes |
|---|---|---|
| Module structure | モジュール構成図 | Class / package hierarchy |
| Class diagram | クラス図 | UML |
| Activity / flow | アクティビティ図 / フロー図 | Processing logic |
| Sequence diagram | シーケンス図 | Inter-component calls |
| Method spec | メソッド仕様書 | Input, output, exceptions |
| Field spec sheet | 項目説明書 | Paired with screen/report layouts; logical name ≠ control name |
| Error handling | エラー処理定義 | Error codes, messages |
| SQL / query spec | SQL設計書 | Where optimization matters |

### テスト仕様書 (Test Specification)

| Section | Japanese | Notes |
|---|---|---|
| Test overview | テスト概要 | Scope, strategy, entry/exit criteria |
| Test environment | テスト環境 | OS, DB, middleware versions |
| Test case table | テストケース一覧 | Case ID, condition, expected result, actual result, NG/OK |
| Bug management | 不具合管理表 | Severity, assignee, status |
| Test results summary | テスト結果まとめ | Coverage metrics |

---

## 2. Keigo Standards

### Level by Document Type

| Document | Style | Rationale |
|---|---|---|
| 要件定義書 | 丁寧語 (です・ます) | Client-facing; users/stakeholders review and sign off |
| 基本設計書 | 丁寧語 or mixed | Still partially client-facing; use です・ます where clients read |
| 詳細設計書 | 常体 (だ・である / 体言止め) | Developer-only; brevity preferred; ambiguity is the real risk |
| テスト仕様書 | 常体 | Table-heavy; full sentences rare; labels and 体言止め dominate |

### Sentence Ending Patterns

**丁寧語 (formal, client docs):**
- `〜します` / `〜できます` / `〜されます`
- `〜を行います` (verbose; acceptable in formal context)
- `〜の通りです` / `〜となります`

**常体 (technical docs):**
- `〜する` / `〜できる` / `〜される`
- 体言止め: `「ログインを実行」` (noun-ending; most common in tables)
- `〜を行う` → simplify to `〜する`
- `〜処理を実行すること` → `〜する`

**Avoid in all docs:**
- `〜を行っていただく` (over-keigo, awkward in tech docs)
- `〜となります` (bureaucratic padding)
- Mixing styles within the same document section

### Common BrSE Mistakes

1. Over-keigo in 詳細設計書: writing `〜していただけます` in developer-only docs
2. Inconsistent style: です・ます in headings, だ・である in body
3. Verbose nominalization: `削除処理を行う` → correct: `削除する`
4. `処理` overuse: ~80% of `処理` instances can be dropped
5. Redundant subject: Japanese drops subjects; re-stating `システムは` every sentence = unnatural
6. Particle errors: `を` vs `が` in passive constructions

---

## 3. Document Lifecycle & Version Control

### Review/Approval Workflow

Standard 3-role chain used across SI firms:

```
作成者 (Author) → レビュアー (Reviewer) → 承認者 (Approver)
```

- 作成者: writes and self-checks
- レビュアー: 技術レビュー (technical) + 品質レビュー (QA); may be PM or tech lead
- 承認者: project sponsor or section manager (課長/部長 level); formal sign-off

NTT Data adds a **第三者レビュー** (third-party QA review) step between レビュアー and 承認者 for high-risk projects.

### Status Labels

| Label | Japanese | Meaning |
|---|---|---|
| Draft | ドラフト / 作成中 | WIP; not ready for review |
| Under review | レビュー中 | Circulated for feedback |
| Revision pending | 修正中 | Feedback incorporated |
| Approved | 承認済み | Signed off |
| Revised | 改版 | Post-approval change issued |
| Obsolete | 廃版 | Superseded |

### Version Numbering

Two conventions in use:

**Numeric (most common at mid-tier SI and agile-adjacent):**
- `0.x` = draft (before first approval)
- `1.0` = first approved version
- `1.x` = minor revisions within approved baseline
- `2.0` = major revision or re-scoped version

**Alphabetic (large SI / government projects):**
- `A版` = first formal issue
- `B版` = major revision
- Within a version: `A-1`, `A-2` for sub-revisions
- Common at NTT-affiliated and government contractor projects

**朱書き (Red-line) Convention:**
- Changes after approval marked in red (朱色) in Word/Excel
- Old text struck through, new text in red
- 改版理由 column in 改版管理表 documents the reason
- Some firms use track-changes in Word instead; PDF-based firms use annotation stamps (印鑑ハンコ)

---

## 4. Template Preset Differentiation

### Three Meaningful Presets

#### Preset A: Enterprise (大手SI / 官公庁向け)
- **Target:** NTT Data, Fujitsu, NEC, government contractors
- **Style:** 丁寧語 throughout; formal section hierarchy; dense cover page with approval table
- **Mandatory sections:** All 基本設計書 sections listed above; separate docs for each subsystem
- **Table format:** Pre-defined column widths; mandatory 備考 column; numbered IDs required (F-xxx, REQ-xxx)
- **Test cases:** Full test case table with actual/expected + sign-off column
- **Version:** Alphabetic (A版/B版)

#### Preset B: Standard (中堅SI / SES向け)
- **Target:** Mid-tier SI firms, typical BrSE deliverables
- **Style:** 丁寧語 in 要件定義書; 常体 in 設計書; mixed acceptable
- **Mandatory sections:** Core sections; non-functional requirements may be brief
- **Table format:** Simplified; no mandatory ID column for all rows
- **Test cases:** Condensed; combined with test results
- **Version:** Numeric (0.x / 1.x)

#### Preset C: Agile-Hybrid (アジャイル / スタートアップ向け)
- **Target:** Agile teams, in-house development, startup SI
- **Style:** 常体 throughout; concise; no excessive formality
- **Mandatory sections:** Reduced set; combine external+internal design into single doc
- **Table format:** Markdown-friendly; no rigid column structure
- **Test cases:** Scenario-based (BDD-style); linked to user stories
- **Version:** Numeric; may use Git tags instead of 改版管理表

### Key Differentiators (what BrSE/PM notice)

| Feature | Enterprise | Standard | Agile |
|---|---|---|---|
| Cover page | Full approval table | Simple | Minimal / none |
| Keigo level | 丁寧語 all docs | Mixed | 常体 all docs |
| Section count | 10-15 per doc | 6-10 per doc | 3-6 per doc |
| ID scheme | Mandatory F/REQ/SCR IDs | Recommended | Optional |
| 改版管理表 | Mandatory | Recommended | Optional |
| Non-functional req | Separate section | Inline | Skip if trivial |
| Diagram style | Formal UML + Excel | UML or flowchart | Mermaid/lightweight |

---

## Unresolved Questions

1. Exact section structure differences between NTT Data internal templates vs. Fujitsu — no public sources; would require insider/BrSE interview data.
2. Whether alphabetic (A版) versioning is still dominant at government-adjacent firms in 2025 or shifting to numeric — trend data absent.
3. Keigo in テスト仕様書: some firms use 丁寧語 even in テスト because clients attend UAT reviews — context-dependent; no definitive rule found.
4. IPA (情報処理推進機構) publishes guidance but their templates appear waterfall-centric; how Sekkei should handle agile-hybrid test specs relative to IPA standards is unclear.
5. 朱書き automation: whether to generate redline diffs in Sekkei's export layer or leave to humans — depends on whether the Python diff tool produces Word output.

---

## Sources

- [設計書・仕様書の書き方が分かる！ (SINT)](https://products.sint.co.jp/ober/blog/write)
- [設計書とは？基本設計書・詳細設計書の書き方 (IC Solution)](https://ic-solution.jp/blog/design_documents)
- [読みやすい設計書の書き方 〜正しい日本語の使い方 (Qiita)](https://qiita.com/mounntainn/items/4b66bc9743c9ff1becb8)
- [NTTデータ流「機能仕様書チェック」(NTT DATA)](https://www.nttdata.com/jp/ja/trends/data-insight/2024/1030/)
- [システム設計書の書き方 (DCR)](https://www.dcr.co.jp/column/how-to-write/)
- [要件定義、基本設計、詳細設計の流れを総復習 (Zenn)](https://zenn.dev/nyanchu/articles/27a3f95d98df45)
- [JTF日本語標準スタイルガイド](https://www.jtf.jp/pdf/jtf_style_guide.pdf)
