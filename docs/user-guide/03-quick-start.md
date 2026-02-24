# Quick Start — Tạo Tài Liệu Đầu Tiên

Hướng dẫn này giúp bạn tạo **要件定義書 đầu tiên trong 15 phút** với ví dụ hệ thống quản lý nhân sự (人事管理システム).

---

## Bước 0: Cài đặt Sekkei

Chạy lệnh sau trong terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
```

Installer tự động: kiểm tra prerequisites (Node.js 20+, git, Claude Code), clone repo, build MCP server, cài skill + CLI, chạy `sekkei doctor` để verify.

> [!NOTE]
> Cần Python export (Excel/PDF/DOCX)? Thêm `--with-python`:
> ```bash
> curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash -s -- --with-python
> ```

Sau khi cài xong, kiểm tra:

```bash
sekkei doctor    # Health check toàn bộ hệ thống
```

---

## Bước 1: Khởi tạo Sekkei

Chạy lệnh sau trong thư mục dự án:

```bash
sekkei init
```

Wizard sẽ hỏi bạn lần lượt:

```
? Project name: HR Management System
? Project type: (web / mobile / api / desktop / lp / internal-system / saas / batch)
  > saas
? Output language: (ja / en / vi)
  > ja
? Keigo level: (丁寧語 / 謙譲語 / simple)
  > 丁寧語
? Output directory: (./workspace-docs)
  > ./workspace-docs
```

Sau khi chạy xong, file `sekkei.config.yaml` được tạo trong thư mục dự án:

```yaml
project:
  name: "HR Management System"
  type: saas
  language: ja
  keigo: 丁寧語
output:
  directory: ./workspace-docs
```

> [!TIP]
> Bạn có thể sửa `sekkei.config.yaml` trực tiếp bất cứ lúc nào. `keigo` ảnh hưởng đến văn phong tiếng Nhật trong output — `丁寧語` là lịch sự chuẩn, `謙譲語` là khiêm nhường hơn (phù hợp khi gửi khách hàng lớn).

---

## Bước 2: Kiểm tra Môi trường

Chạy health check để đảm bảo Sekkei hoạt động đúng:

```bash
sekkei doctor
```

Output mẫu:

```
Sekkei Doctor — Installation Health Check
✓ Node.js v22.0.0
✓ MCP Server connected
✓ Templates loaded (22 types)
✓ Skill files installed
✓ Commands: 33/33 stubs
⚠ Python venv (optional — for Excel/PDF export)
```

Sau đó xem trạng thái chain trong Claude Code:

```
/sekkei:status
```

Lần đầu tiên bạn sẽ thấy tất cả tài liệu ở trạng thái `pending` — đây là bình thường.

> [!WARNING]
> Nếu `sekkei doctor` báo thiếu Python venv, export sang Excel/PDF sẽ không hoạt động. Chạy lại installer với `--with-python` hoặc cài thủ công:
> ```bash
> cd ~/.sekkei/packages/mcp-server && python3 -m venv python/.venv && python/.venv/bin/pip install -r python/requirements.txt
> ```

---

## Bước 3: Tạo Requirements Đầu Tiên

Bạn có hai con đường tùy theo tình huống:

### Con đường A: Có file RFP

Nếu khách hàng đã gửi RFP (file PDF, Word, hoặc text):

```
/sekkei:rfp @rfp-hr-system.pdf
```

Sekkei sẽ chạy qua các phase tự động:

1. **Phân tích RFP** — đọc và extract requirements
2. **Sinh Q&A** — tạo danh sách câu hỏi làm rõ yêu cầu
3. **Chờ client trả lời** — bạn paste câu trả lời vào
4. **Tạo proposal** — draft đề xuất kỹ thuật
5. **Scope freeze** — đóng băng scope, sẵn sàng tạo requirements

Khi scope freeze xong với confidence HIGH/MEDIUM, Sekkei sẽ hỏi:

```
Scope frozen. Confidence: HIGH. Run /sekkei:requirements with proposal as input? [Y/n]
```

Nhập `Y` để tiếp tục.

---

### Con đường B: Không có RFP

Bạn mô tả yêu cầu trực tiếp bằng tiếng Việt hoặc tiếng Anh:

```
/sekkei:requirements @[Hệ thống quản lý nhân sự SaaS cho doanh nghiệp vừa và nhỏ.
Cần các tính năng: quản lý hồ sơ nhân viên, chấm công (check-in/out),
tính lương tự động, báo cáo HR, phân quyền theo role (Admin/Manager/Employee).
Performance: response time < 3s, uptime 99.5%.
Compliance: Luật Lao động Nhật Bản 2024.]
```

Trước khi generate, Sekkei sẽ hỏi thêm vài câu:

```
Trước khi tạo 要件定義書, mình cần xác nhận thêm:
1. Có yêu cầu compliance/regulatory cụ thể nào không? (VD: 個人情報保護法, マイナンバー法)
2. Performance targets cụ thể? (response time, concurrent users)
3. Mức độ security cần thiết? (public SaaS hay internal only)
```

Trả lời xong, Sekkei sinh ra `workspace-docs/requirements.md` với đầy đủ 10 sections và IDs từ REQ-001 trở đi.

> [!TIP]
> Input tiếng Việt hoàn toàn ổn — Sekkei tự detect `input_lang: "vi"` và sinh output tiếng Nhật chuẩn. Bạn không cần dịch trước.

---

## Bước 4: Xem Kết Quả

Khởi động preview server để đọc tài liệu vừa tạo:

```
/sekkei:preview
```

Preview server khởi động tại `http://localhost:5173` với:

- Sidebar navigation theo cấu trúc tài liệu
- Mermaid diagrams render trực tiếp
- Full-text search

Để chỉnh sửa trực tiếp trong browser:

```
/sekkei:preview --edit
```

Chế độ edit cho phép bạn sửa nội dung bằng WYSIWYG editor (Milkdown) — save bằng `Ctrl+S` / `Cmd+S`, thay đổi ghi thẳng vào file markdown.

> [!NOTE]
> Preview server cần chạy song song với Claude Code. Mở tab terminal mới nếu cần tiếp tục dùng Sekkei.

---

## Bước 5: Xuất File

Export sang Excel theo chuẩn IPA 4-sheet:

```
/sekkei:export @requirements --format=xlsx
```

Hoặc PDF để gửi review:

```
/sekkei:export @requirements --format=pdf
```

Hoặc Word:

```
/sekkei:export @requirements --format=docx
```

File được lưu vào `workspace-docs/` với tên tự động. Sekkei báo lại đường dẫn và file size sau khi export xong.

> [!TIP]
> Excel format (`.xlsx`) là định dạng khách hàng Nhật ưa dùng nhất — cấu trúc 4 sheet (表紙 / 更新履歴 / 目次 / 本文) quen thuộc với họ. Dùng PDF khi gửi draft để review nhanh.

---

## Validate Trước Khi Gửi

Luôn chạy validate trước khi gửi khách hàng:

```
/sekkei:validate @requirements
```

Output cho bạn biết:

- Section nào còn thiếu
- ID nào bị orphaned (khai báo nhưng không được reference)
- Bảng nào thiếu column bắt buộc

---

## Bước Tiếp Theo

Sau khi có 要件定義書, bạn có thể tiếp tục chain:

| Tài liệu tiếp theo | Lệnh | Ai làm |
|--------------------|------|--------|
| Danh sách chức năng | `/sekkei:functions-list @requirements.md` | BA |
| Yêu cầu phi chức năng | `/sekkei:nfr @requirements.md` | BA + Dev Lead |
| Kế hoạch dự án | `/sekkei:project-plan @requirements.md` | PM |
| Thiết kế cơ bản | `/sekkei:basic-design @requirements.md` | Dev Lead |

Xem thứ tự ưu tiên cho từng role:

- **BA:** [Workflow Requirements](./04-workflow/01-requirements.md)
- **PM:** [Role Guide — PM](./05-roles/01-pm.md)
- **Dev Lead:** [Workflow Design](./04-workflow/02-design.md)
- **Tất cả:** [Workflow Index](./04-workflow/index.md)

---

## Tóm Tắt Lệnh Đã Dùng

```bash
sekkei init                                  # Khởi tạo project
sekkei doctor                                # Health check
/sekkei:status                               # Xem chain progress
/sekkei:rfp @rfp.pdf                         # Phân tích RFP (nếu có)
/sekkei:requirements @input                  # Tạo 要件定義書
/sekkei:preview                              # Xem tài liệu
/sekkei:validate @requirements               # Kiểm tra chất lượng
/sekkei:export @requirements --format=xlsx   # Xuất Excel
```
