/**
 * Content depth rules for completeness checking per document type.
 * Each rule tests whether the document contains required identifiers/tables.
 */
import type { DocType } from "../types/documents.js";

export interface DepthRule {
  check: string;
  test: (content: string) => boolean;
  message: string;
}

export const CONTENT_DEPTH_RULES: Partial<Record<DocType, DepthRule[]>> = {
  "architecture-design": [
    {
      check: "ARCH entries",
      test: (c: string) => (c.match(/ARCH-\d{3}/g) || []).length >= 3,
      message: "方式設計書: ARCH-xxxが3つ以上必要です",
    },
    {
      check: "architecture diagram",
      test: (c: string) => /mermaid/.test(c),
      message: "方式設計書: アーキテクチャ図（Mermaid）が必要です",
    },
    {
      check: "technology rationale",
      test: (c: string) => /技術選定|選定理由|代替案/.test(c),
      message: "方式設計書: 技術選定の理由が必要です",
    },
  ],
  "basic-design": [
    {
      check: "screen table",
      test: (c) => /\|\s*SCR-\d+/.test(c),
      message: "基本設計書: 画面一覧テーブルにSCR-xxxが必要です",
    },
    {
      check: "DB table",
      test: (c) => /\|\s*TBL-\d+/.test(c),
      message: "基本設計書: テーブル一覧にTBL-xxxが必要です",
    },
    {
      check: "API table",
      test: (c) => /\|\s*API-\d+/.test(c),
      message: "基本設計書: API一覧にAPI-xxxが必要です",
    },
    {
      check: "API mandatory columns",
      test: (c) => {
        const apiRows = c.split("\n").filter(l => /\|\s*API-\d+/.test(l));
        if (apiRows.length === 0) return true;
        const headerLine = c.split("\n").find(l => /API\s*ID.*エンドポイント/.test(l));
        if (!headerLine) return true; // no formal header → skip column count check
        const cols = headerLine.split("|").filter(s => s.trim()).length;
        return cols >= 8;
      },
      message: "基本設計書: API一覧に8列（API ID, エンドポイント, HTTPメソッド, 機能説明, リクエスト, レスポンス, セキュリティ, 呼び出し元）が必要です",
    },
  ],
  "requirements": [
    {
      check: "functional requirements",
      test: (c) => (c.match(/REQ-\d{3}/g) || []).length >= 3,
      message: "要件定義書: 機能要件が3つ以上必要です (REQ-xxx)",
    },
    {
      check: "NFR entry",
      test: (c) => /NFR-\d{3}/.test(c),
      message: "要件定義書: 非機能要件が1つ以上必要です (NFR-xxx)",
    },
    {
      check: "NFR vague terms",
      test: (c: string) => {
        // Extract NFR table rows (lines containing NFR-xxx)
        const nfrRows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        const vaguePattern = /高速|十分|適切|高い|良好/;
        return !nfrRows.some((row) => vaguePattern.test(row));
      },
      message: "要件定義書: NFR目標値に曖昧な表現があります（高速・十分・適切・高い・良好は数値に置換してください）",
    },
    {
      check: "NFR numeric targets",
      test: (c: string) => {
        const nfrRows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        if (nfrRows.length === 0) return true; // no NFR rows to check
        // At least 80% of NFR rows should contain a numeric target
        const withNumbers = nfrRows.filter((row) => /\d+(\.\d+)?(ms|%|秒|時間|件|人|日|回)/.test(row));
        return withNumbers.length >= nfrRows.length * 0.8;
      },
      message: "要件定義書: NFR目標値に数値が不足しています（例: 99.9%, 2秒以内, 1000件）",
    },
    {
      check: "traceability verification method",
      test: (c: string) => {
        const reqRows = c.split("\n").filter((l) => /REQ-\d{3}/.test(l));
        if (reqRows.length === 0) return true;
        // Check that most REQ rows have a 検証方法 value (UT/IT/ST/UAT)
        const withVerification = reqRows.filter((row) => /UT|IT|ST|UAT/.test(row));
        return withVerification.length >= reqRows.length * 0.8;
      },
      message: "要件定義書: 検証方法（UT/IT/ST/UAT）が不足しています",
    },
  ],
  nfr: [
    {
      check: "NFR entries",
      test: (c: string) => (c.match(/NFR-\d{3}/g) || []).length >= 3,
      message: "非機能要件定義書: NFR-xxxが3つ以上必要です",
    },
    {
      check: "NFR vague terms",
      test: (c: string) => {
        const rows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        return !rows.some((r) => /高速|十分|適切|高い|良好/.test(r));
      },
      message: "非機能要件定義書: 目標値に曖昧な表現があります（数値に置換してください）",
    },
    {
      check: "NFR numeric targets",
      test: (c: string) => {
        const rows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        if (rows.length === 0) return true;
        return rows.filter((r) => /\d+(\.\d+)?(ms|%|秒|時間|件|人|日|回)/.test(r)).length >= rows.length * 0.8;
      },
      message: "非機能要件定義書: 目標値に数値が不足しています（例: 99.9%, 2秒以内, 1000件）",
    },
  ],
  "security-design": [
    {
      check: "security entries",
      test: (c: string) => /\|\s*SEC-\d+/.test(c),
      message: "セキュリティ設計書: SEC-xxxが必要です",
    },
    {
      check: "auth mechanism",
      test: (c: string) => /認証|OAuth|JWT|SAML|SSO|多要素認証|MFA/.test(c),
      message: "セキュリティ設計書: 認証方式の記載が必要です（OAuth, JWT, SAML等）",
    },
    {
      check: "vulnerability categories",
      test: (c: string) => /OWASP|XSS|CSRF|SQLインジェクション|SQL\s*Injection/.test(c),
      message: "セキュリティ設計書: 脆弱性対策カテゴリの記載が必要です（OWASP Top 10等）",
    },
  ],
  "detail-design": [
    {
      check: "class table",
      test: (c: string) => /\|\s*CLS-\d+/.test(c),
      message: "詳細設計書: クラス一覧テーブルにCLS-xxxが必要です",
    },
    {
      check: "screen reference",
      test: (c: string) => /SCR-\d+/.test(c),
      message: "詳細設計書: 画面設計詳細にSCR-xxx参照が必要です",
    },
    {
      check: "table reference",
      test: (c: string) => /TBL-\d+/.test(c),
      message: "詳細設計書: DB詳細設計にTBL-xxx参照が必要です",
    },
    {
      check: "API reference",
      test: (c: string) => /API-\d+/.test(c),
      message: "詳細設計書: API詳細仕様にAPI-xxx参照が必要です",
    },
  ],
  "ut-spec": [
    {
      check: "UT cases",
      test: (c: string) => (c.match(/UT-\d{3}/g) || []).length >= 3,
      message: "単体テスト仕様書: UTケースが3つ以上必要です",
    },
    {
      check: "test method presence",
      test: (c: string) => /正常系|異常系|境界値|同値分割/.test(c),
      message: "単体テスト仕様書: テスト技法の記載が必要です（正常系/異常系/境界値等）",
    },
    {
      check: "expected result",
      test: (c: string) => /期待結果|期待値|expected|想定結果/.test(c),
      message: "単体テスト仕様書: 期待結果の記載が必要です",
    },
  ],
  "it-spec": [
    {
      check: "IT cases",
      test: (c: string) => (c.match(/IT-\d{3}/g) || []).length >= 3,
      message: "結合テスト仕様書: ITケースが3つ以上必要です",
    },
    {
      check: "interface scope",
      test: (c: string) => /API-|インターフェース|連携|外部接続|内部連携/.test(c),
      message: "結合テスト仕様書: テスト対象のインターフェースの記載が必要です",
    },
    {
      check: "integration pattern",
      test: (c: string) => /正常系|異常系|タイムアウト|リトライ/.test(c),
      message: "結合テスト仕様書: 結合テストパターンの記載が必要です（正常系/異常系/タイムアウト等）",
    },
  ],
  "st-spec": [
    {
      check: "ST cases",
      test: (c: string) => (c.match(/ST-\d{3}/g) || []).length >= 3,
      message: "システムテスト仕様書: STケースが3つ以上必要です",
    },
    {
      check: "scenario coverage",
      test: (c: string) => /シナリオ|業務フロー|ユースケース|利用者/.test(c),
      message: "システムテスト仕様書: テストシナリオの記載が必要です",
    },
    {
      check: "system-level scope",
      test: (c: string) => /性能|セキュリティ|可用性|負荷|regression/.test(c),
      message: "システムテスト仕様書: システムレベルのテスト観点が必要です（性能/セキュリティ/可用性等）",
    },
  ],
  "uat-spec": [
    {
      check: "UAT cases",
      test: (c: string) => (c.match(/UAT-\d{3}/g) || []).length >= 3,
      message: "受入テスト仕様書: UATケースが3つ以上必要です",
    },
    {
      check: "acceptance criteria linkage",
      test: (c: string) => /REQ-|受入基準|acceptance|要件/.test(c),
      message: "受入テスト仕様書: 受入基準と要件への紐づけが必要です",
    },
    {
      check: "user scenario",
      test: (c: string) => /利用者|エンドユーザー|業務シナリオ|操作手順/.test(c),
      message: "受入テスト仕様書: 利用者視点のテストシナリオが必要です",
    },
  ],
  "functions-list": [
    {
      check: "function table row",
      test: (c) => /\|\s*[A-Z]{1,5}-\d{3}/.test(c),
      message: "機能一覧: 機能テーブルにF-xxx（またはカスタムプレフィックス）が必要です",
    },
    {
      check: "processing type enum",
      test: (c) => {
        const rows = c.match(/\|\s*(入力|照会|帳票|バッチ|API|イベント|スケジューラ|Webhook)\s*\|/g);
        return rows !== null && rows.length > 0;
      },
      message: "機能一覧: 処理分類は有効な値が必要です",
    },
    {
      check: "minimum function count",
      test: (c) => {
        const NON_FUNC = /^(REQ|NFR|SCR|TBL|API|CLS|SEC|PP|TP|EV|OP|MIG|PG|UT|IT|ST|UAT)-/;
        const all = c.match(/[A-Z]{1,5}-\d{3}/g) || [];
        return all.filter(id => !NON_FUNC.test(id)).length >= 5;
      },
      message: "機能一覧: 最低5つの機能が必要です",
    },
    {
      check: "unique function IDs",
      test: (c) => {
        const NON_FUNC = /^(REQ|NFR|SCR|TBL|API|CLS|SEC|PP|TP|EV|OP|MIG|PG|UT|IT|ST|UAT)-/;
        const all = c.match(/\b[A-Z]{1,5}-\d{3,4}\b/g) || [];
        const funcIds = all.filter(id => !NON_FUNC.test(id));
        return funcIds.length === new Set(funcIds).size;
      },
      message: "機能一覧: 重複した機能IDがあります",
    },
    {
      check: "REQ cross-reference",
      test: (c) => /REQ-\d{3}/.test(c),
      message: "機能一覧: REQ-xxx参照が必要です",
    },
    {
      check: "priority enum",
      test: (c) => /\|\s*(高|中|低)\s*\|/.test(c),
      message: "機能一覧: 優先度は高/中/低が必要です",
    },
  ],
  "project-plan": [
    {
      check: "PP entries",
      test: (c: string) => (c.match(/PP-\d{3}/g) || []).length >= 3,
      message: "プロジェクト計画書: WBSにPP-xxxが3つ以上必要です",
    },
    {
      check: "milestone dates",
      test: (c: string) => /\d{4}[年/\-]\d{1,2}[月/\-]/.test(c),
      message: "プロジェクト計画書: マイルストーンの日付が必要です（例: 2026年4月）",
    },
    {
      check: "phase structure",
      test: (c: string) => /要件定義|基本設計|詳細設計|テスト|移行|運用/.test(c),
      message: "プロジェクト計画書: 開発フェーズの記載が必要です",
    },
  ],
  "test-plan": [
    {
      check: "TP entries",
      test: (c: string) => (c.match(/TP-\d{3}/g) || []).length >= 3,
      message: "テスト計画書: テスト戦略にTP-xxxが3つ以上必要です",
    },
    {
      check: "scope document reference",
      test: (c: string) => /要件定義書|基本設計書|機能一覧|REQ-|F-/.test(c),
      message: "テスト計画書: テスト対象の仕様書への参照が必要です",
    },
    {
      check: "coverage metric",
      test: (c: string) => /カバレッジ|網羅率|網羅|coverage/.test(c),
      message: "テスト計画書: テストカバレッジの目標値が必要です",
    },
  ],
  "test-result-report": [
    {
      check: "TR entries",
      test: (c: string) => /\|\s*TR-\d{3}/.test(c),
      message: "テスト結果報告書: TR-xxxが必要です",
    },
    {
      check: "pass rate",
      test: (c: string) => /合格率|pass\s*rate/i.test(c),
      message: "テスト結果報告書: テスト合格率の記載が必要です",
    },
    {
      check: "quality judgment",
      test: (c: string) => /品質判定|総合判定|go\/no-go|合否判定/i.test(c),
      message: "テスト結果報告書: 品質判定（go/no-go）の記載が必要です",
    },
  ],
  "db-design": [
    {
      check: "DB entries",
      test: (c: string) => (c.match(/DB-\d{3}/g) || []).length >= 3,
      message: "データベース設計書: DB-xxxが3つ以上必要です",
    },
    {
      check: "ER diagram",
      test: (c: string) => /erDiagram/.test(c),
      message: "データベース設計書: ER図（Mermaid erDiagram）が必要です",
    },
    {
      check: "TBL reference",
      test: (c: string) => /TBL-\d+/.test(c),
      message: "データベース設計書: TBL-xxx参照が必要です",
    },
  ],
  "report-design": [
    {
      check: "RPT entries",
      test: (c: string) => (c.match(/RPT-\d{3}/g) || []).length >= 3,
      message: "帳票設計書: RPT-xxxが3つ以上必要です",
    },
    {
      check: "output format",
      test: (c: string) => /PDF|Excel|CSV|帳票/.test(c),
      message: "帳票設計書: 出力形式（PDF/Excel/CSV）の記載が必要です",
    },
  ],
  "batch-design": [
    {
      check: "BATCH entries",
      test: (c: string) => (c.match(/BATCH-\d{3}/g) || []).length >= 3,
      message: "バッチ処理設計書: BATCH-xxxが3つ以上必要です",
    },
    {
      check: "schedule entry",
      test: (c: string) => /cron|スケジュール|実行タイミング|定期実行/.test(c),
      message: "バッチ処理設計書: スケジュール定義が必要です",
    },
    {
      check: "error handling",
      test: (c: string) => /リトライ|タイムアウト|エラー|異常終了/.test(c),
      message: "バッチ処理設計書: エラーハンドリング方針が必要です",
    },
  ],
  "test-evidence": [
    {
      check: "evidence entry",
      test: (c) => /\|\s*EV-\d{3}/.test(c),
      message: "テストエビデンス: エビデンスエントリにEV-xxxが必要です",
    },
  ],
  "screen-design": [
    {
      check: "screen table",
      test: (c) => /\|\s*SCR-\d+/.test(c),
      message: "画面設計書: 画面一覧テーブルにSCR-xxxが必要です",
    },
  ],
  "operation-design": [
    {
      check: "OP entries",
      test: (c: string) => (c.match(/OP-\d{3}/g) || []).length >= 3,
      message: "運用設計書: 障害対応手順にOP-xxxが3つ以上必要です",
    },
    {
      check: "SLA numeric targets",
      test: (c: string) => {
        const slaRows = c.split("\n").filter(l => /\|\s*(稼働率|応答時間|SLA|RTO|RPO)/.test(l));
        if (slaRows.length === 0) return false;
        return slaRows.some(row => /\d+(\.\d+)?[%秒ms時間分]/.test(row));
      },
      message: "運用設計書: SLA定義に数値目標が必要です（例: 99.9%, 30秒以内）",
    },
    {
      check: "SLA vague terms",
      test: (c: string) => {
        const slaRows = c.split("\n").filter(l => /\|\s*(稼働率|応答|SLA|RTO|RPO|目標値)/.test(l));
        const vaguePattern = /高い|十分|適切|良好|高速/;
        return !slaRows.some(row => vaguePattern.test(row));
      },
      message: "運用設計書: SLA目標値に曖昧な表現があります（高い・十分・適切・良好・高速は数値に置換してください）",
    },
    {
      check: "backup RPO/RTO",
      test: (c: string) => /RPO/.test(c) && /RTO/.test(c),
      message: "運用設計書: バックアップ方針にRPOとRTOの定義が必要です",
    },
    {
      check: "monitoring threshold",
      test: (c: string) => {
        const hasMonitorTable = /\|\s*(監視対象|メトリクス)/.test(c);
        const hasThreshold = /\|\s*閾値/.test(c);
        return hasMonitorTable && hasThreshold;
      },
      message: "運用設計書: 監視・アラート定義に閾値付きメトリクスが必要です",
    },
    {
      check: "job schedule entry",
      test: (c: string) => /\|\s*(ジョブID|ジョブ名)/.test(c),
      message: "運用設計書: ジョブ管理にジョブエントリが必要です",
    },
    {
      check: "NFR cross-reference",
      test: (c: string) => /NFR-\d{3}/.test(c),
      message: "運用設計書: NFR-xxx参照が必要です（上流の非機能要件をクロスリファレンス）",
    },
  ],
  "migration-design": [
    {
      check: "MIG entries",
      test: (c: string) => (c.match(/MIG-\d{3}/g) || []).length >= 3,
      message: "移行設計書: データ移行計画にMIG-xxxが3つ以上必要です",
    },
    {
      check: "source system reference",
      test: (c: string) => /移行元|既存システム|旧システム|現行システム/.test(c),
      message: "移行設計書: 移行元システムの記載が必要です",
    },
    {
      check: "data volume estimate",
      test: (c: string) => /\d+[万千百]?件|\d+[KMGT]B/.test(c),
      message: "移行設計書: データ量の見積もりが必要です（件数またはサイズ）",
    },
  ],
  "crud-matrix": [
    {
      check: "F-xxx rows",
      test: (c: string) => /\|\s*F-\d+/.test(c),
      message: "CRUD図: 機能行にF-xxxが必要です",
    },
    {
      check: "TBL-xxx columns",
      test: (c: string) => /TBL-\d+/.test(c),
      message: "CRUD図: テーブル列にTBL-xxxが必要です",
    },
  ],
  "traceability-matrix": [
    {
      check: "REQ-xxx rows",
      test: (c: string) => /\|\s*REQ-\d+/.test(c),
      message: "トレーサビリティマトリックス: 要件行にREQ-xxxが必要です",
    },
  ],
  "sitemap": [
    {
      check: "PG entries",
      test: (c: string) => (c.match(/PG-\d{3}/g) || []).length >= 3,
      message: "サイトマップ: ページ一覧にPG-xxxが3つ以上必要です",
    },
  ],
};
