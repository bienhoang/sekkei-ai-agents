---
doc_type: it-spec
version: "1.0"
language: vi
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - test-design
  - test-cases
  - traceability
  - defect-report
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Sử dụng văn phong nhất quán trong toàn tài liệu. -->

# Tài liệu Đặc tả Kiểm thử Tích hợp

## Lịch sử sửa đổi <!-- required -->

| Phiên bản | Ngày | Nội dung thay đổi | Người thay đổi |
|-----------|------|-------------------|----------------|
| 1.0  | YYYY-MM-DD | Tạo phiên bản đầu | <!-- AI: Tên tác giả --> |

<!-- AI: Thêm hàng cho mỗi lần sửa đổi. Phiên bản tăng dần: 1.0, 1.1, 2.0. -->

## Phê duyệt <!-- required -->

| Vai trò | Họ tên | Ngày |
|---------|--------|------|
| Người tạo | | |
| Người kiểm tra | | |
| Người phê duyệt | | |

<!-- AI: Để trống Họ tên và Ngày — con người điền sau khi review. -->

## Kiểm duyệt

| Giai đoạn review | Người review | Ngày review | Số vấn đề | Kết quả |
|-----------------|-------------|------------|-----------|---------|
| Review lần 1 | | | | |
| Review lần 2 | | | | |
| Phê duyệt cuối | | | | |

## Nơi phân phối <!-- required -->

<!-- AI: Liệt kê các bên liên quan sẽ nhận tài liệu. Định dạng danh sách. -->

## Thuật ngữ <!-- required -->

| Thuật ngữ | Giải thích | Tiếng Anh |
|-----------|-----------|-----------|
<!-- AI: Trích xuất 5-10 thuật ngữ chính: API, giao diện, chuyển màn hình, response, xử lý lỗi, stub, lỗi, v.v. -->

## 1. Thiết kế kiểm thử <!-- required -->

<!-- AI: Mô tả phương pháp thiết kế kiểm thử tích hợp. Kiểm thử tích hợp bao gồm cả xác minh giao diện (API-xxx, SCR-xxx, TBL-xxx) và xác nhận hành vi chức năng nghiệp vụ. Bao gồm: danh sách giao diện đối tượng (API-xxx từ Thiết kế Cơ bản, ID màn hình SCR-xxx, ID bảng TBL-xxx), phương pháp kiểm thử (top-down/bottom-up/big bang), cấu hình môi trường kiểm thử, phương châm stub và driver. Tham chiếu API-xxx, SCR-xxx, TBL-xxx từ Thiết kế Cơ bản. -->

### 1.1 Đánh giá rủi ro <!-- required -->

<!-- AI: Đánh giá mức rủi ro Cao/Trung bình/Thấp cho từng module/sub-module và điều chỉnh khối lượng kiểm thử tương ứng. Cao (nghiệp vụ cốt lõi, tài chính, bảo mật, nhiều người dùng phụ thuộc) → tạo nhiều ca kiểm thử, sâu hơn. Trung bình → vừa phải. Thấp → chỉ cơ bản (trường hợp bình thường). -->

| Module/Sub-module | Mức rủi ro | Lý do | Phương châm kiểm thử |
|-----------------|-----------|------|-------------------|
| <!-- AI: module --> | <!-- AI: Cao/Trung bình/Thấp --> | <!-- AI: lý do --> | <!-- AI: nhiều/vừa phải/cơ bản --> |

### 1.2 Quan điểm và kỹ thuật thiết kế kiểm thử <!-- required -->

<!-- AI: Quan điểm kiểm thử (độ bao phủ): trường hợp bình thường / trường hợp bất thường / giá trị biên / edge (timeout, mất kết nối, thực thi đồng thời). Chọn kỹ thuật thiết kế phù hợp với đặc tính dữ liệu và logic nghiệp vụ: phân hoạch tương đương (Equivalence Partitioning), phân tích giá trị biên (Boundary Value Analysis), bảng quyết định (nhiều điều kiện kết hợp), chuyển trạng thái (workflow, chuyển đổi trạng thái). -->

### 1.3 Quy ước dữ liệu kiểm thử <!-- required -->

<!-- AI: Dữ liệu kiểm thử phải có giá trị cụ thể. Cấm mô tả chung chung.
❌ "Nhập email hợp lệ" → ✅ "Email: test_customer_01@domain.com"
❌ "Mã khách hàng đúng" → ✅ "Mã khách hàng: KH-2026-0012"
❌ "Số điện thoại không hợp lệ" → ✅ "Điện thoại: abc123xyz (chữ, không phải số)"
❌ "Tên quá dài" → ✅ "Tên: [256 ký tự 'A' vượt quá giới hạn 255 ký tự]" -->

## 2. Ca kiểm thử tích hợp <!-- required -->

<!-- AI: Tạo ca kiểm thử bao gồm CẢ hợp đồng giao diện (tích hợp API, chuyển màn hình, luồng dữ liệu) VÀ hành vi chức năng. Định dạng ID: IT-001, IT-002... Cột quan điểm kiểm thử ghi rõ trường hợp bình thường/bất thường/giá trị biên/edge và kỹ thuật thiết kế đã áp dụng. Mức độ ưu tiên/rủi ro: Cao/Trung bình/Thấp. Dữ liệu kiểm thử bắt buộc có giá trị cụ thể (§1.3). -->

| STT | ID ca kiểm thử | Module/Sub-module | Tên ca kiểm thử | Đối tượng kiểm thử | Quan điểm kiểm thử | Điều kiện tiên quyết | Quy trình kiểm thử | Dữ liệu kiểm thử | Kết quả mong đợi | Độ ưu tiên | Mức rủi ro | Kết quả thực hiện | Đánh giá | ID lỗi | Ghi chú |
|-----|-------------|----------------|--------------|-----------------|-----------------|------------------|--------------------|--------------|----------------|-----------|-----------|-----------------|---------|-------|---------|
| 1 | IT-001 | <!-- AI: module/sub-module --> | <!-- AI: Xác minh hợp đồng API trường hợp bình thường --> | <!-- AI: endpoint API-xxx --> | Trường hợp bình thường/Xác minh hợp đồng API | <!-- AI: điều kiện tiên quyết --> | <!-- AI: 1.… 2.… --> | <!-- AI: giá trị cụ thể ví dụ: {"email":"test_customer_01@domain.com"} --> | <!-- AI: 1.… 2.… --> | Cao | <!-- AI: Cao/Trung bình/Thấp --> | | | | <!-- AI --> |
| 2 | IT-002 | <!-- AI --> | <!-- AI: Kiểm thử đầu vào trường hợp bất thường --> | <!-- AI: API-xxx --> | Trường hợp bất thường/Phân hoạch tương đương | <!-- AI --> | <!-- AI --> | <!-- AI: giá trị cụ thể ví dụ: Điện thoại: abc123xyz --> | <!-- AI: response lỗi --> | Trung bình | <!-- AI --> | | | | <!-- AI --> |
| 3 | IT-003 | <!-- AI --> | <!-- AI: Kiểm thử giá trị biên --> | <!-- AI: trường API-xxx --> | Giá trị biên/Phân tích giá trị biên | <!-- AI --> | <!-- AI --> | <!-- AI: giá trị cụ thể ví dụ: Mật khẩu 5 ký tự (dưới giới hạn dưới -1) --> | <!-- AI: kết quả mong đợi --> | Trung bình | <!-- AI --> | | | | <!-- AI --> |
| 4 | IT-004 | <!-- AI --> | <!-- AI: Chuyển màn hình/chuyển trạng thái --> | <!-- AI: SCR-xxx → SCR-xxx --> | Edge/Chuyển trạng thái | <!-- AI --> | <!-- AI: các bước điều hướng --> | <!-- AI: giá trị cụ thể ví dụ: ID đơn hàng: ORD-2026-0007 --> | <!-- AI: màn hình mong đợi --> | Thấp | <!-- AI --> | | | | <!-- AI --> |

<!-- AI: Bao phủ: hợp đồng giao diện API-xxx (schema request/response), luồng chuyển màn hình SCR-xxx, tính nhất quán dữ liệu TBL-xxx (thao tác CRUD), biên xác thực và phân quyền, timeout và truyền lan lỗi, và trường hợp bình thường/bất thường/giá trị biên/edge của chức năng nghiệp vụ. -->

## 3. Truy vết <!-- required -->

<!-- AI: Ánh xạ ca kiểm thử tới artifact thiết kế. Hướng truy vết: API-xxx → SCR-xxx → IT-xxx. -->

| API-ID | SCR-ID | IT-ID | Quan điểm kiểm thử | Ghi chú |
|--------|-------|-------|-----------------|---------|
| <!-- AI: API-xxx --> | <!-- AI: SCR-xxx --> | <!-- AI: IT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Đảm bảo mỗi API-xxx từ Thiết kế Cơ bản có ít nhất một IT-xxx. Bao gồm TBL-xxx khi xác minh lưu trữ dữ liệu. -->

## 4. Báo cáo lỗi <!-- required -->

<!-- AI: Để phần này gần như trống — được điền trong quá trình thực hiện kiểm thử. Chỉ cung cấp tiêu đề bảng. -->

| ID lỗi | ID ca kiểm thử | Mức độ | Ngày phát hiện | Nội dung | Nguyên nhân | Ngày sửa | Trạng thái |
|-------|-------------|-------|--------------|---------|------------|---------|-----------|

<!-- AI: Mức độ: Nghiêm trọng/Lớn/Nhỏ/Đề xuất. Trạng thái: Chưa xử lý/Đang xử lý/Đã sửa/Đã xác nhận/Đóng. -->

## 5. Tài liệu tham khảo

<!-- AI: Liệt kê tài liệu tham chiếu: Thiết kế Cơ bản (API-xxx, SCR-xxx, TBL-xxx), Kế hoạch Kiểm thử (TP-002). -->
