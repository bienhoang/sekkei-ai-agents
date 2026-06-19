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

<!-- AI: Describe integration test design approach. 結合テストはインターフェース検証(API-xxx, SCR-xxx, TBL-xxx)に加え、業務機能の動作確認(機能テストケース)も対象とする。Include: テスト対象インターフェース一覧 (API-xxx from 基本設計書, SCR-xxx 画面ID, TBL-xxx テーブルID), テスト手法 (トップダウン/ボトムアップ/ビッグバン), テスト環境構成, スタブ・ドライバー方針. Reference API-xxx, SCR-xxx, TBL-xxx from 基本設計書. -->

### 1.1 リスクアセスメント <!-- required -->

<!-- AI: Rate each モジュール/サブモジュール with リスクレベル 高/中/低 and scale test volume accordingly. 高リスク(中核業務・金銭・セキュリティ・多数の利用者が依存) → テストケースを多く・深く生成。中リスク → 適度。低リスク → 基本(正常系)のみ。 -->

| モジュール/サブモジュール | リスクレベル | 理由 | テスト方針 |
|------------------------|-----------|------|----------|
| <!-- AI: module --> | <!-- AI: 高/中/低 --> | <!-- AI: rationale --> | <!-- AI: 多く/適度/基本 --> |

### 1.2 テスト観点・設計技法 <!-- required -->

<!-- AI: テスト観点(網羅性): 正常系 / 異常系 / 境界値 / エッジ(タイムアウト・接続断・同時実行). 設計技法はデータ特性・業務ロジックに応じて選択: 同値分割(Equivalence Partitioning), 境界値分析(Boundary Value Analysis), デシジョンテーブル(複数条件の組合せ), 状態遷移(ワークフロー・ステータス遷移). -->

### 1.3 テストデータ規約 <!-- required -->

<!-- AI: テストデータは必ず具体的な値を記載する。汎用的な説明は禁止。
❌ 「有効なメールを入力」 → ✅ 「メール: test_customer_01@domain.com を入力」
❌ 「正しい顧客コード」 → ✅ 「顧客コード: KH-2026-0012」
❌ 「不正な電話番号」 → ✅ 「電話: abc123xyz(数字でなく文字)」
❌ 「長すぎる名前」 → ✅ 「名前: [255文字制限超過の256文字の'A']」 -->

## 2. 結合テストケース <!-- required -->

<!-- AI: Generate test cases covering BOTH interface contracts (API integration, screen transition, data flow) AND functional behavior. ID format: IT-001, IT-002... テスト観点 column records 正常系/異常系/境界値/エッジ and the applied 設計技法 (同値分割/境界値分析/デシジョンテーブル/状態遷移). 優先度・リスクレベル: 高/中/低. テストデータは具体値必須(§1.3). -->

| No. | テストケースID | モジュール/サブモジュール | テストケース名 | テスト対象 | テスト観点 | 前提条件 | テスト手順 | テストデータ | 期待結果 | 優先度 | リスクレベル | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|-------------|----------------------|-------------|---------|---------|---------|---------|----------|---------|------|-----------|---------|------|------------|------|
| 1 | IT-001 | <!-- AI: module/submodule --> | <!-- AI: 正常系のAPI契約検証 --> | <!-- AI: API-xxx endpoint --> | 正常系/API契約検証 | <!-- AI: precondition --> | <!-- AI: 1.… 2.… --> | <!-- AI: 具体値 例: {"email":"test_customer_01@domain.com"} --> | <!-- AI: 1.… 2.… --> | 高 | <!-- AI: 高/中/低 --> | | | | <!-- AI --> |
| 2 | IT-002 | <!-- AI --> | <!-- AI: 異常系の入力検証 --> | <!-- AI: API-xxx --> | 異常系/同値分割 | <!-- AI --> | <!-- AI --> | <!-- AI: 具体値 例: 電話: abc123xyz --> | <!-- AI: エラー応答 --> | 中 | <!-- AI --> | | | | <!-- AI --> |
| 3 | IT-003 | <!-- AI --> | <!-- AI: 境界値テスト --> | <!-- AI: API-xxx field --> | 境界値/境界値分析 | <!-- AI --> | <!-- AI --> | <!-- AI: 具体値 例: パスワード5文字(下限-1) --> | <!-- AI: 期待結果 --> | 中 | <!-- AI --> | | | | <!-- AI --> |
| 4 | IT-004 | <!-- AI --> | <!-- AI: 画面遷移/状態遷移 --> | <!-- AI: SCR-xxx → SCR-xxx --> | エッジ/状態遷移 | <!-- AI --> | <!-- AI: navigate steps --> | <!-- AI: 具体値 例: 注文ID: ORD-2026-0007 --> | <!-- AI: expected screen --> | 低 | <!-- AI --> | | | | <!-- AI --> |

<!-- AI: Cover: API-xxx インターフェース契約 (request/response schema), SCR-xxx 画面遷移フロー, TBL-xxx データ整合性 (CRUD operations), 認証・認可の境界, タイムアウト・エラー伝播, および業務機能の正常系/異常系/境界値/エッジ. デシジョンテーブルは複数条件(AND/OR)を持つロジック(例: ログイン判定)に適用する。 -->

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
