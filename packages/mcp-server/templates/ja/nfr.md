---
doc_type: nfr
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - overview
  - availability
  - performance-scalability
  - operability-maintainability
  - migration
  - security
  - environment-ecology
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 非機能要件定義書

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
<!-- AI: Extract 5-10 key technical terms. Include RTO, RPO, SLA, TLS, etc. as applicable. -->

## 1. 非機能要件概要

<!-- AI: Summarize the scope and approach of non-functional requirements for this system. Reference the REQ-xxx IDs from the 要件定義書 that drive these NFRs. Describe IPA NFUG 6-category coverage. -->

## 2. 非機能要件一覧

<!-- AI: Each NFR MUST have a numeric 目標値. NEVER use vague terms: 高速, 十分, 適切, 高い, 良好, 適宜. Use specific numbers (e.g., 99.9%, 2秒以内, 1000同時接続, 4時間以内). Map to REQ-xxx from 要件定義書. -->

| NFR-ID | カテゴリ | 要件名 | 目標値 | 測定方法 | 優先度 |
|--------|---------|-------|-------|---------|-------|
| NFR-001 | 可用性 | <!-- AI: requirement name --> | <!-- AI: e.g., 稼働率99.9%以上 --> | <!-- AI: measurement method --> | 高 |
| NFR-002 | 性能・拡張性 | <!-- AI --> | <!-- AI: e.g., P95応答時間2秒以内 --> | <!-- AI --> | 高 |
| NFR-003 | 運用・保守性 | <!-- AI --> | <!-- AI: e.g., 障害検知5分以内 --> | <!-- AI --> | 中 |
| NFR-004 | 移行性 | <!-- AI --> | <!-- AI: e.g., 移行期間2週間以内 --> | <!-- AI --> | 中 |
| NFR-005 | セキュリティ | <!-- AI --> | <!-- AI: e.g., TLS 1.3以上 --> | <!-- AI --> | 高 |
| NFR-006 | システム環境・エコロジー | <!-- AI --> | <!-- AI: e.g., CPU使用率通常時70%以下 --> | <!-- AI --> | 低 |

## 3. 可用性

<!-- AI: Detail availability requirements. Include: 稼働率目標, RTO (Recovery Time Objective), RPO (Recovery Point Objective), 計画停止時間, 障害時の縮退運転方針. All values must be numeric. -->

## 4. 性能・拡張性

<!-- AI: Detail performance and scalability requirements. Include: 応答時間 (P50/P95/P99), スループット, 同時接続数, データ量上限, スケールアウト条件. All values must be numeric. -->

## 5. 運用・保守性

<!-- AI: Detail operability and maintainability requirements. Include: 監視・アラート応答時間, ログ保持期間, バックアップ頻度・保持期間, デプロイ所要時間, MTTR目標. All values numeric. -->

## 6. 移行性

<!-- AI: Detail migration requirements. Include: 移行期間, データ移行方式, 移行データ整合性確認方法, 並行稼働期間, ロールバック手順. If no migration needed, state 新規開発のため既存システムなし. -->

## 7. セキュリティ

<!-- AI: Detail security requirements. Include: 認証方式, 暗号化方式 (TLS version), パスワードポリシー, アクセスログ保持期間, 脆弱性スキャン頻度. Reference REQ-xxx and NFR-xxx IDs. -->

## 8. システム環境・エコロジー

<!-- AI: Detail environment and ecology requirements. Include: サーバースペック最低要件, OS・ミドルウェアバージョン, PUE目標, CPU/メモリ使用率上限, クラウドリージョン要件. If N/A, state 理由を明記. -->

## 9. 参考資料

<!-- AI: List referenced documents: 要件定義書 (REQ-xxx), IPA NFUG ガイドライン, 関連標準. -->
