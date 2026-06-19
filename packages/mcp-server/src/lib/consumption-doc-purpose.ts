/**
 * Terse 1-line JA purpose per chain doc type, used in the agent llms.txt index.
 * Data-only; kept separate so consumption-index.ts stays focused on logic.
 */
export const DOC_PURPOSE: Record<string, string> = {
  requirements: "システム要件と機能要件 (REQ-xxx) を定義",
  nfr: "非機能要件 (NFR-xxx) と目標値を定義",
  "functions-list": "全機能の一覧 (F-xxx) と分類",
  "project-plan": "プロジェクト計画・体制・スケジュール",
  "architecture-design": "システム全体アーキテクチャ方針",
  "basic-design": "画面 (SCR-xxx)・テーブル (TBL-xxx)・API (API-xxx) の基本設計",
  "security-design": "セキュリティ設計と対策",
  "detail-design": "クラス (CLS-xxx)・処理ロジックの詳細設計",
  "db-design": "テーブル定義 (TBL-xxx) とER構造",
  "report-design": "帳票・レポート設計",
  "batch-design": "バッチ処理設計",
  "test-plan": "テスト全体計画と方針",
  "ut-spec": "単体テスト仕様 (UT-xxx)",
  "it-spec": "結合テスト仕様 (IT-xxx)",
  "st-spec": "システムテスト仕様 (ST-xxx)",
  "uat-spec": "受入テスト仕様 (UAT-xxx)",
  "test-result-report": "テスト結果報告",
  "crud-matrix": "機能×テーブルのCRUDマトリクス",
  "traceability-matrix": "要件↔設計↔テストの追跡マトリクス",
  "operation-design": "運用設計",
  "migration-design": "データ移行設計",
  sitemap: "画面遷移・サイトマップ",
  "screen-design": "画面設計 (SCR-xxx)",
  "interface-spec": "インターフェース仕様 (API-xxx)",
  "test-evidence": "テストエビデンス",
  "meeting-minutes": "議事録",
  "decision-record": "意思決定記録",
};
