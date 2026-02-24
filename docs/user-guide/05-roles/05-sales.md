# Role Guide: Sales / Presales

Xem thêm: [Giới thiệu](../01-introduction.md) | [Quick Start](../03-quick-start.md) | [Workflow Supplementary](../04-workflow/04-supplementary.md) | [Team Playbook](../06-team-playbook/index.md)

---

## 1. Sales/Presales làm gì trong dự án Sekkei?

Sales/Presales dùng Sekkei chủ yếu ở **giai đoạn trước ký hợp đồng** — phân tích RFP từ khách hàng Nhật, làm rõ yêu cầu qua Q&A, đóng băng scope, và demo bộ tài liệu chất lượng cho khách hàng. Khi scope đã freeze, bạn handoff cho BA để bắt đầu phase Requirements chính thức.

Công việc chính của Sales/Presales:

- Chạy **RFP Workspace** để phân tích RFP và sinh Q&A tự động
- Giao tiếp với khách hàng để làm rõ yêu cầu
- Đóng băng scope trước khi ký hợp đồng
- Demo tài liệu qua preview server và export PDF
- Handoff sang BA với proposal đã confirmed

---

## 2. Lệnh thường dùng

| Lệnh | Dùng khi nào |
|------|--------------|
| `/sekkei:rfp` | Bắt đầu RFP Workspace — paste text RFP hoặc attach file |
| `/sekkei:export @doc --format=pdf` | Export PDF để gửi khách hàng review hoặc demo |
| `/sekkei:translate @doc --lang=en` | Dịch sang tiếng Anh cho stakeholder nội bộ |
| `/sekkei:preview` | Khởi động preview server tại localhost:5173 |
| `sekkei doctor` | Health check trước khi demo |

---

## 3. RFP Workflow — Luồng chi tiết

Đây là luồng quan trọng nhất với Sales/Presales. RFP Workspace đi qua các phase tự động:

### Bước 1: Nhận RFP và khởi động

Paste text RFP trực tiếp hoặc attach file:

```
/sekkei:rfp @rfp-client-abc.pdf
```

Hoặc paste text:

```
/sekkei:rfp @[Nội dung RFP từ khách hàng...]
```

### Bước 2: ANALYZING → QNA_GENERATION

Sekkei tự động phân tích RFP và sinh danh sách câu hỏi làm rõ (Q&A). Bạn sẽ thấy output:

```
Phase: QNA_GENERATION
Đã sinh 12 câu hỏi làm rõ yêu cầu.
[Q1] Hệ thống cần tích hợp với phần mềm kế toán hiện tại không?
[Q2] Số lượng người dùng đồng thời tối đa là bao nhiêu?
...
```

**Review Q&A trước khi gửi khách hàng** — xóa câu hỏi thừa, thêm câu hỏi domain-specific nếu cần.

### Bước 3: WAITING_CLIENT → CLIENT_ANSWERED

Gửi Q&A cho khách hàng. Khi họ trả lời, paste câu trả lời vào:

```
CLIENT_ANSWERED: [Paste toàn bộ câu trả lời của khách hàng vào đây]
```

### Bước 4: DRAFTING → SCOPE_FREEZE

Sekkei draft proposal và đề xuất scope. Bạn xem và confirm với khách hàng. Khi đồng ý:

```
SCOPE_FREEZE
```

Sekkei báo confidence level (HIGH / MEDIUM / LOW) và tạo `06_scope_freeze.md`.

### Navigation Keywords

Trong suốt RFP Workspace, bạn có thể dùng các keyword sau:

| Keyword | Tác dụng |
|---------|----------|
| `SHOW` | Hiện trạng thái phase hiện tại và nội dung |
| `BUILD_NOW` | Bỏ qua Q&A, tạo proposal ngay từ RFP gốc |
| `SKIP_QNA` | Bỏ qua bước Q&A, chuyển thẳng sang DRAFTING |
| `BACK` | Quay lại phase trước |

### Output Files

Tất cả output lưu tại `workspace-docs/01-rfp/<project-name>/`:

```
01_raw_rfp.md          — RFP gốc đã được parse
02_analysis.md         — Phân tích requirements từ RFP
03_qna.md              — Danh sách Q&A đã sinh
04_client_answers.md   — Câu trả lời của khách hàng
05_proposal.md         — Draft proposal kỹ thuật
06_scope_freeze.md     — Scope đã đóng băng, sẵn sàng handoff
```

---

## 4. Demo Guide — Trình bày cho khách hàng

**Trước demo:** Chạy `/sekkei:version` để đảm bảo mọi thứ hoạt động.

**Trong demo:**

1. Khởi động preview: `/sekkei:preview` → mở `http://localhost:5173`
2. Cho khách hàng thấy sidebar navigation, Mermaid diagrams render trực tiếp
3. Export PDF ngay tại chỗ: `/sekkei:export @requirements --format=pdf`
4. Nhấn mạnh các điểm sau khi demo:

**Key talking points:**

- **Chuẩn IPA** — format 表紙/更新履歴/目次/本文 mà các công ty Nhật quen dùng
- **Cross-reference IDs** — REQ-001 → F-001 → SCR-001 → UT-001 tự động linked, dễ trace impact khi có thay đổi
- **Auto version history** — mỗi lần regenerate tự động cập nhật 改訂履歴 (revision history)
- **Thời gian** — 要件定義書 đầy đủ trong 30–60 phút thay vì 2–3 ngày

---

## 5. Tips

- Dùng `BUILD_NOW` hoặc `SKIP_QNA` khi RFP đã rất chi tiết và không cần Q&A thêm
- Confidence level **LOW** ở scope freeze = cần thêm thông tin từ khách hàng trước khi handoff BA
- Export PDF ngay sau scope freeze để khách hàng ký xác nhận scope — tránh scope creep
- Dịch proposal sang tiếng Anh bằng `/sekkei:translate` nếu có stakeholder nội bộ không đọc được tiếng Nhật

---

## 6. Checklist

- [ ] Text RFP đầy đủ (không bị cắt xén) trước khi paste vào `/sekkei:rfp`
- [ ] Q&A đã được review — xóa câu hỏi thừa, thêm câu hỏi domain-specific
- [ ] Câu trả lời khách hàng đã được paste đầy đủ
- [ ] Scope freeze đã được confirm với khách hàng (confidence HIGH hoặc MEDIUM)
- [ ] `06_scope_freeze.md` đã được export PDF và lưu trữ
- [ ] Handoff cho BA: giao `05_proposal.md` + `06_scope_freeze.md` làm input cho requirements

---

## 7. Links

- [Giới thiệu Sekkei](../01-introduction.md)
- [V-Model & 13 loại tài liệu](../02-v-model-and-documents.md)
- [Quick Start](../03-quick-start.md)
- [Workflow Supplementary](../04-workflow/04-supplementary.md)
- [Team Playbook](../06-team-playbook/index.md)
