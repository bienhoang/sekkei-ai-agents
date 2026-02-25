# Tài liệu Bổ trợ — 9 Loại Tài liệu Tùy chọn

Xem thêm: [Tổng quan quy trình](./index.md) | [Giai đoạn Testing](./03-testing.md) | [V-Model và Tài liệu](../02-v-model-and-documents.md)

---

## Tổng quan

Ngoài 13 loại tài liệu cốt lõi trong chuỗi liên kết, Sekkei còn hỗ trợ khởi tạo 9 loại tài liệu bổ trợ khác. Các tài liệu này **không mang tính bắt buộc** cho mọi dự án — bạn chỉ nên sử dụng chúng khi tình huống cụ thể yêu cầu để tối ưu hóa nguồn lực.

---

## Danh mục tài liệu bổ trợ

| Tài liệu | Tình huống sử dụng | Câu lệnh |
|---------|-------------|------|
| **Biểu đồ CRUD (CRUD図)** | Kiểm tra tính logic của các thao tác dữ liệu, tránh thiếu sót. | `/sekkei:matrix` |
| **Ma trận truy xuất nguồn gốc (トレーサビリティマトリクス)** | Chứng minh độ bao phủ (coverage) trước khi bàn giao. | `/sekkei:matrix` |
| **Sơ đồ trang web (サイトマップ)** | Sử dụng khi hệ thống có cấu trúc màn hình phức tạp (> 15 SCR). | `/sekkei:sitemap` |
| **Thiết kế vận hành (運用設計書)** | Khi dự án có cam kết SLA khắt khe về vận hành. | `/sekkei:operation-design @input` |
| **Thiết kế chuyển đổi (移行設計書)** | Khi cần chuyển đổi dữ liệu từ hệ thống cũ sang hệ thống mới. | `/sekkei:migration-design @input` |
| **Thiết kế màn hình (画面設計書)** | Chi tiết layout và logic UI (tự động tạo khi bật "split mode"). | (Tự động) |
| **Biên bản cuộc họp (議事録)** | Ghi lại nội dung sau mỗi buổi làm việc với khách hàng Nhật. | (Sử dụng Template) |
| **Quyết định kiến trúc (ADR)** | Ghi chép các quyết định kỹ thuật quan trọng của dự án. | (Sử dụng Template) |
| **Bằng chứng kiểm thử (テストエビデンス)** | Cung cấp ảnh chụp màn hình/log thực tế sau khi chạy test. | (Thực hiện thủ công) |

---

## Biểu đồ CRUD và Ma trận truy xuất nguồn gốc

**Biểu đồ CRUD (CRUD図)** là bảng đối chiếu giữa Chức năng và Bảng dữ liệu thông qua các thao tác C (Khởi tạo), R (Đọc), U (Cập nhật), D (Xóa). Công cụ này giúp bạn phát hiện các lỗ hổng logic nghiệp vụ trước khi bước vào giai đoạn lập trình.

**Ma trận truy xuất nguồn gốc (トレーサビリティマトリクス)** được khởi tạo thông qua cùng một lệnh `/sekkei:matrix`. Nó hiển thị mối liên kết chặt chẽ từ: Yêu cầu (REQ) → Chức năng (F) → Thiết kế (SCR) → Các cấp độ kiểm thử (UT, IT, ST, UAT). Đây là minh chứng rõ ràng nhất về tính toàn vẹn của sản phẩm đối với khách hàng Nhật.

---

## Xuất bản Tài liệu — Excel / PDF / Word

Bạn có thể xuất bất kỳ tài liệu nào ra 3 định dạng phổ biến:

```bash
# Định dạng Excel chuẩn IPA 4-sheet — Định dạng ưa thích của đối tác Nhật
/sekkei:export @requirements --format=xlsx

# Định dạng PDF với font Noto Sans JP — Phù hợp để gửi bản nháp review nhanh
/sekkei:export @basic-design --format=pdf

# Định dạng Word với mục lục tự động — Dùng khi khách hàng cần chỉnh sửa trực tiếp
/sekkei:export @uat-spec --format=docx

# Xuất bản toàn bộ bộ tài liệu của dự án
/sekkei:export --all --format=xlsx
```

**Cấu trúc bảng tính Excel chuẩn IPA (4-sheet):**

- **Trang bìa (表紙):** Thông tin dự án, phiên bản, tác giả (lấy từ cấu hình `sekkei.config.yaml`).
- **Lịch sử cập nhật (更新履歴):** Tự động ghi lại các thay đổi của từng phiên bản.
- **Mục lục (目次):** Danh sách các chương mục kèm số trang tương ứng.
- **Nội dung chính (本文):** Nội dung đặc tả chi tiết kèm bảng biểu và sơ đồ.

> [!TIP]
> Excel là định dạng bàn giao tiêu chuẩn trong hầu hết các dự án với Nhật Bản. PDF cực kỳ hữu ích cho việc xem xét nội bộ. Định dạng Word chỉ nên dùng khi có yêu cầu đặc biệt về việc chỉnh sửa văn bản trực tiếp.

---

## Tính năng Dịch thuật (Translation)

Bạn có thể dịch bất kỳ tài liệu nào sang tiếng Anh hoặc tiếng Việt để đội ngũ phát triển nắm bắt nhanh chóng hoặc gửi cho các bên liên quan:

```bash
# Dịch tài liệu sang tiếng Anh
/sekkei:translate @requirements --lang=en

# Dịch tài liệu sang tiếng Việt (phục vụ BA/Dev nội bộ)
/sekkei:translate @basic-design --lang=vi
```

Sekkei sẽ bảo toàn các mã ID (REQ-xxx, F-xxx, SCR-xxx) trong bản dịch để không làm đứt quãng khả năng tham chiếu. Mọi thuật ngữ chuyên ngành sẽ được dịch thống nhất theo bảng thuật ngữ (glossary) của dự án.

> [!NOTE]
> Bản dịch đóng vai trò là tài liệu tham khảo. Bản tiếng Nhật gốc vẫn luôn là căn cứ chính thức cuối cùng để bàn giao cho khách hàng.

---

**Xem thêm:** [Quy trình xử lý Thay đổi (Change Request)](./05-change-request.md) | [Hướng dẫn theo vai trò](../05-roles/)
