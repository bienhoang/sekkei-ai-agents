---
doc_type: test-plan
version: "1.0"
language: vi
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - test-policy
  - test-strategy
  - test-environment
  - test-schedule
  - organization-roles
  - risks-countermeasures
  - completion-criteria
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Sử dụng văn phong nhất quán trong toàn tài liệu. -->

# Tài liệu Kế hoạch Kiểm thử

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
<!-- AI: Trích xuất 5-10 thuật ngữ kiểm thử chính: kiểm thử đơn vị, kiểm thử tích hợp, kiểm thử hệ thống, kiểm thử chấp nhận, tiêu chí vào/ra, lỗi, độ bao phủ kiểm thử, v.v. -->

## 1. Chính sách kiểm thử <!-- required -->

<!-- AI: Nêu chính sách kiểm thử tổng thể. Bao gồm: mục đích kiểm thử, mục tiêu chất lượng (tỷ lệ phát hiện lỗi, mục tiêu độ bao phủ), phương pháp tiếp cận (dựa trên rủi ro, dựa trên yêu cầu), tiêu chuẩn kiểm thử áp dụng. Tham chiếu REQ-xxx và F-xxx từ tài liệu thượng nguồn. -->

## 2. Chiến lược kiểm thử <!-- required -->

<!-- Mermaid: flowchart LR test levels progression UT to IT to ST to UAT with entry/exit gates -->

### 2.1 Phạm vi kiểm thử

<!-- AI: Định nghĩa phạm vi kiểm thử. Liệt kê những gì TRONG phạm vi và NGOÀI phạm vi. Tham chiếu F-xxx từ Danh sách chức năng và REQ-xxx từ Đặc tả Yêu cầu. -->

### 2.2 Mức kiểm thử và tiêu chí vào/ra

<!-- AI: Định nghĩa các mức kiểm thử với tiêu chí vào/ra. Ánh xạ tới ID UT-xxx, IT-xxx, ST-xxx, UAT-xxx. -->

| TP-ID | Mức kiểm thử | Tiêu chí vào | Tiêu chí ra | Người phụ trách | Công cụ |
|-------|------------|------------|-----------|----------------|--------|
| TP-001 | Kiểm thử đơn vị (UT) | <!-- AI: ví dụ, hoàn thành coding, hoàn thành code review --> | <!-- AI: ví dụ, độ bao phủ >= 80%, 0 lỗi nghiêm trọng --> | Lập trình viên | <!-- AI: ví dụ, Jest, JUnit --> |
| TP-002 | Kiểm thử tích hợp (IT) | <!-- AI: ví dụ, đạt tiêu chí ra UT --> | <!-- AI: ví dụ, tất cả ca kiểm thử tích hợp đạt --> | Lập trình viên | <!-- AI --> |
| TP-003 | Kiểm thử hệ thống (ST) | <!-- AI: ví dụ, đạt tiêu chí ra IT --> | <!-- AI: ví dụ, tất cả ca ST đạt, 0 lỗi nghiêm trọng --> | Nhóm kiểm thử | <!-- AI --> |
| TP-004 | Kiểm thử chấp nhận (UAT) | <!-- AI: ví dụ, đạt tiêu chí ra ST --> | <!-- AI: ví dụ, nhận được phê duyệt của khách hàng --> | Khách hàng · PMO | <!-- AI --> |

### 2.3 Kỹ thuật kiểm thử

<!-- AI: Mô tả kỹ thuật kiểm thử sẽ sử dụng: kiểm thử hộp đen, kiểm thử hộp trắng, phân tích giá trị biên, phân hoạch tương đương, bảng quyết định, kiểm thử khám phá. -->

## 3. Môi trường kiểm thử <!-- required -->

<!-- AI: Chi tiết môi trường kiểm thử. Bao gồm: sơ đồ cấu hình môi trường (phát triển/kiểm thử/sản xuất), yêu cầu phần cứng và phần mềm, chính sách dữ liệu kiểm thử (có dùng dữ liệu thật không, có cần ẩn danh hóa không), danh sách công cụ. -->

## 4. Lịch trình kiểm thử <!-- optional -->

<!-- AI: Định nghĩa lịch trình kiểm thử căn chỉnh với kế hoạch dự án PP-xxx. Bao gồm: ngày bắt đầu/kết thúc dự kiến cho từng mức kiểm thử, cột mốc, khoảng đệm. Định dạng bảng hoặc tham chiếu Gantt. -->

<!-- Mermaid: gantt test schedule by level with milestones -->

## 5. Tổ chức và vai trò <!-- optional -->

<!-- AI: Định nghĩa cơ cấu nhóm kiểm thử. Bao gồm: quản lý kiểm thử, trưởng nhóm kiểm thử, kiểm thử viên, lập trình viên, người phụ trách phía khách hàng, vai trò và trách nhiệm. Định dạng bảng: | Vai trò | Họ tên/Nhóm | Phạm vi trách nhiệm | -->

## 6. Rủi ro và biện pháp đối phó <!-- optional -->

<!-- AI: Xác định rủi ro kiểm thử và biện pháp đối phó. Định dạng bảng:
| ID rủi ro | Nội dung rủi ro | Xác suất | Mức độ ảnh hưởng | Biện pháp đối phó |
Xem xét: chậm tiến độ, thiếu dữ liệu kiểm thử, chậm dựng môi trường, thiếu kỹ năng. -->

## 7. Tiêu chí hoàn thành <!-- required -->

<!-- AI: Định nghĩa tiêu chí hoàn thành kiểm thử tổng thể. Bao gồm: hoàn thành thực hiện tất cả ca kiểm thử, giới hạn số lỗi còn lại (theo mức độ nghiêm trọng), tỷ lệ đạt độ bao phủ kiểm thử, nhận được phê duyệt của khách hàng. Tất cả tiêu chí phải đo lường được với con số cụ thể. -->

## 8. Tài liệu tham khảo <!-- optional -->

<!-- AI: Liệt kê tài liệu tham chiếu: Đặc tả Yêu cầu (REQ-xxx), Danh sách chức năng (F-xxx), Đặc tả Yêu cầu Phi Chức năng (NFR-xxx), Kế hoạch Dự án (PP-xxx). -->
