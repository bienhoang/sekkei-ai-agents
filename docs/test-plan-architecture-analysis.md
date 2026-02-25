# Phan tich kien truc: sekkei:test-plan (テスト計画書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`test-plan` la test-phase doc type trong V-model chain — nhan input tu 5 upstream docs (requirements, nfr, basic-design, security-design, functions-list) va feed xuong 4 downstream test specs (ut-spec, it-spec, st-spec, uat-spec). Day la **central hub** cua toan bo test phase.

### Data Flow

```
[requirements] ──REQ-xxx──────────┐
[nfr] ──NFR-xxx───────────────────┤
[basic-design] ──SCR/TBL/API-xxx──┤──→ generate.ts → AI generates markdown
[security-design] ──SEC-xxx───────┤         │
[functions-list] ──F-xxx──────────┘         ▼
                                      test-plan.md
                                       (TP-xxx)
                                            │
              ┌─────────────┬──────────────┼─────────────┐
              ▼             ▼              ▼             ▼
          ut-spec       it-spec        st-spec       uat-spec
```

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-test.md` | Entry point, prerequisite check, interview |
| MCP Tool | `generate.ts` | Context assembly, upstream injection (5 upstream docs) |
| Instructions | `generation-instructions.ts:136-143` | 7-section prompt, TP-xxx format, entry/exit criteria |
| Template | `templates/ja/test-plan.md` (105 LOC) | 8 sections (7 + 参考資料), YAML frontmatter |
| Validation | `validator.ts` | Section check: テスト方針, テスト戦略, テスト環境, 完了基準 |
| Completeness | `completeness-rules.ts:202-208` | TP-xxx >= 3 check duy nhat |
| Cross-ref | `cross-ref-linker.ts:29-50` | 5 upstream chain pairs + 4 downstream pairs |
| ID_ORIGIN | `cross-ref-linker.ts:85` | `TP: "test-plan"` (also `TS: "test-plan"`) |
| Keigo | `generation-instructions.ts:325` | `simple` (である調) |

### Keigo & Style
- Default: `simple` (である調) — configured in `generation-instructions.ts:325`
- Template comment: `<!-- AI: Keigo: Use である調 throughout. -->`

---

## 2. Diem manh

### 2.1 Richest upstream context trong toan bo V-model
- 5 upstream docs: requirements, nfr, basic-design, security-design, functions-list
- TP table co the map test levels toi UT/IT/ST/UAT → su dung upstream REQ/F/NFR/SEC IDs
- security-design upstream (recent addition) → security test scope duoc inform

### 2.2 Entry/exit criteria per test level duoc explicit
- Template Table (Section 2.2): TP-ID, テストレベル, 入口基準, 出口基準, 担当, ツール
- 4 rows: UT (TP-001), IT (TP-002), ST (TP-003), UAT (TP-004) — fixed mapping
- Instructions: "Define entry/exit criteria per test level (UT/IT/ST/UAT)"

### 2.3 Central hub design cho toan bo test phase
- test-plan feed tat ca 4 test specs: ut-spec, it-spec, st-spec, uat-spec
- TP-xxx IDs duoc reference trong tung spec: UT references TP-001, IT references TP-002, etc.
- Toan bo test strategy duoc define 1 lan trong test-plan

### 2.4 Risk management trong test context
- Section 6 (リスクと対策): Testing-specific risks — schedule delay, data shortage, environment delay
- Risk table format: リスクID, リスク内容, 発生確率, 影響度, 対応策
- Linked voi project-plan risk register (conceptually)

### 2.5 Measurable completion criteria
- Section 7 (完了基準): "All criteria must be measurable with specific numbers"
- Example: "全テストケース実行完了, 欠陥残存数上限 (重大度別), テストカバレッジ達成率"

---

## 3. Diem yeu / Gap

### GAP-01: Completeness rules chi check TP count — missing substance

**Muc do: Medium-High**

`completeness-rules.ts:202-208` chi co **1 rule duy nhat**:

```typescript
"test-plan": [
  { check: "TP entries", test: (c) => (c.match(/TP-\d{3}/g) || []).length >= 3 }
]
```

**Cac check missing:**

| Check | Mo ta | Vi sao can |
|-------|-------|------------|
| Entry/exit criteria present | Section 2.2 table phai co 4 rows (UT/IT/ST/UAT) | Core cua test planning |
| Numeric completion criteria | Section 7 phai co numeric targets | Template: "must be measurable" |
| REQ cross-reference | Phai reference it nhat 1 REQ-xxx | Scope traceability |
| NFR cross-reference | Phai reference it nhat 1 NFR-xxx | Non-functional test scope |
| Test environment defined | Section 3 phai co environment table | Test execution prerequisite |
| 4 test levels present | TP-001 through TP-004 pattern | Complete test coverage |

### GAP-02: Security test scope co the missing

**Muc do: Medium**

security-design upstream (recent addition via `["security-design", "test-plan"]`), nhung:
- Instructions chi noi: "Cross-reference REQ-xxx, F-xxx, NFR-xxx IDs from upstream"
- security-design (SEC-xxx) khong explicit trong test-plan instructions
- security test scope (Penetration testing, SAST/DAST) khong mentioned

**Van de:** AI co the generate test-plan ma skip security-based test cases.

**Fix de xuat:** Update instructions: "Reference SEC-xxx from security-design for security test scope. Include セキュリティテスト section in test strategy."

### GAP-03: Test-plan khong reference project-plan schedule

**Muc do: Medium**

Section 4 (テストスケジュール) cite "aligned with project plan PP-xxx" nhung:
- CHAIN_PAIRS khong co `["project-plan", "test-plan"]`
- AI phai guess test schedule without real PP-xxx dates
- Milestone alignment (project milestones → test phase milestones) impossible without chain link

### GAP-04: Risk section thieu probability × impact matrix

**Muc do: Low**

Template Section 6 (リスクと対策): co risk table nhung chi 5 columns (リスクID, リスク内容, 発生確率, 影響度, 対応策). Missing:
- Risk score (probability × impact)
- Risk mitigation owner
- Contingency vs mitigation distinction
- Risk escalation threshold

### GAP-05: Test environment section thieu infra detail

**Muc do: Low**

Template Section 3 (テスト環境): "環境構成図, ハードウェア・ソフトウェア要件, テストデータ方針, ツール一覧."

Missing:
- Environment provisioning timeline (when will test env be ready)
- Test data masking requirements (PII handling) — link toi security-design
- Environment parity check (test env vs prod env delta)
- Tool version pinning (Jest v29.x, Playwright v1.x)

---

## 4. Recommendations

### 4.1 Them completeness rules (Priority: High)

```typescript
"test-plan": [
  { check: "TP entries", test: (c) => (c.match(/TP-\d{3}/g) || []).length >= 3 },
  {
    check: "entry exit criteria",
    test: (c) => /入口基準|出口基準/.test(c) && /TP-00[1-4]/.test(c),
    message: "テスト計画書: TP-001〜TP-004の入口・出口基準が必要です（UT/IT/ST/UAT）"
  },
  {
    check: "numeric completion criteria",
    test: (c) => {
      const completionSection = c.split(/##\s*7\.\s*完了基準/)[1] || "";
      return /\d+[%件回]/.test(completionSection);
    },
    message: "テスト計画書: 完了基準に数値目標が必要です（例: カバレッジ80%以上）"
  },
  {
    check: "REQ cross-reference",
    test: (c) => /REQ-\d{3}/.test(c),
    message: "テスト計画書: REQ-xxx参照が必要です（テスト範囲トレーサビリティ）"
  },
  {
    check: "NFR cross-reference",
    test: (c) => /NFR-\d{3}/.test(c),
    message: "テスト計画書: NFR-xxx参照が必要です（非機能テスト範囲）"
  },
]
```

### 4.2 Update instructions cho security test scope (Priority: Medium)

Them vao `GENERATION_INSTRUCTIONS["test-plan"]`:
```
Security test scope: If security-design is provided, reference SEC-xxx IDs in test strategy.
Include セキュリティテスト in Section 2.3 (テスト手法): SAST, DAST, Penetration Testing plan.
ST-spec will cover security test cases — plan the scope here in test-plan.
```

### 4.3 Chain pair project-plan → test-plan (Priority: Low)

Cho AI biet schedule context:
```typescript
["project-plan", "test-plan"]  // PP-xxx milestones → test schedule alignment
```

### 4.4 Test data masking guidance (Priority: Medium)

Them explicit note trong Section 3 template:
```
テストデータ方針 MUST include:
- 本番データ使用可否: Yes/No + 理由
- マスキング要件: PII fields to mask (reference SEC-xxx if available)
- テストデータ準備担当者 and timeline
```

---

## 5. Edge Cases & Invariants

### TP-ID Format Rules
- TP-ID format: `TP-\d{3}` (e.g., TP-001, TP-004)
- Special fixed assignments: TP-001=UT, TP-002=IT, TP-003=ST, TP-004=UAT
- Additional TP-xxx (TP-005+) for sub-test-types or additional scope
- `TS` prefix also originates from test-plan: `TS: "test-plan"` in ID_ORIGIN

### Entry/Exit Criteria Invariant
- EVERY test level (UT/IT/ST/UAT) MUST have explicit entry AND exit criteria
- Exit criteria MUST be measurable (no vague "testing complete")
- Accepted: coverage %, defect count thresholds, approval signatures

### Test Level Mapping
| TP-ID | Test Level | Primary Upstream | Primary Spec Doc |
|-------|-----------|-----------------|-----------------|
| TP-001 | UT (単体テスト) | detail-design CLS/DD-xxx | ut-spec |
| TP-002 | IT (結合テスト) | basic-design API/SCR/TBL-xxx | it-spec |
| TP-003 | ST (システムテスト) | functions-list F-xxx + basic-design | st-spec |
| TP-004 | UAT (受入テスト) | requirements REQ-xxx + nfr NFR-xxx | uat-spec |

### Completion Criteria Invariant
- Section 7 MUST contain numeric thresholds
- Required: UT/IT/ST/UAT completion count, critical defect threshold (0), coverage %
- "全テストケース実行完了" alone is NOT sufficient — must have measurable pass criteria

### Keigo Invariant
- である調 throughout (simple style)
- NEVER ですます調 in test-plan
- Consistent voi all 4 test spec docs (ut/it/st/uat-spec)

---

## 6. Upstream/Downstream Chain Detail

### CHAIN_PAIRS cho test-plan

**Upstream of test-plan:**
```typescript
["requirements", "test-plan"]
["nfr", "test-plan"]
["basic-design", "test-plan"]
["security-design", "test-plan"]
["functions-list", "test-plan"]
```

**test-plan as upstream:**
```typescript
["test-plan", "ut-spec"]
["test-plan", "it-spec"]
["test-plan", "st-spec"]
["test-plan", "uat-spec"]
```

**Missing (recommended):**
```typescript
["project-plan", "test-plan"]  // schedule alignment
```

### ID_ORIGIN mapping
```typescript
TP: "test-plan"   // test plan items
TS: "test-plan"   // alternative test strategy IDs
```

### Derived upstream ID prefixes cho test-plan
| Source Doc | ID Prefix | Used in test-plan for |
|------------|-----------|----------------------|
| requirements | REQ | Test scope, UAT acceptance criteria |
| nfr | NFR | Performance/security test targets |
| basic-design | SCR, TBL, API | IT scope definition |
| security-design | SEC | Security test scope |
| functions-list | F | ST scope, functional coverage |

### Downstream ID consumption by test specs
| Test Spec | Primary TP Reference | Secondary TP |
|-----------|---------------------|-------------|
| ut-spec | TP-001 | (inherits test framework from test-plan) |
| it-spec | TP-002 | (inherits environment from test-plan) |
| st-spec | TP-003 | (inherits completion criteria from test-plan) |
| uat-spec | TP-004 | (inherits sign-off process from test-plan) |

---

## 7. Bugs & Van de phat hien

### BUG-01: Completeness rules chi check TP count — no quality checks

**Muc do: Medium-High**

Test-plan la central hub nhung validation chi check count. Entry/exit criteria (core value) khong duoc validated.

**Fix de xuat:** Them 4 rules (entry/exit, numeric completion, REQ cross-ref, NFR cross-ref).

### BUG-02: Instructions khong mention SEC-xxx security test scope

**Muc do: Medium**

security-design duoc them vao upstream nhung test-plan instructions chi mention REQ/F/NFR. Security test scope co the bi skip.

**Fix de xuat:** Update instructions de explicit mention SEC-xxx va security test types.

### BUG-03: project-plan khong la upstream — test schedule khong co context

**Muc do: Low-Medium**

Section 4 yeu cau schedule alignment voi PP-xxx nhung khong co chain link.

**Fix de xuat:** Them optional chain pair `["project-plan", "test-plan"]`.

### BUG-04: TP-001 through TP-004 fixed mapping co the clash voi AI generation

**Muc do: Low**

Template hardcode TP-001=UT, TP-002=IT, TP-003=ST, TP-004=UAT nhung instructions chi noi "ID format: TP-001." AI co the start tu TP-001 cho bat ky level nao.

**Fix de xuat:** Instructions phai specify: "TP-001 for UT, TP-002 for IT, TP-003 for ST, TP-004 for UAT — use these fixed assignments."

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No entry/exit criteria validation | Unclear test completion | High | Add completeness check |
| Security test scope missing | Security gaps post-release | Medium | Update instructions for SEC-xxx |
| No schedule alignment | Test dates unrealistic | Medium | Add project-plan chain pair |
| TP-001-004 numbering mismatch | Wrong test level associations | Low | Fix instructions with fixed assignments |
| No NFR test targets | Non-functional tests pass vaguely | Medium | Add NFR cross-ref check |

---

## 9. Tom tat

### Diem manh
- Richest upstream context (5 docs) trong toan bo V-model
- Central hub design: 1 test-plan → 4 test specs
- Fixed TP-001-004 assignment cho 4 test levels
- Entry/exit criteria per test level in template
- security-design upstream added (recent improvement)

### Can fix (backlog)
- BUG-01: Them 4 completeness rules (entry/exit, numeric completion, REQ, NFR cross-ref)
- BUG-02: Instructions update cho SEC-xxx security test scope
- BUG-03: Optional chain pair project-plan → test-plan
- BUG-04: Fix instructions TP-001-004 fixed assignment

### Tracking Board

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | Completeness rules thieu entry/exit checks (1 rule only) | Medium-High | OPEN | Core test-plan value unvalidated |
| BUG-02 | SEC-xxx not in instructions — security test scope missing | Medium | OPEN | security-design upstream added but not leveraged |
| BUG-03 | project-plan not upstream — test schedule has no context | Low-Medium | OPEN | Section 4 can't align with PP-xxx dates |
| BUG-04 | TP-001-004 fixed mapping not enforced in instructions | Low | OPEN | AI may assign TP-001 to wrong level |
