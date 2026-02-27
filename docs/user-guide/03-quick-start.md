![Sekkei](./images/logo-full-dark.svg)
# Hướng dẫn Bắt đầu nhanh (Quick Start) — Khởi tạo Tài liệu đầu tiên

Tài liệu này sẽ hướng dẫn bạn cách khởi tạo bản **要件定義書 (Định nghĩa yêu cầu) đầu tiên chỉ trong 15 phút** thông qua ví dụ cụ thể về một Hệ thống quản lý nhân sự (人事管理システム).

---

## Bước 0: Cài đặt Sekkei

Vui lòng chạy lệnh sau trong cửa sổ dòng lệnh (Terminal) để bắt đầu quá trình cài đặt:

```bash
curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
```

**Bộ cài đặt sẽ tự động thực hiện các tác vụ sau:**
- Kiểm tra các yêu cầu hệ thống (Node.js 20+, git, Python 3.9+, Claude Code).
- Sao chép và xây dựng máy chủ MCP (MCP Server).
- Thiết lập môi trường ảo Python và cài đặt các thư viện bổ trợ.
- Cài đặt bộ kỹ năng (Skills) và công cụ dòng lệnh (CLI).
- Chạy lệnh `sekkei doctor` để xác minh trạng thái hệ thống.

Sau khi hoàn tất, hãy kiểm tra lại bằng lệnh:
```bash
sekkei doctor    # Kiểm tra sức khỏe toàn diện của hệ thống
```

---

## Bước 1: Khởi tạo dự án Sekkei

Tại thư mục gốc của dự án, hãy thực hiện lệnh khởi tạo:

```bash
sekkei init
```

Hệ thống sẽ lần lượt yêu cầu bạn cung cấp các thông tin cơ bản:
- **Tên dự án (Project name)**.
- **Loại hình dự án (Project type)**: SaaS, Web, Mobile...
- **Ngôn ngữ đầu ra (Output language)**: Mặc định là tiếng Nhật (ja).
- **Mức độ kính ngữ (Keigo level)**: Bạn có thể chọn **丁寧語 (Thể lịch sự)** là mức phổ thông hoặc **謙譲語 (Thể khiêm nhường)** cho các đối tác lớn.
- **Thư mục lưu trữ (Output directory)**: Nơi chứa các file đặc tả được tạo ra.

Sau khi hoàn tất, file cấu hình `sekkei.config.yaml` sẽ được tạo ra tại thư mục gốc của dự án.

> [!TIP]
> Bạn có thể thay đổi văn phong tài liệu bất cứ lúc nào bằng cách chỉnh sửa tham số `keigo` trong file cấu hình.

---

## Bước 2: Kiểm tra trạng thái hệ thống

Hãy đảm bảo Sekkei đã sẵn sàng hoạt động bằng lệnh:
```bash
sekkei doctor
```

Tiếp theo, hãy kiểm tra trạng thái của bộ hồ sơ trong Claude Code:
```bash
/sekkei:status
```
Trong lần đầu tiên, tất cả các tài liệu sẽ ở trạng thái `pending` (đang chờ khởi tạo).

---

## Bước 3: Khởi tạo hồ sơ Định nghĩa yêu cầu

Bạn có thể lựa chọn một trong hai phương thức tùy theo dữ liệu đầu vào bạn có:

### Phương thức A: Sử dụng Hồ sơ thầu (RFP) sẵn có
Nếu bạn đã có file RFP từ khách hàng (PDF, Word hoặc văn bản):
```bash
/sekkei:rfp @rfp-hr-system.pdf
```
Sekkei sẽ dẫn dắt bạn qua các giai đoạn: Phân tích RFP → Đặt câu hỏi làm rõ (Q&A) → Xây dựng đề xuất (Proposal) → Chốt phạm vi (Scope Freeze). Khi phạm vi đã rõ ràng, hệ thống sẽ gợi ý bạn khởi tạo tài liệu đặc tả chính thức.

---

### Phương thức B: Mô tả yêu cầu trực tiếp
Nếu chưa có tài liệu, bạn có thể mô tả ý tưởng bằng tiếng Việt hoặc tiếng Anh:
```bash
/sekkei:requirements @[Xây dựng hệ thống HRM theo mô hình SaaS.
Các tính năng chính gồm: Quản lý hồ sơ, chấm công, tự động tính lương và phân quyền người dùng. 
Hệ thống cần tuân thủ Luật Lao động Nhật Bản và đảm bảo bảo mật thông tin theo Luật bảo vệ thông tin cá nhân (個人情報保護法).]
```
Sekkei sẽ đặt thêm một số câu hỏi để làm rõ chi tiết kỹ thuật (như số lượng người dùng đồng thời, mục tiêu hiệu năng) trước khi sinh ra file `workspace-docs/requirements.md` hoàn chỉnh theo chuẩn IPA.

---

## Bước 4: Xem trước và Chỉnh sửa

Hãy kiểm tra nội dung tài liệu vừa tạo thông qua máy chủ xem trước:
```bash
/sekkei:preview
```
Hệ thống sẽ mở giao diện web tại `http://localhost:5173`. Nếu muốn chỉnh sửa nội dung ngay trên trình duyệt, hãy thêm tham số `--edit`:
```bash
/sekkei:preview --edit
```

---

## Bước 5: Xuất bản tài liệu chuẩn Nhật

Khi đã hài lòng với nội dung, hãy xuất bản hồ sơ ra định dạng Excel chuẩn 4 sheet của Nhật Bản:
```bash
/sekkei:export @requirements --format=xlsx
```
Hoặc xuất bản bản PDF để gửi khách hàng rà soát:
```bash
/sekkei:export @requirements --format=pdf
```

> [!TIP]
> File Excel được xuất ra sẽ bao gồm đầy đủ 4 sheet tiêu chuẩn: **Trang bìa (表紙)**, **Lịch sử cập nhật (更新履歴)**, **Mục lục (目次)** và **Nội dung chính (本文)**.

---

## Kiểm soát chất lượng (Validation)

Trước khi bàn giao hồ sơ, hãy luôn chạy lệnh kiểm tra tính nhất quán:
```bash
/sekkei:validate @requirements
```
Hệ thống sẽ rà soát các mã ID, các liên kết chéo và các đề mục bắt buộc để đảm bảo hồ sơ không có sai sót kỹ thuật.

---

## Bước 6: Xem Dashboard Phân Tích

Để theo dõi chỉ số chất lượng tài liệu, đồ thị truy xuất và điểm số rủi ro:
```bash
/sekkei:dashboard
```
Giao diện web sẽ mở tại `http://localhost:4002` hiển thị các chỉ số hiệu năng, độ hoàn chỉnh của chuỗi tài liệu (chain completeness) và truy xuất liên kết ID qua các tài liệu.

---

## Các bước tiếp theo

Sau khi hoàn thiện bản **要件定義書 (Định nghĩa yêu cầu)**, bạn có thể tiếp tục triển khai các tài liệu kế tiếp trong chuỗi liên kết:
- **Danh sách chức năng**: `/sekkei:functions-list`
- **Yêu cầu phi chức năng**: `/sekkei:nfr`
- **Kế hoạch dự án**: `/sekkei:project-plan`
- **Thiết kế cơ bản**: `/sekkei:basic-design`

---

**Chúc mừng!** Bạn đã hoàn tất quy trình khởi tạo tài liệu đầu tiên với Sekkei.
 Proudly presented by Antigravity.
 Proudly presented by Antigravity.
