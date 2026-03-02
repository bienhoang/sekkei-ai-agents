# Tham Chiếu Cấu Hình — `sekkei.config.yaml`

> File cấu hình nằm ở root của project. Được tạo tự động bởi `sekkei init`.

---

## Tất cả Keys

### `project` — Thông tin dự án

| Key | Type | Giá trị hợp lệ | Mô tả |
|-----|------|----------------|-------|
| `project.name` | string | Bất kỳ | Tên project — xuất hiện trên 表紙 của mọi tài liệu |
| `project.type` | enum | `web` / `mobile` / `api` / `desktop` / `lp` / `internal-system` / `saas` / `batch` | Loại hệ thống — ảnh hưởng đến preset sections trong template |
| `project.language` | enum | `ja` / `en` / `vi` | Ngôn ngữ output của tài liệu |
| `project.keigo` | enum | `丁寧語` / `謙譲語` / `simple` | Mức lịch sự tiếng Nhật trong output (xem bảng bên dưới) |
| `project.industry` | enum | `finance` / `medical` / `manufacturing` / `real-estate` | Preset ngành — tự động thêm terms và compliance sections liên quan (optional) |
| `project.team_size` | number | Bất kỳ | Số thành viên team — dùng trong プロジェクト計画書 |
| `project.stack` | list | Bất kỳ | Tech stack — dùng trong 基本設計書 và セキュリティ設計書 |

### `output` — Thư mục xuất

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `output.directory` | string | `./workspace-docs` | Thư mục lưu toàn bộ tài liệu được generate |

### `export` — Xuất file

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `export.excel_template` | string | — | Đường dẫn đến file Excel template của công ty (optional) — dùng khi khách hàng yêu cầu format riêng |

> **Note (v2.9.0+):** Per-feature generation is now automatic and requires no configuration. When `functions-list.md` contains any features (≥ 1), Sekkei automatically generates per-feature documents for `basic-design`, `detail-design`, and test-specs.

### Các keys khác

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `autoCommit` | boolean | `false` | Tự động git commit sau mỗi lần generate tài liệu |
| `chain.*` | object | (auto) | Trạng thái từng tài liệu trong chain — Sekkei tự quản lý, không nên sửa tay |

> [!WARNING]
> **[Beta]** `approval_chain` — Cấu hình luồng ký duyệt kỹ thuật số (デジタルハンコ) theo từng loại tài liệu. Tính năng đang trong giai đoạn thử nghiệm, API có thể thay đổi.

> [!WARNING]
> **[Beta]** `learning_mode: true` — Thêm annotations giải thích vào tài liệu output để hỗ trợ học IPA standard. Không dùng trong tài liệu gửi khách hàng thật.

---

## Ví dụ `sekkei.config.yaml` đầy đủ

```yaml
project:
  name: "HR Management System"
  type: saas
  language: ja
  keigo: 丁寧語
  industry: manufacturing   # optional
  team_size: 8
  stack:
    - "Node.js / NestJS"
    - "React / TypeScript"
    - "PostgreSQL"
    - "AWS (ECS, RDS, S3)"

output:
  directory: ./workspace-docs

export:
  excel_template: ./templates/company-template.xlsx  # optional

autoCommit: false

# chain.* được Sekkei tự cập nhật — không cần sửa tay
chain:
  requirements: complete
  functions-list: complete
  basic-design: in-progress
```

---

## Keigo Levels — Mức Lịch Sự Tiếng Nhật

| Level | Văn phong | Dùng khi |
|-------|-----------|----------|
| `丁寧語` | です / ます — lịch sự chuẩn | Phổ biến nhất, phù hợp hầu hết dự án |
| `謙譲語` | Khiêm nhường, trang trọng hơn | Gửi khách hàng lớn, tập đoàn Nhật truyền thống |
| `simple` | Không dùng kính ngữ, ngắn gọn | Tài liệu nội bộ, team technical |

---

## Cấu Trúc Thư Mục Output

Sau khi generate đầy đủ, thư mục `workspace-docs/` có cấu trúc:

```
workspace-docs/
├── 01-rfp/
│   ├── rfp-analysis.md
│   ├── qa-list.md
│   ├── proposal.md
│   └── scope-freeze.md
├── 02-requirements/
│   └── requirements.md
├── 03-system/
│   ├── nfr.md
│   └── project-plan.md
├── 04-functions-list/
│   └── functions-list.md
├── 05-features/
│   ├── basic-design.md
│   └── security-design.md
├── 06-data/
│   └── detail-design.md
├── 07-operations/
│   ├── operation-design.md
│   └── migration-design.md
├── 08-test/
│   ├── test-plan.md
│   ├── ut-spec.md
│   ├── it-spec.md
│   ├── st-spec.md
│   └── uat-spec.md
├── 09-ui/
│   └── sitemap.md
└── 10-glossary.md
```

> [!NOTE]
> **Auto-activation (v2.9.0+):** When `functions-list.md` contains any major features (identified by `## ` headings), Sekkei automatically generates per-feature documents. The thư mục `05-features/` is then populated with subfolders per feature — ví dụ `05-features/employee-management/`, `05-features/payroll/`, mỗi folder có `basic-design.md` và `screen-design.md` riêng. No configuration needed.
