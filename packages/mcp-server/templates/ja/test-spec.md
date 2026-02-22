---
doc_type: test-spec
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
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# テスト仕様書

## 改訂履歴

| 版数 | 日付 | 変更内容 | 変更者 |
|------|------|----------|--------|
| 1.0  | YYYY-MM-DD | 初版作成 | <!-- AI: Author name --> |

<!-- AI: Add rows for each revision. 版数 increments as 1.0, 1.1, 2.0. -->

## 承認欄

| 役割 | 氏名 | 日付 |
|------|------|------|
| 作成者 | | |
| 確認者 | | |
| 承認者 | | |

<!-- AI: Leave 氏名 and 日付 blank — these are filled by humans after review. -->

## 配布先

<!-- AI: List the stakeholders and teams who will receive this document (e.g., PMO, 開発チーム, 顧客担当者). Format as bullet list. -->

## 用語集

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key technical or business terms used in this document. Include Japanese term, plain-language explanation, and English equivalent if applicable. -->

## 1. テスト設計

### 1.1 テスト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | |
| ドキュメントID | TS-001 |
| テスト期間 | |
| 作成日 | |
| 版数 | 1.0 |

### 1.2 テスト戦略

| テストレベル | 目的 | 対象範囲 | 担当 | ツール |
|------------|------|---------|------|--------|
| 単体テスト (UT) | 個別モジュールの機能確認 | クラス/メソッド単位 | 開発者 | |
| 結合テスト (IT) | モジュール間連携確認 | API/画面遷移 | 開発者 | |
| システムテスト (ST) | システム全体の動作確認 | エンドツーエンド | QA | |
| 受入テスト (UAT) | ユーザー要件の充足確認 | 業務シナリオ | 顧客/PM | |
<!-- AI: Fill tools column based on project tech stack. -->

### 1.3 テスト環境

| 環境 | 用途 | 構成 | 備考 |
|------|------|------|------|
<!-- AI: Define test environments per level. -->

## 2. テストケース仕様

### 2.1 単体テスト (UT)

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|--------------|-----------|-----------|---------|-----------|--------|--------|---------|------|------------|------|
<!-- AI: Generate UT cases. テスト観点: 正常系/異常系/境界値.
     ID format: UT-001. Map to CLS-xxx or module IDs.
     Generate at least 5 cases per major module. -->

### 2.2 結合テスト (IT)

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|--------------|-----------|-----------|---------|-----------|--------|--------|---------|------|------------|------|
<!-- AI: Generate IT cases. Focus on API integration, screen transitions.
     ID format: IT-001. Map to API-xxx, SCR-xxx IDs. -->

### 2.3 システムテスト (ST)

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|--------------|-----------|-----------|---------|-----------|--------|--------|---------|------|------------|------|
<!-- AI: Generate ST cases. テスト観点: パフォーマンス/セキュリティ/負荷.
     ID format: ST-001. End-to-end business scenarios. -->

### 2.4 受入テスト (UAT)

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|--------------|-----------|-----------|---------|-----------|--------|--------|---------|------|------------|------|
<!-- AI: Generate UAT cases. Business scenario-based.
     ID format: UAT-001. Map to REQ-xxx IDs. -->

## 3. トレーサビリティマトリックス

| 要件ID | 機能ID | 画面ID | UT-ID | IT-ID | ST-ID | UAT-ID | カバレッジ |
|--------|--------|--------|-------|-------|-------|--------|-----------|
<!-- AI: Map requirements through full chain.
     REQ-xxx -> F-xxx -> SCR-xxx -> UT-xxx/IT-xxx/ST-xxx/UAT-xxx.
     カバレッジ: percentage of test coverage per requirement. -->

## 4. デフェクト報告テンプレート

| No. | デフェクトID | 発見日 | テストケースID | 重要度 | 概要 | 再現手順 | 期待動作 | 実際動作 | 対応状況 | 修正担当 | 修正日 | 備考 |
|-----|------------|--------|--------------|--------|------|---------|---------|---------|---------|---------|--------|------|
<!-- AI: Leave template empty for testers to fill during execution.
     重要度: 致命的/重大/軽微/要望.
     対応状況: 未着手/対応中/修正済/確認済/クローズ. -->
