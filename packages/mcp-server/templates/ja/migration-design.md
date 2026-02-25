---
doc_type: migration-design
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - migration-strategy
  - data-migration-plan
  - system-cutover
  - rollback-plan
  - migration-test-plan
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never use です or ます for sentence endings. -->

# 移行設計書

## 改訂履歴 <!-- required -->

| 版数 | 日付 | 変更内容 | 変更者 |
|------|------|----------|--------|
| 1.0  | YYYY-MM-DD | 初版作成 | <!-- AI: Author name --> |

## 承認欄 <!-- required -->

| 役割 | 氏名 | 日付 |
|------|------|------|
| 作成者 | | |
| 確認者 | | |
| 承認者 | | |

## 配布先 <!-- required -->

<!-- AI: List stakeholders: PMO, 開発チーム, インフラチーム, 運用チーム, 顧客担当者. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key migration terms used in this document. -->

## 1. 移行方針 <!-- required -->

<!-- AI: Define overall migration strategy.
     Include: migration approach (big bang / phased / parallel run),
     timeline, success criteria, go/no-go decision points.
     Reference REQ-xxx IDs for migration requirements. -->

### 1.1 移行アプローチ
<!-- AI: Big bang / 段階移行 / 並行稼働 — justify the choice. -->

### 1.2 移行スケジュール
<!-- AI: Timeline with milestones and go/no-go checkpoints. -->

## 2. データ移行計画 <!-- required -->

<!-- AI: Document data migration steps.
     ID format: MIG-001, MIG-002...
     Reference TBL-xxx IDs from basic-design for target tables. -->

| MIG-ID | 対象データ | 移行元 | 移行先 | 移行方法 | データ量 | 検証方法 | 担当者 |
|--------|----------|--------|--------|---------|---------|---------|--------|
| MIG-001 | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI: ETL/SQL/手動 --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

### 2.1 データマッピング
<!-- AI: Source-to-target field mapping for key tables.
     Include data type conversion rules and default values. -->

### 2.2 データクレンジング
<!-- AI: Rules for cleaning invalid/duplicate data before migration. -->

## 3. システム切替手順 <!-- required -->

<!-- AI: Step-by-step cutover procedure with timing estimates.
     Include: pre-cutover checks, DNS switch, service restart, post-cutover verification. -->

| 順番 | 作業内容 | 担当者 | 所要時間 | 確認事項 |
|------|---------|--------|---------|---------|
<!-- AI: Fill with cutover steps in chronological order -->

## 4. ロールバック計画 <!-- required -->

<!-- AI: MANDATORY: Step-by-step rollback procedure.
     Include: trigger conditions, rollback steps, time estimates, data recovery.
     Each step must have a time estimate. -->

### 4.1 ロールバック判断基準
<!-- AI: Conditions that trigger rollback (e.g., error rate > 5%, data loss detected). -->

### 4.2 ロールバック手順

| 順番 | 作業内容 | 担当者 | 所要時間 | 注意事項 |
|------|---------|--------|---------|---------|
<!-- AI: Fill with rollback steps in reverse chronological order -->

## 5. 移行テスト計画 <!-- required -->

<!-- AI: Define migration testing strategy.
     Include: test environments, test data preparation, validation criteria.
     Reference TBL-xxx IDs for data validation targets. -->

| テストID | テスト対象 | テスト内容 | 期待結果 | 判定基準 |
|---------|----------|----------|---------|---------|
<!-- AI: Fill with migration test cases -->
