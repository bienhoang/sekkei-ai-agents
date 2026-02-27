---
doc_type: db-design
version: "1.0"
language: ja
keigo: "simple"
output_language: "ja"
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - db-policy
  - er-diagram
  - table-detail
  - index-design
  - partition-design
  - migration-design
  - backup-recovery
  - naming-convention
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

# データベース設計書

## 改訂履歴 <!-- required -->

| 版数 | 日付 | 変更内容 | 変更者 |
|------|------|----------|--------|

## 承認欄 <!-- required -->

| 役割 | 氏名 | 日付 |
|------|------|------|
| 作成者 | | |
| 確認者 | | |
| 承認者 | | |

## 検印欄

| レビュー段階 | レビュー者 | レビュー日 | 指摘件数 | 判定 |
|------------|----------|----------|---------|------|
| 第1回レビュー | | | | |
| 第2回レビュー | | | | |
| 最終承認 | | | | |

## 配布先 <!-- required -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|

## 1. DB設計方針 <!-- required -->

### 1.1 データベース種別

### 1.2 スキーマ設計方針

### 1.3 データモデリング方針

## 2. ER図 <!-- required -->

```mermaid
erDiagram
```

## 3. テーブル詳細定義 <!-- required -->

### テーブル定義テンプレート

| カラム名 | 物理名 | データ型 | 長さ | NOT NULL | デフォルト | 説明 |
|---------|--------|---------|------|----------|-----------|------|

## 4. インデックス設計 <!-- required -->

| DB-ID | テーブル名 | インデックス名 | カラム | 種別 | 目的 |
|-------|----------|--------------|--------|------|------|

## 5. パーティション設計

| テーブル名 | パーティション方式 | キー | 推定データ量 | 保持期間 |
|----------|-----------------|------|------------|---------|

## 6. データ移行設計

## 7. バックアップ・リカバリ

| 対象 | バックアップ方式 | 頻度 | RPO | RTO | 保管先 |
|------|----------------|------|-----|-----|--------|

## 8. 命名規約

| 対象 | 規約 | 例 |
|------|------|-----|
| テーブル名 | snake_case, プレフィックス m_/t_/l_ | m_users, t_orders |
| カラム名 | snake_case | created_at, user_id |
| インデックス名 | idx_{table}_{columns} | idx_users_email |
