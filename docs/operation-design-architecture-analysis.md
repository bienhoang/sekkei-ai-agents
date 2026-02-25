# Phan tich kien truc: sekkei:operation-design (運用設計書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`operation-design` la supplementary doc type trong V-model chain — nhan input tu 5 upstream docs (requirements, nfr, basic-design, functions-list, security-design) va feed xuong 1 downstream doc (migration-design).

### Data Flow

```
[requirements] ──REQ-xxx──────────┐
[nfr] ──NFR-xxx───────────────────┤
[basic-design] ──SCR/TBL/API-xxx──┤──→ generate.ts → AI generates markdown
[functions-list] ──F-xxx──────────┤         │
[security-design] ──SEC-xxx───────┘         ▼
                                  operation-design.md
                                       (OP-xxx)
                                            │
                                            ▼
                                   migration-design
```

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-supplementary.md` | Entry point, prerequisite check, interview |
| MCP Tool | `generate.ts` | Context assembly, upstream injection |
| Instructions | `generation-instructions.ts:169-176` | 6-section prompt, OP-xxx format |
| Template | `templates/ja/operation-design.md` (109 LOC) | 6 sections, YAML frontmatter |
| Validation | `validator.ts` | Section/column check, cross-ref report |
| Completeness | `completeness-rules.ts:223-229` | OP-xxx >= 3 check duy nhat |
| Cross-ref | `cross-ref-linker.ts:44-48` | Chain pairs, ID_ORIGIN: OP |
| Staleness | `doc-staleness.ts:36` | Git-based upstream change detection |
| Chain Status | `chain-status.ts:82` | operation_design status tracking |

### Keigo & Style
- Default: `simple` (である調) — configured in `generation-instructions.ts:296`
- Template comment: `<!-- AI: Keigo: Use である調 throughout -->`

---

## 2. Diem manh

### 2.1 Prerequisite chain ro rang
- Skill flow (phase-supplementary.md) check `requirements.md` exists → ABORT neu thieu
- `nfr.md` check → WARN only (non-blocking) — cho phep generate voi limited cross-ref
- Interview 3 cau hoi truoc khi generate → kiem soat input quality

### 2.2 Cross-reference tracking
- `CHAIN_PAIRS`: requirements → operation-design, nfr → operation-design
- `ID_ORIGIN`: `OP: "operation-design"` → downstream (migration-design) biet OP-xxx den tu dau
- operation-design → migration-design chain: MIG docs co the reference OP-xxx

### 2.3 Template structure hợp ly
- 6 sections cover ITIL core processes: team, backup, monitoring, incident, jobs, SLA
- SLA section co explicit "Prohibited vague terms" guidance
- Moi section co AI comment huong dan chi tiet

---

## 3. Bugs & Van de phat hien

### BUG-01: Column count mismatch giua template, instructions, va validator

**Muc do: Medium-High**

3 noi dinh nghia khac nhau:

| Source | Columns cho 障害対応手順 |
|--------|------------------------|
| Template (line 86-88) | 6 cols: OP-ID, 手順名, **障害レベル**, 手順内容, 担当者, 想定時間 |
| Generation instructions (line 172) | 5 cols: OP-ID, 手順名, 手順内容, 担当者, 想定時間 — **thieu 障害レベル** |
| Skill reference (phase-supplementary.md line 33) | "OP-001 format with **6 columns**" |
| Validator required columns (line 159) | **3 cols only**: OP-ID, 手順名, 担当者 |

**Van de:**
- AI co the generate 5 hoac 6 columns tuy theo prioritize template hay instructions
- Validator chi check 3/6 columns → 手順内容, 障害レベル, 想定時間 co the missing ma khong bao loi
- Skill reference noi "6 columns" nhung instructions chi list 5

**Fix de xuat:**
1. Align instructions voi template: them `障害レベル` (重大/警告/軽微) vao instructions
2. Validator them tat ca 6 required columns: `["OP-ID", "手順名", "障害レベル", "手順内容", "担当者", "想定時間"]`

---

### BUG-02: SLA vague term check KHONG ton tai cho operation-design

**Muc do: Medium**

Template (line 103): "Prohibited vague terms: 高い, 十分, 適切"
Generation instructions (line 173): "Prohibit vague terms"

Nhung `completeness-rules.ts` va `validator.ts`:
- **Chi requirements** co vague term check (`vaguePattern = /高速|十分|適切|高い|良好/`)
- operation-design **KHONG co** vague term validation rule

**Van de:** AI co the generate SLA nhu "高い稼働率" hoac "十分な応答時間" ma validator KHONG bat.

**Fix de xuat:** Them vague term check rule vao `CONTENT_DEPTH_RULES["operation-design"]`:
```typescript
{
  check: "SLA vague terms",
  test: (c) => {
    const slaRows = c.split("\n").filter(l => /SLA|稼働率|応答|RTO|RPO/.test(l));
    return !slaRows.some(row => /高い|十分|適切|良好|高速/.test(row));
  },
  message: "運用設計書: SLA目標値に曖昧な表現があります"
}
```

---

### BUG-03: Completeness rules qua it — chi check OP-xxx >= 3

**Muc do: Medium**

`completeness-rules.ts:223-229` chi co **1 rule duy nhat**:

```typescript
"operation-design": [
  { check: "OP entries", test: (c) => (c.match(/OP-\d{3}/g) || []).length >= 3 }
]
```

So sanh voi basic-design (4 rules) va requirements (5 rules), operation-design co validation yeu nhat.

**Cac check missing:**
| Check | Mo ta | Vi sao can |
|-------|-------|------------|
| SLA numeric targets | Co it nhat 1 SLA row voi % hoac so | Template yeu cau mandatory |
| Backup RPO/RTO | Co RPO va RTO values | Core cua backup section |
| Monitoring thresholds | Co it nhat 1 monitoring row voi threshold values | Section 3 la trong tam |
| Job schedule entries | Co it nhat 1 job voi cron/schedule | Section 5 yeu cau |
| Cross-ref NFR | Reference it nhat 1 NFR-xxx | Upstream traceability |
| Cross-ref REQ | Reference it nhat 1 REQ-xxx | Upstream traceability |

---

### BUG-04: basic-design KHONG la upstream cua operation-design

**Muc do: Medium**

`CHAIN_PAIRS` chi dinh nghia:
```typescript
["requirements", "operation-design"],
["nfr", "operation-design"],
```

**KHONG co:** `["basic-design", "operation-design"]`

**Van de thuc te:**
- Monitoring section can biet he thong co nhung API endpoints nao (API-xxx) de monitor
- Backup section can biet nhung databases nao (TBL-xxx) de backup
- Job management can lien ket voi batch functions (F-xxx)
- System architecture anh huong truc tiep den monitoring strategy

Ma khong co basic-design lam upstream, operation-design **khong biet** API-xxx, TBL-xxx, SCR-xxx la gi.

**Fix de xuat:** Them chain pair:
```typescript
["basic-design", "operation-design"],
["functions-list", "operation-design"],
```

Va update skill flow de load basic-design + functions-list lam upstream content.

---

### BUG-05: Template column headers khong match giua sections

**Muc do: Low**

| Section | Template columns | Van de |
|---------|-----------------|--------|
| Sec 1: 運用体制 | 役割, 担当, 連絡先, 対応時間帯 | OK |
| Sec 2: バックアップ | 対象, バックアップ方式, 頻度, 保持期間, RPO, RTO | OK |
| Sec 3: 監視 | 監視対象, メトリクス, 閾値(警告), 閾値(異常), 通知先, 対応手順 | OK |
| Sec 4: 障害対応 | OP-ID, 手順名, 障害レベル, 手順内容, 担当者, 想定時間 | **6 cols** |
| Sec 5: ジョブ | ジョブID, ジョブ名, 実行スケジュール, 依存関係, リトライ回数, 失敗時対応 | OK |
| Sec 6: SLA | SLA項目, 目標値, 測定方法, 報告頻度, 違反時対応 | OK |

Section 4 co "障害レベル" trong template nhung thieu trong instructions — AI se confused.

---

## 4. Real-world cases chua duoc cover

### CASE-01: Cloud-native / Kubernetes operations

**Hien tai:** Template assume traditional server-based operations.

**Van de:**
- Container lifecycle (pod restart, scaling, rolling update) khong co section
- Service mesh monitoring (Istio, Linkerd metrics) khong duoc mention
- Infrastructure as Code (Terraform state, drift detection) khong co
- Cloud provider SLA composition (AWS 99.99% × RDS 99.95% = actual SLA) khong co guidance
- Auto-scaling policies (HPA/VPA thresholds) khong nam trong monitoring section

**De xuat:**
- Them project-type-aware instructions: `project_type: "microservice"` → them sections ve container orchestration
- SLA section: them "SLA合成計算" (composed SLA calculation) guidance
- Monitoring: them infrastructure-level metrics (node, pod, container)

---

### CASE-02: Multi-region / Disaster Recovery (DR)

**Hien tai:** Template co RPO/RTO nhung khong co DR strategy.

**Van de:**
- Active-Active vs Active-Passive DR khong duoc dinh nghia
- Cross-region data replication strategy missing
- Failover procedure (manual vs automatic) khong co trong 障害対応手順
- DR testing schedule va validation criteria missing
- DNS failover / traffic routing (Route53, CloudFlare) khong co

**De xuat:**
- Them optional section "災害復旧設計" (Disaster Recovery Design)
- 障害対応手順: them severity "災害" (disaster) level
- SLA: them DR-specific metrics (Recovery Point Actual, Recovery Time Actual)

---

### CASE-03: Security Operations (SecOps)

**Hien tai:** security-design tach biet, KHONG linked vao operation-design.

**Van de:**
- Certificate rotation schedule khong nam trong job management
- WAF rule updates khong nam trong monitoring
- Vulnerability scanning schedule missing
- Security incident response (khac voi operational incident) khong co
- Penetration testing schedule khong nam trong SLA
- CHAIN_PAIRS khong co `["security-design", "operation-design"]`

**De xuat:**
- Them chain pair: `["security-design", "operation-design"]`
- Them optional section "セキュリティ運用" (Security Operations)
- Reference SEC-xxx IDs tu security-design

---

### CASE-04: Release Management / CI-CD Operations

**Hien tai:** Khong co section ve release process.

**Van de:**
- Deployment strategy (blue-green, canary, rolling) khong duoc dinh nghia
- Release approval workflow khong co
- Rollback procedure cho deployments (khac voi data rollback)
- Feature flag management khong nam trong job management
- Database migration trong deployment flow missing

**De xuat:**
- Them optional section "リリース管理" (Release Management)
- Lien ket voi migration-design cho DB migration procedure
- Deployment type table: strategy, rollback method, monitoring period

---

### CASE-05: Third-party / External Service Dependency

**Hien tai:** SLA section chi cover internal system.

**Van de:**
- External API dependency monitoring (3rd party SLA tracking) missing
- Payment gateway operations (reconciliation, retry) khong co
- CDN operations (cache invalidation, purge) missing
- Email/SMS provider failover khong duoc cover
- API rate limit monitoring cho external calls missing

**De xuat:**
- Them section "外部サービス依存管理" (External Dependency Management)
- SLA table: them "外部SLA" column de track 3rd party SLA
- Monitoring: them "外部サービス" category

---

### CASE-06: Batch Processing Operations (khac voi batch design)

**Hien tai:** Job management section co nhung generic.

**Van de:**
- Job dependency visualization (Mermaid gantt hoac graph) missing
- Data volume estimates per batch job missing
- Window constraints (maintenance window, business hours) khong co
- Error recovery strategies per job type (retry vs skip vs manual) chua detail
- Job performance trending (execution time trend) missing
- Cross-system batch dependencies (upstream system finish → our batch starts) missing

**De xuat:**
- Them Mermaid job dependency diagram guidance trong template
- Job table: them columns "データ量目安", "処理ウィンドウ", "前提条件"
- Link voi functions-list F-xxx cho batch function mapping

---

### CASE-07: Log Management & Observability

**Hien tai:** Monitoring section focus tren metrics, khong co log strategy.

**Van de:**
- Log retention policy per log type missing
- Log aggregation architecture (ELK, Splunk, CloudWatch Logs) khong co
- Structured logging standards khong duoc dinh nghia
- Audit log requirements (ai lam gi, khi nao) khong link voi security-design
- Distributed tracing (correlation IDs) khong co
- Log-based alerting (error rate threshold) overlap voi monitoring nhung khong ro boundary

**De xuat:**
- Them section "ログ管理" (Log Management)
- Table: log type, retention, storage, format, alert trigger
- Link voi security-design SEC-xxx (audit log requirements)

---

### CASE-08: Cost Monitoring & FinOps

**Hien tai:** Hoan toan missing.

**Van de:**
- Cloud cost monitoring thresholds khong nam trong monitoring section
- Resource rightsizing alerts missing
- Budget alerts per service/team missing
- Reserved instance / savings plan tracking khong co
- Cost anomaly detection khong duoc cover

**De xuat:** Them optional section "コスト管理" (Cost Management) cho cloud projects.

---

## 5. De xuat cai tien

### 5.1 Validation nang cao (Priority: High)

| Rule | Mo ta |
|------|-------|
| SLA numeric check | Moi SLA row phai co % hoac con so cu the |
| SLA vague term ban | Ban 高い/十分/適切/良好/高速 trong SLA rows |
| Backup RPO/RTO check | Section 2 phai co RPO va RTO values |
| Monitoring threshold check | Section 3 phai co it nhat 1 row voi numeric threshold |
| Job schedule check | Section 5 phai co it nhat 1 job entry |
| NFR cross-ref check | Phai reference it nhat 1 NFR-xxx |
| Column alignment | Enforce 6 cols cho section 4 (match template) |

### 5.2 Chain topology fix (Priority: High)

Them chain pairs:
```typescript
["basic-design", "operation-design"],    // API-xxx, TBL-xxx cho monitoring/backup targets
["functions-list", "operation-design"],   // F-xxx cho batch job mapping
["security-design", "operation-design"],  // SEC-xxx cho security operations
```

Upstream ID types se tu dong derive: API, TBL, SCR, RPT, F, SEC → operation-design biet tat ca resources can monitor/backup.

### 5.3 Template expansion (Priority: Medium)

Them cac optional sections (conditional based on project context):
- **セキュリティ運用** — khi security-design exists
- **リリース管理** — khi project co CI/CD pipeline
- **ログ管理** — always recommended
- **災害復旧設計** — khi NFR co availability > 99.9%
- **外部サービス依存管理** — khi basic-design co external interfaces

### 5.4 Generation instructions alignment (Priority: High)

Sync 3 sources:
1. Template: 6 columns cho section 4 (giu nguyen — day la source of truth)
2. Instructions: update tu 5 → 6 columns, them `障害レベル: 重大/警告/軽微`
3. Validator: update required columns tu 3 → 6

### 5.5 Project-type-specific instructions (Priority: Medium)

| Project Type | Additional Operation Guidance |
|-------------|------------------------------|
| microservice | Container metrics, service mesh monitoring, distributed tracing |
| saas | Tenant isolation monitoring, multi-tenant backup strategy |
| batch | Job dependency diagrams, data volume tracking, processing windows |
| government | Compliance monitoring, audit trail operations, data retention |
| finance | Transaction reconciliation, regulatory reporting schedule |
| healthcare | PHI access monitoring, HIPAA compliance operations |

---

## 6. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SLA no vague term check | Vague SLA pass validation | High (every project) | Add completeness rule |
| Column mismatch confuses AI | Inconsistent output | High (every generation) | Align 3 sources |
| Missing basic-design upstream | Monitoring targets incomplete | High (no API/TBL context) | Add chain pair |
| No security ops link | Security gaps in operations | Medium | Add security-design chain |
| Cloud-native not covered | Irrelevant for modern projects | Medium | Add project-type instructions |
| No DR section | Critical gap for production systems | Medium | Add optional section |
| Log management missing | Observability incomplete | Medium | Add section |

---

## 7. Tom tat

### Diem manh
- Template structure 6 sections cover ITIL core processes
- Prerequisite check system (requirements blocking, nfr warning)
- Interview questions truoc khi generate
- OP-xxx ID tracking trong chain system

### Da fix (5 bugs + 4 improvements)
1. **BUG-01** ✓ Column alignment: instructions updated 5→6 cols, validator updated 3→6 cols
2. **BUG-02** ✓ SLA vague term check added to `completeness-rules.ts`
3. **BUG-03** ✓ 7 completeness rules added (SLA numeric, SLA vague, RPO/RTO, monitoring, job, NFR cross-ref)
4. **BUG-04** ✓ 3 new chain pairs: basic-design, functions-list, security-design → operation-design
5. **BUG-05** ✓ Instructions now include 障害レベル (重大/警告/軽微)
6. **IMP-01** ✓ Columns aligned across template/instructions/validator (all 6 cols)
7. **IMP-02** ✓ 7 completeness rules (was 1)
8. **IMP-03** ✓ Chain pairs added + skill flow updated to load basic-design + functions-list upstream
9. **IMP-04** ✓ security-design chain pair added

### Cases chua cover (8 — backlog)
1. Cloud-native / Kubernetes operations
2. Multi-region / Disaster Recovery
3. Security Operations (template section)
4. Release Management / CI-CD
5. Third-party service dependency
6. Batch processing operations (chi tiet)
7. Log management & observability
8. Cost monitoring / FinOps

### Can improve tiep (backlog)
- IMP-05: Template optional sections (log, DR, release, SecOps)
- IMP-06: Project-type-specific instructions (6 types)

---

## 8. Tracking Board

### Bugs

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-01 | Column count mismatch (template 6 / instructions 5 / validator 3) | Medium-High | FIXED | Instructions: 5→6 cols (+障害レベル). Validator: 3→6 cols. |
| BUG-02 | SLA vague term check missing for operation-design | Medium | FIXED | Added vague term rule in `completeness-rules.ts` |
| BUG-03 | Completeness rules chi co 1 rule (OP >= 3) | Medium | FIXED | Now 7 rules: OP count + SLA numeric + SLA vague + RPO/RTO + monitoring + job + NFR |
| BUG-04 | basic-design not upstream — thieu API/TBL/F context | Medium | FIXED | Added 3 chain pairs + updated skill flow upstream loading |
| BUG-05 | Template section 4 co 障害レベル nhung instructions skip | Low | FIXED | Instructions now include 障害レベル (重大/警告/軽微) |

### Improvements

| ID | Title | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMP-01 | Align columns across template/instructions/validator | High | FIXED | All 3 sources now specify 6 columns for section 4 |
| IMP-02 | Add 6+ completeness rules | High | FIXED | 7 rules: SLA numeric, SLA vague, RPO/RTO, monitoring threshold, job entry, NFR cross-ref |
| IMP-03 | Add basic-design + functions-list chain pairs | High | FIXED | 3 new chain pairs in `cross-ref-linker.ts:46-48` |
| IMP-04 | Add security-design chain pair | Medium | FIXED | `["security-design", "operation-design"]` added |
| IMP-05 | Template optional sections (log, DR, release, SecOps) | Medium | OPEN | Backlog — 4 new sections |
| IMP-06 | Project-type-specific instructions | Medium | OPEN | Backlog — 6 project types |

### Uncovered Cases

| ID | Case | Priority | Status | Notes |
|----|------|----------|--------|-------|
| CASE-01 | Cloud-native / K8s operations | High | OPEN | Modern deploy patterns |
| CASE-02 | Multi-region / DR | High | OPEN | Production critical |
| CASE-03 | Security Operations | Medium | OPEN | Link security-design |
| CASE-04 | Release Management / CI-CD | Medium | OPEN | Deployment ops |
| CASE-05 | Third-party dependency | Medium | OPEN | External SLA tracking |
| CASE-06 | Batch processing detail | Low | OPEN | Job dependency viz |
| CASE-07 | Log management | Medium | OPEN | Observability gap |
| CASE-08 | Cost monitoring / FinOps | Low | OPEN | Cloud cost ops |
