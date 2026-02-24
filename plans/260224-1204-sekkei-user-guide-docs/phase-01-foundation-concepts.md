# Phase 01 — Foundation Concepts

**Status:** completed
**Parallelization:** Sequential first — must complete before Phases 2A/2B/2C/3/4 start
**Effort:** ~2h
**Files owned (3):**
- `sekkei/docs/user-guide/introduction.md`
- `sekkei/docs/user-guide/v-model-and-documents.md`
- `sekkei/docs/user-guide/quick-start.md`

---

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260224-1204-sekkei-user-guide-docs.md`
- Commands research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-01-commands-workflows.md`
- V-model research: `plans/260224-1204-sekkei-user-guide-docs/research/researcher-02-vmodel-doctypes.md`
- SKILL.md: `sekkei/packages/skills/content/SKILL.md`
- Config example: `sekkei/sekkei.config.example.yaml`

---

## File 1: `introduction.md` (~120 lines)

**Purpose:** Value proposition, what Sekkei is, who uses it, why output is Japanese.

**Content outline:**
1. **Sekkei là gì** — AI agent tạo tài liệu spec tiếng Nhật theo chuẩn IPA. Chạy trong Claude Code. Output: 13 loại tài liệu (要件定義書, 基本設計書, etc.)
2. **Tại sao output tiếng Nhật** — Khách hàng Nhật yêu cầu theo chuẩn IPA. Team Việt viết đặc tả bằng tiếng Nhật thay vì tự dịch thủ công.
3. **Ai dùng được** — Bảng 5 role: BA, Sales, PM, Dev Lead, QA — mỗi role dùng gì
4. **Value proposition** — Tiết kiệm 60-80% thời gian viết spec; cross-reference IDs tự động; chain validation
5. **Môi trường hỗ trợ** — Claude Code (primary), Cursor, GitHub Copilot
6. **Giới hạn** — Cần review kỹ output AI; không thay thế domain knowledge của BA/Dev
7. **Thuật ngữ cần biết** — 3 terms: V-model, IPA標準, chain (chuỗi tài liệu phụ thuộc)

**Mermaid:** Simple diagram showing Sekkei position: `Team → [Sekkei] → Japanese Spec Docs → Japanese Client`

**Writing notes:**
- Tone: casual "bạn/mình" — friendly, non-intimidating for non-tech readers
- Avoid jargon; explain every Japanese term inline on first use
- Format: `**Japanese term** (Tên tiếng Việt)` pattern throughout
- ALL 22 files use this same casual tone consistently
<!-- Updated: Validation Session 1 - Tone set to casual "bạn/mình" -->

---

## File 2: `v-model-and-documents.md` (~300 lines)

**Purpose:** Full V-model explanation + all 13 core doc types in detail + 9 supplementary summary.

**Content outline:**

### Section 1: V-Model là gì (~40 lines)
- Mô hình phát triển phần mềm của Nhật
- Mermaid V-model diagram (left=spec, right=test, paired levels)
- Giải thích: mỗi tài liệu spec có tài liệu test tương ứng
- Cross-reference ID system overview: REQ-001 → F-001 → SCR-001 → UT-001

### Section 2: 13 Core Document Types — chi tiết (~200 lines)
For each doc, use consistent card format:
```
#### [số]. [Tên tiếng Việt] — [日本語名]
- **Là gì:** plain language explanation
- **Ai tạo:** role | **Ai review:** role
- **Khi nào:** prerequisite/trigger
- **Input cần:** upstream docs
- **Output:** file path pattern + ID prefix
- **Lệnh:** `/sekkei:command @input` with brief example
```

Docs to cover (in order):
1. 要件定義書 — source: researcher-02 Phase 1, researcher-01 row #2
2. 機能一覧 — source: researcher-02 Phase 1, researcher-01 row #3
3. 非機能要件定義書 — source: researcher-02 Phase 1, researcher-01 row #4
4. プロジェクト計画書 — source: researcher-02 Phase 1, researcher-01 row #5
5. 基本設計書 — source: researcher-02 Phase 2, researcher-01 row #6
6. セキュリティ設計書 — source: researcher-02 Phase 2, researcher-01 row #7
7. 詳細設計書 — source: researcher-02 Phase 3, researcher-01 row #8
8. テスト計画書 — source: researcher-02 Phase 4, researcher-01 row #9
9. 単体テスト仕様書 — source: researcher-02 Phase 4, researcher-01 row #10
10. 結合テスト仕様書 — source: researcher-02 Phase 4, researcher-01 row #11
11. システムテスト仕様書 — source: researcher-02 Phase 4, researcher-01 row #12
12. 受入テスト仕様書 — source: researcher-02 Phase 4, researcher-01 row #13
13. 変更要求書 (CR) — source: researcher-01 CR flow

### Section 3: 9 Supplementary Documents (~40 lines)
Summary table format (not cards):
- CRUD図 / トレーサビリティ, サイトマップ, 運用設計書, 移行設計書, 画面設計書, 議事録, ADR, テストエビデンス, 翻訳
- Source: researcher-02 "9 Supplementary" section
- Each: one line description + command

### Section 4: IPA Standard Format (~20 lines)
- 4-sheet Excel structure (表紙, 更新履歴, 目次, 本文)
- Why this matters: client expects this exact format
- Source: researcher-02 "IPA Document Standards"

**Mermaid diagrams needed:**
1. V-model paired diagram (spec left, test right)
2. Chain dependency flowchart (RFP → req → ... → test-specs)
3. Cross-reference ID linkage example

---

## File 3: `quick-start.md` (~150 lines)

**Purpose:** First-time user tutorial: install → init → create first requirements doc → preview.

**Content outline:**

### Step 0: Prerequisites
- Claude Code installed, project initialized
- Node.js 18+ (for `npx sekkei init`)

### Step 1: Khởi tạo Sekkei
```bash
npx sekkei init
```
- Interactive wizard explanation: what each question means
- Output: `sekkei.config.yaml` created
- Source: researcher-01 "Prerequisites"

### Step 2: Kiểm tra môi trường
```
/sekkei:version
/sekkei:status
```
- Explain status output: chain progress dashboard

### Step 3: Tạo Requirements đầu tiên
Two sub-paths:
- **Có RFP sẵn:** `/sekkei:rfp` → paste → Q&A → scope freeze → `/sekkei:requirements`
- **Không có RFP:** `/sekkei:requirements @[paste your requirements text]` directly

Show example output snippet (realistic sample — SaaS HR management system: 人事管理システム)
<!-- Updated: Validation Session 1 - Example project changed to SaaS HR system -->

### Step 4: Xem kết quả
```
/sekkei:preview
```
Open `localhost:5173`, navigate to the generated doc

### Step 5: Xuất file
```
/sekkei:export @requirements --format=xlsx
```
Result: IPA-standard Excel with 4 sheets

### Bước tiếp theo
- Link to `workflow/requirements.md` for full chain
- Link to `workflow/index.md` for project overview
- Link role-specific guide

**Callout boxes:**
- `> [!TIP]` — `/sekkei:status` anytime to see what to do next
- `> [!WARNING]` — Order matters: cannot skip prerequisites
- `> [!NOTE]` — RFP is optional; can start at requirements directly

---

## Implementation Steps

1. Read `sekkei/packages/skills/content/SKILL.md` for exact command syntax
2. Read `sekkei/sekkei.config.example.yaml` for init wizard fields
3. Write `introduction.md` first (establishes tone + vocabulary)
4. Write `v-model-and-documents.md` (heaviest file — 300 lines)
5. Write `quick-start.md` last (references terms from above two files)
6. Verify Mermaid syntax using v11 rules (flowchart TD, no parentheses in node labels)

## Todo

- [ ] Read SKILL.md for command syntax verification
- [ ] Read sekkei.config.example.yaml for init fields
- [ ] Create `sekkei/docs/user-guide/` directory
- [ ] Write `introduction.md`
- [ ] Write `v-model-and-documents.md` with 3 Mermaid diagrams
- [ ] Write `quick-start.md` with step-by-step tutorial
- [ ] Verify all 13 doc types covered with consistent card format
- [ ] Verify all Mermaid diagrams use v11 syntax

## Success Criteria

- All 3 files exist in `sekkei/docs/user-guide/`
- v-model-and-documents.md covers all 13 core + 9 supplementary doc types
- Each core doc has: là gì, ai tạo, khi nào, input, output, lệnh
- quick-start.md walkable by a non-tech BA with zero prior Sekkei knowledge
- Mermaid diagrams render in VitePress (no syntax errors)
- No duplicate content between files

## Risk Assessment

- **Risk:** Mermaid v11 syntax errors → test with `/mermaidjs-v11` skill
- **Risk:** Command syntax incorrect → verify against SKILL.md
- **Risk:** v-model-and-documents.md too long (300 lines) → acceptable for this file; do not split further
