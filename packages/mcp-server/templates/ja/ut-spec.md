---
doc_type: ut-spec
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - test-design
  - test-cases
  - traceability
  - defect-report
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Keigo: Use である調 throughout. Never mix formal and plain styles within a section. -->

# 単体テスト仕様書

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

## 配布先 <!-- required -->

<!-- AI: List the stakeholders and teams who will receive this document. Format as bullet list. -->

## 用語集 <!-- required -->

| 用語 | 説明 | 英語表記 |
|------|------|----------|
<!-- AI: Extract 5-10 key terms: 正常系, 異常系, 境界値, スタブ, モック, カバレッジ, デフェクト, etc. -->

## 1. テスト設計 <!-- required -->

<!-- AI: Describe unit test design approach for this module/class. Include: テスト対象モジュール・クラス一覧 (CLS-xxx IDs from 詳細設計書), テスト手法 (ホワイトボックス, 境界値分析, 同値分割), カバレッジ目標 (ステートメント/ブランチ), テストフレームワーク, スタブ・モック方針. Reference DD-xxx from 詳細設計書. -->

## 2. 単体テストケース <!-- required -->

<!-- AI: Generate test cases for each module/class (CLS-xxx). テスト観点 MUST cover: 正常系 (normal flow), 異常系 (error/exception handling), 境界値 (boundary values). Generate at least 5 test cases per module. ID format: UT-001, UT-002... -->

| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 | 入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
|-----|-------------|---------|---------|---------|---------|------|------|---------|------|------------|------|
| 1 | UT-001 | <!-- AI: CLS-xxx method --> | 正常系 | <!-- AI: precondition --> | <!-- AI: steps --> | <!-- AI: input --> | <!-- AI: expected --> | <!-- AI: leave blank --> | <!-- AI: leave blank --> | <!-- AI: leave blank --> | <!-- AI --> |
| 2 | UT-002 | <!-- AI: CLS-xxx method --> | 異常系 | <!-- AI --> | <!-- AI --> | <!-- AI: invalid input --> | <!-- AI: error expected --> | | | | <!-- AI --> |
| 3 | UT-003 | <!-- AI: CLS-xxx method --> | 境界値 | <!-- AI --> | <!-- AI --> | <!-- AI: boundary value --> | <!-- AI: expected --> | | | | <!-- AI --> |

<!-- AI: Continue rows for all modules. Minimum 5 cases per CLS-xxx. Cover: 正常系, 異常系 (null/空文字/型不一致), 境界値 (最小値/最大値/±1). -->

## 3. トレーサビリティ <!-- required -->

<!-- AI: Map test cases to design artifacts. Traceability direction: DD-xxx → CLS-xxx → UT-xxx. -->

| DD-ID | CLS-ID | UT-ID | テスト観点 | 備考 |
|-------|-------|-------|---------|------|
| <!-- AI: DD-xxx --> | <!-- AI: CLS-xxx --> | <!-- AI: UT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Ensure every CLS-xxx from 詳細設計書 has at least one UT-xxx. Missing traceability = test gap. -->

## 4. デフェクト報告 <!-- required -->

<!-- AI: Leave this section mostly blank — it is filled during test execution. Provide the table header only. -->

| デフェクトID | テストケースID | 重大度 | 発見日 | 内容 | 原因 | 修正日 | ステータス |
|------------|-------------|-------|-------|-----|------|-------|---------|

<!-- AI: 重大度: 致命的/重大/軽微/提案. ステータス: 未対応/対応中/修正済み/確認済み/クローズ. -->

## 5. 参考資料

<!-- AI: List referenced documents: 詳細設計書 (DD-xxx, CLS-xxx), テスト計画書 (TP-001). -->
