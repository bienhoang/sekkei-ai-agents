> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Japanese Documentation Standards Reference

## IPA Guidelines Summary

IPA (情報処理推進機構) provides standard templates for Japanese software development.
Key principles: consistency within organization, version control, traceability.

## Standard 4-Sheet Excel Structure

All IPA-style documents use: 表紙 (Cover) + 更新履歴 (History) + 目次 (TOC) + 本文 (Content).

## Column Headers by Document Type

### 機能一覧 (Function List)
```
No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 処理分類 | 優先度 | 難易度 | 備考
```

### 要件定義書 — 機能要件 (Functional Requirements)
```
要件ID | 要件カテゴリ | 要件分類 | 要件名 | 要件詳細 | 優先度 | 機能ID | 関連画面 | 検証方法 | 備考
```

### 要件定義書 — 非機能要件 (Non-Functional Requirements)
```
要件ID | 要件分類 | 要件項目 | 要件内容 | 目標値 | 検証方法 | 優先度
```

### 基本設計書 — 画面一覧 (Screen List)
```
画面ID | 画面名 | 説明 | 処理分類 | 入力元 | 出力先 | 使用者 | 備考
```

### 基本設計書 — テーブル定義 (Table Definition)
```
テーブルID | テーブル論理名 | テーブル物理名 | 説明 | 主キー | 記録数予測 | 更新頻度 | 関連テーブル
```

### 基本設計書 — API一覧 (API List)
```
API ID | エンドポイント | HTTPメソッド | 機能説明 | リクエスト | レスポンス | セキュリティ | 呼び出し元
```

### 詳細設計書 — クラス仕様 (Class Specifications)
```
クラスID | クラス名 | パッケージ | 責務 | 継承元 | 備考
```

### 詳細設計書 — バリデーション規則 (Validation Rules)
```
規則ID | 対象画面 | 対象項目 | 規則種別 | 規則内容 | エラーメッセージ
```

### 詳細設計書 — エラーメッセージ一覧 (Error Messages)
```
エラーコード | メッセージ | 重要度 | 発生条件 | 対処方法
```

### テスト仕様書 — テストケース (Test Cases)
```
No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考
```

### テスト仕様書 — トレーサビリティ (Traceability Matrix)
```
要件ID | 機能ID | 画面ID | UT-ID | IT-ID | ST-ID | UAT-ID | カバレッジ
```

## ID Numbering Conventions

| Document | Prefix | Format | Example |
|----------|--------|--------|---------|
| 機能一覧 | F- (default) or subsystem prefix (opt-in) | F-001 (or SAL-001) | F-001 |
| 要件定義書 (機能) | REQ- | REQ-001 | REQ-001 |
| 要件定義書 (非機能) | NFR- | NFR-001 | NFR-001 |
| 画面一覧 | SCR- | SCR-001 | SCR-001 |
| テーブル定義 | TBL- | TBL-001 | TBL-001 |
| API一覧 | API- | API-001 | API-001 |
| クラス仕様 | CLS- | CLS-001 | CLS-001 |
| 単体テスト | UT- | UT-001 | UT-001 |
| 結合テスト | IT- | IT-001 | IT-001 |
| システムテスト | ST- | ST-001 | ST-001 |
| 受入テスト | UAT- | UAT-001 | UAT-001 |

## Processing Types (処理分類)

- **入力 (Input):** Data entry functions
- **照会 (Inquiry):** Search and display functions
- **帳票 (Report):** Report generation and export
- **バッチ (Batch):** Scheduled/background processing
- **API:** External/internal API endpoints
- **イベント (Event):** Event-driven processing
- **スケジューラ (Scheduler):** Cron/timer-triggered jobs
- **Webhook:** External callback endpoints

## Optional Extra Columns (機能一覧)

Configure in `sekkei.config.yaml` → `functions_list.extra_columns`:

| Column | Values | Use Case |
|--------|--------|----------|
| platform | iOS/Android/Web/Backend/Shared | Multi-platform projects |
| sprint | Iteration number | Agile projects |
| external_system | External API dependency | Integration-heavy systems |
| migration_status | AS-IS/TO-BE/新規/廃止 | Migration projects |
| feature_flag | Feature flag name | Feature-flagged rollouts |

## Priority & Difficulty (優先度・難易度)

- **高 (High):** Critical, must-have, Phase 1
- **中 (Medium):** Important, can defer
- **低 (Low):** Enhancement, future release

## Keigo Levels (敬語レベル)

- **丁寧語:** Standard polite form (です/ます). Most common for specifications.
- **謙譲語:** Humble form. Used for client-facing formal documents.
- **simple:** Plain form. Used for internal/technical docs.
