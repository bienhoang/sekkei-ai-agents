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
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 機能一覧

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

## プロジェクト情報
<!-- AI: Fill project name, system name, version, date from project config or ask user. -->

| 項目 | 内容 |
|------|------|
| プロジェクト名 | <!-- AI: project name --> |
| システム名 | <!-- AI: system name --> |
| バージョン | 1.0 |
| 作成日 | <!-- AI: today's date YYYY-MM-DD --> |
| 作成者 | <!-- AI: author or "AI Generated" --> |

## 機能一覧表

<!-- AI: Generate rows from input content.
     Rules:
     - Use 3-tier hierarchy: 大分類 (subsystem) -> 中分類 (functional category) -> 小機能 (individual function)
     - ID format: [PREFIX]-001 where PREFIX is 2-3 char abbreviation of 大分類 (e.g., SAL for 営業管理)
     - 処理分類 must be one of: 入力 (Input) / 照会 (Inquiry) / 帳票 (Report) / バッチ (Batch)
     - 優先度: 高 (High) / 中 (Medium) / 低 (Low)
     - 難易度: 高 / 中 / 低
     - 機能名 should be action verb + object (e.g., 見積書作成, 顧客検索)
     - 機能概要: 1-2 sentence description (100-200 chars)
     - Generate at least 10 functions covering all major areas
     - Group related functions under same 大分類/中分類
-->

| No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 処理分類 | 優先度 | 難易度 | 備考 |
|-----|--------|--------|--------|--------|----------|----------|--------|--------|------|
| 1 | <!-- AI --> | <!-- AI --> | <!-- AI: PREFIX-001 --> | <!-- AI --> | <!-- AI --> | <!-- AI: 入力/照会/帳票/バッチ --> | <!-- AI: 高/中/低 --> | <!-- AI: 高/中/低 --> | <!-- AI --> |

## 集計

<!-- AI: Generate summary counts after completing the table above. -->

| 項目 | 件数 |
|------|------|
| 大分類数 | <!-- AI: count --> |
| 中分類数 | <!-- AI: count --> |
| 機能総数 | <!-- AI: count --> |
| 優先度・高 | <!-- AI: count --> |
| 優先度・中 | <!-- AI: count --> |
| 優先度・低 | <!-- AI: count --> |
