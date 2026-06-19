/**
 * Language-keyed heading and column maps for the validator.
 *
 * Maps are keyed by language ("ja" | "vi" | "en"). "en" reuses the "ja" map as a
 * back-compat alias — English documents currently adopt the ja skeleton.
 *
 * vi strings are VERBATIM from the canonical heading map. Never invent translations.
 */
import type { DocType } from "../types/documents.js";

export type Lang = "ja" | "vi" | "en";

// ---------------------------------------------------------------------------
// Structural sections required in (almost) all document types
// ---------------------------------------------------------------------------

const STRUCTURAL_SECTIONS_JA = ["改訂履歴", "承認欄", "配布先", "用語集"];
const STRUCTURAL_SECTIONS_VI = ["Lịch sử sửa đổi", "Phê duyệt", "Nơi phân phối", "Thuật ngữ"];

export const STRUCTURAL_SECTIONS_BY_LANG: Record<Lang, string[]> = {
  ja: STRUCTURAL_SECTIONS_JA,
  vi: STRUCTURAL_SECTIONS_VI,
  en: STRUCTURAL_SECTIONS_JA, // en back-compat: uses ja skeleton
};

// ---------------------------------------------------------------------------
// Per-doc-type required sections
// ---------------------------------------------------------------------------

const REQUIRED_SECTIONS_JA: Record<DocType, string[]> = {
  "functions-list": [...STRUCTURAL_SECTIONS_JA, "機能一覧"],
  requirements: [...STRUCTURAL_SECTIONS_JA, "概要", "機能要件", "非機能要件"],
  nfr: [
    ...STRUCTURAL_SECTIONS_JA,
    "非機能要件概要", "可用性", "性能・拡張性",
    "運用・保守性", "移行性", "セキュリティ", "システム環境",
  ],
  "project-plan": [
    ...STRUCTURAL_SECTIONS_JA,
    "プロジェクト概要", "WBS", "体制", "リスク管理",
  ],
  "architecture-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "システム方式", "開発方式", "運用方式", "ハードウェア", "技術選定",
  ],
  "basic-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "概要", "システム構成", "業務フロー", "画面設計",
    "DB設計", "外部インターフェース",
  ],
  "security-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "セキュリティ方針", "セキュリティ対策一覧", "認証・認可設計", "データ保護",
    "通信セキュリティ", "脆弱性対策", "監査ログ", "インシデント対応",
  ],
  "detail-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "概要", "モジュール設計", "クラス設計", "画面設計詳細",
    "DB詳細設計", "API詳細仕様", "処理フロー", "エラーハンドリング",
    "セキュリティ実装", "パフォーマンス考慮",
  ],
  "db-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "DB設計方針", "ER図", "テーブル", "インデックス設計",
  ],
  "report-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "帳票概要", "帳票一覧", "帳票レイアウト",
  ],
  "batch-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "バッチ概要", "ジョブ一覧", "ジョブフロー",
  ],
  "test-plan": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト方針", "テスト戦略", "テスト環境", "完了基準",
  ],
  "ut-spec": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト設計", "単体テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "it-spec": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト設計", "結合テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "st-spec": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト設計", "システムテストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "uat-spec": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト設計", "受入テストケース", "トレーサビリティ", "デフェクト報告",
  ],
  "test-result-report": [
    ...STRUCTURAL_SECTIONS_JA,
    "テスト概要", "テスト実施結果", "不具合サマリー", "品質判定",
  ],
  "crud-matrix": [],
  "traceability-matrix": [],
  "operation-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "運用体制", "バックアップ・リストア方針", "監視・アラート定義",
    "障害対応手順", "ジョブ管理", "SLA定義",
  ],
  "migration-design": [
    ...STRUCTURAL_SECTIONS_JA,
    "移行方針", "データ移行計画", "システム切替手順",
    "ロールバック計画", "移行テスト計画",
  ],
  "sitemap": [],
  "test-evidence": [
    "改訂履歴", "承認欄",
    "単体テスト (UT) エビデンス", "テストエビデンスサマリー",
  ],
  "meeting-minutes": [
    "改訂履歴",
    "会議情報", "出席者", "議題", "決定事項", "アクション項目",
  ],
  "decision-record": [
    "改訂履歴",
    "コンテキスト", "検討事項", "決定内容", "影響範囲",
  ],
  "interface-spec": [
    "改訂履歴", "承認欄",
    "インターフェース概要", "データフォーマット", "プロトコル",
    "エラーハンドリング", "SLA定義",
  ],
  "screen-design": [
    "改訂履歴", "承認欄",
    "画面一覧", "画面遷移図",
  ],
};

const REQUIRED_SECTIONS_VI: Record<DocType, string[]> = {
  "functions-list": [...STRUCTURAL_SECTIONS_VI, "Danh sách chức năng"],
  requirements: [...STRUCTURAL_SECTIONS_VI, "Tổng quan", "Yêu cầu chức năng", "Yêu cầu phi chức năng"],
  nfr: [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan yêu cầu phi chức năng", "Tính sẵn sàng", "Hiệu năng・Khả năng mở rộng",
    "Vận hành・Bảo trì", "Tính chuyển đổi", "Bảo mật", "Môi trường hệ thống",
  ],
  "project-plan": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan dự án", "WBS", "Cơ cấu tổ chức", "Quản lý rủi ro",
  ],
  "architecture-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Phương thức hệ thống", "Phương thức phát triển", "Phương thức vận hành", "Phần cứng", "Lựa chọn công nghệ",
  ],
  "basic-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan", "Cấu hình hệ thống", "Luồng nghiệp vụ", "Thiết kế màn hình",
    "Thiết kế CSDL", "Giao diện ngoài",
  ],
  "security-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Chính sách bảo mật", "Danh sách biện pháp bảo mật", "Thiết kế xác thực・phân quyền", "Bảo vệ dữ liệu",
    "Bảo mật truyền thông", "Biện pháp chống lỗ hổng", "Nhật ký kiểm toán", "Xử lý sự cố",
  ],
  "detail-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan", "Thiết kế module", "Thiết kế lớp", "Chi tiết thiết kế màn hình",
    "Thiết kế chi tiết CSDL", "Đặc tả chi tiết API", "Luồng xử lý", "Xử lý lỗi",
    "Triển khai bảo mật", "Cân nhắc hiệu năng",
  ],
  "db-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Chính sách thiết kế CSDL", "Sơ đồ ER", "Bảng", "Thiết kế chỉ mục",
  ],
  "report-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan biểu mẫu", "Danh sách biểu mẫu", "Bố cục biểu mẫu",
  ],
  "batch-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan batch", "Danh sách job", "Luồng job",
  ],
  "test-plan": [
    ...STRUCTURAL_SECTIONS_VI,
    "Chính sách kiểm thử", "Chiến lược kiểm thử", "Môi trường kiểm thử", "Tiêu chí hoàn thành",
  ],
  "ut-spec": [
    ...STRUCTURAL_SECTIONS_VI,
    "Thiết kế kiểm thử", "Ca kiểm thử đơn vị", "Truy vết", "Báo cáo lỗi",
  ],
  "it-spec": [
    ...STRUCTURAL_SECTIONS_VI,
    "Thiết kế kiểm thử", "Ca kiểm thử tích hợp", "Truy vết", "Báo cáo lỗi",
  ],
  "st-spec": [
    ...STRUCTURAL_SECTIONS_VI,
    "Thiết kế kiểm thử", "Ca kiểm thử hệ thống", "Truy vết", "Báo cáo lỗi",
  ],
  "uat-spec": [
    ...STRUCTURAL_SECTIONS_VI,
    "Thiết kế kiểm thử", "Ca kiểm thử chấp nhận", "Truy vết", "Báo cáo lỗi",
  ],
  "test-result-report": [
    ...STRUCTURAL_SECTIONS_VI,
    "Tổng quan kiểm thử", "Kết quả thực hiện kiểm thử", "Tóm tắt lỗi", "Đánh giá chất lượng",
  ],
  "crud-matrix": [],
  "traceability-matrix": [],
  "operation-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Cơ cấu vận hành", "Chính sách sao lưu・phục hồi", "Định nghĩa giám sát・cảnh báo",
    "Quy trình xử lý sự cố", "Quản lý job", "Định nghĩa SLA",
  ],
  "migration-design": [
    ...STRUCTURAL_SECTIONS_VI,
    "Chính sách chuyển đổi", "Kế hoạch chuyển đổi dữ liệu", "Quy trình chuyển đổi hệ thống",
    "Kế hoạch rollback", "Kế hoạch kiểm thử chuyển đổi",
  ],
  "sitemap": [],
  "test-evidence": [
    "Lịch sử sửa đổi", "Phê duyệt",
    "Bằng chứng kiểm thử đơn vị (UT)", "Tóm tắt bằng chứng kiểm thử",
  ],
  "meeting-minutes": [
    "Lịch sử sửa đổi",
    "Thông tin cuộc họp", "Người tham dự", "Chương trình họp", "Các quyết định", "Hạng mục hành động",
  ],
  "decision-record": [
    "Lịch sử sửa đổi",
    "Bối cảnh", "Vấn đề xem xét", "Nội dung quyết định", "Phạm vi ảnh hưởng",
  ],
  "interface-spec": [
    "Lịch sử sửa đổi", "Phê duyệt",
    "Tổng quan giao diện", "Định dạng dữ liệu", "Giao thức",
    "Xử lý lỗi", "Định nghĩa SLA",
  ],
  "screen-design": [
    "Lịch sử sửa đổi", "Phê duyệt",
    "Danh sách màn hình", "Sơ đồ chuyển màn hình",
  ],
};

export const REQUIRED_SECTIONS_BY_LANG: Record<Lang, Record<DocType, string[]>> = {
  ja: REQUIRED_SECTIONS_JA,
  vi: REQUIRED_SECTIONS_VI,
  en: REQUIRED_SECTIONS_JA, // en back-compat: uses ja skeleton
};

// ---------------------------------------------------------------------------
// Revision-history table columns
// ---------------------------------------------------------------------------

const REVISION_HISTORY_COLUMNS_JA = ["版数", "日付", "変更内容", "変更者"];
const REVISION_HISTORY_COLUMNS_VI = ["Phiên bản", "Ngày", "Nội dung thay đổi", "Người thay đổi"];

export const REVISION_HISTORY_COLUMNS_BY_LANG: Record<Lang, string[]> = {
  ja: REVISION_HISTORY_COLUMNS_JA,
  vi: REVISION_HISTORY_COLUMNS_VI,
  en: REVISION_HISTORY_COLUMNS_JA, // en back-compat
};

// ---------------------------------------------------------------------------
// Per-doc-type required table columns
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS_JA: Record<DocType, string[][]> = {
  "functions-list": [REVISION_HISTORY_COLUMNS_JA, ["大分類", "中分類", "機能ID", "機能名", "関連要件ID", "処理分類", "優先度"]],
  requirements: [REVISION_HISTORY_COLUMNS_JA, ["要件ID", "要件名"], ["NFR-ID", "カテゴリ", "目標値", "測定方法"]],
  nfr: [REVISION_HISTORY_COLUMNS_JA, ["NFR-ID", "カテゴリ", "目標値", "測定方法"]],
  "project-plan": [REVISION_HISTORY_COLUMNS_JA, ["PP-ID"]],
  "architecture-design": [REVISION_HISTORY_COLUMNS_JA, ["ARCH-ID"]],
  "basic-design": [REVISION_HISTORY_COLUMNS_JA, ["画面ID"], ["テーブルID"], ["API"]],
  "security-design": [REVISION_HISTORY_COLUMNS_JA, ["SEC-ID", "対策項目", "対策内容", "優先度"]],
  "detail-design": [REVISION_HISTORY_COLUMNS_JA, ["クラスID"], ["エラーコード"]],
  "db-design": [REVISION_HISTORY_COLUMNS_JA, ["DB-ID"], ["テーブル名", "カラム名"]],
  "report-design": [REVISION_HISTORY_COLUMNS_JA, ["RPT-ID", "帳票名", "出力形式"]],
  "batch-design": [REVISION_HISTORY_COLUMNS_JA, ["BATCH-ID", "ジョブ名"]],
  "test-plan": [REVISION_HISTORY_COLUMNS_JA, ["TP-ID"]],
  "ut-spec": [REVISION_HISTORY_COLUMNS_JA, ["テストケースID", "テスト対象"]],
  "it-spec": [REVISION_HISTORY_COLUMNS_JA, ["テストケースID", "テスト対象"]],
  "st-spec": [REVISION_HISTORY_COLUMNS_JA, ["テストケースID", "テスト対象"]],
  "uat-spec": [REVISION_HISTORY_COLUMNS_JA, ["テストケースID", "テスト対象"]],
  "test-result-report": [REVISION_HISTORY_COLUMNS_JA, ["テストレベル", "総件数", "合格", "合格率"]],
  "crud-matrix": [["機能ID", "機能名"]],
  "traceability-matrix": [["要件ID"]],
  "operation-design": [REVISION_HISTORY_COLUMNS_JA, ["OP-ID", "手順名", "障害レベル", "手順内容", "担当者", "想定時間"]],
  "migration-design": [REVISION_HISTORY_COLUMNS_JA, ["MIG-ID", "対象データ", "移行方法"]],
  "sitemap": [["ページID", "ページ名"]],
  "test-evidence": [REVISION_HISTORY_COLUMNS_JA, ["エビデンスID", "テストケースID"]],
  "meeting-minutes": [REVISION_HISTORY_COLUMNS_JA],
  "decision-record": [REVISION_HISTORY_COLUMNS_JA],
  "interface-spec": [REVISION_HISTORY_COLUMNS_JA, ["IF-ID"]],
  "screen-design": [REVISION_HISTORY_COLUMNS_JA, ["画面ID"]],
};

const REQUIRED_COLUMNS_VI: Record<DocType, string[][]> = {
  "functions-list": [REVISION_HISTORY_COLUMNS_VI, ["Phân loại lớn", "Phân loại vừa", "ID chức năng", "Tên chức năng", "ID yêu cầu liên quan", "Phân loại xử lý", "Độ ưu tiên"]],
  requirements: [REVISION_HISTORY_COLUMNS_VI, ["ID yêu cầu", "Tên yêu cầu"], ["NFR-ID", "Danh mục", "Giá trị mục tiêu", "Phương pháp đo"]],
  nfr: [REVISION_HISTORY_COLUMNS_VI, ["NFR-ID", "Danh mục", "Giá trị mục tiêu", "Phương pháp đo"]],
  "project-plan": [REVISION_HISTORY_COLUMNS_VI, ["PP-ID"]],
  "architecture-design": [REVISION_HISTORY_COLUMNS_VI, ["ARCH-ID"]],
  "basic-design": [REVISION_HISTORY_COLUMNS_VI, ["ID màn hình"], ["ID bảng"], ["API"]],
  "security-design": [REVISION_HISTORY_COLUMNS_VI, ["SEC-ID", "Hạng mục biện pháp", "Nội dung biện pháp", "Độ ưu tiên"]],
  "detail-design": [REVISION_HISTORY_COLUMNS_VI, ["ID lớp"], ["Mã lỗi"]],
  "db-design": [REVISION_HISTORY_COLUMNS_VI, ["DB-ID"], ["Tên bảng", "Tên cột"]],
  "report-design": [REVISION_HISTORY_COLUMNS_VI, ["RPT-ID", "Tên biểu mẫu", "Định dạng xuất"]],
  "batch-design": [REVISION_HISTORY_COLUMNS_VI, ["BATCH-ID", "Tên job"]],
  "test-plan": [REVISION_HISTORY_COLUMNS_VI, ["TP-ID"]],
  "ut-spec": [REVISION_HISTORY_COLUMNS_VI, ["ID ca kiểm thử", "Đối tượng kiểm thử"]],
  "it-spec": [REVISION_HISTORY_COLUMNS_VI, ["ID ca kiểm thử", "Đối tượng kiểm thử"]],
  "st-spec": [REVISION_HISTORY_COLUMNS_VI, ["ID ca kiểm thử", "Đối tượng kiểm thử"]],
  "uat-spec": [REVISION_HISTORY_COLUMNS_VI, ["ID ca kiểm thử", "Đối tượng kiểm thử"]],
  "test-result-report": [REVISION_HISTORY_COLUMNS_VI, ["Mức kiểm thử", "Tổng số", "Đạt", "Tỷ lệ đạt"]],
  "crud-matrix": [["ID chức năng", "Tên chức năng"]],
  "traceability-matrix": [["ID yêu cầu"]],
  "operation-design": [REVISION_HISTORY_COLUMNS_VI, ["OP-ID", "Tên quy trình", "Mức sự cố", "Nội dung quy trình", "Người phụ trách", "Thời gian dự kiến"]],
  "migration-design": [REVISION_HISTORY_COLUMNS_VI, ["MIG-ID", "Dữ liệu mục tiêu", "Phương pháp chuyển đổi"]],
  "sitemap": [["ID trang", "Tên trang"]],
  "test-evidence": [REVISION_HISTORY_COLUMNS_VI, ["ID bằng chứng", "ID ca kiểm thử"]],
  "meeting-minutes": [REVISION_HISTORY_COLUMNS_VI],
  "decision-record": [REVISION_HISTORY_COLUMNS_VI],
  "interface-spec": [REVISION_HISTORY_COLUMNS_VI, ["IF-ID"]],
  "screen-design": [REVISION_HISTORY_COLUMNS_VI, ["ID màn hình"]],
};

export const REQUIRED_COLUMNS_BY_LANG: Record<Lang, Record<DocType, string[][]>> = {
  ja: REQUIRED_COLUMNS_JA,
  vi: REQUIRED_COLUMNS_VI,
  en: REQUIRED_COLUMNS_JA, // en back-compat
};

// ---------------------------------------------------------------------------
// Shared section headings for per-feature validation
// ---------------------------------------------------------------------------

export const SHARED_SECTION_HEADINGS_BY_LANG: Record<Lang, Record<string, string>> = {
  ja: {
    "system-architecture": "システム構成",
    "database-design": "DB設計",
    "external-interface": "外部インターフェース",
    "non-functional-design": "非機能",
    "technology-rationale": "技術選定",
  },
  vi: {
    "system-architecture": "Cấu hình hệ thống",
    "database-design": "Thiết kế CSDL",
    "external-interface": "Giao diện ngoài",
    "non-functional-design": "Phi chức năng",
    "technology-rationale": "Lựa chọn công nghệ",
  },
  en: {
    "system-architecture": "システム構成",
    "database-design": "DB設計",
    "external-interface": "外部インターフェース",
    "non-functional-design": "非機能",
    "technology-rationale": "技術選定",
  },
};

// ---------------------------------------------------------------------------
// Feature section headings for per-feature validation
// ---------------------------------------------------------------------------

export const FEATURE_SECTION_HEADINGS_BY_LANG: Record<Lang, Partial<Record<DocType, string[]>>> = {
  ja: {
    "basic-design": ["概要", "業務フロー", "画面設計"],
    "detail-design": ["概要", "モジュール設計", "クラス設計", "画面設計詳細", "API詳細仕様"],
    "ut-spec": ["単体テストケース"],
    "it-spec": ["結合テストケース"],
  },
  vi: {
    "basic-design": ["Tổng quan", "Luồng nghiệp vụ", "Thiết kế màn hình"],
    "detail-design": ["Tổng quan", "Thiết kế module", "Thiết kế lớp", "Chi tiết thiết kế màn hình", "Đặc tả chi tiết API"],
    "ut-spec": ["Ca kiểm thử đơn vị"],
    "it-spec": ["Ca kiểm thử tích hợp"],
  },
  en: {
    "basic-design": ["概要", "業務フロー", "画面設計"],
    "detail-design": ["概要", "モジュール設計", "クラス設計", "画面設計詳細", "API詳細仕様"],
    "ut-spec": ["単体テストケース"],
    "it-spec": ["結合テストケース"],
  },
};

// ---------------------------------------------------------------------------
// Revision-history heading used in regex extraction
// ---------------------------------------------------------------------------

export const REVISION_HEADING_BY_LANG: Record<Lang, string> = {
  ja: "改訂履歴",
  vi: "Lịch sử sửa đổi",
  en: "改訂履歴", // en back-compat
};

/**
 * Resolve language to a validated Lang key.
 * Unknown values default to "vi" (the new primary default).
 */
export function resolveLang(lang: string | undefined): Lang {
  if (lang === "ja" || lang === "vi" || lang === "en") return lang;
  return "vi";
}
