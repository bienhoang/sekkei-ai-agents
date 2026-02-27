---
doc_type: it-spec
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
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# 結合テスト仕様書

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

## 検印欄

| レビュー段階 | レビュー者 | レビュー日 | 指摘件数 | 判定 |
|------------|----------|----------|---------|------|
| 第1回レビュー | | | | |
| 第2回レビュー | | | | |
| 最終承認 | | | | |

## 配布先 <!-- required -->

<!-- AI: List the stakeholders and teams who will receive this document. Format as bullet list. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key terms: API, インターフェース, 画面遷移, レスポンス, エラーハンドリング, スタブ, デフェクト, etc. -->

## 1. テスト設計 <!-- required -->

<!-- AI: Describe integration test design approach. Focus on interface contracts between components. Include: テスト対象インターフェース一覧 (API-xxx from 基本設計書, SCR-xxx 画面ID, TBL-xxx テーブルID), テスト手法 (トップダウン/ボトムアップ/ビッグバン), テスト環境構成, スタブ・ドライバー方針. Reference API-xxx, SCR-xxx, TBL-xxx from 基本設計書. -->

## 2. 結合テストケース <!-- required -->

<!-- AI: Generate test cases focused on interface contracts, API integration, and screen transitions. ID format: IT-001, IT-002... テスト観点: API契約検証, 画面遷移, データ整合性, エラー伝播, タイムアウト処理. -->

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|-------------|---------|---------|---------|---------|------|------|---------|------|------------|------|
| 1 | IT-001 | <!-- AI: API-xxx endpoint --> | API契約検証 | <!-- AI: precondition --> | <!-- AI: steps --> | <!-- AI: request body --> | <!-- AI: expected response --> | | | | <!-- AI --> |
| 2 | IT-002 | <!-- AI: SCR-xxx → SCR-xxx --> | 画面遷移 | <!-- AI --> | <!-- AI: navigate steps --> | <!-- AI: user action --> | <!-- AI: expected screen --> | | | | <!-- AI --> |
| 3 | IT-003 | <!-- AI: API-xxx --> | エラーハンドリング | <!-- AI --> | <!-- AI --> | <!-- AI: invalid request --> | <!-- AI: error response --> | | | | <!-- AI --> |

<!-- AI: Focus on: API-xxx インターフェース契約 (request/response schema), SCR-xxx 画面遷移フロー, TBL-xxx データ整合性 (CRUD operations), 認証・認可の境界, タイムアウト・エラー伝播. -->

## 3. トレーサビリティ <!-- required -->

<!-- AI: Map test cases to design artifacts. Traceability direction: API-xxx → SCR-xxx → IT-xxx. -->

| API-ID | SCR-ID | IT-ID | テスト観点 | 備考 |
|--------|-------|-------|---------|------|
| <!-- AI: API-xxx --> | <!-- AI: SCR-xxx --> | <!-- AI: IT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Ensure every API-xxx from 基本設計書 has at least one IT-xxx. Include TBL-xxx where data persistence is verified. -->

## 4. デフェクト報告 <!-- required -->

<!-- AI: Leave this section mostly blank — it is filled during test execution. Provide the table header only. -->

| デフェクトID | テストケースID | 重大度 | 発見日 | 内容 | 原因 | 修正日 | ステータス |
|------------|-------------|-------|-------|-----|------|-------|---------|

<!-- AI: 重大度: 致命的/重大/軽微/提案. ステータス: 未対応/対応中/修正済み/確認済み/クローズ. -->

## 5. 参考資料

<!-- AI: List referenced documents: 基本設計書 (API-xxx, SCR-xxx, TBL-xxx), テスト計画書 (TP-002). -->
