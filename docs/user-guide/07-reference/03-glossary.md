# Bảng Từ Vựng — Glossary

> Tra cứu nhanh 3 ngôn ngữ: Tiếng Việt ↔ 日本語 ↔ English.

---

## Section 1: Loại Tài Liệu

### 13 Tài Liệu Cốt Lõi

| Tiếng Việt | 日本語 | English |
|-----------|-------|---------|
| Tài liệu yêu cầu | 要件定義書 | Requirements Specification |
| Danh sách chức năng | 機能一覧 | Functions List |
| Tài liệu yêu cầu phi chức năng | 非機能要件定義書 | Non-Functional Requirements |
| Kế hoạch dự án | プロジェクト計画書 | Project Plan |
| Tài liệu thiết kế cơ bản | 基本設計書 | Basic Design Document |
| Tài liệu thiết kế bảo mật | セキュリティ設計書 | Security Design Document |
| Tài liệu thiết kế chi tiết | 詳細設計書 | Detail Design Document |
| Kế hoạch kiểm thử | テスト計画書 | Test Plan |
| Đặc tả kiểm thử đơn vị | 単体テスト仕様書 | Unit Test Specification |
| Đặc tả kiểm thử tích hợp | 結合テスト仕様書 | Integration Test Specification |
| Đặc tả kiểm thử hệ thống | システムテスト仕様書 | System Test Specification |
| Đặc tả kiểm thử nghiệm thu | 受入テスト仕様書 | User Acceptance Test Specification |
| Yêu cầu thay đổi | 変更要求書 | Change Request |

### 9 Tài Liệu Bổ Sung

| Tiếng Việt | 日本語 | English |
|-----------|-------|---------|
| Bảng CRUD / ma trận truy vết | CRUD図 / トレーサビリティマトリクス | CRUD Matrix / Traceability Matrix |
| Sơ đồ màn hình | サイトマップ | Sitemap / Screen Map |
| Tài liệu thiết kế vận hành | 運用設計書 | Operation Design Document |
| Tài liệu thiết kế di chuyển dữ liệu | 移行設計書 | Migration Design Document |
| Tài liệu thiết kế màn hình | 画面設計書 | Screen Design Document |
| Biên bản cuộc họp | 議事録 | Meeting Minutes |
| Hồ sơ quyết định kiến trúc | ADR (Architecture Decision Record) | Architecture Decision Record |
| Bằng chứng kiểm thử | テストエビデンス | Test Evidence |
| Tài liệu dịch | 翻訳ドキュメント | Translated Document |

---

## Section 2: ID Prefixes

| Tiếng Việt | Prefix | Tài liệu nguồn | Ví dụ |
|-----------|--------|---------------|-------|
| Yêu cầu chức năng | `REQ-` | 要件定義書 | `REQ-001` |
| Yêu cầu phi chức năng | `NFR-` | 非機能要件定義書 | `NFR-001` |
| Chức năng | `F-` | 機能一覧 | `F-001` |
| Màn hình | `SCR-` | 基本設計書 | `SCR-001` |
| Bảng database | `TBL-` | 基本設計書 | `TBL-001` |
| API endpoint | `API-` | 基本設計書 | `API-001` |
| Class / module | `CLS-` | 詳細設計書 | `CLS-001` |
| Yêu cầu bảo mật | `SEC-` | セキュリティ設計書 | `SEC-001` |
| Milestone / WBS item | `PP-` | プロジェクト計画書 | `PP-001` |
| Mục tiêu kiểm thử | `TP-` | テスト計画書 | `TP-001` |
| Test case đơn vị | `UT-` | 単体テスト仕様書 | `UT-001` |
| Test case tích hợp | `IT-` | 結合テスト仕様書 | `IT-001` |
| Test case hệ thống | `ST-` | システムテスト仕様書 | `ST-001` |
| Test case nghiệm thu | `UAT-` | 受入テスト仕様書 | `UAT-001` |

> Luồng cross-reference: `REQ-xxx` → `F-xxx` → `SCR-xxx` / `TBL-xxx` / `API-xxx` → `CLS-xxx` → `UT-xxx` / `IT-xxx` / `ST-xxx` / `UAT-xxx`

---

## Section 3: Khái Niệm Chính

| Tiếng Việt | 日本語 | English |
|-----------|-------|---------|
| Mô hình V | Vモデル | V-Model |
| Chuỗi tài liệu phụ thuộc | ドキュメントチェーン | Document Chain |
| Lịch sử sửa đổi | 改訂履歴 | Revision History |
| Trang bìa | 表紙 | Cover Page |
| Mục lục | 目次 | Table of Contents |
| Nội dung chính | 本文 | Body / Main Content |
| Ký duyệt kỹ thuật số | デジタルハンコ | Digital Approval Stamp |
| Tiêu chuẩn IPA | IPA標準 | IPA Standard |
| RFP workspace | RFPワークスペース | RFP Workspace |
| Đóng băng phạm vi | スコープフリーズ | Scope Freeze |
| Mức lịch sự tiếng Nhật | 敬語レベル | Keigo Level |
| Phân tích ảnh hưởng thay đổi | 変更影響分析 | Change Impact Analysis |
| Ma trận truy vết | トレーサビリティ | Traceability Matrix |
| Chế độ tách file | スプリットモード | Split Mode |
| Điểm vào / điểm ra kiểm thử | 入口基準 / 出口基準 | Entry Criteria / Exit Criteria |
| Yêu cầu kỹ thuật | 技術要件 | Technical Requirements |

---

## Section 4: Thuật Ngữ Chuẩn IPA

### Phân loại xử lý (処理種別)

| Tiếng Việt | 日本語 | English | Mô tả |
|-----------|-------|---------|-------|
| Xử lý nhập liệu | 入力 | Input processing | Màn hình / API nhận dữ liệu từ user |
| Xử lý tra cứu | 照会 | Inquiry / Query | Màn hình / API trả về thông tin |
| Xử lý báo cáo / in ấn | 帳票 | Report / Form output | Xuất báo cáo, file PDF, Excel |
| Xử lý hàng loạt | バッチ | Batch processing | Tác vụ chạy theo lịch, không có UI |

### Mức độ ưu tiên (優先度)

| Tiếng Việt | 日本語 | English |
|-----------|-------|---------|
| Cao | 高 | High |
| Trung bình | 中 | Medium |
| Thấp | 低 | Low |

### Trạng thái trong chain

| Tiếng Việt | Giá trị trong config | Mô tả |
|-----------|---------------------|-------|
| Chưa bắt đầu | `pending` | Tài liệu chưa được tạo |
| Đang thực hiện | `in-progress` | Đang generate hoặc đang review |
| Hoàn chỉnh | `complete` | Đã được duyệt, sẵn sàng làm input cho tài liệu tiếp theo |

### Loại test case (テスト種別)

| Tiếng Việt | 日本語 | English |
|-----------|-------|---------|
| Test trường hợp bình thường | 正常系 | Happy path / Normal case |
| Test trường hợp lỗi | 異常系 | Error case / Abnormal case |
| Test giá trị biên | 境界値 | Boundary value test |
| Test hiệu năng | 性能テスト | Performance test |
| Test bảo mật | セキュリティテスト | Security test |

### Cấu trúc tài liệu Excel IPA (4 sheet)

| Sheet | 日本語 | Nội dung |
|-------|-------|---------|
| Sheet 1 | 表紙 | Tên project, tên tài liệu, version, ngày, tác giả |
| Sheet 2 | 更新履歴 | Lịch sử sửa đổi — ngày, version, nội dung, người thay đổi |
| Sheet 3 | 目次 | Mục lục tự động với số trang |
| Sheet 4 | 本文 | Nội dung tài liệu chính |
