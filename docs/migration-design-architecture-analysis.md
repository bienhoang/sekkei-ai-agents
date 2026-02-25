# Phan tich kien truc: sekkei:migration-design (移行設計書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`migration-design` la supplementary doc type trong V-model chain — nhan input tu 3 upstream docs (basic-design, requirements, operation-design) va la **terminal node** trong CHAIN_PAIRS (khong co downstream doc).

### Data Flow

```
[basic-design] ──SCR/TBL/API-xxx──┐
[requirements] ──REQ-xxx──────────┤──→ generate.ts → AI generates markdown
[operation-design] ──OP-xxx───────┘         │
                                             ▼
                                   migration-design.md
                                      (MIG-xxx)
                                           │
                                [TERMINAL — no downstream]
```

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-supplementary.md` | Entry point, prerequisite check, interview |
| MCP Tool | `generate.ts` | Context assembly, upstream injection |
| Instructions | `generation-instructions.ts:214-221` | 5-section prompt, MIG-xxx format |
| Template | `templates/ja/migration-design.md` (112 LOC) | 5 sections + subsections, YAML frontmatter |
| Validation | `validator.ts` | Section check: 5 required sections |
| Completeness | `completeness-rules.ts:272-278` | MIG-xxx >= 3 check duy nhat |
| Cross-ref | `cross-ref-linker.ts:52-54` | 3 chain pairs: basic-design, requirements, operation-design → migration-design |
| ID_ORIGIN | `cross-ref-linker.ts:84` | `MIG: "migration-design"` |
| Keigo | `generation-instructions.ts:333` | `simple` (である調) |

### Keigo & Style
- Default: `simple` (である調) — configured in `generation-instructions.ts:333`
- Template comment: `<!-- AI: Keigo: Use である調 throughout. Never use です or ます for sentence endings. -->`

---

## 2. Diem manh

### 2.1 Rollback plan la mandatory
- Template Section 4 (ロールバック計画): "MANDATORY: Step-by-step rollback procedure"
- Instructions: "ロールバック計画: Must include step-by-step rollback procedure with time estimates"
- Each rollback step MUST have time estimate — concrete, not vague
- Trigger conditions phai explicit (e.g., "error rate > 5%")

### 2.2 OP-xxx upstream link duoc fix (recent improvement)
- `["operation-design", "migration-design"]` duoc them vao CHAIN_PAIRS
- migration-design co the reference OP-xxx tu operation-design
- Cutover procedure co the align voi operational runbooks

### 2.3 Data migration voi full table context
- `["basic-design", "migration-design"]` trong CHAIN_PAIRS
- instructions: "Reference TBL-xxx IDs from basic-design for target tables"
- AI co the generate migration plan voi actual table names tu upstream

### 2.4 Template 5-section structure cover full migration lifecycle
- Section 1: 移行方針 (strategy: big bang / phased / parallel run)
- Section 2: データ移行計画 (MIG-xxx table + data mapping + cleansing)
- Section 3: システム切替手順 (cutover steps voi timing)
- Section 4: ロールバック計画 (mandatory rollback procedure)
- Section 5: 移行テスト計画 (test cases per migration object)

---

## 3. Diem yeu / Gap

### GAP-01: Completeness rules chi check MIG count — no quality checks

**Muc do: Medium-High**

`completeness-rules.ts:272-278` chi co **1 rule duy nhat**:

```typescript
"migration-design": [
  { check: "MIG entries", test: (c) => (c.match(/MIG-\d{3}/g) || []).length >= 3 }
]
```

**Cac check missing:**

| Check | Mo ta | Vi sao can |
|-------|-------|------------|
| Rollback present | Section 4 phai co non-empty rollback steps | Template: MANDATORY |
| TBL cross-reference | Phai reference it nhat 1 TBL-xxx | Data migration target tables |
| REQ cross-reference | Phai reference it nhat 1 REQ-xxx | Requirements traceability |
| OP cross-reference | Phai reference it nhat 1 OP-xxx (khi OP exists) | Operational alignment |
| Rollback trigger | Phai co ロールバック判断基準 (trigger conditions) | Mandatory per template |
| Cutover steps | Section 3 phai co step table | Critical cutover procedure |

### GAP-02: nfr khong la upstream cua migration-design

**Muc do: Medium**

migration-design can NFR migration requirements nhung CHAIN_PAIRS khong co `["nfr", "migration-design"]`.

**Van de thuc te:**
- NFR-xxx Section 6 (移行性): migration duration, data volume, parallel operation period
- migration-design khong biet NFR migration targets → co the miss RPO during migration, acceptable downtime window
- Migration test plan khong co NFR-based pass/fail criteria

**Fix de xuat:** Them `["nfr", "migration-design"]` vao CHAIN_PAIRS.

### GAP-03: security-design khong la upstream — security requirements cho migration missing

**Muc do: Medium**

Migration co nhieu security concerns:
- Data encryption during migration transport
- Access control cho migration tools
- PII data handling within migration ETL scripts
- Audit log requirements cho migration activities

Nhung CHAIN_PAIRS khong co `["security-design", "migration-design"]` → AI khong biet SEC-xxx requirements khi generating migration plan.

### GAP-04: Template thieu data volume estimates trong MIG table

**Muc do: Medium**

Template MIG table co 8 columns: MIG-ID, 対象データ, 移行元, 移行先, 移行方法, データ量, 検証方法, 担当者.

`データ量` column co trong template nhung instructions khong mention data volume requirement. AI co the leave blank.

**Van de:** Migration scheduling va window planning phu thuoc vao data volume estimates.

### GAP-05: Parallel run strategy duoc mention nhung khong co detail

**Muc do: Medium**

Template Section 1.1: "Big bang / 段階移行 / 並行稼働 — justify the choice." Nhung:
- Khong co guidance cho parallel run period (how long, what criteria to end)
- Conflict resolution khi ca 2 systems run concurrently khong duoc cover
- Data sync strategy during parallel run missing
- Rollback during parallel run (khac voi rollback after big bang) missing

### GAP-06: Migration testing thieu performance benchmarks

**Muc do: Low**

Template Section 5 (移行テスト計画): data validation-focused. Missing:
- Migration throughput benchmark (e.g., N records/hour)
- Acceptable migration window (total time budget)
- Performance regression testing post-migration
- Data integrity sampling rate (100% vs statistical sampling)

---

## 4. Recommendations

### 4.1 Them completeness rules (Priority: High)

```typescript
"migration-design": [
  { check: "MIG entries", test: (c) => (c.match(/MIG-\d{3}/g) || []).length >= 3 },
  {
    check: "rollback section present",
    test: (c) => /ロールバック判断基準|ロールバック手順/.test(c),
    message: "移行設計書: ロールバック判断基準と手順が必要です（必須項目）"
  },
  {
    check: "TBL cross-reference",
    test: (c) => /TBL-\d{3}/.test(c),
    message: "移行設計書: TBL-xxx参照が必要です（データ移行対象テーブル）"
  },
  {
    check: "REQ cross-reference",
    test: (c) => /REQ-\d{3}/.test(c),
    message: "移行設計書: REQ-xxx参照が必要です（移行要件トレーサビリティ）"
  },
  {
    check: "cutover steps",
    test: (c) => /システム切替手順/.test(c) && /\|\s*\d+\s*\|/.test(c),
    message: "移行設計書: システム切替手順のステップテーブルが必要です"
  },
]
```

### 4.2 Them chain pairs cho nfr va security-design (Priority: Medium)

```typescript
["nfr", "migration-design"],           // migration NFR targets (downtime window, data volume)
["security-design", "migration-design"] // security requirements for migration execution
```

### 4.3 Rollback trigger criteria clarification (Priority: High)

Template Section 4.1 nen co example trigger conditions:
```
Rollback triggers (examples):
- Migration error rate > 5%
- Data validation failure count > threshold
- Migration window exceeded by N%
- Critical data loss detected
- System unavailability exceeds RTO
```

### 4.4 Parallel run guidance (Priority: Medium)

Them subsection trong template Section 1.1:
```
### 1.3 並行稼働設計 (if 並行稼働 chosen)
- Parallel run duration: N weeks
- Data sync direction: old → new / bidirectional
- Conflict resolution policy
- Criteria to end parallel run (end-state check)
- Rollback procedure during parallel run (distinct from post-cutover)
```

---

## 5. Edge Cases & Invariants

### MIG-ID Format Rules
- MIG-ID format: `MIG-\d{3}` (e.g., MIG-001, MIG-015)
- Each MIG entry = 1 migration object (e.g., 1 table, 1 data category)
- MIG-xxx khong duoc reference boi bat ky downstream doc (terminal node)

### Rollback Invariant (CRITICAL)
- Section 4 (ロールバック計画) la MANDATORY — khong co "N/A"
- Every rollback step MUST have 所要時間 (time estimate)
- Total rollback time MUST be stated — compare to RTO from NFR/operation-design
- ロールバック判断基準 MUST list explicit trigger conditions (NOT vague)

### Migration Strategy Rules
- Big bang: Single cutover, no parallel run — highest risk, shortest migration window
- 段階移行: Phased by module/data type — lower risk, longer total timeline
- 並行稼働: Both systems run simultaneously — lowest risk, highest complexity
- Choice MUST be justified in Section 1.1

### Data Validation Invariant
- Every MIG-xxx MUST have 検証方法 (validation method) — not blank
- Accepted: SQL count check, hash comparison, sample review, full reconciliation
- Template: "Reference TBL-xxx IDs for data validation targets"

### Keigo Invariant
- である調 throughout (simple style)
- NEVER ですます調 in migration-design
- Consistent voi operation-design (same である調 style)

---

## 6. Upstream/Downstream Chain Detail

### CHAIN_PAIRS cho migration-design

**Upstream of migration-design:**
```typescript
["basic-design", "migration-design"]      // TBL-xxx, SCR-xxx, API-xxx
["requirements", "migration-design"]      // REQ-xxx migration requirements
["operation-design", "migration-design"]  // OP-xxx operational procedures
```

**migration-design as upstream:**
- NONE — terminal node

**Missing (recommended):**
```typescript
["nfr", "migration-design"]              // NFR migration targets
["security-design", "migration-design"]  // SEC-xxx security requirements
```

### ID_ORIGIN mapping
```typescript
MIG: "migration-design"  // single origin
```

### Derived upstream ID prefixes cho migration-design
| Source Doc | ID Prefix | Used for |
|------------|-----------|---------|
| basic-design | TBL | Migration target tables |
| basic-design | SCR, API | System components affected |
| requirements | REQ | Migration requirements traceability |
| operation-design | OP | Operational runbook alignment |

### Terminal Node Implications
| Aspect | Impact |
|--------|--------|
| No downstream | MIG-xxx khong duoc tham chieu boi any other doc |
| Standalone | Can generate sau khi basic-design va operation-design complete |
| Change propagation | Schema changes (TBL-xxx) in basic-design khong auto-flag migration-design |
| Staleness | migration-design co the stale khi basic-design schema changes |

---

## 7. Bugs & Van de phat hien

### BUG-01: Completeness rules chi check MIG count — missing critical checks

**Muc do: Medium-High**

Template noi rollback la MANDATORY nhung validator khong enforce rollback presence.

**Fix de xuat:** Them 4 rules (rollback, TBL cross-ref, REQ cross-ref, cutover steps).

### BUG-02: nfr khong la upstream — migration window/downtime constraints missing

**Muc do: Medium**

Migration plan co the violate NFR availability targets (e.g., RTO = 4h, nhung migration plan require 8h downtime).

**Fix de xuat:** Them `["nfr", "migration-design"]` chain pair.

### BUG-03: security-design khong la upstream — PII migration security gap

**Muc do: Medium**

Migration ETL scripts xu ly PII data nhung khong co SEC-xxx security requirements reference.

**Fix de xuat:** Them `["security-design", "migration-design"]` chain pair.

### BUG-04: Data volume estimates khong validated

**Muc do: Low**

Template co データ量 column nhung instructions khong mention it. AI co the leave blank.

**Fix de xuat:** Them explicit mention trong instructions: "データ量: Estimate records count and GB size per MIG entry."

### BUG-05: Parallel run strategy underspecified

**Muc do: Low**

3 strategies mentioned but only big bang + phased co clear guidance.

**Fix de xuat:** Them Section 1.3 cho parallel run design.

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No rollback validation | Missing rollback plan | Medium (project pressure) | Add rollback completeness check |
| NFR migration targets unknown | Violates availability SLA | High (always critical) | Add nfr chain pair |
| PII security gap | Compliance violation | Medium | Add security-design chain pair |
| Data volume not estimated | Wrong migration window | High (production impact) | Add data volume instruction |
| Parallel run undefined | Data conflict during migration | Medium | Expand parallel run guidance |

---

## 9. Tom tat

### Diem manh
- Rollback plan explicitly labeled MANDATORY trong template va instructions
- 3 upstream docs (basic-design, requirements, operation-design) provide good context
- 5-section structure cover full migration lifecycle: strategy → data plan → cutover → rollback → testing
- OP-xxx upstream link cho operational alignment

### Can fix (backlog)
- BUG-01: Them 4 completeness rules (rollback, TBL cross-ref, REQ cross-ref, cutover steps)
- BUG-02: Chain pair nfr → migration-design (migration window vs NFR availability)
- BUG-03: Chain pair security-design → migration-design (PII migration security)
- BUG-04: Data volume instruction explicit mention
- BUG-05: Parallel run subsection trong template

### Tracking Board

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | Completeness rules thieu rollback/TBL/REQ checks | Medium-High | OPEN | Rollback MANDATORY but not validated |
| BUG-02 | nfr khong upstream — migration window constraints missing | Medium | OPEN | NFR-xxx availability targets needed |
| BUG-03 | security-design khong upstream — PII migration security gap | Medium | OPEN | SEC-xxx needed for migration ETL |
| BUG-04 | Data volume estimates khong validated | Low | OPEN | データ量 column often left blank |
| BUG-05 | Parallel run strategy underspecified | Low | OPEN | Need Section 1.3 parallel run guidance |
