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
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 非機能要件定義書

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
<!-- AI: Extract 5-10 key technical terms. Include RTO, RPO, SLA, TLS, etc. as applicable. -->

## 1. 非機能要件概要 <!-- required -->

<!-- AI: Summarize the scope and approach of non-functional requirements for this system. Reference the REQ-xxx IDs from the 要件定義書 that drive these NFRs. Describe IPA NFUG 6-category coverage. -->

## 2. IPA グレード基準 <!-- reference -->

<!-- AI: Select the appropriate grade for each NFR category below. Use this as the basis for 目標値 in Section 3. The grades are from IPA NFUG (Non-Functional Requirements Utilization Guide). -->

### 可用性グレード

| グレード | 稼働率 | RTO | RPO | 適用例 |
|---------|--------|-----|-----|--------|
| A (最高) | 99.999% (5分/年) | 数分 | 0 (データ損失なし) | 金融基幹, 医療生命維持 |
| B (高) | 99.99% (53分/年) | 1時間以内 | 数分 | EC, SaaS, 官公庁 |
| C (標準) | 99.9% (8.8時間/年) | 4時間以内 | 1時間 | 社内業務, BtoB |
| D (低) | 99% (3.7日/年) | 24時間以内 | 24時間 | 情報系, 参照専用 |

### 性能グレード

| グレード | 応答時間 (P95) | 同時接続数 | スループット | 適用例 |
|---------|--------------|-----------|------------|--------|
| A (最高) | 0.5秒以内 | 10,000+ | 1,000 TPS+ | 高頻度取引, リアルタイム |
| B (高) | 2秒以内 | 1,000-10,000 | 100-1,000 TPS | EC, SaaS |
| C (標準) | 5秒以内 | 100-1,000 | 10-100 TPS | 社内業務 |
| D (低) | 10秒以内 | ~100 | ~10 TPS | バッチ中心, 少人数利用 |

### セキュリティグレード

| グレード | 認証 | 暗号化 | 監査ログ | 適用例 |
|---------|------|--------|---------|--------|
| A (最高) | MFA必須 + 生体認証 | AES-256 + TLS 1.3 | 改竄防止 + 7年保持 | 金融, 防衛, 医療 |
| B (高) | MFA推奨 + SSO | AES-256 + TLS 1.2+ | 暗号化保存 + 3年保持 | 官公庁, EC |
| C (標準) | パスワード + SSO | TLS 1.2+ | 1年保持 | 一般BtoB |
| D (低) | パスワード認証 | TLS 1.2+ | 90日保持 | 社内ツール |

<!-- AI: Select one grade per category. Reference the selected grade when filling Section 3 目標値. State the selected grade explicitly (e.g., "可用性: グレードB") in Section 1 概要. -->

## 3. 非機能要件一覧 <!-- required -->

<!-- AI: Each NFR MUST have a numeric 目標値. NEVER use vague terms: 高速, 十分, 適切, 高い, 良好, 適宜. Use specific numbers (e.g., 99.9%, 2秒以内, 1000同時接続, 4時間以内). Map to REQ-xxx from 要件定義書. Use the IPA grade tables in Section 2 as reference for choosing appropriate numeric targets. -->

| NFR-ID | カテゴリ | 要件名 | 目標値 | 測定方法 | 優先度 |
|--------|---------|-------|-------|---------|-------|
| NFR-001 | 可用性 | <!-- AI: requirement name --> | <!-- AI: e.g., 稼働率99.9%以上 --> | <!-- AI: measurement method --> | 高 |
| NFR-002 | 性能・拡張性 | <!-- AI --> | <!-- AI: e.g., P95応答時間2秒以内 --> | <!-- AI --> | 高 |
| NFR-003 | 運用・保守性 | <!-- AI --> | <!-- AI: e.g., 障害検知5分以内 --> | <!-- AI --> | 中 |
| NFR-004 | 移行性 | <!-- AI --> | <!-- AI: e.g., 移行期間2週間以内 --> | <!-- AI --> | 中 |
| NFR-005 | セキュリティ | <!-- AI --> | <!-- AI: e.g., TLS 1.3以上 --> | <!-- AI --> | 高 |
| NFR-006 | システム環境・エコロジー | <!-- AI --> | <!-- AI: e.g., CPU使用率通常時70%以下 --> | <!-- AI --> | 低 |

## 4. 可用性 <!-- required -->

<!-- AI: Detail availability requirements. Reference the selected grade from Section 2. Include: 稼働率目標, RTO (Recovery Time Objective), RPO (Recovery Point Objective), 計画停止時間, 障害時の縮退運転方針. All values must be numeric. -->

## 5. 性能・拡張性 <!-- required -->

<!-- AI: Detail performance and scalability requirements. Reference the selected grade from Section 2. Include: 応答時間 (P50/P95/P99), スループット, 同時接続数, データ量上限, スケールアウト条件. All values must be numeric. -->

## 6. 運用・保守性 <!-- required -->

<!-- AI: Detail operability and maintainability requirements. Include: 監視・アラート応答時間, ログ保持期間, バックアップ頻度・保持期間, デプロイ所要時間, MTTR目標. All values numeric. -->

## 7. 移行性 <!-- required -->

<!-- AI: Detail migration requirements. Include: 移行期間, データ移行方式, 移行データ整合性確認方法, 並行稼働期間, ロールバック手順. If no migration needed, state 新規開発のため既存システムなし. -->

## 8. セキュリティ <!-- required -->

<!-- AI: Detail security requirements. Reference the selected grade from Section 2. Include: 認証方式, 暗号化方式 (TLS version), パスワードポリシー, アクセスログ保持期間, 脆弱性スキャン頻度. Reference REQ-xxx and NFR-xxx IDs. -->

## 9. システム環境・エコロジー <!-- required -->

<!-- AI: Detail environment and ecology requirements. Include: サーバースペック最低要件, OS・ミドルウェアバージョン, PUE目標, CPU/メモリ使用率上限, クラウドリージョン要件. If N/A, state 理由を明記. -->

## 10. 参考資料 <!-- optional -->

<!-- AI: List referenced documents: 要件定義書 (REQ-xxx), IPA NFUG ガイドライン, 関連標準. -->
