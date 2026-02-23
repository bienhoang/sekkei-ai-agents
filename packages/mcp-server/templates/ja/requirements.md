---
doc_type: requirements
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - cover
  - overview
  - current-problems
  - requirements-definition
  - constraints
  - acceptance-criteria
  - out-of-scope
  - glossary
  - references
  - appendices
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use ですます調 throughout. Never mix formal and plain styles within a section. -->

# 要件定義書

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

### 1.1 システムの目的・背景
<!-- AI: Describe the business context, why this system is needed, what problem it solves.
     Use formal Japanese (丁寧語). 3-5 paragraphs. -->

### 1.2 プロジェクト概要
<!-- AI: Project name, timeline, team structure, methodology overview. -->

### 1.3 対象組織・対象業務
<!-- AI: Which departments/roles use this system, what business processes it covers. -->

### 1.4 制約条件・前提条件
<!-- AI: Technical, budget, schedule, regulatory constraints. List as bullet points. -->

## 2. 現状課題

### 2.1 現在のシステム構成
<!-- AI: Describe current system landscape. If greenfield, state "新規開発のため既存システムなし". -->

### 2.2 現在の業務フロー
<!-- AI: Current business process flow. Use numbered steps or Mermaid flowchart. -->

### 2.3 課題分析
<!-- AI: List current pain points, inefficiencies, risks. Use table format:
     | No. | 課題 | 影響度 | 備考 | -->

### 2.4 改善目標
<!-- AI: Measurable improvement targets. KPIs where possible. -->

## 3. 要件の定義

### 3.1 機能要件

#### 3.1.1 ユーザーロール
<!-- AI: Define user roles/personas. Table format:
     | ロール名 | 権限レベル | 主な業務 | 備考 | -->

#### 3.1.2 ユースケース
<!-- AI: Key use cases in brief format. Detailed use cases go to appendix.
     | UC-ID | ユースケース名 | アクター | 概要 | -->

#### 3.1.3 機能要件一覧

<!-- AI: Generate functional requirements from input.
     Rules:
     - ID format: REQ-001, REQ-002... (sequential)
     - 要件カテゴリ: 機能 / データ / インターフェース
     - 関連RFP項目: trace each requirement back to RFP source section/item
     - 検証方法: UT / IT / ST / UAT
     - Do NOT reference F-xxx — functions-list does not exist yet
     - Include at least 10 functional requirements
-->

| 要件ID | 要件カテゴリ | 要件分類 | 要件名 | 要件詳細説明 | 優先度 | 関連RFP項目 | 検証方法 | 備考 |
|--------|-------------|---------|--------|-------------|--------|------------|---------|------|
| REQ-001 | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI: 高/中/低 --> | <!-- AI: RFP source section/item --> | <!-- AI: UT,IT --> | <!-- AI --> |

#### 3.1.4 業務フロー図
<!-- AI: Mermaid flowchart showing main business process flow.
     Use swimlanes for different actors/systems. -->

### 3.2 非機能要件

<!-- AI: Use IPA NFUG 6 categories exactly as listed below. You MUST provide a specific, measurable 目標値 for EVERY row. NEVER use vague terms: 高速, 十分, 適切, 高い, 良好, 適宜. Use specific numbers (e.g., 99.9%, 2秒以内, 1000同時接続, 4時間以内). -->

<!-- AI: IPA NFUG category examples:
  - 可用性: 稼働率99.9%以上、RTO 4時間以内、RPO 1時間以内
  - 性能・拡張性: P95応答時間2秒以内、同時接続1000ユーザー
  - 運用・保守性: 障害検知5分以内、ログ保持期間90日
  - 移行性: 移行期間2週間以内、既存データ移行率100%
  - セキュリティ: TLS 1.2以上、パスワード8文字以上英数字混在
  - システム環境・エコロジー: CPU使用率通常時70%以下、PUE 1.5以下
  Mark as N/A with reason if a category does not apply to this project. -->

| NFR-ID | カテゴリ | 要件名 | 目標値 | 測定方法 | 優先度 |
|--------|---------|-------|-------|---------|-------|
| NFR-001 | 可用性 | <!-- AI: requirement name --> | <!-- AI: specific number --> | <!-- AI: measurement method --> | 高 |
| NFR-002 | 性能・拡張性 | <!-- AI --> | <!-- AI --> | <!-- AI --> | 高 |
| NFR-003 | 運用・保守性 | <!-- AI --> | <!-- AI --> | <!-- AI --> | 中 |
| NFR-004 | 移行性 | <!-- AI --> | <!-- AI --> | <!-- AI --> | 中 |
| NFR-005 | セキュリティ | <!-- AI --> | <!-- AI --> | <!-- AI --> | 高 |
| NFR-006 | システム環境・エコロジー | <!-- AI --> | <!-- AI --> | <!-- AI --> | 低 |

## 4. 制約条件・前提条件

### 4.1 技術的制約
<!-- AI: Technology stack constraints, platform requirements, integration limitations. -->

### 4.2 予算・スケジュール制約
<!-- AI: Budget range, timeline milestones, resource limitations. -->

### 4.3 法的・規制的制約
<!-- AI: Compliance requirements (個人情報保護法, etc.), industry regulations. -->

### 4.4 前提条件
<!-- AI: Assumptions about environment, user behavior, data availability. -->

## 5. 受け入れ基準

### 5.1 機能的受け入れ基準
<!-- AI: Conditions for functional acceptance. Checklist format. -->

### 5.2 非機能的受け入れ基準
<!-- AI: Performance, security, availability thresholds for acceptance. -->

### 5.3 サインオフ条件
<!-- AI: Who approves, what evidence is needed, sign-off process. -->

## 6. 対象外・今後の検討事項

### 6.1 本プロジェクト対象外
<!-- AI: Explicitly list features/scope NOT included. Prevents scope creep. -->

### 6.2 フェーズ2以降での検討事項
<!-- AI: Deferred features planned for future releases. -->

## 7. 用語定義・参考資料

### 7.1 専門用語定義表

<!-- AI: Define domain-specific terms used in this document.
     | 用語 | 定義 | 備考 | -->

| 用語 | 定義 | 備考 |
|------|------|------|
| <!-- AI --> | <!-- AI --> | <!-- AI --> |

### 7.2 関連ドキュメント参照
<!-- AI: List referenced documents, standards, external specifications. -->

## 8. 附録

### 8.1 詳細なユースケース記述
<!-- AI: Detailed use case descriptions if needed. -->

### 8.2 業務ルール定義表
<!-- AI: Business rules table if applicable. -->

### 8.3 既存システム連携仕様
<!-- AI: Integration specs with existing systems if applicable. -->
