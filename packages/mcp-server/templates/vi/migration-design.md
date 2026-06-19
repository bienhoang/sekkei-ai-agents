---
doc_type: migration-design
version: "1.0"
language: vi
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - migration-strategy
  - data-migration-plan
  - system-cutover
  - rollback-plan
  - migration-test-plan
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Sử dụng văn phong nhất quán trong toàn tài liệu. -->

# Tài liệu Thiết kế Chuyển đổi

## Lịch sử sửa đổi <!-- required -->

| Phiên bản | Ngày | Nội dung thay đổi | Người thay đổi |
|-----------|------|-------------------|----------------|
| 1.0  | YYYY-MM-DD | Tạo phiên bản đầu | <!-- AI: Tên tác giả --> |

## Phê duyệt <!-- required -->

| Vai trò | Họ tên | Ngày |
|---------|--------|------|
| Người tạo | | |
| Người kiểm tra | | |
| Người phê duyệt | | |

## Kiểm duyệt

| Giai đoạn review | Người review | Ngày review | Số vấn đề | Kết quả |
|-----------------|-------------|------------|-----------|---------|
| Review lần 1 | | | | |
| Review lần 2 | | | | |
| Phê duyệt cuối | | | | |

## Nơi phân phối <!-- required -->

<!-- AI: Liệt kê các bên liên quan: PMO, nhóm phát triển, nhóm hạ tầng, nhóm vận hành, người phụ trách phía khách hàng. -->

## Thuật ngữ <!-- required -->

| Thuật ngữ | Giải thích | Tiếng Anh |
|-----------|-----------|-----------|
<!-- AI: Trích xuất 5-10 thuật ngữ chuyển đổi chính dùng trong tài liệu này. -->

## 1. Chính sách chuyển đổi <!-- required -->

<!-- AI: Định nghĩa chiến lược chuyển đổi tổng thể.
     Bao gồm: phương pháp chuyển đổi (big bang / theo giai đoạn / vận hành song song),
     mốc thời gian, tiêu chí thành công, điểm quyết định go/no-go.
     Tham chiếu ID REQ-xxx cho yêu cầu chuyển đổi. -->

### 1.1 Phương pháp chuyển đổi
<!-- AI: Big bang / Chuyển đổi theo giai đoạn / Vận hành song song — giải thích lý do chọn. -->

### 1.2 Lịch trình chuyển đổi
<!-- AI: Mốc thời gian với các điểm kiểm tra và quyết định go/no-go. -->

<!-- Mermaid: gantt migration schedule with milestones and go/no-go checkpoints -->

## 2. Kế hoạch chuyển đổi dữ liệu <!-- required -->

<!-- AI: Ghi lại các bước chuyển đổi dữ liệu.
     Định dạng ID: MIG-001, MIG-002...
     Tham chiếu ID TBL-xxx từ thiết kế cơ bản cho bảng đích. -->

| MIG-ID | Dữ liệu mục tiêu | Nguồn | Đích | Phương pháp chuyển đổi | Khối lượng dữ liệu | Phương pháp xác minh | Người phụ trách |
|--------|----------------|-------|------|---------------------|-----------------|---------------------|----------------|
| MIG-001 | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI: ETL/SQL/Thủ công --> | <!-- AI --> | <!-- AI --> | <!-- AI --> |

### 2.1 Ánh xạ dữ liệu
<!-- AI: Ánh xạ trường từ nguồn sang đích cho các bảng chính.
     Bao gồm quy tắc chuyển đổi kiểu dữ liệu và giá trị mặc định. -->

### 2.2 Làm sạch dữ liệu
<!-- AI: Quy tắc làm sạch dữ liệu không hợp lệ/trùng lặp trước khi chuyển đổi. -->

## 3. Quy trình chuyển đổi hệ thống <!-- required -->

<!-- AI: Quy trình chuyển đổi từng bước với ước tính thời gian.
     Bao gồm: kiểm tra trước khi chuyển đổi, chuyển đổi DNS, khởi động lại dịch vụ, xác minh sau chuyển đổi. -->

<!-- Mermaid: flowchart TD system cutover procedure with rollback decision points -->

| Thứ tự | Nội dung công việc | Người phụ trách | Thời gian cần | Điểm xác nhận |
|-------|-----------------|----------------|-------------|-------------|
<!-- AI: Điền các bước chuyển đổi theo thứ tự thời gian -->

## 4. Kế hoạch rollback <!-- required -->

<!-- AI: BẮT BUỘC: Quy trình rollback từng bước.
     Bao gồm: điều kiện kích hoạt, các bước rollback, ước tính thời gian, phục hồi dữ liệu.
     Mỗi bước phải có ước tính thời gian. -->

### 4.1 Tiêu chí quyết định rollback
<!-- AI: Điều kiện kích hoạt rollback (ví dụ: tỷ lệ lỗi > 5%, phát hiện mất dữ liệu). -->

### 4.2 Quy trình rollback

<!-- Mermaid: flowchart TD rollback decision and execution flow -->

| Thứ tự | Nội dung công việc | Người phụ trách | Thời gian cần | Lưu ý |
|-------|-----------------|----------------|-------------|------|
<!-- AI: Điền các bước rollback theo thứ tự ngược -->

## 5. Kế hoạch kiểm thử chuyển đổi <!-- required -->

<!-- AI: Định nghĩa chiến lược kiểm thử chuyển đổi.
     Bao gồm: môi trường kiểm thử, chuẩn bị dữ liệu kiểm thử, tiêu chí xác minh.
     Tham chiếu ID TBL-xxx cho đối tượng xác minh dữ liệu. -->

| ID kiểm thử | Đối tượng kiểm thử | Nội dung kiểm thử | Kết quả mong đợi | Tiêu chí đánh giá |
|-----------|-----------------|-----------------|----------------|----------------|
<!-- AI: Điền ca kiểm thử chuyển đổi -->
