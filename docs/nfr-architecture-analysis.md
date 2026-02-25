# Phan tich kien truc: sekkei:nfr (非機能要件定義書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`nfr` la requirements-phase doc type trong V-model chain — nhan input tu 1 upstream doc (requirements) va feed xuong 5 downstream docs (basic-design, test-plan, security-design, uat-spec, operation-design).

### Data Flow

```
[requirements] ──REQ-xxx──────────┐
                                  ▼
                         generate.ts → AI generates markdown
                                  │
                                  ▼
                         nfr.md (NFR-xxx)
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        basic-design        security-design       test-plan
              │                                       │
              ▼                                       ▼
        detail-design                       uat-spec / ut-spec
                                                       │
              ▼                                       ▼
        operation-design ◄────────────────────────────┘
```

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-requirements.md` | Entry point, prerequisite check, interview |
| MCP Tool | `generate.ts` | Context assembly, upstream injection |
| Instructions | `generation-instructions.ts:73-84` | IPA NFUG 6-category prompt, NFR-xxx format |
| Template | `templates/ja/nfr.md` (99 LOC) | 9 sections, YAML frontmatter |
| Validation | `validator.ts` | Section check: 7 required sections |
| Completeness | `completeness-rules.ts:87-93` | NFR-xxx >= 3 check duy nhat |
| Cross-ref | `cross-ref-linker.ts:13-15` | Chain pairs: requirements → nfr |
| ID_ORIGIN | `cross-ref-linker.ts:73` | `NFR: ["nfr", "requirements"]` — dual origin |
| Keigo | `generation-instructions.ts:318` | `丁寧語` (ですます調) |

### Keigo & Style
- Default: `丁寧語` (ですます調) — configured in `generation-instructions.ts:318`
- Template comment: `<!-- AI: Keigo: Use ですます調 throughout. -->`

---

## 2. Diem manh

### 2.1 IPA NFUG 6-category framework ro rang
- Generation instructions specify exactly 6 IPA categories: 可用性、性能・拡張性、運用・保守性、移行性、セキュリティ、システム環境・エコロジー
- Template co 1 section per category (Sections 2-8) — khong the miss
- Moi NFR-xxx MUST co numeric 目標値 — instruction explicitly list vi du: 99.9%, 2秒以内, 1000同時接続

### 2.2 Vague term prohibition duoc nhan manh
- Instructions: "Prohibited vague terms: 高速, 十分, 適切, 高い, 良好"
- Template comment: "NEVER use vague terms: 高速, 十分, 適切, 高い, 良好, 適宜"
- Validator (via requirements completeness rule) enforce vague term check
- Nhung: nfr-specific vague term check khong ton tai (xem Bug-02)

### 2.3 Dual ID origin duoc dinh nghia ro
- `ID_ORIGIN.NFR = ["nfr", "requirements"]` — ca 2 doc types deu co the produce NFR-xxx
- requirements template co NFR-xxx placeholder entries (1 per IPA category)
- nfr doc elaborates va adds new NFR-xxx entries
- Downstream docs (basic-design, security-design, operation-design) biet NFR-xxx co the den tu ca 2 nguon

### 2.4 Cross-reference voi upstream requirements
- Instructions: "Use those same IDs and elaborate each with detailed analysis"
- Template: Section 1 "Reference the REQ-xxx IDs from the 要件定義書 that drive these NFRs"
- So sanh IPA 6 categories voi upstream REQ-xxx → traceability ro rang

### 2.5 Template section structure hop ly
- Section 2: NFR summary table (NFR-ID, カテゴリ, 要件名, 目標値, 測定方法, 優先度) — 6 cols
- Sections 3-8: 1 detailed section per IPA category
- Section 9: 参考資料 — reference upstream REQ-xxx

---

## 3. Diem yeu / Gap

### GAP-01: Completeness rules qua it — chi check NFR-xxx >= 3

**Muc do: Medium-High**

`completeness-rules.ts:87-93` chi co **1 rule duy nhat**:

```typescript
nfr: [
  { check: "NFR entries", test: (c) => (c.match(/NFR-\d{3}/g) || []).length >= 3 }
]
```

So sanh voi requirements (5 rules) va basic-design (4 rules), nfr co validation yeu.

**Cac check missing:**

| Check | Mo ta | Vi sao can |
|-------|-------|------------|
| Vague term ban | NFR rows khong chua 高速/十分/適切/高い/良好 | Instructions cam nhung validator khong enforce |
| Numeric targets | 80%+ NFR rows phai co numeric value (%, 秒, ms) | Template yeu cau "all values must be numeric" |
| IPA category coverage | Phai co it nhat 1 NFR per IPA category (6 checks) | Core requirement cua IPA NFUG |
| REQ cross-reference | Phai reference it nhat 1 REQ-xxx | Upstream traceability |
| 測定方法 presence | Moi NFR row phai co measurement method | Template column yeu cau |

### GAP-02: Khong co unique NFR-ID check

**Muc do: Medium**

requirements doc produce NFR-xxx IDs (1 per category) va nfr doc add them IDs. Khong co:
- Duplicate NFR-ID check giua 2 docs
- Sequence check (NFR-001, NFR-002... phai sequential)
- Conflict check (same ID, different values)

**Van de:** AI co the generate NFR-001 trong ca requirements va nfr doc voi khac nhau content.

### GAP-03: Security section trong nfr co overlap voi security-design

**Muc do: Medium**

- nfr Section 7 (セキュリティ): "認証方式, 暗号化方式 (TLS version), パスワードポリシー"
- security-design: "認証・認可設計, データ保護, 通信セキュリティ..."
- CHAIN_PAIRS: `["nfr", "security-design"]` — security-design elaborates nfr security

**Van de:** Boundary khong ro rang — nfr Section 7 co the thua content voi security-design.

**De xuat:** Clarify trong instructions: "nfr security = requirements (WHAT); security-design = implementation (HOW)."

### GAP-04: Migration section trong nfr chi cover "khong co migration" case

**Muc do: Low**

Template Section 6 (移行性): "If no migration needed, state 新規開発のため既存システムなし."

Nhung neu co migration:
- Khong co link toi migration-design (CHAIN_PAIRS khong co nfr → migration-design)
- NFR migration requirements (NFR-xxx) khong directly feed migration-design
- migration-design chi nhan REQ-xxx, TBL-xxx, OP-xxx tu upstream

### GAP-05: Performance section thieu distributed/cloud patterns

**Muc do: Low**

Template Section 4 (性能・拡張性): P50/P95/P99, スループット, 同時接続数 — traditional metrics.

Missing cho modern systems:
- Horizontal scaling thresholds (pod count, HPA config)
- CDN cache hit rate targets
- Database connection pool sizing
- Message queue throughput (events/sec)
- Cold start latency cho serverless

---

## 4. Recommendations

### 4.1 Them completeness rules (Priority: High)

```typescript
nfr: [
  { check: "NFR entries", test: (c) => (c.match(/NFR-\d{3}/g) || []).length >= 3 },
  {
    check: "NFR vague terms",
    test: (c) => {
      const nfrRows = c.split("\n").filter(l => /NFR-\d{3}/.test(l));
      return !nfrRows.some(row => /高速|十分|適切|高い|良好/.test(row));
    },
    message: "非機能要件定義書: NFR目標値に曖昧な表現があります"
  },
  {
    check: "NFR numeric targets",
    test: (c) => {
      const nfrRows = c.split("\n").filter(l => /NFR-\d{3}/.test(l));
      if (nfrRows.length === 0) return true;
      const withNumbers = nfrRows.filter(row => /\d+(\.\d+)?[%秒ms時間件人日回]/.test(row));
      return withNumbers.length >= nfrRows.length * 0.8;
    },
    message: "非機能要件定義書: NFR目標値に数値が不足しています"
  },
  {
    check: "REQ cross-reference",
    test: (c) => /REQ-\d{3}/.test(c),
    message: "非機能要件定義書: REQ-xxx参照が必要です（上流の要件定義書をクロスリファレンス）"
  },
  {
    check: "IPA category coverage",
    test: (c) => {
      const categories = ["可用性", "性能", "運用", "移行性", "セキュリティ", "システム環境"];
      return categories.every(cat => new RegExp(cat).test(c));
    },
    message: "非機能要件定義書: IPA NFUG 6カテゴリ全てのカバレッジが必要です"
  },
]
```

### 4.2 Clarify security boundary giua nfr va security-design (Priority: Medium)

Them comment vao nfr template Section 7:
```
<!-- AI: Define WHAT security requirements must be met (policy level).
         Do NOT specify implementation details — that belongs in security-design.
         Example: "認証: MFA必須" (nfr) vs "認証: OAuth 2.0 with PKCE flow" (security-design) -->
```

### 4.3 Them 測定方法 completeness check (Priority: Medium)

Validator check: moi NFR row trong summary table phai co non-empty 測定方法 column.

### 4.4 Migration section clarification (Priority: Low)

Them note trong instructions: "移行性 NFR-xxx should reference migration-design when created later."

---

## 5. Edge Cases & Invariants

### ID Format Rules
- NFR-ID format: `NFR-\d{3}` (e.g., NFR-001, NFR-012)
- Dual origin: requirements doc produces NFR-001 through NFR-00N (1 per IPA category); nfr doc adds more
- Sequential across both docs — no restart at NFR-001 in nfr doc

### IPA NFUG Coverage
- 6 mandatory categories — ALL must be present
- 可用性: 稼働率 % target + RTO + RPO
- 性能・拡張性: P95 response time + concurrent users + scale-out condition
- 運用・保守性: MTTR + log retention + backup frequency
- 移行性: migration duration + data volume + parallel operation period
- セキュリティ: TLS version + auth method + audit log retention
- システム環境・エコロジー: CPU/memory cap + PUE target + cloud region

### Numeric Target Invariant
- ALL NFR rows in summary table (Section 2) MUST have numeric 目標値
- No qualitative values like "高い", "十分", "適切"
- Accepted formats: %, 秒, ms, 件, 人, 日, 回, 時間

### Keigo Invariant
- ですます調 throughout (丁寧語)
- NEVER である調 in nfr doc (unlike test-plan, operation-design)

---

## 6. Upstream/Downstream Chain Detail

### CHAIN_PAIRS cho nfr

**Upstream of nfr:**
```typescript
["requirements", "nfr"]
```

**nfr as upstream:**
```typescript
["nfr", "basic-design"]
["nfr", "security-design"]
["nfr", "test-plan"]
["nfr", "uat-spec"]
["nfr", "operation-design"]  // Added in recent fix
```

### ID_ORIGIN mapping
```typescript
NFR: ["nfr", "requirements"]  // dual origin
```

### Derived upstream ID prefixes cho nfr
- Upstream: requirements → REQ prefix
- nfr consumes: REQ-xxx
- nfr produces: NFR-xxx (elaborated from requirements NFR entries + new entries)

### Downstream ID consumption
| Downstream Doc | Uses NFR-xxx for |
|---------------|-----------------|
| basic-design | System design constraints |
| security-design | Security policy foundation |
| test-plan | NFR test scope (performance, security levels) |
| uat-spec | Non-functional acceptance criteria |
| operation-design | SLA targets, monitoring thresholds, RPO/RTO |

---

## 7. Bugs & Van de phat hien

### BUG-01: Completeness rules chi check NFR count — missing vague/numeric checks

**Muc do: Medium-High**

Instructions va template deu cam vague terms va yeu cau numeric targets. Nhung `completeness-rules.ts` chi check count >= 3, khong enforce quality.

**Fix de xuat:** Them 4 rules vao `CONTENT_DEPTH_RULES["nfr"]` (xem Section 4.1).

### BUG-02: Duplicate NFR-ID giua requirements va nfr khong duoc detect

**Muc do: Medium**

AI co the generate NFR-001 trong requirements (category: 可用性, target: 99.9%) va regenerate NFR-001 trong nfr (category: 可用性, target: 99.95%) — khong co check.

**Fix de xuat:** Cross-doc ID conflict detection trong `cross-ref-linker.ts` cho NFR dual origin.

### BUG-03: migration-design khong nhan NFR migration requirements

**Muc do: Low**

nfr Section 6 (移行性) define migration NFR-xxx nhung migration-design KHONG co nfr trong CHAIN_PAIRS.

**Fix de xuat:** Them `["nfr", "migration-design"]` vao CHAIN_PAIRS.

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Vague NFR pass validation | Non-measurable requirements | High (every project) | Add vague term check |
| Missing numeric targets | NFR unmeasurable | High | Add numeric check |
| Duplicate NFR-ID | Traceability confusion | Medium | Add cross-doc ID check |
| IPA category missing | Incomplete NFR coverage | Medium | Add category coverage check |
| Security boundary blur | Redundant content in nfr + security-design | Medium | Add template clarification |

---

## 9. Tom tat

### Diem manh
- IPA NFUG 6-category framework duoc enforce trong instructions va template
- Dual ID origin (NFR co the den tu requirements hoac nfr) duoc dinh nghia ro trong ID_ORIGIN
- Vague term list explicit trong ca instructions va template
- Downstream chain ro rang: feed 5 docs (basic-design, security-design, test-plan, uat-spec, operation-design)

### Can fix (backlog)
- BUG-01: Them 4 completeness rules (vague terms, numeric targets, REQ cross-ref, IPA coverage)
- BUG-02: Duplicate NFR-ID cross-doc detection
- BUG-03: Them chain pair nfr → migration-design

### Tracking Board

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | Completeness rules thieu (1/5 rules) | Medium-High | OPEN | Missing vague, numeric, REQ ref, IPA coverage checks |
| BUG-02 | Duplicate NFR-ID giua requirements va nfr | Medium | OPEN | Dual origin can cross-doc conflict check |
| BUG-03 | migration-design khong nhan NFR migration requirements | Low | OPEN | Missing chain pair nfr → migration-design |
