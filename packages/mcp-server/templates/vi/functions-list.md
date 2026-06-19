---
doc_type: functions-list
version: "1.0"
language: vi
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - project-info
  - functions-table
  - summary
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
export_hints:
  excel:
    freeze_row: 1
    auto_width: true
  pdf:
    orientation: landscape
---

<!-- AI: Sử dụng văn phong lịch sự, nhất quán trong toàn tài liệu. -->

# Danh sách chức năng

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

<!-- AI: Liệt kê các bên liên quan sẽ nhận tài liệu (ví dụ: PMO, nhóm phát triển, khách hàng). Định dạng danh sách. -->

## Thuật ngữ <!-- required -->

| Thuật ngữ | Giải thích | Tiếng Anh |
|-----------|-----------|-----------|
<!-- AI: Trích xuất 5-10 thuật ngữ kỹ thuật hoặc nghiệp vụ chính dùng trong tài liệu này. -->

## Thông tin dự án <!-- optional -->
<!-- AI: Điền tên dự án, tên hệ thống, phiên bản, ngày từ cấu hình dự án hoặc hỏi người dùng. -->

| Hạng mục | Nội dung |
|---------|---------|
| Tên dự án | <!-- AI: tên dự án --> |
| Tên hệ thống | <!-- AI: tên hệ thống --> |
| Phiên bản | 1.0 |
| Ngày tạo | <!-- AI: ngày hôm nay YYYY-MM-DD --> |
| Người tạo | <!-- AI: tác giả hoặc "AI Generated" --> |

## Bảng danh sách chức năng <!-- required -->

<!-- AI: Tạo các hàng từ nội dung đầu vào.
     Quy tắc:
     - Dùng phân cấp 3 cấp: Phân loại lớn (hệ thống con) -> Phân loại vừa (nhóm chức năng) -> Chức năng nhỏ (chức năng đơn lẻ)
     - Định dạng ID: F-001, F-002... (tuần tự). Mỗi F-xxx PHẢI ánh xạ tới ít nhất một REQ-xxx qua cột ID yêu cầu liên quan
     - ID yêu cầu liên quan: các ID REQ-xxx từ Đặc tả Yêu cầu mà chức năng này thực hiện, cách nhau bằng dấu phẩy
     - Phân loại xử lý phải là một trong: Nhập liệu / Tra cứu / Biểu mẫu / Batch / API / Sự kiện / Lập lịch / Webhook
     - Độ ưu tiên: Cao / Trung bình / Thấp
     - Độ phức tạp: Cao / Trung bình / Thấp
     - Tên chức năng nên là động từ hành động + đối tượng (ví dụ: Tạo báo giá, Tìm kiếm khách hàng)
     - Tổng quan chức năng: mô tả 1-2 câu (100-200 ký tự)
     - Tạo ít nhất 10 chức năng bao phủ tất cả lĩnh vực chính
     - Nhóm các chức năng liên quan dưới cùng Phân loại lớn/vừa
-->

| STT | Phân loại lớn | Phân loại vừa | ID chức năng | Tên chức năng | Tổng quan chức năng | ID yêu cầu liên quan | Phân loại xử lý | Độ ưu tiên | Độ phức tạp | Ghi chú |
|-----|--------------|--------------|-------------|--------------|--------------------|--------------------|----------------|-----------|------------|---------|
| 1 | <!-- AI --> | <!-- AI --> | <!-- AI: F-001 --> | <!-- AI --> | <!-- AI --> | <!-- AI: REQ-001, REQ-002 --> | <!-- AI: Nhập liệu/Tra cứu/Biểu mẫu/Batch/API/Sự kiện/Lập lịch/Webhook --> | <!-- AI: Cao/Trung bình/Thấp --> | <!-- AI: Cao/Trung bình/Thấp --> | <!-- AI --> |

<!-- AI: Nếu tạo >30 chức năng, chia thành các phần phụ theo Phân loại lớn.
     Mỗi phần phụ: ## Bảng danh sách chức năng — {Tên phân loại lớn} với cùng định dạng 11 cột.
     Giữ đánh số F-xxx tuần tự qua tất cả các bảng phụ. -->

<!-- AI: Các cột bổ sung có thể được yêu cầu trong ngữ cảnh tạo. Nếu có, thêm sau cột Ghi chú. -->

## Tổng hợp <!-- optional -->

<!-- AI: Tạo tổng hợp số lượng sau khi hoàn thành bảng trên. -->

| Hạng mục | Số lượng |
|---------|---------|
| Số phân loại lớn | <!-- AI: đếm --> |
| Số phân loại vừa | <!-- AI: đếm --> |
| Tổng số chức năng | <!-- AI: đếm --> |
| Độ ưu tiên Cao | <!-- AI: đếm --> |
| Độ ưu tiên Trung bình | <!-- AI: đếm --> |
| Độ ưu tiên Thấp | <!-- AI: đếm --> |
| Theo phân loại xử lý | <!-- AI: đếm từng loại (ví dụ: Nhập liệu:3, Tra cứu:2, API:1) --> |
| Độ bao phủ REQ | <!-- AI: số REQ đã khớp/tổng số REQ từ thượng nguồn --> |
