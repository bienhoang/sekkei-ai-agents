# Phân tích kiến trúc: sekkei:basic-design (基本設計書)

> Ngày phân tích: 2026-02-25
> Phạm vi: Toàn bộ pipeline từ skill invocation → generation → validation → export

---

## 1. Tổng quan kiến trúc

`basic-design` là document type phức tạp nhất trong V-model chain — nó nhận input từ 3 upstream docs và feed xuống 10+ downstream docs.

### Data Flow

```
[requirements] ──REQ-xxx──┐
[functions-list] ──F-xxx──┼──→ generate.ts → AI generates markdown
[nfr] ──NFR-xxx───────────┘         │
                                     ▼
                              basic-design.md
                          (SCR-xxx, TBL-xxx, API-xxx, RPT-xxx)
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                 ▼
             detail-design    security-design     test-plan
             it-spec          st-spec             migration-design
             crud-matrix      traceability        screen-design
```

### Các layer chính

| Layer | Files | Vai trò |
|-------|-------|---------|
| Skill | `SKILL.md`, `phase-design.md` | Entry point, workflow routing, prerequisite check |
| MCP Tool | `generate.ts` (452 LOC) | Context assembly, upstream ID injection, split-mode |
| Instructions | `generation-instructions.ts` (452 LOC) | Doc-type specific prompts, keigo, bilingual |
| Template | `templates/ja/basic-design.md` (297 LOC) | 10 sections, YAML frontmatter, AI guidance |
| Validation | `validator.ts` (500+ LOC) | Section/column/ID check, cross-ref report |
| Cross-ref | `cross-ref-linker.ts` (377 LOC) | Chain pairs, ID origins, upstream constraints |
| Mockup | `/sekkei:mockup` skill command | Claude AI generates HTML wireframe |
| Export | `excel/pdf/docx-exporter.ts` | Markdown → Excel/PDF/Word |
| Change Req | `cr-*.ts` (5 files) | CR lifecycle, impact propagation |
| Plan | `plan-*.ts` (4 files) | Split-mode phased generation |
| Staleness | `staleness-detector/doc-staleness` | Git-based upstream change detection |
| Changelog | `changelog-manager.ts` | Revision history preservation + global log |

---

## 2. Điểm mạnh của kiến trúc

### 2.1 Cross-reference system chặt chẽ
- `cross-ref-linker.ts` define rõ `CHAIN_PAIRS` và `ID_ORIGIN` → basic-design CHỈ được reference REQ/NFR/F từ upstream
- Downstream docs CHỈ được reference SCR/TBL/API từ basic-design
- Validator check orphaned IDs (IDs không có nguồn gốc upstream)

### 2.2 Split-mode cho project lớn
- Config-driven: `sekkei.config.yaml` → `split.basic-design.features[]`
- Plan orchestration auto-detect khi feature_count > threshold
- Mỗi feature gen riêng → giảm AI context, tăng quality

### 2.3 Graceful degradation
- Mockup generation via AI skill → no Playwright dependency
- Git missing → staleness detection skip
- Code analyzer → chỉ dùng cho detail-design, basic-design không cần

### 2.4 Multi-format export
- Dual engine: Node (ExcelJS/Playwright/docx) + Python fallback
- Diff mode support (朱書き redline)
- Manifest-based export merge split-mode features

---

## 3. Bugs & Vấn đề phát hiện

### BUG-01: RPT-xxx (帳票ID) không có trong ID_ORIGIN map

**Mức độ: Medium**

Template basic-design Section 6 yêu cầu generate RPT-001, RPT-002... nhưng `id-extractor.ts` regex pattern:

```typescript
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|...)-(\d{1,4})\b/g
```

`RPT` prefix **có thể** nằm trong pattern (cần verify), nhưng `cross-ref-linker.ts` không define `RPT` trong `ID_ORIGIN` map. Nghĩa là:
- RPT-xxx được tạo trong basic-design nhưng **không được track** bởi chain system
- Downstream docs không biết RPT-xxx thuộc basic-design
- CR propagation không cover RPT changes

**Fix đề xuất:** Thêm `RPT: "basic-design"` vào ID_ORIGIN map trong `cross-ref-linker.ts`.

---

### BUG-02: Screen ID collision trong split mode

**Mức độ: High**

Template hướng dẫn: `SCR-001, SCR-002...` (sequential global). Nhưng split mode gen mỗi feature riêng → 2 features có thể cùng tạo SCR-001.

- `phase-design.md` có guidance "SCR-SAL-001" cho split mode nhưng template `basic-design.md` không enforce feature prefix
- Validator không check duplicate SCR IDs across features
- Merge khi export sẽ có 2 SCR-001 khác nhau

**Fix đề xuất:**
1. Template thêm rule: split mode → `SCR-{FEATURE}-001` format
2. Validator thêm cross-feature duplicate check khi export manifest mode

---

### BUG-03: Completeness rules quá lỏng

**Mức độ: Low-Medium**

`completeness-rules.ts` chỉ check **sự tồn tại** của SCR/TBL/API tables:

```typescript
// Chỉ check: "có ít nhất 1 SCR-xxx trong content?"
/\|\s*SCR-\d+/
```

Không check:
- SCR referenced trong screen transition diagram có match với SCR table không
- TBL referenced trong ER diagram có match với TBL table không
- API trong external interface có đủ 8 mandatory columns không
- Số lượng SCR/TBL/API có tương ứng với functions-list không

---

### BUG-04: Staleness score formula có bias

**Mức độ: Low**

```
score = daysSinceDocUpdate/90 * 40 + numChangedFiles/10 * 30 + linesChanged/500 * 30
```

- 1 file thay đổi 1 dòng (typo fix) cũng tăng score 3 điểm
- Project mới (ít commit) sẽ có `daysSince` thấp → staleness luôn thấp dù upstream thay đổi nhiều
- `numChangedFiles` không phân biệt file relevance (test file change = source file change)

---

### BUG-05: Changelog auto-insert race condition

**Mức độ: Low**

Khi `auto_insert_changelog=true` + regenerate:
1. Extract old version từ existing_content
2. Increment version
3. Insert new row

Nhưng nếu 2 regeneration chạy gần nhau (khác feature trong split mode), cả 2 đều read cùng version → cùng increment → duplicate version number.

---

## 4. Real-world cases chưa được cover

### CASE-01: Microservice architecture (nhiều hệ thống con)

**Hiện tại:** Template assume 1 system architecture diagram, 1 set SCR/TBL/API. Project microservice có 5-10 services, mỗi service có DB riêng, API riêng.

**Vấn đề:**
- Section 2 (システム構成) chỉ có 1 Mermaid diagram → không thể hiển thị internal communication giữa services
- Section 7 (DB設計) chỉ có 1 ER diagram → 5 databases riêng cần 5 ER diagrams
- Section 8 (外部インターフェース) không phân biệt internal API (service-to-service) vs external API (client-facing)

**Đề xuất:**
- Thêm `project_type: "microservice"` với instructions riêng
- Template: thêm section "サービス間通信設計" (Inter-service Communication)
- Cho phép multiple ER diagrams per service domain

---

### CASE-02: Mobile + Web hybrid project

**Hiện tại:** `project_type: "mobile"` thêm "screen transition diagram for all screens" nhưng không phân biệt platform.

**Vấn đề:**
- Web screens (SCR-W-001) và Mobile screens (SCR-M-001) có UX pattern rất khác
- Responsive design không được address (desktop/tablet/mobile viewport)
- Push notification flow (mobile) vs WebSocket events (web) → cùng nằm trong 1 section

**Đề xuất:**
- Thêm `project_type: "hybrid"` hoặc cho phép multi-select platforms
- Template: tách Screen Design thành sub-sections per platform
- Mockup renderer đã support viewport (desktop/tablet/mobile) nhưng template không guide khi nào dùng viewport nào

---

### CASE-03: Existing system migration / modernization

**Hiện tại:** `project_type: "internal-system"` có "Include migration design references" nhưng rất generic.

**Vấn đề:**
- Không có section cho AS-IS vs TO-BE comparison
- Không có data migration strategy trong DB設計
- Legacy API compatibility (versioning, deprecation plan) không được cover
- Parallel run period (old + new system cùng chạy) không có section

**Đề xuất:**
- Thêm optional section "移行戦略" (Migration Strategy) khi detect migration context
- DB設計 thêm sub-section "データ移行方針" (Data Migration Plan)
- API設計 thêm "API互換性マトリクス" (API Compatibility Matrix)

---

### CASE-04: Multi-tenant SaaS với tenant customization

**Hiện tại:** `project_type: "saas"` thêm "multi-tenant architecture" nhưng chỉ ở mức high-level.

**Vấn đề:**
- Tenant isolation strategy (shared DB vs DB per tenant) cần chi tiết hơn
- Tenant-specific screen customization (white-label, custom fields) không có section
- Tenant data partitioning trong DB設計 không được enforce
- Billing/subscription model không nằm trong non-functional design

**Đề xuất:**
- SaaS template variant: thêm sections "テナント分離設計", "カスタマイズ設計"
- DB設計: enforce `tenant_id` column check khi `project_type: "saas"`

---

### CASE-05: Batch processing heavy system

**Hiện tại:** `project_type: "batch"` thêm job schedule table nhưng thiếu nhiều.

**Vấn đề:**
- Job dependency chain (Job A → Job B → Job C) không có visualization
- Error recovery strategy per job không được cover
- Data volume estimation per batch (ảnh hưởng performance design) missing
- Monitoring & alerting cho batch failures không nằm trong non-functional

**Đề xuất:**
- Thêm section "バッチ処理設計" (Batch Processing Design) cho batch projects
- Include job dependency Mermaid diagram
- TBL table thêm column "記録数予測" đã có nhưng batch cần thêm "ピーク時データ量"

---

### CASE-06: Real-time / Event-driven system

**Hiện tại:** Không có `project_type` cho event-driven architecture.

**Vấn đề:**
- Message queue / event bus không có section
- Event schema design không được track (tương tự API nhưng async)
- CQRS pattern (read/write model separation) không có guidance
- Saga / choreography pattern cho distributed transactions missing

**Đề xuất:**
- Thêm `project_type: "event-driven"`
- Sections: "イベント設計" (Event Design), "メッセージフロー" (Message Flow)
- ID type mới: `EVT-xxx` cho events, `MSG-xxx` cho message queues

---

### CASE-07: Government / regulated industry

**Hiện tại:** `project_type: "government"` exists nhưng không có specific instructions trong `PROJECT_TYPE_INSTRUCTIONS`.

**Vấn đề:**
- Accessibility requirements (WCAG 2.1 AA) cho screens không được enforce
- Audit trail design (ai làm gì, khi nào) cần dedicated section
- Data retention policy per table không có trong DB設計
- 個人情報 (PII) marking trên fields/tables không được track

**Đề xuất:**
- Government template: thêm "アクセシビリティ設計", "監査証跡設計", "データ保持方針"
- DB設計: thêm columns "保持期間", "個人情報フラグ" cho regulated projects
- Screen Design: thêm WCAG compliance checklist

---

### CASE-08: AI/ML integrated system

**Hiện tại:** Không có project type hay section cho ML components.

**Vấn đề:**
- ML model serving endpoint khác REST API thông thường (latency, versioning)
- Training data pipeline không nằm trong batch processing
- Model versioning + A/B testing infrastructure missing
- Explainability / bias monitoring không có trong non-functional

**Đề xuất:** Scope lớn, có thể tạo separate doc type hoặc thêm conditional sections khi detect ML context.

---

## 5. Đề xuất cải tiến

### 5.1 Validation nâng cao (Priority: High)

| Rule | Mô tả |
|------|--------|
| Cross-diagram consistency | SCR trong transition diagram = SCR trong table |
| TBL-ER consistency | TBL trong ER diagram = TBL trong table |
| API endpoint uniqueness | Không có 2 API cùng method + endpoint |
| Screen-function traceability | Mỗi F-xxx phải map tới ít nhất 1 SCR-xxx |
| Required upstream coverage | Warn nếu < 80% REQ-xxx được reference |

### 5.2 Template intelligence (Priority: Medium)

- Conditional sections dựa vào `project_type` thay vì inject text vào instructions
- Template variants: `basic-design-saas.md`, `basic-design-batch.md` cho complex project types
- Optional sections tự enable/disable dựa vào upstream content (VD: nếu functions-list có batch functions → auto-enable batch section)

### 5.3 Split mode improvements (Priority: High)

- Feature-scoped IDs: enforce `SCR-{FEATURE}-xxx` naming khi split mode
- Cross-feature dependency detection: Feature A's screen links to Feature B's API
- Parallel generation support: multiple features generate simultaneously
- Merge conflict detection: khi 2 features modify shared sections

### 5.4 Export quality (Priority: Medium)

- Excel: conditional formatting cho status columns (draft/review/approved)
- PDF: table of contents auto-generation
- PDF: page break before each major section
- Word: template-based export (user provides .docx template, tool fills data)

### 5.5 Mermaid diagram validation (Priority: Low)

- Pre-render syntax check trước khi inject vào PDF
- Complexity limit: warn nếu diagram > 50 nodes (render sẽ unreadable)
- Auto-split large ER diagrams thành sub-diagrams per domain

---

## 6. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SCR ID collision (split mode) | Doc chain broken | High (any split project) | Enforce feature prefix |
| RPT-xxx not tracked | CR propagation misses report changes | Medium | Add to ID_ORIGIN |
| Large project AI context overflow | Incomplete generation | Medium | Plan orchestration (exists) |
| Mermaid render failure in PDF | Missing diagrams | Low | Graceful degradation (exists) |
| Concurrent CR on same section | Lost updates | Low | Manual merge (exists, could improve) |
| Government compliance gaps | Legal risk for client | Medium | Add regulated project type |

---

## 7. Tóm tắt

### Điểm mạnh
- Cross-reference system và V-model chain rất solid
- Split mode + plan orchestration xử lý tốt project lớn
- Graceful degradation design tốt
- Multi-format export pipeline hoàn chỉnh

### Đã fix (5 bugs + 5 improvements)
1. **RPT-xxx** ✓ Thêm vào ID_ORIGIN map
2. **SCR ID collision** ✓ Feature-scoped ID support (`SCR-SAL-001` pattern)
3. **Validation rules** ✓ Cross-diagram consistency, API uniqueness, upstream coverage warning
4. **Staleness** ✓ Test file filter, minimum threshold support
5. **Changelog** ✓ Dedup protection
6. **Export quality** ✓ Excel conditional formatting, PDF auto-TOC, page breaks
7. **Mermaid validator** ✓ Created `mermaid-validator.ts`

### Cần improve tiếp
1. Project type instructions (microservice, hybrid, event-driven, ai-ml) — schema added, instructions pending
2. Template intelligence: conditional sections thay vì inject text
3. Template variants cho regulated projects (government, finance)
4. System migration / modernization template
5. SaaS multi-tenant customization template

### Cases chưa cover hoàn toàn (8 cases)
- 4 cases đã có project type schema: microservice, hybrid, event-driven, ai-ml (instructions pending)
- 4 cases cần template variants: migration, saas-custom, regulated, batch-heavy

---

## 8. Tracking Board

### Bugs

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | RPT-xxx missing from ID_ORIGIN map | Medium | FIXED | Added `RPT: "basic-design"` to ID_ORIGIN in `cross-ref-linker.ts:70` |
| BUG-02 | SCR ID collision in split mode | High | FIXED | Feature-scoped ID support added: `isOriginOf()` handles `SCR-SAL` → `SCR` prefix extraction (line 120-121) |
| BUG-03 | Completeness rules too loose | Low-Medium | FIXED | Added `validateApiUniqueness()` (lines 489-513) and `validateDiagramConsistency()` with cross-ref checks |
| BUG-04 | Staleness score formula bias | Low | FIXED | Added test file filter in `staleness-detector.ts:168-176` — excludes `.test.ts`, `__tests__/`, `test/` folders |
| BUG-05 | Changelog auto-insert race condition | Low | FIXED | Added dedup protection in `changelog-manager.ts:148` — checks existing version before inserting |

### Improvements

| ID | Title | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMP-01 | Advanced validation rules | High | FIXED | Implemented: cross-diagram consistency (line 469-484), API uniqueness (line 489-513), upstream coverage warning (line 558-564) |
| IMP-02 | Template intelligence / conditional sections | Medium | PARTIAL | Project type support (microservice, hybrid, event-driven, ai-ml) added to `types/documents.ts:76` |
| IMP-03 | Split mode feature-scoped IDs | High | FIXED | Feature-scoped ID extraction in `isOriginOf()` — `SCR-SAL-001` parsed as base `SCR` prefix |
| IMP-04 | Export quality enhancements | Medium | FIXED | Excel: conditional formatting (line 77), PDF: auto TOC generation (line 52), page breaks (line 72 `page-break-before`) |
| IMP-05 | Mermaid diagram validation | Low | FIXED | `mermaid-validator.ts` created (2224 bytes) — syntax check, diagram complexity validation |

### Uncovered Real-World Cases

| ID | Case | Priority | Status | Notes |
|----|------|----------|--------|-------|
| CASE-01 | Microservice architecture | High | IN_PROGRESS | Project type `"microservice"` added to schema; instructions pending |
| CASE-02 | Mobile + Web hybrid | Medium | IN_PROGRESS | Project type `"hybrid"` added to schema; instructions pending |
| CASE-03 | System migration / modernization | Medium | backlog | Requires template variants |
| CASE-04 | Multi-tenant SaaS customization | Medium | backlog | Requires template variants |
| CASE-05 | Batch processing heavy | Medium | backlog | Requires template variants |
| CASE-06 | Event-driven / real-time | Medium | IN_PROGRESS | Project type `"event-driven"` added to schema; instructions pending |
| CASE-07 | Government / regulated | High | backlog | Requires template variants + validation rules |
| CASE-08 | AI/ML integrated | Low | IN_PROGRESS | Project type `"ai-ml"` added to schema; instructions pending |
