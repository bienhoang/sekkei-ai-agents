# Phan tich kien truc: sekkei:project-plan (プロジェクト計画書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`project-plan` la requirements-phase doc type trong V-model chain — nhan input tu 2 upstream docs (requirements, functions-list) va la **terminal node** (khong co downstream docs trong CHAIN_PAIRS).

### Data Flow

```
[requirements] ──REQ-xxx──────────┐
[functions-list] ──F-xxx──────────┤──→ generate.ts → AI generates markdown
                                  │         │
                                  │         ▼
                                  │   project-plan.md
                                  │     (PP-xxx)
                                  │
                                  │   [TERMINAL — no downstream]
                                  └──────────────────────────────
```

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-requirements.md` | Entry point, prerequisite check, interview |
| MCP Tool | `generate.ts` | Context assembly, upstream injection |
| Instructions | `generation-instructions.ts:127-134` | 7-section prompt, PP-xxx WBS format |
| Template | `templates/ja/project-plan.md` (99 LOC) | 8 sections, YAML frontmatter |
| Validation | `validator.ts` | Section check: プロジェクト概要, WBS, 体制, リスク管理 |
| Completeness | `completeness-rules.ts:195-201` | PP-xxx >= 3 check duy nhat |
| Cross-ref | `cross-ref-linker.ts:17-18` | Chain pairs: requirements → project-plan, functions-list → project-plan |
| ID_ORIGIN | `cross-ref-linker.ts:81` | `PP: "project-plan"` |
| Keigo | `generation-instructions.ts:319` | `丁寧語` (ですます調) |

### Keigo & Style
- Default: `丁寧語` (ですます調) — configured in `generation-instructions.ts:319`
- Template comment: `<!-- AI: Keigo: Use ですます調 throughout. -->`

---

## 2. Diem manh

### 2.1 Terminal node design phu hop
- project-plan la planning document, khong phai technical spec — dung la terminal
- Nhan context tu ca requirements (REQ-xxx) va functions-list (F-xxx) de build complete WBS
- Khong co downstream docs → khong co cross-ref responsibility
- Tach biet plan management khoi document chain

### 2.2 WBS structure ro rang
- Template co PP-ID column trong WBS table — trackable
- 6 standard phases: 要件定義, 基本設計, 詳細設計, 実装, テスト, リリース
- Template suggest Mermaid Gantt chart cho schedule visualization
- Risk management table voi risk ID, probability, impact, mitigation

### 2.3 Cross-reference ca 2 upstream docs
- Instructions: "Cross-reference REQ-xxx IDs from upstream 要件定義書. Include F-xxx from 機能一覧 if available."
- Functions-list upstream → WBS tasks co the map to F-xxx (function scope → task scope)
- Requirements upstream → acceptance criteria co the derive tu REQ-xxx

### 2.4 Section structure full project lifecycle
- Section 3: 体制 (RACI matrix) — accountability clear
- Section 4: リソース計画 (team size, tools, budget)
- Section 5: リスク管理 (risk register voi probability × impact)
- Section 6: 品質管理 (defect density, coverage targets, quality gates)
- Section 7: コミュニケーション計画 (meeting schedule, escalation path)

---

## 3. Diem yeu / Gap

### GAP-01: Completeness rules chi check PP-xxx >= 3

**Muc do: Medium-High**

`completeness-rules.ts:195-201` chi co **1 rule duy nhat**:

```typescript
"project-plan": [
  { check: "PP entries", test: (c) => (c.match(/PP-\d{3}/g) || []).length >= 3 }
]
```

**Cac check missing:**

| Check | Mo ta | Vi sao can |
|-------|-------|------------|
| Risk entries | Phai co it nhat 1 risk entry voi リスクID | Core section cua project plan |
| Milestone dates | Phai co YYYY-MM-DD date format | Schedule completeness |
| RACI/team roles | Phai co role definitions trong 体制 | Project governance requirement |
| REQ cross-ref | Phai reference it nhat 1 REQ-xxx | Upstream traceability |
| F-xxx cross-ref | Phai reference it nhat 1 F-xxx (khi available) | Scope traceability |
| WBS work unit | Moi PP-xxx MUST co 工数 (effort estimate) | Planning completeness |

### GAP-02: project-plan khong co downstream — mismatch voi thuc te

**Muc do: Medium**

project-plan la terminal theo CHAIN_PAIRS. Nhung trong thuc te:

**Van de thuc te:**
- detail-design va implementation tasks derive tu WBS PP-xxx
- test-plan schedule align voi project-plan PP-xxx milestones
- Change requests (CR) anh huong project-plan schedule nhung khong co chain link

**De xuat:** Xem xet them chain pair:
```typescript
["project-plan", "test-plan"]  // test schedule align voi project milestones
```

### GAP-03: WBS depth qua shalllow — chi 6 phases, khong co work packages

**Muc do: Medium**

Template chi list 6 phases (要件定義 → リリース). Thuc te project co the can:
- Sub-tasks per phase (e.g., 基本設計: 画面設計, DB設計, API設計)
- Work packages voi dependencies
- Critical path identification
- Sprint breakdown (agile projects)

**Van de:** AI generate flat WBS, khong co hierarchy hay dependencies.

**De xuat:** Template nen co 2-level WBS: phase level + task level, voi task dependencies column.

### GAP-04: Quality management section thieu numeric targets

**Muc do: Medium**

Template Section 6 (品質管理): "欠陥密度, テストカバレッジ率等" — nhung khong co numeric targets.

**Van de:** AI co the generate "高いカバレッジ" (vague) thay vi "UT coverage >= 80%" (measurable).

**De xuat:** Them note trong template: "All quality goals MUST have numeric targets: e.g., UT coverage >= 80%, defect density <= 0.1 bugs/LOC."

### GAP-05: Risk management thieu probability × impact matrix

**Muc do: Low**

Template co risk table nhung khong specify:
- Probability scale (5-point: 1=very low, 5=very high)
- Impact scale (5-point)
- Risk score = probability × impact
- Risk heat map recommendation

---

## 4. Recommendations

### 4.1 Them completeness rules (Priority: High)

```typescript
"project-plan": [
  { check: "PP entries", test: (c) => (c.match(/PP-\d{3}/g) || []).length >= 3 },
  {
    check: "REQ cross-reference",
    test: (c) => /REQ-\d{3}/.test(c),
    message: "プロジェクト計画書: REQ-xxx参照が必要です"
  },
  {
    check: "risk entries",
    test: (c) => /リスクID|Risk-\d|R-\d{3}/.test(c),
    message: "プロジェクト計画書: リスク管理セクションにリスクエントリが必要です"
  },
  {
    check: "milestone dates",
    test: (c) => /\d{4}-\d{2}-\d{2}/.test(c),
    message: "プロジェクト計画書: WBSにYYYY-MM-DD形式の日付が必要です"
  },
]
```

### 4.2 Them chain pair project-plan → test-plan (Priority: Low)

Cho test-plan biet milestones va schedule tu project-plan:
```typescript
["project-plan", "test-plan"]
```

### 4.3 WBS template 2-level hierarchy (Priority: Medium)

Expand template WBS table:
```
| PP-ID | Loai | Phase | Task | Dep | Assignee | Start | End | Effort | Status |
|-------|------|-------|------|-----|----------|-------|-----|--------|--------|
| PP-001 | Phase | 要件定義 | — | — | PM | ... | ... | 10人日 | 未着手 |
| PP-002 | Task | 要件定義 | 要件ヒアリング | PP-001 | BA | ... | ... | 5人日 | 未着手 |
```

### 4.4 Agile preset support (Priority: Medium)

Project-type "agile" co instructions trong requirements (user story format) nhung project-plan khong co agile-aware instructions.

De xuat: Them conditional instructions:
```
If project_type = "agile":
  - Replace WBS phases with Sprint backlog format
  - Replace Gantt chart with Velocity chart guidance
  - Quality goals: definition of done per story
```

---

## 5. Edge Cases & Invariants

### PP-ID Format Rules
- PP-ID format: `PP-\d{3}` (e.g., PP-001, PP-015)
- PP-ID scope: WBS task entries — NOT phases
- Terminal node: PP-xxx khong duoc reference boi bat ky downstream doc nao trong CHAIN_PAIRS

### WBS Completeness
- Minimum 6 phases phai present (template defines 6)
- Each PP-xxx MUST have: 担当 (assignee), 開始日, 終了日, 工数 (effort)
- ステータス values: 未着手/進行中/完了/中止

### Risk Management
- Risk table format: リスクID, リスク内容, 発生確率, 影響度, 優先度, 対応策, 担当
- Risk levels: 高/中/低 (no numeric required, but consistent)
- Every critical risk (priority: 高) MUST have 担当 (owner)

### Keigo Invariant
- ですます調 throughout (丁寧語) — consistent voi requirements va nfr
- NEVER である調 trong project-plan

---

## 6. Upstream/Downstream Chain Detail

### CHAIN_PAIRS cho project-plan

**Upstream of project-plan:**
```typescript
["requirements", "project-plan"]
["functions-list", "project-plan"]
```

**project-plan as upstream:**
- NONE — terminal node trong hien tai

### ID_ORIGIN mapping
```typescript
PP: "project-plan"  // single origin
```

### Derived upstream ID prefixes cho project-plan
- requirements → REQ-xxx
- functions-list → F-xxx
- project-plan consumes: REQ-xxx, F-xxx
- project-plan produces: PP-xxx (WBS task IDs)

### Terminal Node Implications
| Aspect | Impact |
|--------|--------|
| No downstream | PP-xxx khong duoc cross-referenced boi other docs |
| Standalone | project-plan co the generate bat ky luc nao sau requirements |
| Change propagation | CR changes to scope khong auto-trigger project-plan update |
| Staleness | project-plan khong track upstream staleness (no downstream to notify) |

---

## 7. Bugs & Van de phat hien

### BUG-01: Completeness rules chi check PP count — missing substance checks

**Muc do: Medium**

1 rule duy nhat (PP >= 3) khong detect:
- Missing risk management (quan trong nhat trong project plan)
- Missing milestone dates
- Missing REQ/F-xxx traceability

**Fix de xuat:** Them 3 rules (REQ cross-ref, risk entries, milestone dates).

### BUG-02: WBS thieu hierarchy va dependencies

**Muc do: Medium**

6-phase flat WBS khong phu hop voi real projects. Task dependencies (A must finish before B) khong co column.

**Fix de xuat:** Them 2-level WBS structure vao template va instructions.

### BUG-03: Agile project-plan khong co dedicated instructions

**Muc do: Low**

requirements co `when preset is 'agile'` instructions. project-plan khong co.

**Fix de xuat:** Them agile preset conditional vao `GENERATION_INSTRUCTIONS["project-plan"]`.

### BUG-04: project-plan la terminal nhung test-plan can schedule alignment

**Muc do: Low**

test-plan schedule phai align voi project-plan milestones nhung khong co chain link → AI phai guess test dates.

**Fix de xuat:** Them optional chain pair `["project-plan", "test-plan"]`.

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No risk entries validation | Empty risk section | High | Add risk entry check |
| No date validation | Undated WBS | High | Add YYYY-MM-DD check |
| Flat WBS insufficient | Poor project planning | Medium | Expand template |
| No agile support | Irrelevant for agile projects | Medium | Add agile preset |
| Terminal node misses test schedule | Test plan lacks schedule context | Low | Add chain pair |

---

## 9. Tom tat

### Diem manh
- Terminal node design phu hop — project-plan khong feed technical docs
- WBS co PP-xxx IDs de trackable
- 7-section structure cover full project lifecycle (overview, WBS, team, resource, risk, quality, comms)
- Cross-reference ca REQ-xxx va F-xxx tu 2 upstream docs

### Can fix (backlog)
- BUG-01: Them 3+ completeness rules (risk, dates, REQ cross-ref)
- BUG-02: WBS 2-level hierarchy va dependency column
- BUG-03: Agile preset instructions
- BUG-04: Optional chain pair → test-plan

### Tracking Board

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | Completeness rules thieu substance checks | Medium | OPEN | Chi check PP count, missing risk/date/REQ |
| BUG-02 | WBS flat structure, no task dependencies | Medium | OPEN | Template/instructions need 2-level WBS |
| BUG-03 | No agile preset for project-plan | Low | OPEN | requirements co agile mode, project-plan khong |
| BUG-04 | Terminal node misses test schedule alignment | Low | OPEN | Consider chain pair project-plan → test-plan |
