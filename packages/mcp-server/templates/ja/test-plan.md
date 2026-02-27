---
doc_type: test-plan
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - test-policy
  - test-strategy
  - test-environment
  - test-schedule
  - organization-roles
  - risks-countermeasures
  - completion-criteria
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# テスト計画書

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
<!-- AI: Extract 5-10 key testing terms: 単体テスト, 結合テスト, システムテスト, 受入テスト, 入口基準, 出口基準, デフェクト, テストカバレッジ, etc. -->

## 1. テスト方針 <!-- required -->

<!-- AI: State the overall testing policy. Include: テストの目的, 品質目標 (欠陥検出率, カバレッジ目標), テストアプローチ (リスクベースド, 要件ベースド), 適用するテスト標準. Reference REQ-xxx and F-xxx from upstream documents. -->

## 2. テスト戦略 <!-- required -->

### 2.1 テスト範囲

<!-- AI: Define test scope. List what is IN scope and OUT of scope. Reference F-xxx from 機能一覧 and REQ-xxx from 要件定義書. -->

### 2.2 テストレベルと入口・出口基準

<!-- AI: Define test levels with entry/exit criteria. Map to UT-xxx, IT-xxx, ST-xxx, UAT-xxx IDs. -->

| TP-ID | テストレベル | 入口基準 | 出口基準 | 担当 | ツール |
|-------|-----------|---------|---------|------|------|
| TP-001 | 単体テスト (UT) | <!-- AI: e.g., コーディング完了, コードレビュー完了 --> | <!-- AI: e.g., カバレッジ80%以上, 重大欠陥0件 --> | 開発者 | <!-- AI: e.g., Jest, JUnit --> |
| TP-002 | 結合テスト (IT) | <!-- AI: e.g., 単体テスト出口基準クリア --> | <!-- AI: e.g., 全結合テストケース合格 --> | 開発者 | <!-- AI --> |
| TP-003 | システムテスト (ST) | <!-- AI: e.g., 結合テスト出口基準クリア --> | <!-- AI: e.g., 全STケース合格, 重大欠陥0件 --> | テストチーム | <!-- AI --> |
| TP-004 | 受入テスト (UAT) | <!-- AI: e.g., システムテスト出口基準クリア --> | <!-- AI: e.g., 顧客承認取得 --> | 顧客・PMO | <!-- AI --> |

### 2.3 テスト手法

<!-- AI: Describe test techniques to be used: ブラックボックステスト, ホワイトボックステスト, 境界値分析, 同値分割, デシジョンテーブル, 探索的テスト. -->

## 3. テスト環境 <!-- required -->

<!-- AI: Detail test environments. Include: 環境構成図 (開発/テスト/本番), ハードウェア・ソフトウェア要件, テストデータ方針 (本番データ使用可否, マスキング要否), ツール一覧. -->

## 4. テストスケジュール <!-- optional -->

<!-- AI: Define test schedule aligned with project plan PP-xxx. Include: 各テストレベルの開始・終了予定日, マイルストーン, バッファ期間. Format as table or Gantt reference. -->

## 5. 体制・役割 <!-- optional -->

<!-- AI: Define test team structure. Include: テストマネージャー, テストリーダー, テスター, 開発者, 顧客担当者の役割と責任. Format as table: | 役割 | 氏名/チーム | 責任範囲 | -->

## 6. リスクと対策 <!-- optional -->

<!-- AI: Identify testing risks and countermeasures. Format as table:
| リスクID | リスク内容 | 発生確率 | 影響度 | 対応策 |
Consider: スケジュール遅延, テストデータ不足, 環境構築遅延, スキル不足. -->

## 7. 完了基準 <!-- required -->

<!-- AI: Define overall test completion criteria. Include: 全テストケース実行完了, 欠陥残存数上限 (重大度別), テストカバレッジ達成率, 顧客承認取得. All criteria must be measurable with specific numbers. -->

## 8. 参考資料 <!-- optional -->

<!-- AI: List referenced documents: 要件定義書 (REQ-xxx), 機能一覧 (F-xxx), 非機能要件定義書 (NFR-xxx), プロジェクト計画書 (PP-xxx). -->
