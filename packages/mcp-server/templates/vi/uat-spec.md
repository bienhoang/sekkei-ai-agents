---
doc_type: uat-spec
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

# Tài liệu Đặc tả Kiểm thử Chấp nhận

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
<!-- AI: Trích xuất 5-10 thuật ngữ chính: tiêu chí chấp nhận, kịch bản nghiệp vụ, vai trò người dùng, ký duyệt, lỗi, v.v. -->

## 1. Thiết kế kiểm thử <!-- required -->

<!-- AI: Mô tả phương pháp thiết kế UAT. Tập trung vào kịch bản nghiệp vụ từ góc nhìn người dùng — KHÔNG phải phạm vi chức năng kỹ thuật. Bao gồm: mục đích kiểm thử (xác nhận đáp ứng yêu cầu nghiệp vụ), người tham gia (người dùng nghiệp vụ thực tế, PMO, người phụ trách phía khách hàng), môi trường kiểm thử (tương đương sản xuất), phương châm dữ liệu kiểm thử (dùng dữ liệu gần với dữ liệu nghiệp vụ thực tế), quy trình ký duyệt. Tham chiếu REQ-xxx từ Đặc tả Yêu cầu, NFR-xxx từ Đặc tả Yêu cầu Phi Chức năng. -->

## 2. Ca kiểm thử chấp nhận <!-- required -->

<!-- AI: Tạo ca kiểm thử UAT dưới dạng kịch bản nghiệp vụ viết bằng ngôn ngữ người dùng. Định dạng ID: UAT-001, UAT-002... Quan điểm kiểm thử: đạt được kịch bản nghiệp vụ, tính khả dụng, chấp nhận phi chức năng (hiệu năng/tính sẵn sàng). KHÔNG giới hạn trong từng chức năng — viết từ góc nhìn nghiệp vụ của người dùng cuối. -->

| STT | ID ca kiểm thử | Đối tượng kiểm thử | Quan điểm kiểm thử | Điều kiện tiên quyết | Quy trình kiểm thử | Giá trị đầu vào | Kết quả mong đợi | Kết quả thực hiện | Đánh giá | ID lỗi | Ghi chú |
|-----|-------------|-----------------|-----------------|------------------|--------------------|---------------|----------------|-----------------|---------|-------|---------|
| 1 | UAT-001 | <!-- AI: kịch bản nghiệp vụ REQ-xxx --> | Kịch bản nghiệp vụ | <!-- AI: điều kiện tiên quyết nghiệp vụ bằng ngôn ngữ người dùng --> | <!-- AI: các bước từ góc nhìn người dùng, không dùng thuật ngữ kỹ thuật --> | <!-- AI: đầu vào người dùng --> | <!-- AI: kết quả nghiệp vụ mong đợi --> | | | | <!-- AI --> |
| 2 | UAT-002 | <!-- AI: chấp nhận phi chức năng NFR-xxx --> | Chấp nhận phi chức năng | <!-- AI --> | <!-- AI: các bước quan sát được từ người dùng --> | <!-- AI --> | <!-- AI: giá trị mục tiêu NFR-xxx --> | | | | <!-- AI --> |
| 3 | UAT-003 | <!-- AI: kịch bản REQ-xxx khác --> | Kịch bản nghiệp vụ | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | | | | <!-- AI --> |

<!-- AI: Viết tất cả bước kiểm thử và kết quả mong đợi bằng ngôn ngữ nghiệp vụ đơn giản, không dùng thuật ngữ kỹ thuật, người dùng không có chuyên môn kỹ thuật vẫn hiểu được. Bao phủ: kịch bản nghiệp vụ chính (theo từng REQ-xxx), tiêu chí chấp nhận phi chức năng (xác nhận giá trị mục tiêu NFR-xxx từ góc nhìn người dùng), trải nghiệm người dùng khi có lỗi (thông báo lỗi dễ hiểu), khả năng truy cập và tính khả dụng. -->

## 3. Truy vết <!-- required -->

<!-- AI: Ánh xạ ca kiểm thử tới yêu cầu. Hướng truy vết: REQ-xxx → NFR-xxx → UAT-xxx. -->

| REQ-ID | NFR-ID | UAT-ID | Quan điểm kiểm thử | Ghi chú |
|--------|-------|--------|-----------------|---------|
| <!-- AI: REQ-xxx --> | <!-- AI: NFR-xxx hoặc N/A --> | <!-- AI: UAT-xxx --> | <!-- AI --> | <!-- AI --> |

<!-- AI: Đảm bảo mỗi REQ-xxx từ Đặc tả Yêu cầu có ít nhất một UAT-xxx. Cũng ánh xạ tiêu chí chấp nhận NFR-xxx tới UAT-xxx. Thiếu truy vết = khoảng trống chấp nhận. -->

## 4. Báo cáo lỗi <!-- required -->

<!-- AI: Để phần này gần như trống — được điền trong quá trình thực hiện kiểm thử. Chỉ cung cấp tiêu đề bảng. -->

| ID lỗi | ID ca kiểm thử | Mức độ | Ngày phát hiện | Nội dung | Nguyên nhân | Ngày sửa | Trạng thái |
|-------|-------------|-------|--------------|---------|------------|---------|-----------|

<!-- AI: Mức độ: Nghiêm trọng/Lớn/Nhỏ/Đề xuất. Trạng thái: Chưa xử lý/Đang xử lý/Đã sửa/Đã xác nhận/Đóng. -->

## 5. Ký duyệt

<!-- AI: Cung cấp phần ký duyệt chấp nhận cuối cùng. Để trống họ tên và ngày cho con người điền. -->

| Hạng mục | Kết quả | Người phụ trách | Ngày | Ghi chú |
|---------|--------|----------------|------|---------|
| Tất cả ca UAT đạt | | | | |
| Không còn lỗi nghiêm trọng | | | | |
| Nhận được phê duyệt của khách hàng | | | | |
| Phê duyệt phát hành lên sản xuất | | | | |

## 6. Tài liệu tham khảo

<!-- AI: Liệt kê tài liệu tham chiếu: Đặc tả Yêu cầu (REQ-xxx), Đặc tả Yêu cầu Phi Chức năng (NFR-xxx), Kế hoạch Kiểm thử (TP-004). -->
