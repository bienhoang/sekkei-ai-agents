---
doc_type: project-plan
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - project-overview
  - wbs-schedule
  - organization
  - resource-plan
  - risk-management
  - quality-management
  - communication-plan
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# プロジェクト計画書

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
<!-- AI: Extract 5-10 key project management terms: WBS, マイルストーン, RACI, リスク, QA, etc. -->

## 1. プロジェクト概要 <!-- required -->

<!-- AI: Summarize the project. Include: プロジェクト名, 目的・背景, スコープ概要, 開発手法 (アジャイル/ウォーターフォール), 主要マイルストーン. Reference F-xxx from 機能一覧 and REQ-xxx from 要件定義書. -->

## 2. WBS・スケジュール <!-- required -->

<!-- AI: Generate WBS and schedule table. Each task maps to PP-ID. Dates in YYYY-MM-DD format. 工数 in 人日. Reference REQ-xxx and F-xxx to derive tasks. -->

| PP-ID | フェーズ | タスク | 担当 | 開始日 | 終了日 | 工数 | ステータス |
|-------|---------|-------|------|-------|-------|------|---------|
| PP-001 | 要件定義 | <!-- AI: task name --> | <!-- AI: role --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI: N人日 --> | 未着手 |
| PP-002 | 基本設計 | <!-- AI --> | <!-- AI --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI --> | 未着手 |
| PP-003 | 詳細設計 | <!-- AI --> | <!-- AI --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI --> | 未着手 |
| PP-004 | 実装 | <!-- AI --> | <!-- AI --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI --> | 未着手 |
| PP-005 | テスト | <!-- AI --> | <!-- AI --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI --> | 未着手 |
| PP-006 | リリース | <!-- AI --> | <!-- AI --> | YYYY-MM-DD | YYYY-MM-DD | <!-- AI --> | 未着手 |

<!-- AI: Add Mermaid Gantt chart summarizing the schedule phases. -->

## 3. 体制 <!-- required -->

<!-- AI: Define project organization. Include: RACI表 (Responsible/Accountable/Consulted/Informed), 役割と責任一覧, 外部ベンダー・顧客側担当者. Format as table: | 役割 | 氏名 | 所属 | 責任範囲 | -->

## 4. リソース計画 <!-- optional -->

<!-- AI: Detail resource allocation. Include: 要員計画 (フェーズ別人数), スキル要件, 環境・ツール一覧 (開発/テスト/本番), 予算概要. -->

## 5. リスク管理 <!-- required -->

<!-- AI: Identify and plan for project risks. Include: リスク登録簿 (発生確率・影響度・対応策). Format as table:
| リスクID | リスク内容 | 発生確率 | 影響度 | 優先度 | 対応策 | 担当 | -->

## 6. 品質管理 <!-- optional -->

<!-- AI: Define quality management approach. Include: 品質目標 (欠陥密度, テストカバレッジ率等), レビュープロセス, テスト戦略概要, 品質ゲート条件 (フェーズ移行基準). -->

## 7. コミュニケーション計画 <!-- optional -->

<!-- AI: Define communication plan. Include: 定例会議スケジュール, 報告体系, エスカレーションパス, ツール (課題管理, チャット, ドキュメント管理). Format as table:
| 会議名 | 頻度 | 参加者 | 目的 | 成果物 | -->

## 8. 参考資料 <!-- optional -->

<!-- AI: List referenced documents: 機能一覧 (F-xxx), 要件定義書 (REQ-xxx), 関連する社内規程. -->
