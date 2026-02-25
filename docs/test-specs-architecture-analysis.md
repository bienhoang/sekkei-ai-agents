# Phan tich kien truc: sekkei:ut-spec / it-spec / st-spec / uat-spec (テスト仕様書群)

> Ngay phan tich: 2026-02-25
> Pham vi: 4 test spec docs — UT, IT, ST, UAT — pipeline tu generation → validation → export

---

## 1. Tong quan kien truc

4 test spec doc types (`ut-spec`, `it-spec`, `st-spec`, `uat-spec`) la V-model test-phase leaves — moi spec nhan input tu test-plan (TP-xxx) va upstream design docs khac nhau. Tat ca deu share cung 12-column test case table format va 4-section structure.

### Data Flow (per spec)

```
UT-SPEC:
[detail-design] ──CLS/DD-xxx──────┐
[test-plan] ──TP-001──────────────┤──→ generate.ts → ut-spec.md (UT-xxx)

IT-SPEC:
[detail-design] ──CLS/DD-xxx──────┐
[basic-design] ──API/SCR/TBL-xxx──┤──→ generate.ts → it-spec.md (IT-xxx)
[test-plan] ──TP-002──────────────┘

ST-SPEC:
[basic-design] ──SCR/TBL-xxx──────┐
[functions-list] ──F-xxx──────────┤──→ generate.ts → st-spec.md (ST-xxx)
[security-design] ──SEC-xxx───────┤
[test-plan] ──TP-003──────────────┘

UAT-SPEC:
[requirements] ──REQ-xxx──────────┐
[nfr] ──NFR-xxx───────────────────┤──→ generate.ts → uat-spec.md (UAT-xxx)
[test-plan] ──TP-004──────────────┘
```

### Cac layer chinh (shared)

| Layer | UT | IT | ST | UAT |
|-------|----|----|----|----|
| Instructions | lines 145-153 | lines 155-163 | lines 165-173 | lines 175-183 |
| Template | `ut-spec.md` (90L) | `it-spec.md` (90L) | `st-spec.md` (90L) | `uat-spec.md` (101L) |
| Validator sections | テスト設計, 単体テストケース, トレーサビリティ, デフェクト報告 | 結合テストケース | システムテストケース | 受入テストケース |
| Completeness | UT-xxx >= 3 | IT-xxx >= 3 | ST-xxx >= 3 | UAT-xxx >= 3 |
| ID_ORIGIN | `UT: "ut-spec"` | `IT: "it-spec"` | `ST: "st-spec"` | `UAT: "uat-spec"` |
| Keigo | simple (である調) | simple | simple | simple |

### Shared 12-column Test Case Table

```
| No. | テストケースID | テスト対象 | テスト観点 | 前提条件 | テスト手順 |
  入力値 | 期待値 | 実行結果 | 判定 | デフェクトID | 備考 |
```

---

## 2. Diem manh

### 2.1 Consistent 12-column format across all 4 specs
- Toan bo 4 specs deu dung cung table structure
- 実行結果 va 判定 left blank at generation time — filled during execution
- デフェクトID link test case toi defect tracker
- Format familiar cho test engineers — khong can re-learn per spec

### 2.2 Traceability direction ro rang per spec
- UT: `DD-xxx → CLS-xxx → UT-xxx`
- IT: `API-xxx → SCR-xxx → IT-xxx`
- ST: `F-xxx → SCR-xxx → ST-xxx`
- UAT: `REQ-xxx → NFR-xxx → UAT-xxx`
- Moi spec co dedicated traceability table voi dung cot matching its upstream IDs

### 2.3 テスト観点 duoc differentiate per level
- UT: 正常系/異常系/境界値 — code-level test perspectives
- IT: API契約検証/画面遷移/データ整合性/エラー伝播/タイムアウト処理
- ST: E2Eシナリオ/性能テスト/セキュリティテスト/障害回復 — system-level
- UAT: ビジネスシナリオ/非機能受入 — business language, no tech jargon

### 2.4 UAT co sign-off section unique trong tat ca specs
- uat-spec template co Section 5 (サインオフ) — khong co trong UT/IT/ST
- Sign-off table: 全UATケース合格, 重大欠陥残存なし, 顧客承認取得, 本番リリース承認
- Leave blank for human completion — correct design

### 2.5 test-plan chain link clear
- test-plan feeds tat ca 4 specs via CHAIN_PAIRS
- Moi spec reference TP-00N trong Section "参考資料"
- Toan bo test strategy defined 1 lan trong test-plan → specs inherit

---

## 3. Diem yeu / Gap

### GAP-01: Completeness rules chi check count — no quality checks (toan bo 4 specs)

**Muc do: Medium-High**

Tat ca 4 specs chi co 1 rule:

```typescript
"ut-spec":  [{ check: "UT cases", test: (c) => count >= 3 }]
"it-spec":  [{ check: "IT cases", test: (c) => count >= 3 }]
"st-spec":  [{ check: "ST cases", test: (c) => count >= 3 }]
"uat-spec": [{ check: "UAT cases", test: (c) => count >= 3 }]
```

**Missing checks per spec:**

| Spec | Missing Checks |
|------|----------------|
| ut-spec | テスト観点 coverage (正常系/異常系/境界値 all present), CLS cross-ref, TP-001 reference |
| it-spec | API-xxx cross-ref, SCR-xxx cross-ref, TP-002 reference |
| st-spec | F-xxx cross-ref, NFR-xxx cross-ref (performance targets), SEC-xxx cross-ref, TP-003 reference |
| uat-spec | REQ-xxx cross-ref, NFR-xxx cross-ref, sign-off table present, TP-004 reference |

### GAP-02: UT テスト観点 coverage khong duoc validated

**Muc do: Medium-High**

Instructions: "テスト観点 MUST cover: 正常系 (normal flow), 異常系 (error/exception handling), 境界値 (boundary values). Generate at least 5 cases per module."

Nhung completeness-rules chi check UT count >= 3. Possible outcome:
- AI generates 3 正常系 cases only → pass validation
- Missing 異常系 va 境界値 → untested error paths va edge cases

**Fix de xuat:**
```typescript
{
  check: "UT test perspectives",
  test: (c) => /正常系/.test(c) && /異常系/.test(c) && /境界値/.test(c),
  message: "単体テスト仕様書: 正常系・異常系・境界値の3観点が必要です"
}
```

### GAP-03: IT spec thieu API contract validation check

**Muc do: Medium**

Instructions: "Focus on API integration, screen transitions, data flow." IT test cases should cover API request/response contract validation.

Nhung khong co completeness check ensuring:
- At least 1 IT case references API-xxx
- At least 1 IT case covers error response handling
- HTTP status codes tested (400, 401, 404, 500)

### GAP-04: ST spec thieu NFR performance test validation

**Muc do: Medium-High**

ST-spec instructions: "テスト観点: パフォーマンス/セキュリティ/負荷/E2E."
NFR-xxx upstream provides performance targets (P95 response time, concurrent users, throughput).

Nhung:
- Completeness rules khong check NFR cross-reference trong st-spec
- Performance test cases (ST-xxx) co the missing entirely
- Security test cases (SEC-xxx) co the missing entirely
- AI co the generate only E2E functional tests → system test incomplete

**Van de:** ST-spec la primary location de validate NFR targets nhung khong co enforcement.

### GAP-05: UAT spec co the miss business scenario coverage

**Muc do: Medium**

UAT instructions: "Every REQ-xxx from 要件定義書 must have at least one UAT-xxx." Nhung completeness chi check count >= 3.

**Van de:** AI co the generate 3 generic UAT cases covering 3 out of 20 REQ-xxx → 85% acceptance gap.

**Fix de xuat:** Check phai require REQ cross-ref presence, khong chi UAT count.

### GAP-06: Traceability tables co the co gaps

**Muc do: Medium**

Template instruction: "Missing traceability = test gap." Nhung:
- Khong co completeness check verifying traceability table non-empty
- AI co the generate test cases nhung skip traceability section
- Section 3 (トレーサビリティ) la separate table — AI co the generate placeholder only

### GAP-07: detail-design la upstream cua ca UT va IT — overlap potential

**Muc do: Low-Medium**

CHAIN_PAIRS:
```typescript
["detail-design", "ut-spec"]  // CLS-xxx → UT-xxx
["detail-design", "it-spec"]  // CLS-xxx → IT-xxx (also basic-design)
```

IT-spec nhan detail-design upstream nhung instructions chi say: "Focus on API integration, screen transitions." CLS-xxx co trong IT-spec's upstream nhung IT instructions khong mention CLS-xxx.

**Van de:** AI generating IT-spec co the generate class-level tests (UT scope) thay vi integration tests.

### GAP-08: uat-spec sign-off section khong duoc validated

**Muc do: Low**

uat-spec la duy nhat co sign-off section (Section 5). Nhung completeness rules khong check sign-off table present.

**Van de:** AI co the generate uat-spec without sign-off table → acceptance process incomplete.

---

## 4. Recommendations

### 4.1 Them completeness rules cho UT (Priority: High)

```typescript
"ut-spec": [
  { check: "UT cases", test: (c) => (c.match(/UT-\d{3}/g) || []).length >= 3 },
  {
    check: "UT test perspectives",
    test: (c) => /正常系/.test(c) && /異常系/.test(c) && /境界値/.test(c),
    message: "単体テスト仕様書: 正常系・異常系・境界値の3観点全てが必要です"
  },
  {
    check: "CLS cross-reference",
    test: (c) => /CLS-\d{3}/.test(c),
    message: "単体テスト仕様書: CLS-xxx参照が必要です（詳細設計書クラスへのトレーサビリティ）"
  },
  {
    check: "traceability table",
    test: (c) => /DD-ID|DD-\d{3}/.test(c),
    message: "単体テスト仕様書: トレーサビリティテーブルにDD-xxx参照が必要です"
  },
]
```

### 4.2 Them completeness rules cho IT (Priority: High)

```typescript
"it-spec": [
  { check: "IT cases", test: (c) => (c.match(/IT-\d{3}/g) || []).length >= 3 },
  {
    check: "API cross-reference",
    test: (c) => /API-\d{3}/.test(c),
    message: "結合テスト仕様書: API-xxx参照が必要です（API契約検証トレーサビリティ）"
  },
  {
    check: "error handling tests",
    test: (c) => /エラーハンドリング|エラー伝播|異常系/.test(c),
    message: "結合テスト仕様書: エラーハンドリングテストケースが必要です"
  },
]
```

### 4.3 Them completeness rules cho ST (Priority: High)

```typescript
"st-spec": [
  { check: "ST cases", test: (c) => (c.match(/ST-\d{3}/g) || []).length >= 3 },
  {
    check: "F cross-reference",
    test: (c) => /F-\d{3}/.test(c),
    message: "システムテスト仕様書: F-xxx参照が必要です（機能カバレッジトレーサビリティ）"
  },
  {
    check: "NFR test cases",
    test: (c) => /NFR-\d{3}|性能テスト|パフォーマンス|負荷テスト/.test(c),
    message: "システムテスト仕様書: NFR-xxx参照または性能テストケースが必要です"
  },
  {
    check: "E2E scenario present",
    test: (c) => /E2E|エンドツーエンド|業務シナリオ/.test(c),
    message: "システムテスト仕様書: E2Eシナリオテストケースが必要です"
  },
]
```

### 4.4 Them completeness rules cho UAT (Priority: High)

```typescript
"uat-spec": [
  { check: "UAT cases", test: (c) => (c.match(/UAT-\d{3}/g) || []).length >= 3 },
  {
    check: "REQ cross-reference",
    test: (c) => /REQ-\d{3}/.test(c),
    message: "受入テスト仕様書: REQ-xxx参照が必要です（要件受入トレーサビリティ）"
  },
  {
    check: "NFR cross-reference",
    test: (c) => /NFR-\d{3}/.test(c),
    message: "受入テスト仕様書: NFR-xxx参照が必要です（非機能受入基準）"
  },
  {
    check: "sign-off table",
    test: (c) => /サインオフ|全UATケース合格|顧客承認/.test(c),
    message: "受入テスト仕様書: サインオフセクションが必要です"
  },
]
```

### 4.5 Clarify IT scope boundary voi detail-design upstream (Priority: Medium)

Update IT instructions:
```
Note: detail-design (CLS-xxx) is provided as upstream context for understanding
module behavior. IT test cases focus on INTERFACE-level testing (API contracts,
screen transitions, data flow between components), NOT class-level unit testing.
CLS-xxx is for reference only — do not generate class method tests in IT-spec.
```

---

## 5. Edge Cases & Invariants

### ID Format Rules
- UT-ID: `UT-\d{3}` (e.g., UT-001, UT-025)
- IT-ID: `IT-\d{3}` (e.g., IT-001, IT-010)
- ST-ID: `ST-\d{3}` (e.g., ST-001, ST-008)
- UAT-ID: `UAT-\d{3}` (e.g., UAT-001, UAT-015)
- All IDs sequential, reset per spec (each spec starts at 001)

### Minimum Test Case Requirements
- UT: >= 5 cases per CLS-xxx (instructions), >= 3 enforced (validator)
- IT: >= 5 integration test cases (instructions), >= 3 enforced (validator)
- ST: >= 3 per system-level test type (instructions), >= 3 enforced (validator)
- UAT: >= 1 case per REQ-xxx (instructions), >= 3 enforced (validator)

### テスト観点 Invariants
- UT: MUST cover 正常系, 異常系, 境界値 — all 3 perspectives mandatory
- IT: API契約検証, 画面遷移 mandatory; エラー伝播, タイムアウト処理 required
- ST: E2Eシナリオ mandatory; 性能テスト mandatory when NFR-xxx exist
- UAT: ビジネスシナリオ in user-facing language; no technical jargon

### 実行結果 / 判定 Column Invariant
- ALWAYS left blank at generation time
- Filled by humans during test execution
- AI MUST NOT pre-fill these columns — represents future test results

### Defect Report Section Invariant
- Section 4 (デフェクト報告) — header only at generation time
- Severity values: 致命的/重大/軽微/提案
- Status values: 未対応/対応中/修正済み/確認済み/クローズ
- AI generates table header only — never pre-fills defect rows

### Keigo Invariant (all 4 specs)
- である調 throughout (simple style)
- NEVER ですます調 in any test spec
- Consistent voi test-plan (same である調 parent document)

---

## 6. Upstream/Downstream Chain Detail

### CHAIN_PAIRS cho ut-spec

**Upstream:**
```typescript
["test-plan", "ut-spec"]
["detail-design", "ut-spec"]
```

**Downstream:** NONE (test leaves — no further docs)

### CHAIN_PAIRS cho it-spec

**Upstream:**
```typescript
["test-plan", "it-spec"]
["detail-design", "it-spec"]
["basic-design", "it-spec"]
```

**Downstream:** NONE

### CHAIN_PAIRS cho st-spec

**Upstream:**
```typescript
["test-plan", "st-spec"]
["basic-design", "st-spec"]
["functions-list", "st-spec"]
["security-design", "st-spec"]
```

**Downstream:** NONE

### CHAIN_PAIRS cho uat-spec

**Upstream:**
```typescript
["test-plan", "uat-spec"]
["requirements", "uat-spec"]
["nfr", "uat-spec"]
```

**Downstream:** NONE

### ID_ORIGIN mapping
```typescript
UT: "ut-spec"
IT: "it-spec"
ST: "st-spec"
UAT: "uat-spec"
```

### Upstream ID consumption per spec

| Spec | Primary IDs Used | Secondary IDs Used | test-plan ref |
|------|-----------------|-------------------|---------------|
| ut-spec | CLS-xxx, DD-xxx (detail-design) | — | TP-001 |
| it-spec | API-xxx, SCR-xxx, TBL-xxx (basic-design) | CLS-xxx (detail-design) | TP-002 |
| st-spec | F-xxx (functions-list), SCR-xxx, TBL-xxx (basic-design) | SEC-xxx, NFR-xxx | TP-003 |
| uat-spec | REQ-xxx (requirements) | NFR-xxx (nfr) | TP-004 |

### V-model Symmetry
```
requirements  ←→ uat-spec    (requirements verified at UAT level)
nfr           ←→ uat-spec    (non-functional acceptance)
basic-design  ←→ it-spec     (design interfaces verified at IT level)
detail-design ←→ ut-spec     (implementation verified at UT level)
functions-list ←→ st-spec    (full function coverage at system level)
security-design ←→ st-spec   (security countermeasures verified at ST level)
```

---

## 7. Bugs & Van de phat hien

### BUG-01: Tat ca 4 specs chi co count check — no quality validation

**Muc do: Medium-High**

Count >= 3 cho phep:
- UT: 3 正常系 only (missing 異常系/境界値)
- IT: 3 UI tests (missing API contract tests)
- ST: 3 E2E tests (missing performance/security)
- UAT: 3 generic scenarios (missing REQ coverage)

**Fix de xuat:** Them 3-4 rules per spec (Section 4.1-4.4).

### BUG-02: UT 3-perspective coverage (正常系/異常系/境界値) khong enforced

**Muc do: Medium-High**

Instructions noi MUST cover tat ca 3 perspectives nhung validator khong check.

**Fix de xuat:** Them テスト観点 coverage rule vao ut-spec completeness.

### BUG-03: ST NFR performance test cases co the missing

**Muc do: Medium**

ST-spec la primary noi validate NFR targets nhung completeness rules khong enforce NFR cross-ref hoac performance test presence.

**Fix de xuat:** Them NFR cross-ref check + E2E scenario check vao st-spec completeness.

### BUG-04: UAT sign-off table khong validated

**Muc do: Low-Medium**

uat-spec la duy nhat co sign-off section nhung khong co completeness check.

**Fix de xuat:** Them sign-off presence check vao uat-spec completeness.

### BUG-05: IT scope contamination from detail-design upstream

**Muc do: Low**

detail-design la upstream cua ca UT va IT nhung IT instructions khong clarify boundary — AI co the generate class-level tests trong IT-spec.

**Fix de xuat:** Add scope boundary note vao IT instructions (Section 4.5).

### BUG-06: Traceability tables co the empty

**Muc do: Low-Medium**

Section 3 traceability table la separate from test cases. AI co the skip hoac generate empty table. Khong co completeness check for non-empty traceability.

**Fix de xuat:** Them traceability table check cho it nhat UT va UAT (most critical traceability docs).

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| UT missing 異常系/境界値 | Bug-prone error paths untested | High (easy to skip) | Add テスト観点 coverage check |
| ST missing NFR tests | Non-functional requirements unvalidated | High (often deprioritized) | Add NFR cross-ref check |
| UAT missing REQ coverage | Requirements not accepted | High (critical) | Add REQ cross-ref check |
| IT class-level tests (UT scope) | IT/UT boundary confusion | Medium | Clarify instructions |
| Traceability gaps | Test coverage unmeasurable | Medium | Add traceability presence check |
| UAT sign-off missing | Acceptance process incomplete | Medium | Add sign-off check |

---

## 9. Tom tat

### Diem manh
- Consistent 12-column format across all 4 specs — familiar, reusable
- Distinct traceability directions per spec: DD→CLS→UT, API→SCR→IT, F→SCR→ST, REQ→NFR→UAT
- テスト観点 appropriately differentiated (code-level → interface → system → business)
- UAT-only sign-off section — correct design choice
- V-model symmetry respected: each spec mirrors its design counterpart

### Can fix (backlog)
- BUG-01/02: UT — them 3 rules (観点 coverage, CLS cross-ref, traceability)
- BUG-01/BUG-03: ST — them 3 rules (F cross-ref, NFR cross-ref, E2E scenario)
- BUG-01/BUG-04: UAT — them 3 rules (REQ cross-ref, NFR cross-ref, sign-off)
- BUG-01: IT — them 2 rules (API cross-ref, error handling)
- BUG-05: IT instructions scope boundary clarification
- BUG-06: Traceability table presence checks (UT, UAT at minimum)

### Tracking Board

| ID | Doc | Title | Severity | Status | Notes |
|----|-----|-------|----------|--------|-------|
| BUG-01 | All 4 | Count-only completeness rules | Medium-High | OPEN | 16 new rules needed total (4 per spec) |
| BUG-02 | ut-spec | 3-perspective coverage not enforced | Medium-High | OPEN | 正常系/異常系/境界値 all required |
| BUG-03 | st-spec | NFR performance tests may be missing | Medium | OPEN | ST is primary NFR verification doc |
| BUG-04 | uat-spec | Sign-off table not validated | Low-Medium | OPEN | Acceptance process completeness |
| BUG-05 | it-spec | Scope contamination from detail-design upstream | Low | OPEN | IT may generate class-level tests |
| BUG-06 | ut-spec, uat-spec | Traceability tables may be empty | Low-Medium | OPEN | Missing traceability = coverage gap |
