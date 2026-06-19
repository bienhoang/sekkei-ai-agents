---
doc_type: nfr
version: "1.0"
language: vi
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - overview
  - availability
  - performance-scalability
  - operability-maintainability
  - migration
  - security
  - environment-ecology
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI: Sử dụng văn phong lịch sự, nhất quán trong toàn tài liệu. -->

# Tài liệu Đặc tả Yêu cầu Phi Chức năng

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
<!-- AI: Trích xuất 5-10 thuật ngữ kỹ thuật chính. Bao gồm RTO, RPO, SLA, TLS, v.v. nếu áp dụng. -->

## 1. Tổng quan yêu cầu phi chức năng <!-- required -->

<!-- AI: Tóm tắt phạm vi và cách tiếp cận yêu cầu phi chức năng cho hệ thống này. Tham chiếu các ID REQ-xxx từ Đặc tả Yêu cầu là cơ sở của các NFR này. Mô tả phạm vi phủ 6 danh mục IPA NFUG. -->

## 2. Tiêu chuẩn cấp độ IPA <!-- reference -->

<!-- AI: Chọn cấp độ phù hợp cho từng danh mục NFR bên dưới. Sử dụng làm cơ sở cho Giá trị mục tiêu ở Mục 3. Cấp độ từ IPA NFUG (Non-Functional Requirements Utilization Guide). -->

### Cấp độ Tính sẵn sàng

| Cấp độ | Tỷ lệ hoạt động | RTO | RPO | Ví dụ áp dụng |
|--------|----------------|-----|-----|---------------|
| A (Cao nhất) | 99.999% (5 phút/năm) | Vài phút | 0 (không mất dữ liệu) | Tài chính cốt lõi, y tế |
| B (Cao) | 99.99% (53 phút/năm) | Trong 1 giờ | Vài phút | EC, SaaS, chính phủ |
| C (Tiêu chuẩn) | 99.9% (8.8 giờ/năm) | Trong 4 giờ | 1 giờ | Nghiệp vụ nội bộ, BtoB |
| D (Thấp) | 99% (3.7 ngày/năm) | Trong 24 giờ | 24 giờ | Hệ thống thông tin, chỉ đọc |

### Cấp độ Hiệu năng

| Cấp độ | Thời gian phản hồi (P95) | Kết nối đồng thời | Throughput | Ví dụ áp dụng |
|--------|------------------------|-----------------|-----------|---------------|
| A (Cao nhất) | Trong 0.5 giây | 10,000+ | 1,000 TPS+ | Giao dịch tần suất cao, thời gian thực |
| B (Cao) | Trong 2 giây | 1,000-10,000 | 100-1,000 TPS | EC, SaaS |
| C (Tiêu chuẩn) | Trong 5 giây | 100-1,000 | 10-100 TPS | Nghiệp vụ nội bộ |
| D (Thấp) | Trong 10 giây | ~100 | ~10 TPS | Batch trung tâm, ít người dùng |

### Cấp độ Bảo mật

| Cấp độ | Xác thực | Mã hóa | Nhật ký kiểm toán | Ví dụ áp dụng |
|--------|---------|--------|-----------------|---------------|
| A (Cao nhất) | MFA bắt buộc + sinh trắc học | AES-256 + TLS 1.3 | Chống giả mạo + lưu 7 năm | Tài chính, quốc phòng, y tế |
| B (Cao) | MFA khuyến nghị + SSO | AES-256 + TLS 1.2+ | Mã hóa + lưu 3 năm | Chính phủ, EC |
| C (Tiêu chuẩn) | Mật khẩu + SSO | TLS 1.2+ | Lưu 1 năm | BtoB thông thường |
| D (Thấp) | Xác thực mật khẩu | TLS 1.2+ | Lưu 90 ngày | Công cụ nội bộ |

<!-- AI: Chọn một cấp độ cho mỗi danh mục. Tham chiếu cấp độ đã chọn khi điền Giá trị mục tiêu ở Mục 3. -->

## 3. Danh sách yêu cầu phi chức năng <!-- required -->

<!-- AI: Mỗi NFR PHẢI có Giá trị mục tiêu bằng số. TUYỆT ĐỐI không dùng thuật ngữ mơ hồ: nhanh, đủ, phù hợp, cao, tốt. Dùng con số cụ thể (ví dụ: 99.9%, trong 2 giây, 1000 kết nối đồng thời, trong 4 giờ). Ánh xạ tới REQ-xxx từ Đặc tả Yêu cầu. -->

| NFR-ID | Danh mục | Tên yêu cầu | Giá trị mục tiêu | Phương pháp đo | Độ ưu tiên |
|--------|---------|------------|-----------------|---------------|-----------|
| NFR-001 | Tính sẵn sàng | <!-- AI: tên yêu cầu --> | <!-- AI: ví dụ, tỷ lệ hoạt động >= 99.9% --> | <!-- AI: phương pháp đo --> | Cao |
| NFR-002 | Hiệu năng・Khả năng mở rộng | <!-- AI --> | <!-- AI: ví dụ, thời gian phản hồi P95 <= 2 giây --> | <!-- AI --> | Cao |
| NFR-003 | Vận hành・Bảo trì | <!-- AI --> | <!-- AI: ví dụ, phát hiện sự cố trong 5 phút --> | <!-- AI --> | Trung bình |
| NFR-004 | Tính chuyển đổi | <!-- AI --> | <!-- AI: ví dụ, thời gian chuyển đổi <= 2 tuần --> | <!-- AI --> | Trung bình |
| NFR-005 | Bảo mật | <!-- AI --> | <!-- AI: ví dụ, TLS 1.3 trở lên --> | <!-- AI --> | Cao |
| NFR-006 | Môi trường hệ thống・sinh thái | <!-- AI --> | <!-- AI: ví dụ, CPU <= 70% khi hoạt động bình thường --> | <!-- AI --> | Thấp |

## 4. Tính sẵn sàng <!-- required -->

<!-- AI: Chi tiết yêu cầu tính sẵn sàng. Tham chiếu cấp độ đã chọn ở Mục 2. Bao gồm: mục tiêu tỷ lệ hoạt động, RTO, RPO, thời gian dừng có kế hoạch, phương châm vận hành thu hẹp khi có sự cố. Tất cả giá trị phải bằng số. -->

## 5. Hiệu năng・Khả năng mở rộng <!-- required -->

<!-- AI: Chi tiết yêu cầu hiệu năng và khả năng mở rộng. Tham chiếu cấp độ đã chọn ở Mục 2. Bao gồm: thời gian phản hồi (P50/P95/P99), throughput, kết nối đồng thời, giới hạn dữ liệu, điều kiện scale-out. Tất cả giá trị bằng số. -->

## 6. Vận hành・Bảo trì <!-- required -->

<!-- AI: Chi tiết yêu cầu vận hành và bảo trì. Bao gồm: thời gian phản hồi giám sát và cảnh báo, thời gian lưu log, tần suất và thời gian lưu sao lưu, thời gian triển khai, mục tiêu MTTR. Tất cả giá trị bằng số. -->

## 7. Tính chuyển đổi <!-- required -->

<!-- AI: Chi tiết yêu cầu chuyển đổi. Bao gồm: thời gian chuyển đổi, phương thức chuyển đổi dữ liệu, phương pháp xác minh tính nhất quán dữ liệu, thời gian vận hành song song, quy trình rollback. Nếu không cần chuyển đổi, ghi rõ hệ thống mới hoàn toàn không có hệ thống cũ. -->

## 8. Bảo mật <!-- required -->

<!-- AI: Chi tiết yêu cầu bảo mật. Tham chiếu cấp độ đã chọn ở Mục 2. Bao gồm: phương thức xác thực, phương thức mã hóa (phiên bản TLS), chính sách mật khẩu, thời gian lưu nhật ký truy cập, tần suất quét lỗ hổng. Tham chiếu ID REQ-xxx và NFR-xxx. -->

## 9. Môi trường hệ thống <!-- required -->

<!-- AI: Chi tiết yêu cầu môi trường hệ thống. Bao gồm: thông số máy chủ tối thiểu, phiên bản OS và middleware, mục tiêu PUE, giới hạn sử dụng CPU/bộ nhớ, yêu cầu region cloud. Nếu không áp dụng, ghi rõ lý do. -->

## 10. Tài liệu tham khảo <!-- optional -->

<!-- AI: Liệt kê tài liệu tham chiếu: Đặc tả Yêu cầu (REQ-xxx), hướng dẫn IPA NFUG, tiêu chuẩn liên quan. -->
