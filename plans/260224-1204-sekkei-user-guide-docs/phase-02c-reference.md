# Phase 02C — Reference Section

**Status:** completed
**Parallelization:** Runs in parallel with Phase 2A and 2B — after Phase 1 completes
**Effort:** ~1h
**Files owned (3):**
- `sekkei/docs/user-guide/reference/commands.md`
- `sekkei/docs/user-guide/reference/configuration.md`
- `sekkei/docs/user-guide/reference/glossary.md`

---

## Context Links

- Commands research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-01-commands-workflows.md` — all 30 commands
- V-model research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-02-vmodel-doctypes.md` — ID prefixes
- Config example: `sekkei/sekkei.config.example.yaml` — full config reference
- SKILL.md: `sekkei/packages/skills/content/SKILL.md` — command syntax
- Utilities: `sekkei/packages/skills/content/references/utilities.md`

---

## File 1: `reference/commands.md` (~200 lines)

**Purpose:** Complete quick-reference for all 30 commands. Lookup format — not tutorial.

**Content outline:**

### Format
Scannable table grouped by category. For each command:
- Command name + full syntax
- Required args
- Output / what it does
- Prerequisite(s)
- Link to detailed workflow page where applicable

### Section 1: Document Generation (13 commands)
Table columns: Command | Syntax | Input | Output Doc | Prerequisite | Detail

Commands (from researcher-01 table rows 1-13):
1. `rfp` — `/sekkei:rfp [@project-name]`
2. `requirements` — `/sekkei:requirements @input`
3. `functions-list` — `/sekkei:functions-list @input`
4. `nfr` — `/sekkei:nfr @requirements`
5. `project-plan` — `/sekkei:project-plan @req`
6. `basic-design` — `/sekkei:basic-design @input`
7. `security-design` — `/sekkei:security-design @bd`
8. `detail-design` — `/sekkei:detail-design @input`
9. `test-plan` — `/sekkei:test-plan @req`
10. `ut-spec` — `/sekkei:ut-spec @detail-design`
11. `it-spec` — `/sekkei:it-spec @basic-design`
12. `st-spec` — `/sekkei:st-spec @basic-design`
13. `uat-spec` — `/sekkei:uat-spec @requirements`

### Section 2: Supplementary Documents (4 commands)
Commands 14-17: matrix, sitemap, operation-design, migration-design

### Section 3: Utility Commands (13 commands)
Table columns: Command | Syntax | Key Options | Mục đích

Commands 18-30 (from researcher-01 utility table):
18. `validate` — with/without @doc
19. `status` — chain progress
20. `export` — `--format=xlsx|pdf|docx`
21. `translate` — `--lang=en|vi`
22. `glossary` — subcommands: add|list|find|export|import
23. `change` — `--resume`, `--status`, `--list`, `--cancel`, `--rollback`
24. `update` — `--since <git-ref>`
25. `diff-visual` — before/after comparison
26. `plan` — survey + phased plan
27. `implement` — execute plan
28. `preview` — `--edit`, `--docs`, `--port`
29. `version` — `--json`
30. `uninstall` / `rebuild`

### Notes Section
- **Order matters:** Document generation follows strict chain — see prerequisite column
- **`@input` syntax:** File path to existing doc OR paste text directly in chat
- **Status anytime:** `/sekkei:status` shows current chain state and next recommended command
- **Validate modes:** Without args = full chain; with `@doc` = single document

---

## File 2: `reference/configuration.md` (~100 lines)

**Purpose:** Full `sekkei.config.yaml` reference — every key explained.

**Source:** `sekkei/sekkei.config.example.yaml` (read entire file), researcher-01 "Configuration" section.

**Content outline:**

### Cấu trúc file
Explain that `sekkei.config.yaml` lives at project root. Created by `npx sekkei init`.

### Full Key Reference Table
Group by section:

**project section:**
| Key | Type | Values | Mô tả |
|-----|------|--------|-------|
| `project.name` | string | any | Tên project |
| `project.type` | enum | web\|mobile\|api\|desktop\|lp\|internal-system\|saas\|batch | Loại hệ thống |
| `project.language` | enum | ja\|en\|vi | Ngôn ngữ output |
| `project.keigo` | enum | 丁寧語\|謙譲語\|simple | Mức độ lịch sự tiếng Nhật |
| `project.industry` | enum | finance\|medical\|manufacturing\|real-estate | Preset ngành (optional) |
| `project.team_size` | number | — | Số người trong team |
| `project.stack` | list | — | Tech stack |

**output section:**
| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `output.directory` | path | `docs/` | Thư mục output |

**export section:**
| Key | Type | Mô tả |
|-----|------|-------|
| `export.excel_template` | path | Company Excel template (optional) |

**other keys:**
| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `autoCommit` | boolean | false | Tự động commit docs vào git |
| `approval_chain` | map | — | Digital approval workflow per doc **[Beta]** |
| `learning_mode` | boolean | false | Annotate docs with standard explanations **[Beta]** |
| `chain.*` | object | — | Per-doc chain status (auto-managed) |

> [!WARNING] **[Beta]** — Các tính năng đánh dấu [Beta] có thể chưa hoạt động hoàn chỉnh trong phiên bản hiện tại.
<!-- Updated: Validation Session 1 - approval_chain, learning_mode marked as [Beta] -->

**split section:**
| Key | Type | Mô tả |
|-----|------|-------|
| `split.basic-design` | boolean | Tạo per-feature files cho basic-design |
| `split.detail-design` | boolean | Tạo per-feature files cho detail-design |

### Output Directory Structure
```
sekkei-docs/
├── 01-rfp/
├── 02-requirements/
├── 03-system/
├── 04-functions-list/
├── 05-features/
├── 06-data/
├── 07-operations/
├── 08-test/
├── 09-ui/
└── 10-glossary.md
```

### approval_chain Config Example
```yaml
approval_chain:
  要件定義書: [pm, ba]
  基本設計書: [pm, dev-lead]
  詳細設計書: [dev-lead]
  受入テスト仕様書: [pm, qa, ba]
```

### Keigo Levels Explained
- `丁寧語` (です/ます) — Tiêu chuẩn, dùng cho hầu hết tài liệu
- `謙譲語` — Formal, dùng cho tài liệu gửi client trực tiếp
- `simple` — Internal/technical docs, không cần keigo

---

## File 3: `reference/glossary.md` (~150 lines)

**Purpose:** 3-language lookup table: Vietnamese ↔ Japanese ↔ English for all key terms.

**Content outline:**

### Hướng dẫn sử dụng
Brief intro: find any term in any of the 3 columns. Japanese terms in this guide always appear in the format `**日本語** (Tiếng Việt)`.

### Section 1: Document Types (13 core + 9 supplementary)
3-column table: Tiếng Việt | 日本語 | English

| Tiếng Việt | 日本語 | English |
|------------|--------|---------|
| Tài liệu yêu cầu | 要件定義書 | Requirements Specification |
| Danh sách chức năng | 機能一覧 | Functions List |
| Yêu cầu phi chức năng | 非機能要件定義書 | Non-Functional Requirements |
| Kế hoạch dự án | プロジェクト計画書 | Project Plan |
| Thiết kế cơ bản | 基本設計書 | Basic Design Document |
| Thiết kế bảo mật | セキュリティ設計書 | Security Design Document |
| Thiết kế chi tiết | 詳細設計書 | Detail Design Document |
| Kế hoạch kiểm thử | テスト計画書 | Test Plan |
| Đặc tả kiểm thử đơn vị | 単体テスト仕様書 | Unit Test Specification |
| Đặc tả kiểm thử tích hợp | 結合テスト仕様書 | Integration Test Specification |
| Đặc tả kiểm thử hệ thống | システムテスト仕様書 | System Test Specification |
| Đặc tả kiểm thử chấp nhận | 受入テスト仕様書 | User Acceptance Test Specification |
| Yêu cầu thay đổi | 変更要求書 | Change Request |
(+ 9 supplementary rows)

### Section 2: ID Prefixes
| Tiếng Việt | Prefix | Ví dụ |
|------------|--------|-------|
| Yêu cầu chức năng | REQ- | REQ-001 |
| Yêu cầu phi chức năng | NFR- | NFR-001 |
| Chức năng | F- | F-001 |
| Màn hình | SCR- | SCR-001 |
| Bảng dữ liệu | TBL- | TBL-001 |
| API | API- | API-001 |
| Class/Module | CLS- | CLS-001 |
| Bảo mật | SEC- | SEC-001 |
| Kế hoạch dự án | PP- | PP-001 |
| Kế hoạch kiểm thử | TP- | TP-001 |
| Kiểm thử đơn vị | UT- | UT-001 |
| Kiểm thử tích hợp | IT- | IT-001 |
| Kiểm thử hệ thống | ST- | ST-001 |
| Kiểm thử chấp nhận | UAT- | UAT-001 |

### Section 3: Key Concepts
| Tiếng Việt | 日本語 | English |
|------------|--------|---------|
| Mô hình V | Vモデル | V-Model |
| Chuỗi tài liệu | ドキュメントチェーン | Document Chain |
| Lịch sử sửa đổi | 改訂履歴 / 更新履歴 | Revision History |
| Trang bìa | 表紙 | Cover Page |
| Mục lục | 目次 | Table of Contents |
| Ký duyệt kỹ thuật số | デジタルハンコ | Digital Approval Seal |
| Tiêu chuẩn IPA | IPA標準 | IPA Standard |
| Phân tích phạm vi RFP | RFPワークスペース | RFP Workspace |
| Đóng băng phạm vi | スコープフリーズ | Scope Freeze |
| Mức lịch sự tiếng Nhật | 敬語レベル | Keigo Level |
| Phân tích tác động thay đổi | 変更影響分析 | Change Impact Analysis |
| Ma trận truy xuất | トレーサビリティマトリクス | Traceability Matrix |

### Section 4: IPA Standard Terms
| Tiếng Việt | 日本語 | English |
|------------|--------|---------|
| Loại xử lý: nhập liệu | 入力 | Input/Data Entry |
| Loại xử lý: tra cứu | 照会 | Inquiry/Search |
| Loại xử lý: báo cáo | 帳票 | Report/Form |
| Loại xử lý: batch | バッチ | Batch Process |
| Mức ưu tiên cao | 高 | High |
| Mức ưu tiên trung | 中 | Medium |
| Mức ưu tiên thấp | 低 | Low |

---

## Implementation Steps

1. Read `sekkei/sekkei.config.example.yaml` entirely — extract all config keys
2. Read researcher-01 for complete 30-command list with syntax
3. Read researcher-02 for ID prefix table and doc type names
4. Write `commands.md` — structured reference tables (3 sections)
5. Write `configuration.md` — config key reference tables
6. Write `glossary.md` — 3-language tables (4 sections)

## Todo

- [ ] Read `sekkei/sekkei.config.example.yaml` — extract all valid keys
- [ ] Read `sekkei/packages/skills/content/references/utilities.md`
- [ ] Create `sekkei/docs/user-guide/reference/` directory
- [ ] Write `reference/commands.md` with all 30 commands in 3 groups
- [ ] Write `reference/configuration.md` with full key table
- [ ] Write `reference/glossary.md` with all 4 sections
- [ ] Verify command count: exactly 30
- [ ] Verify glossary covers all doc types + ID prefixes + key concepts

## Success Criteria

- `commands.md`: all 30 commands present, grouped (13 gen + 4 supp + 13 util), prerequisites correct
- `configuration.md`: all config keys documented; output directory structure shown
- `glossary.md`: all 13 core doc types + 9 supplementary + all ID prefixes + key concepts — 3-language
- No tutorial content in reference files — lookup only
- No overlap with workflow/* or roles/* files
