# Hướng dẫn theo Vai trò: Trưởng nhóm Phát triển — Dev Lead

Xem thêm: [Giới thiệu](../01-introduction.md) | [Bắt đầu nhanh (Quick Start)](../03-quick-start.md) | [Quy trình Thiết kế](../04-workflow/02-design.md) | [Team Playbook](../06-team-playbook/index.md)

---

## 1. Vai trò của Dev Lead trong dự án sử dụng Sekkei

Dev Lead tiếp nhận các yêu cầu đã được BA xác thực và chịu trách nhiệm chính cho toàn bộ giai đoạn Thiết kế (Design Phase). Công việc của bạn trải dài từ việc xây dựng **基本設計書 (Thiết kế cơ bản)** cho đến **詳細設計書 (Thiết kế chi tiết)** và **セキュリティ設計書 (Thiết kế bảo mật)**. Bạn đóng vai trò là "kiến trúc sư" thẩm định độ chính xác về mặt kỹ thuật của các đề xuất từ AI.

**Các nhiệm vụ trọng tâm của Dev Lead:**
- Khởi tạo Thiết kế cơ bản dựa trên danh sách yêu cầu và chức năng hiện có.
- Thẩm định các thành phần do AI khởi tạo: SCR-xxx (Thiết kế màn hình), TBL-xxx (Cấu trúc bảng), API-xxx (Các cổng giao tiếp).
- Triển khai song song Thiết kế bảo mật và Thiết kế chi tiết sau khi bản Thiết kế cơ bản đã hoàn thiện.
- Thiết lập chế độ tách file (Split Mode) để quản lý hiệu quả các dự án quy mô lớn (> 20 tính năng).
- Sử dụng công cụ lập kế hoạch thực hiện (`/sekkei:plan` & `/sekkei:implement`).

---

## 2. Các câu lệnh thường dùng

| Câu lệnh | Tình huống sử dụng |
|------|--------------|
| `/sekkei:basic-design` | Khởi tạo Thiết kế cơ bản — "xương sống" của giai đoạn Design. |
| `/sekkei:security-design` | Khởi tạo Thiết kế bảo mật (đối soát OWASP, mô hình hóa mối đe dọa). |
| `/sekkei:detail-design` | Khởi tạo Thiết kế chi tiết (sơ đồ lớp CLS-xxx và logic xử lý sâu). |
| `/sekkei:plan` | Tự động xây dựng lộ trình thực hiện (implementation plan) từ bản thiết kế. |
| `/sekkei:implement` | Thực thi từng giai đoạn trong lộ trình phát triển đã lập. |
| `/sekkei:validate @basic-design` | Kiểm tra tính đồng bộ của các mã ID màn hình, bảng và API. |
| `/sekkei:diff-visual` | So sánh trực quan sự khác biệt giữa hai phiên bản tài liệu. |

---

## 3. Quy trình làm việc tiêu chuẩn

Lộ trình làm việc của Dev Lead: **Xác nhận yêu cầu → Thiết kế cơ bản → Rà soát mã định danh → Thiết kế bảo mật & Chi tiết song song → Xác thực → Chuyển giao QA**.

Bạn bắt đầu bằng việc kiểm tra trạng thái phê duyệt của BA qua lệnh `/sekkei:status`. Sau đó triển khai Thiết kế cơ bản và tập trung rà soát tính hợp lý của kiến trúc dữ liệu cũng như giao diện người dùng. Khi nền tảng đã vững chắc, hãy triển khai song song thiết kế bảo mật và chi tiết để tối ưu thời gian. Bước cuối cùng là chạy lệnh xác thực toàn diện trước khi bàn giao cho đội ngũ QA.

---

## 4. Chế độ tách file (Split Mode) cho dự án lớn

Đối với các dự án có quy mô hơn 20 tính năng, việc lưu trữ tất cả thiết kế trong một file duy nhất sẽ gây khó khăn cho việc quản lý. Bạn nên kích hoạt chế độ tách file trong `sekkei.config.yaml`:

```yaml
output:
  split: true
  split_by: feature   # Tách theo tính năng, module hoặc lớp kiến trúc
```

Khi được kích hoạt, Sekkei sẽ tự động phân tách tài liệu thành các file riêng biệt (như SCR-auth.md, TBL-schema.md...) mà vẫn đảm bảo mọi liên kết mã ID giữa các file luôn nhất quán và chính xác.

---

## 5. Lời khuyên cho Dev Lead

- **Ưu tiên rà soát API đầu tiên**: Các sai sót trong hợp đồng API sẽ dẫn đến sự sai lệch dây chuyền cho kịch bản kiểm thử tích hợp (IT spec) và cả kịch bản kiểm thử nghiệm thu (UAT).
- Sử dụng `/sekkei:diff-visual` ngay khi có thay đổi về yêu cầu để nhận biết tức thì những phần thiết kế bị ảnh hưởng.
- Không nên để Thiết kế bảo mật là bước sau cùng; hãy triển khai nó đồng thời với Thiết kế chi tiết để đảm bảo tính an toàn ngay từ lớp logic.
- Đảm bảo các lớp (CLS-xxx) trong Thiết kế chi tiết tham chiếu chính xác đến các API và bảng dữ liệu đã định nghĩa trong Thiết kế cơ bản.

---

## 6. Danh sách kiểm tra (Checklist) dành cho Dev Lead

- [ ] SCR-xxx: Đầy đủ các màn hình cần thiết, mỗi chức năng chính có ít nhất một màn hình tương ứng.
- [ ] TBL-xxx: Cấu trúc bảng dữ liệu hợp lý, khóa chính/khóa ngoại được định nghĩa rõ ràng.
- [ ] API-xxx: Các cổng giao tiếp RESTful hỗ trợ đầy đủ các thao tác CRUD cần thiết.
- [ ] Thiết kế bảo mật: Các rủi ro tiềm tàng đã được đối soát với danh sách OWASP Top 10.
- [ ] Thiết kế chi tiết: Các đối tượng logic (CLS-xxx) tham chiếu đúng mã ID từ bản Thiết kế cơ bản.
- [ ] Đã kích hoạt Split Mode nếu quy mô dự án vượt ngưỡng thông thường.
- [ ] Lệnh `/sekkei:validate @basic-design` chạy thành công, không có lỗi hệ thống.
- [ ] Bàn giao: Bản Thiết kế cơ bản và Thiết kế chi tiết đã sẵn sàng cho giai đoạn Kiểm thử.
