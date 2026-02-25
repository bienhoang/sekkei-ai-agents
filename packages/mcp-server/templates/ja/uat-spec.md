---
doc_type: uat-spec
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - test-design
  - test-cases
  - traceability
  - defect-report
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# 受入テスト仕様書

## 改訂履歴 <!-- required -->

| 版数 | 日付 | 変更内容 | 変更者 |
|------|------|----------|--------|
| 1.0  | YYYY-MM-DD | 初版作成 | <!-- AI: Author name --> |

<!-- AI: Add rows for each revision. 版数 increments as 1.0, 1.1, 2.0. -->

## 承認欄 <!-- required -->

| 役割 | 氏名 | 日付 |
|------|------|------|
| 作成者 | | |
| 確認者 | | |
| 承認者 | | |

<!-- AI: Leave 氏名 and 日付 blank — these are filled by humans after review. -->

## 配布先 <!-- required -->

<!-- AI: List the stakeholders and teams who will receive this document. Format as bullet list. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key terms: 受入基準, ビジネスシナリオ, ユーザーロール, サインオフ, デフェクト, etc. -->

## 1. テスト設計 <!-- required -->

<!-- AI: Describe UAT design approach. Focus on business scenarios from the user's perspective — NOT technical feature scope. Include: テスト目的 (ビジネス要件の充足確認), テスト参加者 (実業務ユーザー, PMO, 顧客担当者), テスト環境 (本番同等), テストデータ方針 (実業務データに近いデータ使用), サインオフ手順. Reference REQ-xxx from 要件定義書, NFR-xxx from 非機能要件定義書. -->

## 2. 受入テストケース <!-- required -->

<!-- AI: Generate UAT test cases as business scenarios written in user-facing language. ID format: UAT-001, UAT-002... テスト観点: ビジネスシナリオ達成, ユーザビリティ, 非機能受入 (性能/可用性). Do NOT scope to individual features — write from end-user business perspective. -->

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|-------------|---------|---------|---------|---------|------|------|---------|------|------------|------|
| 1 | UAT-001 | <!-- AI: REQ-xxx business scenario --> | ビジネスシナリオ | <!-- AI: business precondition in user language --> | <!-- AI: user-facing steps, no tech jargon --> | <!-- AI: user input --> | <!-- AI: business outcome expected --> | | | | <!-- AI --> |
| 2 | UAT-002 | <!-- AI: NFR-xxx non-functional acceptance --> | 非機能受入 | <!-- AI --> | <!-- AI: user-observable steps --> | <!-- AI --> | <!-- AI: NFR-xxx target value --> | | | | <!-- AI --> |
| 3 | UAT-003 | <!-- AI: another REQ-xxx scenario --> | ビジネスシナリオ | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | | | | <!-- AI --> |

<!-- AI: Write all test steps and expected results in plain business Japanese understandable by non-technical users. Cover: 主要ビジネスシナリオ (REQ-xxx ごと), 非機能受入基準 (NFR-xxx の目標値をユーザー視点で確認), エラー時のユーザー体験 (エラーメッセージの分かりやすさ), アクセシビリティ・ユーザビリティ. -->

## 3. トレーサビリティ <!-- required -->

<!-- AI: Map test cases to requirements. Traceability direction: REQ-xxx → NFR-xxx → UAT-xxx. -->

| REQ-ID | NFR-ID | UAT-ID | テスト観点 | 備考 |
|--------|-------|--------|---------|------|
| <!-- AI: REQ-xxx --> | <!-- AI: NFR-xxx or N/A --> | <!-- AI: UAT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Ensure every REQ-xxx from 要件定義書 has at least one UAT-xxx. NFR-xxx 受入基準も UAT-xxx にマッピングすること. Missing traceability = acceptance gap. -->

## 4. デフェクト報告 <!-- required -->

<!-- AI: Leave this section mostly blank — it is filled during test execution. Provide the table header only. -->

| デフェクトID | テストケースID | 重大度 | 発見日 | 内容 | 原因 | 修正日 | ステータス |
|------------|-------------|-------|-------|-----|------|-------|---------|

<!-- AI: 重大度: 致命的/重大/軽微/提案. ステータス: 未対応/対応中/修正済み/確認済み/クローズ. -->

## 5. サインオフ

<!-- AI: Provide the final acceptance sign-off section. Leave names and dates blank for human completion. -->

| 項目 | 判定 | 担当者 | 日付 | 備考 |
|-----|------|-------|------|------|
| 全UATケース合格 | | | | |
| 重大欠陥残存なし | | | | |
| 顧客承認取得 | | | | |
| 本番リリース承認 | | | | |

## 6. 参考資料

<!-- AI: List referenced documents: 要件定義書 (REQ-xxx), 非機能要件定義書 (NFR-xxx), テスト計画書 (TP-004). -->
