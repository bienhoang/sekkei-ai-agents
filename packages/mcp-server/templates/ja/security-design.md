---
doc_type: security-design
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - security-policy
  - authentication-authorization
  - data-protection
  - communication-security
  - vulnerability-countermeasures
  - audit-log
  - incident-response
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# セキュリティ設計書

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

<!-- AI: List the stakeholders and teams who will receive this document. Format as bullet list. -->

## 用語集

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key security terms: 認証, 認可, TLS, bcrypt, OWASP, XSS, CSRF, SQLインジェクション, etc. -->

## 1. セキュリティ方針

<!-- AI: State the overall security policy for this system. Reference REQ-xxx and NFR-xxx from upstream documents. Include: セキュリティ設計の基本方針, 適用範囲, 準拠するセキュリティ基準 (OWASP Top 10, IPA, etc.). -->

## 2. セキュリティ対策一覧

<!-- AI: Reference OWASP Top 10 categories when generating countermeasures. Each SEC-ID must map to specific REQ-xxx or NFR-xxx. -->

| SEC-ID | 対策項目 | 対策内容 | 対象 | 優先度 | 備考 |
|--------|---------|---------|------|-------|------|
| SEC-001 | <!-- AI: e.g., 認証強化 --> | <!-- AI: specific countermeasure --> | <!-- AI: scope --> | 高 | <!-- AI --> |
| SEC-002 | <!-- AI: e.g., SQLインジェクション対策 --> | <!-- AI --> | <!-- AI --> | 高 | <!-- AI --> |
| SEC-003 | <!-- AI: e.g., XSS対策 --> | <!-- AI --> | <!-- AI --> | 高 | <!-- AI --> |
| SEC-004 | <!-- AI: e.g., CSRF対策 --> | <!-- AI --> | <!-- AI --> | 高 | <!-- AI --> |
| SEC-005 | <!-- AI: e.g., 通信暗号化 --> | <!-- AI: TLS 1.3以上 --> | <!-- AI --> | 高 | <!-- AI --> |

## 3. 認証・認可設計

<!-- AI: Detail authentication and authorization design. Include: 認証方式 (パスワード/MFA/SSO), セッション管理方式, ロールベースアクセス制御 (RBAC) 設計, パスワードポリシー (bcryptハッシュ化, 最低8文字英数字記号混在). Reference OWASP A07 Identification and Authentication Failures. -->

## 4. データ保護

<!-- AI: Detail data protection design. Include: 個人情報の取扱い (個人情報保護法準拠), 保存データ暗号化方式, 機密データのマスキング・難読化, データ保持期間・削除ポリシー. -->

## 5. 通信セキュリティ

<!-- AI: Detail communication security. Include: TLS 1.3以上の使用を必須とする, 使用する暗号スイート, 証明書管理方針, API通信のセキュリティ (HTTPS強制, HSTSヘッダー). Reference OWASP A02 Cryptographic Failures. -->

## 6. 脆弱性対策

<!-- AI: Detail vulnerability countermeasures. Include: 入力バリデーション方針, SQLインジェクション対策 (プリペアドステートメント), XSS対策 (出力エスケープ), CSRF対策 (トークン方式), 依存ライブラリの脆弱性管理. Map to OWASP Top 10 categories. -->

## 7. 監査ログ

<!-- AI: Detail audit logging design. Include: ログ収集対象イベント一覧, ログ項目 (タイムスタンプ/ユーザーID/操作内容/IPアドレス), ログ保持期間 (具体的な日数), ログ改ざん防止対策, ログ監視・アラート方針. -->

## 8. インシデント対応

<!-- AI: Detail incident response procedures. Include: インシデント検知方法, 重大度分類 (高/中/低), 対応手順フロー, エスカレーション先, 事後対応 (原因分析・再発防止). -->

## 9. 参考資料

<!-- AI: List referenced documents: OWASP Top 10, IPA セキュアプログラミングガイド, REQ-xxx, NFR-xxx. -->
