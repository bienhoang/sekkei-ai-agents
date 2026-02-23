/**
 * i18n — Translation strings for the Sekkei init CLI.
 * Compact [en, ja, vi] tuple format.
 */

const L = { en: 0, ja: 1, vi: 2 };

// Messages: key → [en, ja, vi]
const M = {
  // Meta
  overwrite: [
    "sekkei.config.yaml already exists. Overwrite?",
    "sekkei.config.yaml は既に存在します。上書きしますか？",
    "sekkei.config.yaml đã tồn tại. Ghi đè?",
  ],
  cancel: ["Setup cancelled", "セットアップを中止しました", "Đã hủy cài đặt"],
  setup_done: ["Setup complete!", "設定完了！", "Cài đặt hoàn tất!"],
  config_written: [
    "Generated sekkei.config.yaml",
    "sekkei.config.yaml を生成しました",
    "Đã tạo sekkei.config.yaml",
  ],
  path_invalid: [
    "Output directory must not contain '..'",
    "出力ディレクトリに '..' は使用できません",
    "Thư mục đầu ra không được chứa '..'",
  ],

  // Project
  project_name: ["Project name", "プロジェクト名", "Tên dự án"],
  project_name_required: [
    "Please enter a project name",
    "プロジェクト名を入力してください",
    "Vui lòng nhập tên dự án",
  ],
  project_type: ["Project type", "プロジェクト種別", "Loại dự án"],

  // Stack sections
  stack_hint: [
    "↑↓ navigate · Space select · Enter submit",
    "↑↓ 移動 · Space 選択 · Enter 確定",
    "↑↓ di chuyển · Space chọn · Enter xác nhận",
  ],
  stack_frontend: ["Frontend", "フロントエンド", "Frontend"],
  stack_backend: ["Backend", "バックエンド", "Backend"],
  stack_database: ["Database", "データベース", "Database"],
  stack_cloud: ["Cloud / Infra", "クラウド / インフラ", "Cloud / Infra"],
  stack_mobile: ["Mobile", "モバイル", "Mobile"],
  stack_desktop: ["Desktop", "デスクトップ", "Desktop"],
  stack_messaging: ["Messaging / Queue", "メッセージング / キュー", "Messaging / Queue"],

  // Other / Custom input
  other: ["Other (type custom)", "その他（手入力）", "Khác (tự nhập)"],
  other_hint: [
    "Enter custom value",
    "カスタム値を入力してください",
    "Nhập giá trị tùy chỉnh",
  ],
  other_required: [
    "Please enter a value",
    "値を入力してください",
    "Vui lòng nhập giá trị",
  ],
  other_multi_hint: [
    "Enter custom values (comma-separated)",
    "カスタム値を入力（カンマ区切り）",
    "Nhập giá trị tùy chỉnh (phân cách bằng dấu phẩy)",
  ],

  // Doc options
  doc_language: ["Document language", "ドキュメント言語", "Ngôn ngữ tài liệu"],
  keigo_level: ["Keigo level", "敬語レベル", "Mức độ kính ngữ"],
  preset: ["Template preset", "テンプレートプリセット", "Mẫu preset"],
  industry: [
    "Industry glossary",
    "業種テンプレート（用語集インポート）",
    "Thuật ngữ ngành",
  ],
  output_dir: ["Output directory", "出力ディレクトリ", "Thư mục đầu ra"],

  // Deps
  editor_detect: [
    "Detecting editor config...",
    "エディタ設定を検出中...",
    "Đang phát hiện trình soạn thảo...",
  ],
  editor_done: [
    "Editor config complete",
    "エディタ設定完了",
    "Cấu hình trình soạn thảo hoàn tất",
  ],
  editor_skip: [
    "Editor config skipped",
    "エディタ設定をスキップしました",
    "Bỏ qua cấu hình trình soạn thảo",
  ],
  python_setup: [
    "Setting up Python venv...",
    "Python venv をセットアップ中...",
    "Đang cài đặt Python venv...",
  ],
  python_done: [
    "Python venv ready",
    "Python venv セットアップ完了",
    "Python venv đã sẵn sàng",
  ],
  python_not_found: [
    "Python not found — export features unavailable",
    "Python が見つかりません — エクスポート機能は利用不可",
    "Không tìm thấy Python — tính năng xuất không khả dụng",
  ],
  python_fail: [
    "Python venv setup failed (skipped)",
    "Python venv セットアップ失敗（スキップ）",
    "Cài đặt Python venv thất bại (bỏ qua)",
  ],
  playwright_setup: [
    "Installing Playwright chromium...",
    "Playwright chromium をインストール中...",
    "Đang cài đặt Playwright chromium...",
  ],
  playwright_done: [
    "Playwright chromium installed",
    "Playwright chromium インストール完了",
    "Đã cài đặt Playwright chromium",
  ],
  playwright_fail: [
    "Playwright install failed — PDF export unavailable",
    "Playwright インストール失敗 — PDF出力は利用不可",
    "Cài Playwright thất bại — xuất PDF không khả dụng",
  ],
  build_setup: [
    "Building MCP server...",
    "MCP server をビルド中...",
    "Đang build MCP server...",
  ],
  build_done: ["Build complete", "ビルド完了", "Build hoàn tất"],
  build_fail: [
    "Build failed — run npm run build manually",
    "ビルド失敗 — 手動で npm run build を実行してください",
    "Build thất bại — chạy npm run build thủ công",
  ],
  env_status: [
    "Environment Status",
    "環境ステータス",
    "Trạng thái môi trường",
  ],
  skip_deps_title: [
    "Post-setup steps",
    "セットアップ後の手順",
    "Bước tiếp theo",
  ],
  skip_deps_body: [
    "For PDF export:\n  npx playwright install chromium\n\nFor Python extensions:\n  pip install -r python/requirements.txt",
    "PDF出力を利用する場合:\n  npx playwright install chromium\n\nPython拡張機能（用語集・差分）を利用する場合:\n  pip install -r python/requirements.txt",
    "Để xuất PDF:\n  npx playwright install chromium\n\nĐể dùng Python extensions:\n  pip install -r python/requirements.txt",
  ],
  glossary_imported: [
    " glossary terms imported",
    " 用語集をインポートしました",
    " thuật ngữ đã được nhập",
  ],
  glossary_fail: [
    "Glossary import failed (skipped)",
    "用語集インポートに失敗しました（スキップ）",
    "Nhập thuật ngữ thất bại (bỏ qua)",
  ],
  mcp_registered: [
    "MCP server registered in Claude Code",
    "MCP サーバーを Claude Code に登録しました",
    "Đã đăng ký MCP server vào Claude Code",
  ],
  mcp_register_fail: [
    "MCP registration failed (manual setup needed)",
    "MCP 登録に失敗しました（手動設定が必要）",
    "Đăng ký MCP thất bại (cần cài đặt thủ công)",
  ],
  commands_updated: [
    "Command stubs regenerated",
    "コマンドスタブを再生成しました",
    "Đã tạo lại command stubs",
  ],
  summary_title: [
    "Configuration Summary",
    "設定内容の確認",
    "Tóm tắt cấu hình",
  ],
  summary_confirm: [
    "Proceed with this configuration?",
    "この設定で続行しますか？",
    "Tiếp tục với cấu hình này?",
  ],
  summary_redo: [
    "Which section to redo?",
    "どのセクションをやり直しますか？",
    "Muốn làm lại phần nào?",
  ],
  section_project: ["Project basics", "プロジェクト基本", "Thông tin dự án"],
  section_stack: ["Tech stack", "技術スタック", "Công nghệ"],
  section_doc: ["Document options", "ドキュメント設定", "Tùy chọn tài liệu"],
};

/** Get translated message */
export function t(lang, key) {
  return M[key]?.[L[lang]] ?? M[key]?.[0] ?? key;
}

/** Map option tuples [value, en, ja, vi] to clack { value, label } */
export function opts(lang, items) {
  return items.map(([value, ...labels]) => ({
    value,
    label: labels[L[lang]] ?? labels[0],
  }));
}
