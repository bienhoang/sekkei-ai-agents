# Hướng dẫn theo Vai trò: Kinh doanh & Tư vấn Giải pháp — Sales / Presales

Xem thêm: [Giới thiệu](../01-introduction.md) | [Bắt đầu nhanh (Quick Start)](../03-quick-start.md) | [Tài liệu bổ trợ](../04-workflow/04-supplementary.md) | [Team Playbook](../06-team-playbook/index.md)

---

## 1. Vai trò của Sales/Presales trong dự án sử dụng Sekkei

Đội ngũ Sales/Presales sử dụng Sekkei chủ yếu ở **giai đoạn trước khi ký kết hợp đồng**. Công việc của bạn tập trung vào việc phân tích các hồ sơ yêu cầu (RFP) từ phía Nhật Bản, thực hiện Q&A để làm rõ các điểm chưa tường minh, chốt phạm vi dự án (scope freeze) và trực tiếp trình diễn (demo) bộ tài liệu đặc tả chất lượng cao để thuyết phục khách hàng. Sau khi phạm vi đã được thống nhất, bạn sẽ thực hiện bàn giao lại cho BA để bắt đầu giai đoạn Định nghĩa yêu cầu chính thức.

**Các nhiệm vụ trọng tâm của Sales/Presales:**
- Sử dụng **RFP Workspace** để phân tích hồ sơ thầu và tự động khởi tạo danh sách Q&A.
- Trao đổi trực tiếp với khách hàng để làm rõ các yêu cầu nghiệp vụ còn thiếu sót.
- Chốt và đóng băng phạm vi (scope) trước khi ký hợp đồng chính thức.
- Trình diễn tài liệu thông qua preview server và xuất bản file PDF chuyên nghiệp.
- Bàn giao hồ sơ đề xuất (proposal) đã được khách hàng xác nhận cho đội ngũ BA.

---

## 2. Các câu lệnh thường dùng

| Câu lệnh | Tình huống sử dụng |
|------|--------------|
| `/sekkei:rfp` | Khởi động không gian làm việc RFP — xử lý file hoặc nội dung text của hồ sơ thầu. |
| `/sekkei:export @doc --format=pdf` | Xuất bản file PDF phục vụ việc trình bày hoặc gửi khách hàng xem xét. |
| `/sekkei:translate` | Dịch thuật tài liệu sang tiếng Anh cho các bên liên quan nội bộ. |
| `/sekkei:preview` | Khởi động máy chủ xem trước (preview) để trình diễn giao diện tài liệu trực quan. |
| `sekkei doctor` | Kiểm tra trạng thái hệ thống và độ ổn định trước khi trình diễn khách hàng. |

---

## 3. Quy trình làm việc với RFP (RFP Workflow)

Đây là quy trình quan trọng nhất dành riêng cho Sales/Presales, giúp rút ngắn thời gian phản hồi khách hàng:

### Bước 1: Tiếp nhận và Phân tích RFP
Bạn có thể đưa toàn bộ nội dung RFP vào hệ thống bằng cách đính kèm file hoặc dán trực tiếp đoạn văn bản. Sekkei sẽ bắt đầu phân tích cấu trúc và logic của yêu cầu.

### Bước 2: Tự động khởi tạo Q&A
Hệ thống sẽ chuyển sang giai đoạn `QNA_GENERATION`, tự động liệt kê các câu hỏi nghiệp vụ cần làm rõ (Ví dụ: "Hệ thống có cần tích hợp phần mềm hiện có không?", "Số lượng người dùng đồng thời kỳ vọng là bao nhiêu?"). Bạn cần rà soát lại danh sách này, loại bỏ các câu hỏi thừa và bổ sung các câu hỏi chuyên sâu trước khi gửi cho khách hàng.

### Bước 3: Phản hồi từ Khách hàng
Khi khách hàng trả lời các câu hỏi, bạn dán nội dung đó vào hệ thống để Sekkei cập nhật lại cơ sở dữ liệu yêu cầu.

### Bước 4: Soạn thảo đề xuất và Chốt phạm vi (Scope Freeze)
Hệ thống sẽ dự thảo bản đề xuất kỹ thuật (Proposal) và xác định phạm vi công việc. Sau khi khách hàng đồng ý, bạn thực hiện lệnh `SCOPE_FREEZE`. Sekkei sẽ đánh giá mức độ tin cậy (Confidence Level) của giải pháp và khởi tạo file chốt phạm vi chính thức.

### Navigation Keywords

Trong suốt quá trình làm việc với RFP Workspace, bạn có thể sử dụng các từ khóa sau:

| Keyword | Tác dụng |
|---------|----------|
| `SHOW` | Hiển thị trạng thái hiện tại của giai đoạn và nội dung liên quan. |
| `BUILD_NOW` | Bỏ qua bước Q&A, tạo đề xuất ngay lập tức từ RFP gốc. |
| `SKIP_QNA` | Bỏ qua giai đoạn Q&A, chuyển thẳng sang giai đoạn soạn thảo đề xuất (DRAFTING). |
| `BACK` | Quay lại giai đoạn trước đó. |

### Output Files

Tất cả các tài liệu đầu ra được lưu trữ tại thư mục `workspace-docs/01-rfp/<project-name>/`:

```
01_raw_rfp.md          — Hồ sơ RFP gốc đã được phân tích.
02_analysis.md         — Phân tích các yêu cầu từ RFP.
03_qna.md              — Danh sách các câu hỏi Q&A đã được tạo.
04_client_answers.md   — Các câu trả lời từ phía khách hàng.
05_proposal.md         — Bản dự thảo đề xuất kỹ thuật.
06_scope_freeze.md     — Phạm vi công việc đã được chốt, sẵn sàng bàn giao.
```

---

## 4. Trình diễn và Thuyết phục Khách hàng (Demo Guide)

**Trước buổi trình diễn:** Chạy lệnh `/sekkei:version` để đảm bảo mọi thứ hoạt động ổn định.

**Trong buổi trình diễn:**

1. Khởi động máy chủ xem trước: `/sekkei:preview` → mở trình duyệt tại `http://localhost:5173`.
2. Cho khách hàng thấy thanh điều hướng (sidebar navigation) và cách các biểu đồ Mermaid được hiển thị trực tiếp.
3. Xuất file PDF ngay tại chỗ: `/sekkei:export @requirements --format=pdf`.
4. Nhấn mạnh các điểm sau khi trình diễn:

**Các điểm nhấn quan trọng khi Demo:**
- **Tuân thủ chuẩn IPA**: Cho khách hàng thấy cấu trúc tài liệu chuyên nghiệp gồm: **Trang bìa (表紙)**, **Lịch sử cập nhật (更新履歴)**, **Mục lục (目次)** và **Nội dung chính (本文)** — đây là những gì mà các doanh nghiệp Nhật Bản kỳ vọng.
- **Liên kết mã ID thông minh**: Trình diễn cách các yêu cầu (REQ-001), chức năng (F-001), và màn hình (SCR-001) được kết nối chặt chẽ với nhau, giúp dễ dàng truy vết ảnh hưởng nếu có thay đổi.
- **Tự động ghi nhận lịch sử**: Cho khách hàng thấy phần **改訂履歴 (Lịch sử sửa đổi)** được cập nhật tự động một cách minh bạch sau mỗi lần thay đổi.
- **Tốc độ thực hiện**: Thay vì mất hàng tuần, bạn có thể tạo ra bản **要件定義書 (Định nghĩa yêu cầu)** đầy đủ chỉ trong thời gian ngắn, giúp rút ngắn thời gian phản hồi đề xuất.

---

## 5. Lời khuyên cho Sales/Presales

- Nếu hồ sơ RFP của khách hàng đã cực kỳ chi tiết, bạn có thể sử dụng lệnh `BUILD_NOW` hoặc `SKIP_QNA` để chuyển thẳng sang bước tạo đề xuất mà không cần qua giai đoạn Q&A.
- Chú ý đến chỉ số Confidence Level: Nếu mức độ tin cậy ở mức **LOW** (Thấp) khi chốt phạm vi, bạn cần tiếp tục trao đổi thêm để làm rõ thông tin trước khi bàn giao cho đội ngũ BA.
- Luôn xuất bản PDF ngay sau khi chốt phạm vi để khách hàng ký xác nhận, giúp phòng tránh tình trạng phát sinh yêu cầu ngoài hợp đồng (scope creep).
- Dịch bản đề xuất sang tiếng Anh bằng lệnh `/sekkei:translate` nếu có các bên liên quan nội bộ không đọc được tiếng Nhật.

---

## 6. Danh sách kiểm tra (Checklist) dành cho Sales

- [ ] Nội dung RFP đầu vào đầy đủ, không bị thiếu sót thông tin quan trọng.
- [ ] Danh sách Q&A đã được rà soát và điều chỉnh phù hợp với thực tế.
- [ ] Phản hồi của khách hàng đã được nạp đầy đủ vào hệ thống.
- [ ] Phạm vi công việc đã được khách hàng xác nhận và trạng thái `SCOPE_FREEZE` đã được thiết lập (với mức độ tin cậy HIGH hoặc MEDIUM).
- [ ] File chốt phạm vi (`06_scope_freeze.md`) đã được lưu trữ và export PDF.
- [ ] Hoàn tất bàn giao hồ sơ đề xuất (`05_proposal.md`) và phạm vi chốt (`06_scope_freeze.md`) cho đội ngũ BA để thực hiện bước tiếp theo.

---

## 7. Links

- [Giới thiệu Sekkei](../01-introduction.md)
- [V-Model & 13 loại tài liệu](../02-v-model-and-documents.md)
- [Quick Start](../03-quick-start.md)
- [Workflow Supplementary](../04-workflow/04-supplementary.md)
- [Team Playbook](../06-team-playbook/index.md)
