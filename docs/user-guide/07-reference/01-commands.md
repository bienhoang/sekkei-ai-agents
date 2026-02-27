# Tham Chiếu Lệnh — Quick Reference

> Lookup nhanh tất cả lệnh (40+ slash commands + CLI). Xem thứ tự prerequisite trước khi chạy.

---

## Section 1: Tạo Tài Liệu Cốt Lõi (18 lệnh)

| # | Lệnh | Syntax | Input | Output | Prerequisite |
|---|------|--------|-------|--------|-------------|
| 1 | **rfp** | `/sekkei:rfp [@project-name]` | Paste RFP text | 6 files trong `01-rfp/`: phân tích, Q&A, proposal, scope freeze | Không cần |
| 2 | **requirements** | `/sekkei:requirements @input` | RFP / mô tả yêu cầu | 要件定義書 — `requirements.md` (REQ-xxx, NFR-xxx) | RFP hoàn chỉnh (khuyến nghị) |
| 3 | **functions-list** | `/sekkei:functions-list @input` | 要件定義書 | 機能一覧 — `functions-list.md` (F-xxx) | requirements |
| 4 | **nfr** | `/sekkei:nfr @requirements` | 要件定義書 | 非機能要件定義書 — `nfr.md` (NFR-xxx) | requirements |
| 5 | **project-plan** | `/sekkei:project-plan @req` | 要件定義書 | プロジェクト計画書 — `project-plan.md` (PP-xxx) | requirements |
| 6 | **architecture-design** | `/sekkei:architecture-design @input` | 要件定義書 + NFR + 機能一覧 | 方式設計書 — `architecture-design.md` (ARCH-xxx) | requirements + nfr |
| 7 | **basic-design** | `/sekkei:basic-design @input` | 要件定義書 + 機能一覧 | 基本設計書 — `basic-design.md` (SCR-xxx, TBL-xxx, API-xxx) | requirements + functions-list |
| 8 | **security-design** | `/sekkei:security-design @bd` | 基本設計書 | セキュリティ設計書 — `security-design.md` (SEC-xxx) | basic-design |
| 9 | **detail-design** | `/sekkei:detail-design @input` | 基本設計書 | 詳細設計書 — `detail-design.md` (CLS-xxx) | basic-design |
| 10 | **db-design** | `/sekkei:db-design @input` | 基本設計書 + NFR | データベース設計書 — `db-design.md` (DB-xxx) | basic-design |
| 11 | **screen-design** | `/sekkei:screen-design @input` | 基本設計書 | 画面設計書 — `screen-design.md` (SCR-xxx) | basic-design |
| 12 | **interface-spec** | `/sekkei:interface-spec @input` | 基本設計書 | IF仕様書 — `interface-spec.md` (IF-xxx) | basic-design |
| 13 | **report-design** | `/sekkei:report-design @input` | 基本設計書 | 帳票設計書 — `report-design.md` (RPT-xxx) | basic-design |
| 14 | **batch-design** | `/sekkei:batch-design @input` | 基本設計書 + 機能一覧 | バッチ処理設計書 — `batch-design.md` (BATCH-xxx) | basic-design |
| 15 | **test-plan** | `/sekkei:test-plan @req` | 要件定義書 + 非機能要件 + 機能一覧 + 基本設計書 | テスト計画書 — `test-plan.md` (TP-xxx) | basic-design + functions-list |
| 16 | **ut-spec** | `/sekkei:ut-spec @detail-design` | 詳細設計書 + テスト計画書 | 単体テスト仕様書 — `ut-spec.md` (UT-xxx) | detail-design + test-plan |
| 17 | **it-spec** | `/sekkei:it-spec @basic-design` | 基本設計書 + テスト計画書 | 結合テスト仕様書 — `it-spec.md` (IT-xxx) | basic-design + test-plan |
| 18 | **st-spec** | `/sekkei:st-spec @basic-design` | 基本設計書 + 機能一覧 + テスト計画書 | システムテスト仕様書 — `st-spec.md` (ST-xxx) | basic-design + test-plan |
| 19 | **uat-spec** | `/sekkei:uat-spec @requirements` | 要件定義書 + 非機能要件 + テスト計画書 | 受入テスト仕様書 — `uat-spec.md` (UAT-xxx) | requirements + test-plan |
| 20 | **test-result-report** | `/sekkei:test-result-report @input` | Các đặc tả kiểm thử | テスト結果報告書 — `test-result-report.md` (TR-xxx) | ut/it/st/uat-spec |
| 21 | **test-evidence** | `/sekkei:test-evidence @input` | テスト計画書 | テストエビデンス — `test-evidence.md` (EV-xxx) | test-plan |

---

## Section 2: Tài Liệu Bổ Sung & Quản lý (10 lệnh)

| # | Lệnh | Syntax | Input | Output | Prerequisite |
|---|------|--------|-------|--------|-------------|
| 22 | **mockup** | `/sekkei:mockup` | Screen defs từ screen-design.md / basic-design.md | HTML mockups trong `11-mockups/` + PNG screenshots nhúng vào tài liệu | basic-design |
| 23 | **matrix** | `/sekkei:matrix` | Tài liệu hiện có trong chain | CRUD図 / トレーサビリティマトリクス | basic-design |
| 24 | **sitemap** | `/sekkei:sitemap` | Tài liệu hiện có trong chain | サイトマップ — phân cấp màn hình (PG-xxx) | basic-design |
| 25 | **operation-design** | `/sekkei:operation-design @input` | Mô tả yêu cầu vận hành | 運用設計書 — backup, monitoring, DR, SLA | basic-design |
| 26 | **migration-design** | `/sekkei:migration-design @input` | Mô tả hệ thống cũ và plan | 移行設計書 — data migration, cutover plan | basic-design |
| 27 | **meeting-minutes** | `/sekkei:meeting-minutes @input` | Nội dung cuộc họp | 議事録 — biên bản, quyết định, action items | Không cần |
| 28 | **decision-record** | `/sekkei:decision-record @input` | Quyết định kiến trúc | 設計判断記録 (ADR) — context, decision, consequences | Không cần |

---

## Section 3: Lệnh Tiện Ích (15 lệnh)

| # | Lệnh | Syntax | Options / Subcommands | Mục đích |
|---|------|--------|-----------------------|----------|
| 19 | **validate** | `/sekkei:validate [@doc]` | Không có arg = validate cả chain | Kiểm tra completeness, broken cross-ref IDs, thiếu section |
| 20 | **status** | `/sekkei:status` | — | Xem tiến độ chain, gợi ý tài liệu tiếp theo |
| 21 | **export** | `/sekkei:export @doc --format=xlsx` | `xlsx` / `pdf` / `docx` | Export sang Excel (IPA 4-sheet) / PDF / Word |
| 22 | **translate** | `/sekkei:translate @doc --lang=en` | `--lang=en` / `--lang=vi` | Dịch tài liệu, giữ nguyên cross-ref IDs |
| 23 | **glossary** | `/sekkei:glossary [subcommand]` | `add` / `list` / `find` / `export` / `import` | Quản lý thuật ngữ dự án |
| 24 | **change** | `/sekkei:change` | `--resume` / `--status` / `--list` / `--cancel` / `--rollback` | Quản lý lifecycle của change request (変更要求書) |
| 25 | **update** | `/sekkei:update @doc` | `--since <git-ref>` | Phát hiện upstream changes, sinh danh sách tài liệu cần cập nhật |
| 26 | **diff-visual** | `/sekkei:diff-visual @before @after` | — | Export Excel màu thể hiện diff giữa 2 version |
| 27 | **plan** | `/sekkei:plan @doc-type` | — | Khảo sát yêu cầu + tạo kế hoạch triển khai nhiều phase |
| 28 | **implement** | `/sekkei:implement @plan-path` | — | Thực thi plan từng phase, tạo tài liệu theo thứ tự |
| 29 | **preview** | `/sekkei:preview` | `--docs` / `--guide` / `--port <number>` / `--no-open` / `--help` | Khởi động Express preview server tại localhost:4983 |
| 30 | **dashboard** | `/sekkei:dashboard` | `--port <number>` / `--open` | Bảng điều khiển Analytics — chỉ số chất lượng, đồ thị truy xuất, điểm rủi ro (mặc định: port 4002) |
| 31 | **version** | `/sekkei:version` | `--json` | Version info + MCP server status |
| 32 | **doctor** | `sekkei doctor` | `--json` | Health check toàn diện — MCP, templates, skill, Python, commands, fix suggestions |
| 33 | **uninstall / rebuild** | `/sekkei:uninstall` / `/sekkei:rebuild` | — | Gỡ cài đặt hoặc rebuild toàn bộ Sekkei |

---

## Ghi chú sử dụng

**Thứ tự quan trọng** — Luôn kiểm tra cột Prerequisite. Bỏ qua bước giữa sẽ làm các tài liệu sau thiếu cross-ref IDs.

**`@input` là gì** — Có thể là đường dẫn file (`@requirements.md`) hoặc paste text trực tiếp sau lệnh trong `[ ]`.

**Bắt đầu từ đâu** — Chạy `/sekkei:status` bất cứ lúc nào để biết Sekkei gợi ý tài liệu nào tiếp theo.

**Validate không arg** — `/sekkei:validate` kiểm tra toàn bộ chain. `/sekkei:validate @doc` chỉ kiểm tra một file.

**Export formats:**
| Format | Dùng khi |
|--------|----------|
| `xlsx` | Gửi khách hàng Nhật — format IPA 4-sheet (表紙/更新履歴/目次/本文) |
| `pdf` | Gửi draft review nhanh |
| `docx` | Khách hàng yêu cầu Word hoặc cần edit thêm |

**Glossary subcommands:**
| Subcommand | Ví dụ |
|-----------|-------|
| `add` | `/sekkei:glossary add "勤怠管理" "Quản lý chấm công" "Attendance management"` |
| `list` | `/sekkei:glossary list` |
| `find` | `/sekkei:glossary find "勤怠"` |
| `export` | `/sekkei:glossary export --format=xlsx` |
| `import` | `/sekkei:glossary import @glossary.xlsx` |

**Mockup modes:**
| Mode | Syntax | Mục đích |
|------|--------|----------|
| Full | `/sekkei:mockup` | Tạo HTML từ screen defs → chụp ảnh → nhúng PNG vào tài liệu |
| Screenshot only | `/sekkei:mockup --screenshot` | Chụp lại ảnh từ HTML đã có (sau khi chỉnh sửa thủ công) |

**Change request flags:**
| Flag | Mục đích |
|------|----------|
| `--resume` | Tiếp tục change request đang dở |
| `--status` | Xem trạng thái CR hiện tại |
| `--list` | Liệt kê toàn bộ CR trong dự án |
| `--cancel` | Huỷ CR chưa được duyệt |
| `--rollback` | Rollback tài liệu về trạng thái trước CR |
