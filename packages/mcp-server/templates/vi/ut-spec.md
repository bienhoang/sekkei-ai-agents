---
doc_type: ut-spec
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

# Tài liệu Đặc tả Kiểm thử Đơn vị

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
<!-- AI: Trích xuất 5-10 thuật ngữ chính: trường hợp bình thường, trường hợp bất thường, giá trị biên, stub, mock, độ bao phủ, lỗi, v.v. -->

## 1. Thiết kế kiểm thử <!-- required -->

<!-- AI: Mô tả phương pháp thiết kế kiểm thử đơn vị cho module/lớp này. Bao gồm: danh sách module/lớp đối tượng (ID CLS-xxx từ Thiết kế Chi tiết), kỹ thuật kiểm thử (hộp trắng, phân tích giá trị biên, phân hoạch tương đương), mục tiêu độ bao phủ (statement/branch), framework kiểm thử, phương châm stub và mock. Tham chiếu DD-xxx từ Thiết kế Chi tiết. -->

## 2. Ca kiểm thử đơn vị <!-- required -->

<!-- AI: Tạo ca kiểm thử cho từng module/lớp (CLS-xxx). Quan điểm kiểm thử PHẢI bao gồm: trường hợp bình thường (luồng bình thường), trường hợp bất thường (xử lý lỗi/ngoại lệ), giá trị biên (giá trị biên). Tạo ít nhất 5 ca kiểm thử mỗi module. Định dạng ID: UT-001, UT-002... -->

| STT | ID ca kiểm thử | Đối tượng kiểm thử | Quan điểm kiểm thử | Điều kiện tiên quyết | Quy trình kiểm thử | Giá trị đầu vào | Kết quả mong đợi | Kết quả thực hiện | Đánh giá | ID lỗi | Ghi chú |
|-----|-------------|-----------------|-----------------|------------------|--------------------|---------------|----------------|-----------------|---------|-------|---------|
| 1 | UT-001 | <!-- AI: phương thức CLS-xxx --> | Trường hợp bình thường | <!-- AI: điều kiện tiên quyết --> | <!-- AI: các bước --> | <!-- AI: đầu vào --> | <!-- AI: kết quả mong đợi --> | <!-- AI: để trống --> | <!-- AI: để trống --> | <!-- AI: để trống --> | <!-- AI --> |
| 2 | UT-002 | <!-- AI: phương thức CLS-xxx --> | Trường hợp bất thường | <!-- AI --> | <!-- AI --> | <!-- AI: đầu vào không hợp lệ --> | <!-- AI: lỗi mong đợi --> | | | | <!-- AI --> |
| 3 | UT-003 | <!-- AI: phương thức CLS-xxx --> | Giá trị biên | <!-- AI --> | <!-- AI --> | <!-- AI: giá trị biên --> | <!-- AI: kết quả mong đợi --> | | | | <!-- AI --> |

<!-- AI: Tiếp tục thêm hàng cho tất cả module. Tối thiểu 5 ca mỗi CLS-xxx. Bao phủ: trường hợp bình thường, trường hợp bất thường (null/chuỗi rỗng/sai kiểu), giá trị biên (giá trị tối thiểu/tối đa/±1). -->

## 3. Truy vết <!-- required -->

<!-- AI: Ánh xạ ca kiểm thử tới các artifact thiết kế. Hướng truy vết: DD-xxx → CLS-xxx → UT-xxx. -->

| DD-ID | CLS-ID | UT-ID | Quan điểm kiểm thử | Ghi chú |
|-------|-------|-------|-----------------|---------|
| <!-- AI: DD-xxx --> | <!-- AI: CLS-xxx --> | <!-- AI: UT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Đảm bảo mỗi CLS-xxx từ Thiết kế Chi tiết có ít nhất một UT-xxx. Thiếu truy vết = khoảng trống kiểm thử. -->

## 4. Báo cáo lỗi <!-- required -->

<!-- AI: Để phần này gần như trống — được điền trong quá trình thực hiện kiểm thử. Chỉ cung cấp tiêu đề bảng. -->

| ID lỗi | ID ca kiểm thử | Mức độ | Ngày phát hiện | Nội dung | Nguyên nhân | Ngày sửa | Trạng thái |
|-------|-------------|-------|--------------|---------|------------|---------|-----------|

<!-- AI: Mức độ: Nghiêm trọng/Lớn/Nhỏ/Đề xuất. Trạng thái: Chưa xử lý/Đang xử lý/Đã sửa/Đã xác nhận/Đóng. -->

## 5. Tài liệu tham khảo

<!-- AI: Liệt kê tài liệu tham chiếu: Thiết kế Chi tiết (DD-xxx, CLS-xxx), Kế hoạch Kiểm thử (TP-001). -->
