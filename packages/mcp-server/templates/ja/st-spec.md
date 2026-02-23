---
doc_type: st-spec
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

# システムテスト仕様書

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

<!-- AI: List the stakeholders and teams who will receive this document. Format as bullet list. -->

## 用語集

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key terms: E2Eテスト, 負荷テスト, セキュリティテスト, 性能テスト, 回帰テスト, デフェクト, etc. -->

## 1. テスト設計

<!-- AI: Describe system test design approach. Focus on end-to-end system behavior, NOT individual feature scope. Include: テスト対象システム範囲, テスト観点 (機能E2E/性能/セキュリティ/障害回復), テスト環境 (本番同等構成), テストデータ方針, 非機能テスト計画 (負荷ツール等). Reference F-xxx from 機能一覧, SCR-xxx and TBL-xxx from 基本設計書. -->

## 2. システムテストケース

<!-- AI: Generate system-level test cases. ID format: ST-001, ST-002... テスト観点: E2Eシナリオ, 性能・負荷, セキュリティ, 障害回復, データ整合性. Do NOT scope to individual features — test system as a whole. -->

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|-------------|---------|---------|---------|---------|------|------|---------|------|------------|------|
| 1 | ST-001 | <!-- AI: F-xxx E2E scenario --> | E2Eシナリオ | <!-- AI: system precondition --> | <!-- AI: end-to-end steps --> | <!-- AI: scenario input --> | <!-- AI: expected outcome --> | | | | <!-- AI --> |
| 2 | ST-002 | <!-- AI: performance target --> | 性能テスト | <!-- AI --> | <!-- AI: load test steps --> | <!-- AI: concurrent users --> | <!-- AI: NFR-xxx target value --> | | | | <!-- AI --> |
| 3 | ST-003 | <!-- AI: security scenario --> | セキュリティテスト | <!-- AI --> | <!-- AI: attack simulation steps --> | <!-- AI: malicious input --> | <!-- AI: blocked/rejected --> | | | | <!-- AI --> |

<!-- AI: Cover all system-level test types: E2Eシナリオ (主要業務フロー全体), 性能テスト (NFR-xxx の目標値を検証), セキュリティテスト (SEC-xxx 対策の有効性確認), 障害回復テスト (RTO/RPO 検証), 回帰テスト (既存機能への影響確認). -->

## 3. トレーサビリティ

<!-- AI: Map test cases to design artifacts. Traceability direction: F-xxx → SCR-xxx → ST-xxx. Include TBL-xxx and NFR-xxx where applicable. -->

| F-ID | SCR-ID | ST-ID | テスト観点 | 備考 |
|------|-------|-------|---------|------|
| <!-- AI: F-xxx --> | <!-- AI: SCR-xxx --> | <!-- AI: ST-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Ensure every F-xxx from 機能一覧 is covered by at least one ST-xxx. NFR-xxx 性能・セキュリティ要件も ST-xxx にマッピングすること. -->

## 4. デフェクト報告

<!-- AI: Leave this section mostly blank — it is filled during test execution. Provide the table header only. -->

| デフェクトID | テストケースID | 重大度 | 発見日 | 内容 | 原因 | 修正日 | ステータス |
|------------|-------------|-------|-------|-----|------|-------|---------|

<!-- AI: 重大度: 致命的/重大/軽微/提案. ステータス: 未対応/対応中/修正済み/確認済み/クローズ. -->

## 5. 参考資料

<!-- AI: List referenced documents: 機能一覧 (F-xxx), 基本設計書 (SCR-xxx, TBL-xxx), 非機能要件定義書 (NFR-xxx), テスト計画書 (TP-003). -->
