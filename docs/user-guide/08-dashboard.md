# Bảng Điều Khiển Phân Tích — Dashboard

Sekkei Dashboard cung cấp giao diện web trực quan để theo dõi chất lượng tài liệu, truy xuất liên kết giữa các tài liệu (traceability), và điểm số rủi ro theo thời gian thực.

Xem thêm: [Giới thiệu](./01-introduction.md) | [Bắt đầu nhanh](./03-quick-start.md) | [Tham chiếu lệnh](./07-reference/01-commands.md)

---

## 1. Khởi động Dashboard

```bash
/sekkei:dashboard
```

Dashboard sẽ tự động mở trình duyệt tại `http://localhost:4984`. Các tuỳ chọn bổ sung:

| Tuỳ chọn | Mô tả |
|-----------|--------|
| `--docs <path>` | Chỉ định thư mục workspace-docs (tự phát hiện nếu bỏ qua) |
| `--port <N>` | Chỉ định cổng (mặc định: 4984, tự chọn cổng khác nếu bận) |
| `--no-open` | Không tự động mở trình duyệt |

> [!TIP]
> Dashboard tự phát hiện thư mục `workspace-docs/` trong thư mục hiện tại hoặc đọc từ `sekkei.config.yaml`.

---

## 2. Bố cục giao diện

Giao diện gồm **thanh điều hướng bên trái (Sidebar)** và **vùng nội dung chính** bên phải:

| Menu | Đường dẫn | Mô tả |
|------|-----------|--------|
| Overview | `/` | Tổng quan dự án — các chỉ số tổng hợp |
| Chain Status | `/chain` | Trạng thái chuỗi tài liệu V-Model |
| Analytics | `/analytics` | Phân tích chất lượng chuyên sâu |
| Change History | `/changes` | Lịch sử thay đổi và Change Request |
| Features | `/features` | Tiến độ theo tính năng (chỉ hiện khi bật split mode) |

---

## 3. Màn hình Overview — Tổng quan dự án

Màn hình mặc định khi mở Dashboard, hiển thị bức tranh toàn cảnh về trạng thái dự án.

### 3.1 Thẻ thống kê (Stat Cards)

4 thẻ nằm ngang ở đầu trang:

| Thẻ | Ý nghĩa |
|-----|---------|
| **Documents** | Tổng số tài liệu đã tạo trong workspace |
| **Completion** | Phần trăm hoàn thành tổng thể (dựa trên trạng thái từng tài liệu) |
| **Stale Alerts** | Số tài liệu lỗi thời — tài liệu upstream đã thay đổi nhưng downstream chưa cập nhật |
| **Active CRs** | Số Change Request đang hoạt động (chưa hoàn thành) |

### 3.2 V-Model Coverage Cards

4 thẻ hiển thị độ phủ liên kết theo mô hình V:

| Thẻ | Công thức | Ý nghĩa |
|-----|-----------|---------|
| **Req → Design** | % yêu cầu có liên kết đến tài liệu thiết kế | Yêu cầu đã được chuyển thành thiết kế chưa? |
| **Req → Test** | % yêu cầu có liên kết đến test spec | Yêu cầu đã có test case tương ứng chưa? |
| **Full Trace** | % yêu cầu có cả Design lẫn Test link | Yêu cầu được phủ đầy đủ cả hai chiều? |
| **Overall** | % ID có bất kỳ tham chiếu downstream nào | Tỷ lệ truy xuất tổng thể của dự án |

Mã màu: xanh lá (≥80%), vàng (≥60%), đỏ (<60%).

### 3.3 Risk Score Gauge

Đồng hồ bán nguyệt hiển thị **điểm rủi ro tổng thể (0–100)** của dự án, được tính từ 5 yếu tố:

| Yếu tố | Trọng số | Mô tả |
|---------|----------|--------|
| Trace Completeness | 30% | Mức độ liên kết giữa các tài liệu |
| NFR Coverage | 20% | Độ phủ yêu cầu phi chức năng |
| Test Coverage | 20% | Độ phủ test spec cho yêu cầu |
| Freshness | 15% | Mức độ cập nhật (không lỗi thời) |
| Structural Health | 15% | Chất lượng cấu trúc tài liệu |

Phân loại: **Xanh lá** (≥80 — tốt), **Vàng** (≥60 — cần chú ý), **Đỏ** (<60 — rủi ro cao).

### 3.4 Risk Score Trend

Biểu đồ đường hiển thị xu hướng điểm rủi ro theo thời gian, lấy dữ liệu từ các snapshot đã lưu. Giúp nhận biết dự án đang cải thiện hay xuống cấp.

### 3.5 Completion Donut

Biểu đồ tròn (donut) phân nhóm tài liệu theo trạng thái:

| Màu | Trạng thái | Ý nghĩa |
|-----|------------|---------|
| Xanh lá | Complete | Tài liệu đã hoàn chỉnh |
| Xanh dương | In Progress | Đang biên soạn |
| Xám | Pending | Chưa bắt đầu |

### 3.6 V-Model Pipeline

Bảng trực quan hiển thị toàn bộ chuỗi tài liệu V-Model theo 4 nhóm pha:

| Pha | Tài liệu |
|-----|----------|
| **Requirements** | REQ (要件定義書), FL (機能一覧), NFR (非機能要件), PP (プロジェクト計画書) |
| **Design** | BD (基本設計書), SEC (セキュリティ設計書), DD (詳細設計書) |
| **Testing** | TP (テスト計画書), UT, IT, ST, UAT (各テスト仕様書) |
| **Supplementary** | SM (サイトマップ), OD (運用設計書), MD (移行設計書) |

Mỗi ô hiển thị trạng thái bằng màu: xanh lá (complete), xanh dương (in-progress), xám (pending). Nhấp vào ô để xem chi tiết tài liệu.

### 3.7 Recent Changes

Bảng 10 thay đổi gần nhất — bao gồm ngày, loại tài liệu, phiên bản, và nội dung thay đổi.

---

## 4. Màn hình Chain Status — Trạng thái chuỗi tài liệu

Màn hình chuyên sâu về chuỗi tài liệu V-Model và quan hệ liên kết giữa chúng.

### 4.1 Bộ lọc pha (Phase Filter)

Dropdown cho phép lọc theo pha: All Phases, Requirements, Design, Testing, Supplementary.

### 4.2 Traceability Graph

Đồ thị tương tác (interactive graph) hiển thị **luồng tài liệu và liên kết chéo** (cross-reference) giữa các tài liệu:

- **Nút (node)**: Mỗi nút đại diện một tài liệu, màu theo pha
- **Cạnh (edge)**: Mũi tên nối giữa các tài liệu có tham chiếu ID chung
- **Nhấp vào nút**: Highlight các nút liên kết trực tiếp
- **Thanh bên phải**: Hiển thị Trace Completeness (%), Broken Links (số liên kết lỗi), và chi tiết nút được chọn

> [!TIP]
> Đồ thị sử dụng thuật toán Dagre để tự động sắp xếp từ trái sang phải theo luồng V-Model.

### 4.3 Bảng trạng thái theo pha

4 bảng (theo pha) liệt kê từng tài liệu với các cột: **Status** (trạng thái), **Version** (phiên bản), **Last Modified** (lần sửa gần nhất).

### 4.4 Bảng chi tiết tài liệu

Khi chọn một tài liệu (từ pipeline hoặc đồ thị), hiển thị: badge trạng thái, phiên bản, đường dẫn file output, thời gian sửa đổi.

---

## 5. Màn hình Analytics — Phân tích chất lượng

Màn hình phân tích chuyên sâu nhất, dành cho QA và PM muốn đánh giá chất lượng tài liệu toàn diện.

### 5.1 Thẻ thống kê

| Thẻ | Ý nghĩa |
|-----|---------|
| **IDs Defined** | Tổng số ID đã định nghĩa trong toàn bộ tài liệu (REQ-xxx, F-xxx, SCR-xxx, ...) |
| **IDs Referenced** | Số ID được tham chiếu bởi tài liệu khác |
| **Freshness Score** | Điểm tươi mới (%) — tỷ lệ tài liệu không lỗi thời |
| **Stale Docs** | Số tài liệu lỗi thời cần cập nhật |

### 5.2 Cross-Reference Analysis

Biểu đồ thanh ngang so sánh **Defined vs Referenced** theo từng loại ID (REQ, F, SCR, TBL, API, CLS, ...).

Bên dưới hiển thị:
- **Missing IDs** (badge đỏ): ID được tham chiếu nhưng chưa được định nghĩa — cần bổ sung
- **Orphaned IDs** (badge vàng): ID được định nghĩa nhưng không có tài liệu nào tham chiếu — có thể dư thừa

### 5.3 Staleness Warnings

Hộp cảnh báo vàng liệt kê các cặp tài liệu upstream/downstream bị lỗi thời:

> Ví dụ: "requirements đã cập nhật (v1.3) nhưng basic-design vẫn ở v1.1 — cần regenerate."

### 5.4 Document Quality

Biểu đồ thanh ngang hiển thị **Section Completeness (%)** cho từng loại tài liệu — đo mức độ hoàn chỉnh các mục (section) bắt buộc trong template.

### 5.5 NFR Coverage Radar

Biểu đồ radar hiển thị độ phủ yêu cầu phi chức năng theo 6 nhóm (performance, security, availability, ...) với nhãn tiếng Nhật. Hình dạng càng đầy đặn, NFR càng được phủ tốt.

### 5.6 Document Health Panel

| Phần | Mô tả |
|------|--------|
| **Overall Health Gauge** | Đồng hồ hiển thị điểm sức khỏe tổng thể |
| **Per-Document Table** | Bảng sắp xếp theo điểm, badge: Good (xanh), Warning (vàng), Critical (đỏ) |
| **Top Issues** | Danh sách các vấn đề cấu trúc cần khắc phục (tối đa 10) |

Công thức tính Health Score: Complete = 100đ, In-progress = 60đ, Pending = 20đ → trung bình cộng.

### 5.7 Health Score Trend

Biểu đồ đường hiển thị xu hướng điểm sức khỏe theo thời gian (từ snapshot).

---

## 6. Màn hình Change History — Lịch sử thay đổi

Theo dõi toàn bộ thay đổi và Change Request trong dự án.

### 6.1 Bộ lọc

| Bộ lọc | Mô tả |
|--------|--------|
| **Document Type** | Lọc theo loại tài liệu (requirements, basic-design, ...) |
| **Date From / To** | Khoảng thời gian |
| **Reset** | Xoá tất cả bộ lọc |

### 6.2 Changes Over Time

Biểu đồ cột hiển thị **số lượng thay đổi theo tháng** — giúp nhận biết giai đoạn có nhiều chỉnh sửa.

### 6.3 Change Requests

Nếu có CR (Change Request), hiển thị thẻ CR với:
- **ID và trạng thái** (badge màu)
- **Thanh tiến trình state machine** gồm 7 bước:

```
INITIATED → ANALYZING → IMPACT_ANALYZED → APPROVED → PROPAGATING → VALIDATED → COMPLETED
```

Mỗi bước biểu thị giai đoạn trong quy trình quản lý thay đổi.

### 6.4 Changelog Table

Bảng liệt kê chi tiết các thay đổi: Ngày, Tài liệu, Phiên bản, Nội dung thay đổi, Tác giả, CR ID (nếu có).

---

## 7. Màn hình Features — Tiến độ theo tính năng

> [!NOTE]
> Màn hình này **chỉ hiển thị khi bật split mode** trong `sekkei.config.yaml`. Split mode cho phép tạo tài liệu riêng biệt cho từng tính năng (feature).

### 7.1 Thẻ thống kê

| Thẻ | Ý nghĩa |
|-----|---------|
| **Features** | Tổng số tính năng trong dự án |
| **Avg Completion** | Phần trăm hoàn thành trung bình |
| **Fully Complete** | Số tính năng đã hoàn thành tất cả tài liệu |

### 7.2 Feature × Document Matrix

Bảng ma trận với:
- **Hàng**: Tên từng tính năng
- **Cột**: Loại tài liệu (basic-design, detail-design, ut-spec, it-spec, st-spec)
- **Ô**: Trạng thái bằng mã màu

| Ký hiệu | Màu | Ý nghĩa |
|----------|-----|---------|
| ok | Xanh lá | Đã hoàn thành |
| .. | Xanh dương | Đang thực hiện |
| -- | Xám | Chưa bắt đầu |
| N/A | Trong suốt | Không áp dụng |

Cột cuối hiển thị thanh tiến trình (progress bar) tổng hợp cho mỗi tính năng.

---

## 8. Snapshot — Lưu trữ chỉ số theo thời gian

Dashboard hỗ trợ tạo **snapshot** — ảnh chụp chỉ số tại một thời điểm, gắn với git tag.

Snapshot lưu trữ: Risk Score, Health Score, Coverage %, Staleness Score.

Dữ liệu snapshot được sử dụng bởi các biểu đồ xu hướng (trend charts) trên màn hình Overview và Analytics.

> [!TIP]
> Tạo snapshot định kỳ (ví dụ mỗi sprint) để theo dõi tiến trình cải thiện chất lượng tài liệu.

---

## 9. Giải thích thuật ngữ Dashboard

| Thuật ngữ | Tiếng Nhật | Ý nghĩa |
|-----------|------------|---------|
| Trace Completeness | トレーサビリティ完全性 | Mức độ liên kết giữa yêu cầu → thiết kế → test |
| Staleness | 陳腐化 | Tài liệu lỗi thời do upstream thay đổi |
| Cross-Reference | 相互参照 | Tham chiếu chéo ID giữa các tài liệu |
| Coverage | カバレッジ | Độ phủ — tỷ lệ ID có liên kết downstream |
| Health Score | 健全性スコア | Điểm sức khỏe cấu trúc tài liệu |
| Risk Score | リスクスコア | Điểm rủi ro tổng hợp 5 yếu tố |
| NFR | 非機能要件 | Yêu cầu phi chức năng (hiệu năng, bảo mật, ...) |
| Split Mode | 分割モード | Chế độ tạo tài liệu riêng theo tính năng |

---

**Bước tiếp theo:** [Tổng quan quy trình](./04-workflow/index.md) | [Hướng dẫn cho PM](./05-roles/01-pm.md) | [Tham chiếu lệnh](./07-reference/01-commands.md)
