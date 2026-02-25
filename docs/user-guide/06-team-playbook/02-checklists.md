# Danh sách kiểm tra (Checklists) theo từng giai đoạn

Xem thêm: [Team Playbook](./index.md) | [Kịch bản phối hợp](./01-scenarios.md) | [Review & Phê duyệt](./03-review-and-approval.md)

---

Bạn hãy copy-paste danh sách kiểm tra tương ứng vào công cụ quản lý công việc (Task Tracker) hoặc phần bình luận của Pull Request (PR) khi bắt đầu mỗi giai đoạn của dự án.

---

## Danh sách 0: Thiết lập dự án (Dành cho PM)

*Thực hiện trước khi đội ngũ bắt đầu triển khai các công việc chuyên môn.*

- [ ] Lệnh `sekkei init` đã chạy thành công — File cấu hình `sekkei.config.yaml` đã được khởi tạo.
- [ ] Cấu hình dự án (Tên dự án, loại hình, mức độ kính ngữ **Keigo**) đã phù hợp với đối tượng khách hàng Nhật Bản.
- [ ] Chuỗi phê duyệt (Approval Chain) đã được thiết lập đúng quy trình.
- [ ] Kiểm tra hệ thống bằng lệnh `/sekkei:version` đảm bảo mọi kết nối đều ổn định.
- [ ] Tất cả thành viên trong nhóm đã cài đặt đầy đủ Sekkei skill.
- [ ] Thư mục đầu ra (`workspace-docs/`) đã sẵn sàng.
- [ ] Kho lưu trữ Git đã được khởi tạo và thực hiện bản commit đầu tiên với file cấu hình.

---

## Danh sách 1: Giai đoạn Phân tích hồ sơ thầu (Dành cho Sales + PM)

*Thực hiện ngay khi nhận được hồ sơ RFP từ khách hàng Nhật.*

- [ ] Nội dung đoạn text RFP đảm bảo đầy đủ, không bị thiếu sót thông tin khi đưa vào lệnh `/sekkei:rfp`.
- [ ] Hệ thống đã tự động phân tích và đưa ra danh sách Q&A ban đầu.
- [ ] Sales đã rà soát Q&A: Loại bỏ câu hỏi thừa, bổ sung câu hỏi chuyên môn sâu về nghiệp vụ khách hàng.
- [ ] Danh sách Q&A đã được gửi đi và nhận được phản hồi xác đáng từ phía khách hàng.
- [ ] Toàn bộ câu trả lời của khách hàng đã được nạp vào hệ thống để ghi nhận yêu cầu.
- [ ] Đã thực hiện lệnh `SCOPE_FREEZE` với mức độ tin cậy đạt HIGH hoặc MEDIUM.
- [ ] File chốt phạm vi (`06_scope_freeze.md`) đã được khách hàng ký xác nhận bản PDF.
- [ ] **Bàn giao cho BA:** Đã chuyển giao hồ sơ đề xuất và file chốt phạm vi làm đầu vào.

---

## Danh sách 2: Giai đoạn Xác định yêu cầu (Dành cho BA + PM)

*Bắt đầu triển khai sau khi nhận bàn giao từ đội ngũ Sales.*

- [ ] Khởi tạo thành công **要件定義書 (Định nghĩa yêu cầu)** dựa trên phạm vi đã chốt.
- [ ] Rà soát các mã REQ-xxx: Đảm bảo tính duy nhất, logic mạch lạc và bao phủ toàn bộ yêu cầu khách hàng.
- [ ] Nội dung Định nghĩa yêu cầu khớp hoàn toàn với các biên bản họp và hồ sơ RFP gốc.
- [ ] Đã xây dựng **機能一覧 (Danh sách chức năng)** với cấu trúc phân cấp (Hierarchy) hợp lý.
- [ ] Các mục tiêu trong **非機能要件定義書 (Định nghĩa yêu cầu phi chức năng)** đã có số liệu định lượng cụ thể.
- [ ] PM đã hoàn thiện **プロジェクト計画書 (Kế hoạch dự án)**.
- [ ] Bảng thuật ngữ (Glossary) đã được bổ sung đầy đủ các thuật ngữ nghiệp vụ đặc thù của dự án.
- [ ] Lệnh `/sekkei:validate` chạy thành công cho toàn bộ bộ tài liệu yêu cầu.
- [ ] PM đã rà soát và phê duyệt chốt chặn giai đoạn 1 (Gate 1).
- [ ] **Bàn giao cho Dev Lead:** Toàn bộ bộ tài liệu yêu cầu đã xác thực được chuyển giao chính thức.

---

## Danh sách 3: Giai đoạn Thiết kế hệ thống (Dành cho Dev Lead + PM)

*Bắt đầu sau khi hoàn tất bàn giao từ BA và vượt qua Gate 1.*

- [ ] Đã chạy lệnh khởi tạo **基本設計書 (Thiết kế cơ bản)** làm nền tảng cho hệ thống.
- [ ] Rà soát màn hình (SCR): Đảm bảo đầy đủ các giao diện cần thiết theo luồng nghiệp vụ.
- [ ] Rà soát dữ liệu (TBL): Cấu trúc bảng, khóa chính/ngoại và quan hệ giữa các bảng được thiết kế tối ưu.
- [ ] Rà soát cổng giao tiếp (API): Đạt chuẩn RESTful và hỗ trợ đầy đủ các thao tác nghiệp vụ.
- [ ] Kích hoạt chế độ tách file (Split mode) nếu dự án có quy mô lớn.
- [ ] Triển khai song song **セキュリティ設計書 (Thiết kế bảo mật)** và **詳細設計書 (Thiết kế chi tiết)**.
- [ ] Các sơ đồ lớp (CLS) trong Thiết kế chi tiết tham chiếu chính xác đến mã ID của bảng và API.
- [ ] Các mối đe dọa bảo mật đã được đối soát và ánh xạ vào danh sách OWASP Top 10.
- [ ] Toàn bộ bộ hồ sơ thiết kế đã vượt qua lệnh xác thực hệ thống `/sekkei:validate`.
- [ ] PM đã rà soát và phê duyệt chốt chặn giai đoạn 2 (Gate 2).
- [ ] **Bàn giao cho QA:** Chuyển giao đầy đủ bộ hồ sơ Thiết kế cơ bản, Bảo mật và Chi tiết.

---

## Danh sách 4: Giai đoạn Kiểm thử (Dành cho QA + PM)

*Bắt đầu sau khi nhận bàn giao thiết kế và xác nhận vượt qua Gate 2.*

- [ ] Đã khởi tạo **テスト計画書 (Kế hoạch kiểm thử)** với đầy đủ phạm vi, chiến lược và tiêu chuẩn đầu ra.
- [ ] Đã triển khai đầy đủ các đặc tả kiểm thử: Đơn vị (UT), Tích hợp (IT), Hệ thống (ST) và Nghiệm thu (UAT).
- [ ] BA đã tham gia rà soát các kịch bản kiểm thử nghiệm thu (UAT scenarios) để đảm bảo bám sát yêu cầu khách hàng.
- [ ] Ma trận truy xuất nguồn gốc (Traceability Matrix) đã được khởi tạo thành công.
- [ ] Đảm bảo 100% yêu cầu nghiệp vụ (REQ-xxx) đều có ít nhất một kịch bản kiểm thử tương ứng.
- [ ] Hệ thống báo cáo trạng thái hoàn toàn nhất quán trên toàn chuỗi (Gate 3 - Final Gate).

---

## Danh sách 5: Bàn giao sản phẩm (Delivery)

*Thực hiện sau khi vượt qua tất cả các chốt chặn chất lượng.*

- [ ] Xuất bản toàn bộ bộ hồ sơ đặc tả ra định dạng Excel: Từ Yêu cầu, Thiết kế đến Kiểm thử.
- [ ] Kiểm tra mỗi file Excel đảm bảo có đủ 4 sheet tiêu chuẩn: **Trang bìa (表紙)**, **Lịch sử sửa đổi (改訂履歴)**, **Mục lục (目次)** và **Nội dung chính (本文)**.
- [ ] Thông tin trên Trang bìa (phiên bản, ngày tháng, tên tài liệu) hoàn toàn nhất quán.
- [ ] Đóng gói toàn bộ hồ sơ bản Excel và PDF vào file ZIP với quy tắc đặt tên rõ ràng.
- [ ] PM thực hiện phê duyệt cuối cùng và chính thức gửi hồ sơ cho khách hàng Nhật Bản.

---

## Danh sách 6: Quản lý thay đổi (Change Request)

*Thực hiện mỗi khi phát sinh thay đổi yêu cầu sau khi đã chốt phạm vi.*

- [ ] Nội dung thay đổi được mô tả chi tiết, xác định rõ các mã ID bị ảnh hưởng.
- [ ] Đã thực hiện sao lưu trạng thái dự án (Git checkpoint) trước khi bắt đầu thay đổi.
- [ ] Sơ đồ ảnh hưởng (Impact Graph) đã được tạo và PM đã rà soát tính hợp lý của phạm vi thay đổi.
- [ ] Thực hiện cập nhật lan truyền (Propagation) đầy đủ trên tất cả các tài liệu liên quan.
- [ ] Thông tin thay đổi đã được tự động ghi nhận vào Lịch sử sửa đổi của từng tài liệu.
- [ ] Lệnh xác thực toàn chuỗi chạy thành công sau khi hoàn tất cập nhật.
- [ ] Cập nhật lại Ma trận truy xuất nguồn gốc và xuất bản lại các tài liệu có thay đổi để gửi khách hàng.

---

**Xem thêm:** [Kịch bản phối hợp](./01-scenarios.md) | [Review & Phê duyệt](./03-review-and-approval.md)
 Proudly presented by Antigravity.
 Proudly presented by Antigravity.
