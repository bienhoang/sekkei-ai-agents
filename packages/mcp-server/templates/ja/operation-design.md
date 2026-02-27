---
doc_type: operation-design
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - operations-organization
  - backup-restore
  - monitoring-alerts
  - incident-response
  - job-management
  - sla-definition
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never use です or ます for sentence endings. -->

# 運用設計書

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

## 検印欄

| レビュー段階 | レビュー者 | レビュー日 | 指摘件数 | 判定 |
|------------|----------|----------|---------|------|
| 第1回レビュー | | | | |
| 第2回レビュー | | | | |
| 最終承認 | | | | |

## 配布先 <!-- required -->

<!-- AI: List stakeholders: PMO, 運用チーム, インフラチーム, 顧客担当者. Format as bullet list. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key operational terms used in this document. -->

## 1. 運用体制 <!-- required -->

<!-- AI: Define operational team structure, roles, and escalation path.
     Include on-call rotation schedule if applicable.
     Reference NFR-xxx availability requirements. -->

| 役割 | 担当 | 連絡先 | 対応時間帯 |
|------|------|--------|-----------|
<!-- AI: Fill with team roles and responsibilities -->

## 2. バックアップ・リストア方針 <!-- required -->

<!-- AI: Define backup strategy: full/incremental schedule, retention period, storage location.
     Include RPO/RTO targets from NFR requirements.
     Document restore procedure with estimated time. -->

| 対象 | バックアップ方式 | 頻度 | 保持期間 | RPO | RTO |
|------|-----------------|------|---------|-----|-----|
<!-- AI: Fill for each data store (DB, file storage, logs) -->

## 3. 監視・アラート定義 <!-- required -->

<!-- AI: Define monitoring targets, thresholds, alert channels.
     Include system metrics (CPU, memory, disk), application metrics (response time, error rate),
     and business metrics (transaction count, queue depth). -->

| 監視対象 | メトリクス | 閾値(警告) | 閾値(異常) | 通知先 | 対応手順 |
|---------|-----------|-----------|-----------|--------|---------|
<!-- AI: Fill for each monitoring target -->

## 4. 障害対応手順 <!-- required -->

<!-- AI: Document incident response procedures.
     ID format: OP-001, OP-002...
     Include: severity classification, initial response, escalation, recovery steps. -->

| OP-ID | 手順名 | 障害レベル | 手順内容 | 担当者 | 想定時間 |
|-------|--------|-----------|---------|--------|---------|
| OP-001 | <!-- AI --> | <!-- AI: 重大/警告/軽微 --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

## 5. ジョブ管理 <!-- required -->

<!-- AI: List batch jobs and scheduled tasks.
     Include: execution schedule, dependencies, retry policy, failure notification. -->

| ジョブID | ジョブ名 | 実行スケジュール | 依存関係 | リトライ回数 | 失敗時対応 |
|---------|--------|---------------|---------|------------|-----------|
<!-- AI: Fill for each scheduled job -->

## 6. SLA定義 <!-- required -->

<!-- AI: Define Service Level Agreement targets.
     MANDATORY: Every SLA item must have a specific numeric target.
     Prohibited vague terms: 高い, 十分, 適切. -->

| SLA項目 | 目標値 | 測定方法 | 報告頻度 | 違反時対応 |
|---------|--------|---------|---------|-----------|
| 稼働率 | <!-- AI: e.g., 99.9% --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |
| 応答時間 | <!-- AI: e.g., 95%ile < 200ms --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |
