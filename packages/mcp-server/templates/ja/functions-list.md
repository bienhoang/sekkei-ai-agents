---
doc_type: functions-list
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - project-info
  - functions-table
  - summary
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
export_hints:
  excel:
    freeze_row: 1
    auto_width: true
  pdf:
    orientation: landscape
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 機能一覧

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

<!-- AI: List the stakeholders and teams who will receive this document (e.g., PMO, 開発チーム, 顧客担当者). Format as bullet list. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key technical or business terms used in this document. Include Japanese term, plain-language explanation, and English equivalent if applicable. -->

## プロジェクト情報 <!-- optional -->
<!-- AI: Fill project name, system name, version, date from project config or ask user. -->

| 項目 | 内容 |
|------|------|
| プロジェクト名 | <!-- AI: project name --> |
| システム名 | <!-- AI: system name --> |
| バージョン | 1.0 |
| 作成日 | <!-- AI: today's date YYYY-MM-DD --> |
| 作成者 | <!-- AI: author or "AI Generated" --> |

## 機能一覧表 <!-- required -->

<!-- AI: Generate rows from input content.
     Rules:
     - Use 3-tier hierarchy: 大分類 (subsystem) -> 中分類 (functional category) -> 小機能 (individual function)
     - ID format: F-001, F-002... (sequential). Each F-xxx MUST map to at least one REQ-xxx via 関連要件ID column
     - 関連要件ID: comma-separated REQ-xxx IDs from upstream 要件定義書 that this function implements
     - 処理分類 must be one of: 入力 (Input) / 照会 (Inquiry) / 帳票 (Report) / バッチ (Batch) / API / イベント (Event) / スケジューラ (Scheduler) / Webhook
     - 優先度: 高 (High) / 中 (Medium) / 低 (Low)
     - 難易度: 高 / 中 / 低
     - 機能名 should be action verb + object (e.g., 見積書作成, 顧客検索)
     - 機能概要: 1-2 sentence description (100-200 chars)
     - Generate at least 10 functions covering all major areas
     - Group related functions under same 大分類/中分類
-->

| No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |
|-----|--------|--------|--------|--------|----------|------------|----------|--------|--------|------|
| 1 | <!-- AI --> | <!-- AI --> | <!-- AI: F-001 --> | <!-- AI --> | <!-- AI --> | <!-- AI: REQ-001, REQ-002 --> | <!-- AI: 入力/照会/帳票/バッチ/API/イベント/スケジューラ/Webhook --> | <!-- AI: 高/中/低 --> | <!-- AI: 高/中/低 --> | <!-- AI --> |

<!-- AI: If generating >30 functions, split into sub-sections by 大分類.
     Each sub-section: ## 機能一覧表 — {大分類名} with same 11-column format.
     Keep F-xxx numbering sequential across all sub-tables. -->

<!-- AI: Optional extra columns may be requested in the generation context. If so, add them after 備考 column. -->

## 集計 <!-- optional -->

<!-- AI: Generate summary counts after completing the table above. -->

| 項目 | 件数 |
|------|------|
| 大分類数 | <!-- AI: count --> |
| 中分類数 | <!-- AI: count --> |
| 機能総数 | <!-- AI: count --> |
| 優先度・高 | <!-- AI: count --> |
| 優先度・中 | <!-- AI: count --> |
| 優先度・低 | <!-- AI: count --> |
| 処理分類別 | <!-- AI: count per type (e.g., 入力:3, 照会:2, API:1) --> |
| REQカバレッジ | <!-- AI: matched/total REQ count from upstream --> |
