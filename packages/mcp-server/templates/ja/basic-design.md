---
doc_type: basic-design
version: "1.0"
language: ja
keigo: "丁寧語"
output_language: "ja"
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - overview
  - system-architecture
  - business-flow
  - functions-list
  - screen-design
  - report-design
  - database-design
  - external-interface
  - non-functional-design
  - technology-rationale
status: draft
author: ""
reviewer: ""
approver: ""
---

# 基本設計書

## 改訂履歴

| 版数 | 日付 | 変更内容 | 変更者 |
|------|------|----------|--------|

## 承認欄

| 役割 | 氏名 | 日付 |
|------|------|------|
| 作成者 | | |
| 確認者 | | |
| 承認者 | | |

## 配布先

## 用語集

| 用語 | 説明 | 英語表記 |
|------|------|----------|

## 1. 概要

### 1.1 本書の目的

### 1.2 対象範囲

### 1.3 設計方針

### 1.4 前提条件・制約

## 2. システム構成

### 2.1 システム構成図
<!-- Mermaid: graph TB system architecture diagram -->

### 2.2 ネットワーク構成

### 2.3 開発・本番環境構成

## 3. 業務フロー

### 3.1 業務フロー図
<!-- Mermaid: flowchart TD business process with swimlanes -->

### 3.2 業務フロー説明

## 4. 機能一覧

| No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 処理分類 | 備考 |
|-----|--------|--------|--------|--------|----------|----------|------|

## 5. 画面設計

### 5.1 画面一覧

| 画面ID | 画面名 | 説明 | 処理分類 | 入力元 | 出力先 | 使用者 | 備考 |
|--------|--------|------|----------|--------|--------|--------|------|

### 5.2 画面遷移図
<!-- Mermaid: stateDiagram-v2 screen transition diagram -->

### 5.3 画面レイアウト方針

<!-- SPLIT MODE: When generating in split mode (scope: "feature"), do NOT generate
     per-screen detail specs in this file. Per-screen specs are generated separately in
     05-features/{feature-name}/detail-design.md.
     In split mode, section 5 should contain ONLY the 画面一覧 table and 画面遷移図 diagram.
     Reference: "詳細は 05-features/{feature-name}/detail-design.md を参照" -->

## 6. 帳票設計

### 6.1 帳票一覧

| 帳票ID | 帳票名 | 出力形式 | 出力タイミング | 使用者 | 備考 |
|--------|--------|----------|---------------|--------|------|

## 7. DB設計

### 7.1 ER図
<!-- Mermaid: erDiagram entity relationship diagram -->

### 7.2 テーブル定義

| テーブルID | テーブル論理名 | テーブル物理名 | 説明 | 主キー | 記録数予測 | 更新頻度 | 関連テーブル |
|-----------|-------------|-------------|------|--------|----------|---------|------------|

### 7.3 データベース方針

## 8. 外部インターフェース

### 8.1 API一覧

| API ID | エンドポイント | HTTPメソッド | 機能説明 | リクエスト | レスポンス | セキュリティ | 呼び出し元 |
|--------|-------------|------------|---------|-----------|-----------|------------|-----------|

### 8.2 外部システム連携

## 9. 非機能設計

### 9.1 パフォーマンス設計

### 9.2 セキュリティ設計

### 9.3 可用性設計

### 9.4 運用・保守設計

## 10. 技術選定根拠

| 技術要素 | 選定技術 | 選定理由 | 代替候補 |
|---------|---------|---------|---------|
