---
doc_type: basic-design
version: "1.0"
language: ja
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

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 基本設計書

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

## 1. 概要

### 1.1 本書の目的
<!-- AI: State the purpose of this basic design document.
     Reference the upstream 要件定義書 (REQ-xxx IDs). -->

### 1.2 対象範囲
<!-- AI: System scope covered by this design. List subsystems/modules. -->

### 1.3 設計方針
<!-- AI: Key design principles (separation of concerns, scalability, security-first, etc.). -->

### 1.4 前提条件・制約
<!-- AI: Design-level constraints inherited from requirements + new technical constraints. -->

## 2. システム構成

### 2.1 システム構成図
<!-- AI: Generate a Mermaid architecture diagram showing:
     - Client tier (browser, mobile app)
     - Application tier (API server, web server)
     - Data tier (database, cache, storage)
     - External systems (3rd-party APIs, mail server)
     Example:
     ```mermaid
     graph TB
       subgraph Client
         Browser[Webブラウザ]
         Mobile[モバイルアプリ]
       end
       subgraph Application
         API[APIサーバー]
         Web[Webサーバー]
       end
       subgraph Data
         DB[(データベース)]
         Cache[キャッシュ]
       end
       Browser --> Web
       Mobile --> API
       Web --> API
       API --> DB
       API --> Cache
     ```
-->

### 2.2 ネットワーク構成
<!-- AI: Network topology, security zones, load balancers if applicable. -->

### 2.3 開発・本番環境構成
<!-- AI: Environment list (dev, staging, production) with key differences. -->

## 3. 業務フロー

### 3.1 業務フロー図
<!-- AI: Generate Mermaid flowchart with swimlanes for major business processes.
     Use actors from requirements (ユーザーロール).
     ```mermaid
     flowchart TD
       A[開始] --> B{条件分岐}
       B -->|条件1| C[処理1]
       B -->|条件2| D[処理2]
       C --> E[終了]
       D --> E
     ```
-->

### 3.2 業務フロー説明
<!-- AI: Narrative description of each major business flow shown in diagram. -->

## 4. 機能一覧

<!-- AI: Summary function list from requirements phase. If upstream 機能一覧 exists,
     reproduce or reference it. Otherwise generate from requirements. -->

| No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 処理分類 | 備考 |
|-----|--------|--------|--------|--------|----------|----------|------|
| <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

## 5. 画面設計

### 5.1 画面一覧

<!-- AI: Generate screen inventory from functions and requirements.
     Rules:
     - ID format: SCR-001, SCR-002... (sequential)
     - 処理分類: 入力 / 照会 / 帳票
     - 使用者: Role names from requirements (営業, 管理者, システム管理者, etc.)
     - Map to function IDs where applicable
-->

| 画面ID | 画面名 | 説明 | 処理分類 | 入力元 | 出力先 | 使用者 | 備考 |
|--------|--------|------|----------|--------|--------|--------|------|
| SCR-001 | <!-- AI --> | <!-- AI --> | <!-- AI: 入力/照会/帳票 --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

### 5.2 画面遷移図
<!-- AI: Generate a complete Mermaid stateDiagram-v2 screen transition diagram.
MANDATORY rules:
1. Every SCR-xxx from the 画面一覧 table (§5.1) MUST appear as a state node.
2. Use state labels: state "画面名（SCR-001）" as SCR001
3. Include [*] as the start state (initial entry point, e.g., ログイン画面).
4. Include [*] as end state(s) for logout/session termination.
5. Every transition arrow MUST have a label: SCR001 --> SCR002 : ボタン名またはアクション名
6. Include error/exception transitions (e.g., 認証エラー → ログイン画面).
7. Group related screens using composite states if there are more than 10 screens.

Example format:
stateDiagram-v2
  [*] --> SCR001 : アプリ起動
  state "ログイン画面（SCR-001）" as SCR001
  SCR001 --> SCR002 : ログイン成功
  SCR001 --> SCR001 : 認証エラー（エラーメッセージ表示）
  state "ホーム画面（SCR-002）" as SCR002
  SCR002 --> SCR003 : 一覧ボタン押下
  SCR002 --> [*] : ログアウト
-->

### 5.3 画面レイアウト方針
<!-- AI: For each screen in 画面一覧, provide a structured YAML layout block
     inside a ```yaml code fence. This YAML will be rendered to a visual
     PNG mockup image. Do NOT use ASCII art for screen layouts.

     Example YAML layout block:
     ```yaml
     layout_type: form   # form | dashboard | list | detail | modal | wizard
     viewport: desktop   # desktop | tablet | mobile
     regions:
       header:
         components:
           - {n: 1, type: logo, label: "ロゴ"}
           - {n: 2, type: nav, label: "ナビゲーション"}
       main:
         components:
           - {n: 3, type: text-input, label: "フィールド名", required: true}
           - {n: 4, type: button, label: "送信", variant: primary}
       footer:
         components:
           - {n: 5, type: text, label: "フッターテキスト"}
     ```

     Rules:
     - `n` values: sequential starting from 1, unique across all regions
     - `n` numbers correspond to ①②③ in 画面項目定義 table
     - Component types: text-input, password-input, textarea, select, checkbox,
       radio, button, link, table, card, nav, logo, text, search-bar, tabs, pagination
     - `variant` for buttons: primary, secondary, danger
     - `required: true` marks mandatory fields (shows ※ in rendered mockup)

     Also include common layout guidelines: header/footer structure,
     navigation pattern, responsive breakpoints, component library choice. -->

<!-- AI SPLIT MODE: When generating in split mode (scope: "feature"), do NOT generate
     per-screen detail specs in this file. Per-screen specs (画面項目定義, バリデーション,
     イベント, 画面遷移, 権限) are generated separately in
     05-features/{feature-name}/detail-design.md.
     In split mode, section 5 should contain ONLY the 画面一覧 table and 画面遷移図 Mermaid diagram.
     Reference: "詳細は 05-features/{feature-name}/detail-design.md を参照" -->

## 6. 帳票設計

### 6.1 帳票一覧
<!-- AI: List of reports/documents the system generates.
     | 帳票ID | 帳票名 | 出力形式 | 出力タイミング | 使用者 | 備考 | -->

| 帳票ID | 帳票名 | 出力形式 | 出力タイミング | 使用者 | 備考 |
|--------|--------|----------|---------------|--------|------|
| RPT-001 | <!-- AI --> | <!-- AI: PDF/Excel/CSV --> | <!-- AI: リアルタイム/バッチ --> | <!-- AI --> | <!-- AI --> |

## 7. DB設計

### 7.1 ER図
<!-- AI: Generate Mermaid ER diagram showing main entities and relationships.
     ```mermaid
     erDiagram
       CUSTOMER ||--o{ ORDER : places
       ORDER ||--|{ ORDER_LINE : contains
       PRODUCT ||--o{ ORDER_LINE : "ordered in"
     ```
-->

### 7.2 テーブル定義

<!-- AI: Generate table definitions from requirements and business entities.
     Rules:
     - ID format: TBL-001, TBL-002... (sequential)
     - Prefix convention: M- (Master), T- (Transaction), L- (Log)
     - 物理名: snake_case English (m_customer, t_order, etc.)
     - 記録数予測: estimated row count
     - 更新頻度: リアルタイム / 日次 / 月次 / 年次
-->

| テーブルID | テーブル論理名 | テーブル物理名 | 説明 | 主キー | 記録数予測 | 更新頻度 | 関連テーブル |
|-----------|-------------|-------------|------|--------|----------|---------|------------|
| TBL-001 | <!-- AI --> | <!-- AI: snake_case --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

### 7.3 データベース方針
<!-- AI: DBMS choice rationale, charset (UTF-8), collation, backup strategy. -->

## 8. 外部インターフェース

### 8.1 API一覧

<!-- AI: Generate API inventory from screen/function requirements.
     Rules:
     - ID format: API-001, API-002...
     - RESTful endpoint naming convention
     - HTTP methods: GET / POST / PUT / DELETE / PATCH
     - セキュリティ: OAuth 2.0 / API Key / Basic Auth / None
-->

| API ID | エンドポイント | HTTPメソッド | 機能説明 | リクエスト | レスポンス | セキュリティ | 呼び出し元 |
|--------|-------------|------------|---------|-----------|-----------|------------|-----------|
| API-001 | <!-- AI: /api/v1/xxx --> | <!-- AI: GET/POST/PUT/DELETE --> | <!-- AI --> | <!-- AI --> | <!-- AI: JSON --> | <!-- AI --> | <!-- AI --> |

### 8.2 外部システム連携
<!-- AI: Integration with external systems, APIs, services. -->

## 9. 非機能設計

### 9.1 パフォーマンス設計
<!-- AI: Response time targets, throughput, caching strategy. Reference NFR-xxx IDs. -->

### 9.2 セキュリティ設計
<!-- AI: Authentication, authorization, encryption, audit logging. -->

### 9.3 可用性設計
<!-- AI: Availability targets, failover strategy, monitoring. -->

### 9.4 運用・保守設計
<!-- AI: Logging, monitoring, alerting, backup/restore, deployment strategy. -->

## 10. 技術選定根拠

<!-- AI: Justify technology choices. Table format recommended.
     | 技術要素 | 選定技術 | 選定理由 | 代替候補 | -->

| 技術要素 | 選定技術 | 選定理由 | 代替候補 |
|---------|---------|---------|---------|
| <!-- AI: e.g., フロントエンド --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |
