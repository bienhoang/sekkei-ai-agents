# Phân tich kien truc: sekkei:security-design (セキュリティ設計書)

> Ngay phan tich: 2026-02-25
> Pham vi: Toan bo pipeline tu skill invocation → generation → validation → export

---

## 1. Tong quan kien truc

`security-design` la document type thuoc design phase trong V-model chain — nhan input tu 3 upstream docs (requirements, nfr, basic-design) va feed xuong operation-design + test specs.

### Data Flow

```
[requirements] ──REQ-xxx──┐
[nfr] ──NFR-xxx────────────┼──→ generate.ts → AI generates markdown
[basic-design] ──API/SCR/TBL-xxx──┘         │
                                             ▼
                                     security-design.md
                                        (SEC-xxx)
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                      operation-design   test-plan     st-spec/uat-spec
```

### Chain Position

| Relationship | Doc Types |
|-------------|-----------|
| Upstream (input) | requirements, nfr, basic-design |
| Parallel sibling | detail-design |
| Downstream (output) | operation-design, migration-design |
| ID originates | SEC-xxx |
| ID references | REQ-xxx, NFR-xxx, API-xxx, SCR-xxx, TBL-xxx |

### Cac layer chinh

| Layer | Files | Vai tro |
|-------|-------|---------|
| Skill | `phase-design.md:105-139` | Entry point, prerequisite check, interview 3 questions |
| MCP Tool | `generate.ts:404-599` | Context assembly, upstream ID injection |
| Instructions | `generation-instructions.ts:83-91` | 7 lines — security-specific prompts |
| Template | `templates/ja/security-design.md` (98 LOC) | 9 sections + 4 structural, YAML frontmatter |
| Validation | `validator.ts:56-60, 151` | Section check + SEC-ID/対策項目 columns |
| Cross-ref | `cross-ref-linker.ts:23-25, 74, 127-129` | Chain pairs, ID origin, upstream overrides |
| Staleness | `doc-staleness.ts` | Upstream change detection |
| Changelog | `changelog-manager.ts` | Revision history preservation |

---

## 2. Diem manh cua kien truc

### 2.1 Upstream chain phong phu
- Nhan input tu CA 3 docs (requirements + nfr + basic-design), khong chi 1
- Skill flow load tung doc rieng, concat thanh `upstream_content`
- Cross-ref linker co 3 chain pairs rieng cho security-design (line 23-25)

### 2.2 OWASP Top 10 integration
- Template explicitly reference OWASP categories (A02, A07) trong AI comments
- Generation instructions bat buoc reference OWASP Top 10
- Specific crypto standards: TLS 1.3+, bcrypt cost>=12, AES-256

### 2.3 Upstream ID override mechanism
- `UPSTREAM_OVERRIDES` (validator.ts:129) chi dinh chinh xac SEC-xxx la self-originated
- Tranh false positive khi validator check "orphaned IDs" — SEC-xxx khong can upstream source

### 2.4 Keigo = "simple" (である調)
- Phu hop cho technical security document — khong can formal polite language
- Nhat quan voi detail-design va test specs

---

## 3. Bugs & Van de phat hien

### BUG-01: Generation instructions qua thin — chi 7 dong

**Muc do: High**

So sanh voi cac doc types khac:

| Doc Type | Instruction Lines | Sections Covered |
|----------|------------------|------------------|
| basic-design | 15+ lines | 10 sections, split-mode, mockup |
| detail-design | 12+ lines | class design, error handling, API spec |
| **security-design** | **7 lines** | **7 sections (but only surface-level)** |
| requirements | 10+ lines | functional + non-functional |

Generation instructions (`generation-instructions.ts:83-91`):
```
"Generate a セキュリティ設計書 (Security Design) from basic-design."
"7 sections: セキュリティ方針, 認証・認可設計, データ保護, 通信セキュリティ, 脆弱性対策, 監査ログ, インシデント対応."
"ID format: SEC-001. Reference OWASP Top 10 for vulnerability countermeasures."
"Authentication: specify method (OAuth2, SAML, JWT). Password: bcrypt, not MD5."
"Encryption: TLS 1.3+ for transit, AES-256 for rest."
"Table: SEC-ID, 対策項目, 対策内容, 対象, 優先度, 備考."
"Cross-reference REQ-xxx, NFR-xxx IDs from upstream."
```

**Van de:**
- Khong co guidance cho "muc do chi tiet" cua moi section (VD: auth section can bao nhieu dong?)
- Khong co guidance cho "so luong SEC-ID toi thieu" (basic-design co "at least N entries" rules)
- Khong de cap den "incident severity classification" structure
- Khong co guidance ve "audit log retention" duration specifics
- Khong mention API security (rate limiting, CORS, API key management)

---

### BUG-02: Template thieu Section "セキュリティ対策一覧" trong validator

**Muc do: Medium**

Template co 9 core sections:
1. セキュリティ方針
2. **セキュリティ対策一覧** (SEC-ID table)
3. 認証・認可設計
4. データ保護
5. 通信セキュリティ
6. 脆弱性対策
7. 監査ログ
8. インシデント対応
9. 参考資料

Nhung validator `REQUIRED_SECTIONS` (validator.ts:56-60) chi check 6 sections:
```typescript
"security-design": [
  ...STRUCTURAL_SECTIONS,
  "セキュリティ方針", "認証・認可設計", "データ保護",
  "通信セキュリティ", "脆弱性対策", "監査ログ",
]
```

**Thieu 3 sections:**
- "セキュリティ対策一覧" — CHUA duoc check (day la section chua SEC-ID table!)
- "インシデント対応" — CHUA duoc check
- "参考資料" — CHUA duoc check

**Impact:** Doc co the pass validation ma thieu bang SEC-ID tong hop va phan incident response.

---

### BUG-03: Khong co PROJECT_TYPE_INSTRUCTIONS cho security-design

**Muc do: High**

`PROJECT_TYPE_INSTRUCTIONS` (generate.ts:113-212) co instructions cho nhieu doc types:
- `saas` → basic-design, requirements
- `government` → basic-design, requirements
- `finance` → basic-design, requirements
- `healthcare` → basic-design, requirements

**Nhung KHONG co project type nao co instructions cho `security-design`.**

Day la van de lon vi security design thay doi RAT NHIEU theo project type:
- **SaaS**: Multi-tenant isolation, tenant-scoped API keys, shared infra security
- **Government**: Data sovereignty, audit trail compliance, PII handling theo luat
- **Finance**: FISC standards, transaction integrity, fraud detection
- **Healthcare**: HIPAA/3省2ガイドライン, PHI protection, consent management
- **Mobile**: Certificate pinning, secure local storage, biometric auth
- **Microservice**: Service mesh security, mTLS, API gateway auth

---

### BUG-04: Interview questions khong adapt theo project_type

**Muc do: Medium**

Skill flow (`phase-design.md:117-119`) hoi 3 cau co dinh:
1. Authentication method? (OAuth2, SAML, OpenID Connect, custom)
2. Data classification levels? (公開, 社内, 機密, 極秘)
3. Applicable compliance? (個人情報保護法, PCI-DSS, HIPAA, ISMS)

**Van de:**
- SaaS project can hoi: "Tenant isolation strategy?" nhung khong duoc hoi
- Mobile can hoi: "Certificate pinning required?" nhung khong duoc hoi
- Finance can hoi: "FISC compliance level?" nhung khong duoc hoi
- Government can hoi: "Security clearance level?" nhung khong duoc hoi
- Khong hoi ve "Existing WAF/firewall infrastructure?"
- Khong hoi ve "Third-party integration security requirements?"

---

### BUG-05: SEC-ID table validation qua don gian

**Muc do: Medium**

`REQUIRED_COLUMNS` (validator.ts:151):
```typescript
"security-design": [REVISION_HISTORY_COLUMNS, ["SEC-ID", "対策項目"]]
```

Chi check 2 columns: `SEC-ID` va `対策項目`. Template define 6 columns:
```
SEC-ID | 対策項目 | 対策内容 | 対象 | 優先度 | 備考
```

**Khong check:**
- `対策内容` — cot quan trong nhat (NỘI DUNG cua countermeasure)
- `優先度` — khong validate co dung gia tri (高/中/低) khong
- Khong check so luong SEC entries (co the chi co 1 entry va pass)
- Khong check cross-ref: SEC entries co map den REQ/NFR khong

---

### BUG-06: Khong co split mode support

**Muc do: Low**

Security-design la monolithic only — khong ho tro split mode nhu basic-design hay detail-design.

Voi project lon (50+ screens, 20+ APIs), security document co the dai 50+ pages. AI context window se gap gioi han.

Tuy nhien, split mode cho security doc la debatable — security can duoc nhìn tong the, khong nen chia theo feature vi security controls thuong cross-cutting.

**De xuat:** Thay vi split by feature, co the split by security domain:
- Split 1: Authentication & Authorization
- Split 2: Data Protection & Encryption
- Split 3: Network & API Security
- Split 4: Audit & Incident Response

---

## 4. Real-world cases chua duoc cover

### CASE-01: API Security (Rate Limiting, CORS, API Gateway)

**Hien tai:** Template co section "通信セキュリティ" nhung chi noi ve TLS va HTTPS.

**Thieu:**
- API rate limiting strategy (per-user, per-IP, per-tenant)
- CORS policy design (allowed origins, headers, methods)
- API key management (rotation, revocation, scoping)
- API gateway security (WAF rules, DDoS protection)
- GraphQL-specific: query depth limiting, introspection disabling
- WebSocket security (origin validation, message size limits)

**Impact:** Real-world API abuse la attack vector #1 — template khong cover.

---

### CASE-02: Cloud Infrastructure Security

**Hien tai:** Template assume on-premise hoac generic infrastructure.

**Thieu:**
- IAM role design (least privilege, service accounts)
- Secret management (Vault, AWS Secrets Manager, env var security)
- Container security (image scanning, runtime security, pod security policies)
- Network security groups / VPC design
- Cloud-specific compliance (SOC2, ISO27001 mapping)
- Infrastructure as Code security (Terraform state protection, drift detection)

---

### CASE-03: Supply Chain & Dependency Security

**Hien tai:** Template Section 6 (脆弱性対策) noi "依存ライブラリの脆弱性管理" nhung chi 1 dong.

**Thieu:**
- SCA (Software Composition Analysis) tool integration
- Dependency update policy (auto-merge patch, manual review minor/major)
- License compliance checking
- SBOM (Software Bill of Materials) generation
- Container base image update strategy
- GitHub Dependabot / Snyk / Renovate configuration guidance

---

### CASE-04: Security Testing Integration

**Hien tai:** security-design la "design" doc — khong link den test specs.

**Thieu:**
- SAST (Static Application Security Testing) tool configuration
- DAST (Dynamic Application Security Testing) scope
- Penetration testing scope va schedule
- Security test cases traceability (SEC-xxx → ST-xxx or dedicated security test)
- Bug bounty program design (neu co)
- sec-design → test-plan/st-spec chain link chua duoc exploit

**Impact:** V-model co chain pair `security-design → operation-design` nhung KHONG co chain pair `security-design → test-plan` hay `security-design → st-spec`. Tuc la security requirements khong tu dong flow xuong test specs.

Xem `cross-ref-linker.ts:29-41` — test phase chi nhan input tu requirements, basic-design, detail-design. Security-design bi "isolated" khoi test chain.

---

### CASE-05: Data Privacy & GDPR/個人情報保護法 Compliance

**Hien tai:** Template Section 4 (データ保護) noi "個人情報保護法準拠" nhung chi 1 dong.

**Thieu:**
- Data flow diagram cho PII (tu input → processing → storage → deletion)
- Consent management design
- Data subject rights implementation (access, rectification, erasure, portability)
- Data breach notification procedure (72h rule under GDPR)
- Privacy Impact Assessment (PIA) integration
- Cross-border data transfer controls
- Data retention matrix per data category

---

### CASE-06: Zero Trust Architecture

**Hien tai:** Template assume perimeter-based security model.

**Thieu:**
- Zero Trust principles application
- Identity verification at every access point
- Micro-segmentation design
- Continuous authentication / session re-validation
- Device trust assessment
- Contextual access policies (location, time, device health)

---

### CASE-07: Secrets & Key Management

**Hien tai:** Template noi "bcrypt" va "AES-256" nhung khong co section rieng cho key management.

**Thieu:**
- Key lifecycle management (generation, rotation, revocation, destruction)
- Key storage strategy (HSM, KMS, Vault)
- Key hierarchy design (master key, data encryption key, key encryption key)
- Certificate management (issuance, renewal, revocation, monitoring)
- API token lifecycle (JWT expiry, refresh token rotation)

---

### CASE-08: Security Monitoring & SIEM

**Hien tai:** Template Section 7 (監査ログ) va Section 8 (インシデント対応) lam rieng re.

**Thieu:**
- SIEM integration design (log aggregation, correlation rules)
- Security alert escalation matrix
- Real-time threat detection rules
- Automated incident response playbooks
- Security metrics dashboard design (KPIs: MTTD, MTTR, false positive rate)
- Integration voi operation-design (cung co monitoring section)

---

## 5. De xuat cai tien

### 5.1 Enrich generation instructions (Priority: Critical)

Hien tai 7 dong — can 20-25 dong, bao gom:
- Minimum SEC-ID count per section (VD: >=3 entries cho auth, >=5 cho vulnerability)
- API security section guidance (rate limiting, CORS, API keys)
- Cloud/infrastructure security guidance
- Audit log retention duration specifics (khong chi "具体的な日数" ma co guidance)
- Incident severity matrix structure (S1/S2/S3/S4 voi response time)
- Cross-reference: moi SEC entry PHAI map den it nhat 1 REQ hoac NFR

### 5.2 Add PROJECT_TYPE_INSTRUCTIONS for security-design (Priority: High)

| Project Type | Security Focus |
|-------------|---------------|
| saas | Tenant isolation, shared infra security, API key scoping per tenant |
| government | Data sovereignty, audit compliance, PII handling, clearance levels |
| finance | FISC standards, transaction integrity, fraud detection, PCI-DSS |
| healthcare | PHI protection, consent, 3省2ガイドライン, medical device security |
| mobile | Certificate pinning, secure storage, biometric auth, jailbreak detection |
| microservice | Service mesh, mTLS, API gateway, service-to-service auth |

### 5.3 Fix validator completeness (Priority: High)

1. Them "セキュリティ対策一覧", "インシデント対応", "参考資料" vao `REQUIRED_SECTIONS`
2. Them "対策内容" vao `REQUIRED_COLUMNS`
3. Them minimum row count check: `SEC-ID count >= 5`
4. Them priority value validation: `優先度` must be 高/中/低
5. Them cross-ref check: each SEC-xxx should reference at least 1 upstream ID

### 5.4 Add security-design → test chain link (Priority: High)

Hien tai `CHAIN_PAIRS` khong co:
```typescript
["security-design", "test-plan"]  // missing!
["security-design", "st-spec"]    // missing!
```

Can them de SEC-xxx IDs flow xuong test planning. Security test cases can trace back to SEC entries.

### 5.5 Expand interview questions (Priority: Medium)

Them conditional questions dua tren project_type:
- Base: 3 cau hien tai (auth, data classification, compliance)
- SaaS: +1 "Tenant isolation strategy?"
- Mobile: +1 "Mobile-specific security? (cert pinning, biometric)"
- Government: +1 "Security clearance requirements?"
- Finance: +1 "FISC/PCI-DSS compliance tier?"
- All: +1 "Third-party integrations requiring security review?"
- All: +1 "Cloud provider and infrastructure security requirements?"

### 5.6 Template enhancement (Priority: Medium)

Them optional sections:
- "API セキュリティ" — rate limiting, CORS, API key management
- "クラウドインフラセキュリティ" — IAM, secrets, container security
- "サプライチェーンセキュリティ" — dependency, SBOM, SCA
- "鍵管理" — key lifecycle, KMS, certificate management

### 5.7 Security-design specific staleness rules (Priority: Low)

Security-design phu thuoc upstream nhieu, nhung staleness detection hien tai generic. Can:
- Higher sensitivity cho security-related changes (NFR security section changes → immediate stale)
- Track OWASP version changes (Top 10 list updates)
- Track compliance regulation changes (new laws/standards)

---

## 6. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Thin generation instructions → AI generates generic doc | High | High | Enrich instructions to 20+ lines |
| No project-type security guidance → miss domain-specific risks | High | High | Add PROJECT_TYPE_INSTRUCTIONS |
| Missing validator sections → incomplete doc passes | Medium | High | Fix REQUIRED_SECTIONS |
| No test chain link → security reqs untested | High | Medium | Add chain pairs |
| No API security guidance → OWASP A01 blind spot | High | Medium | Add API security section |
| No cloud infra guidance → modern stack gaps | Medium | Medium | Add cloud security section |
| SEC-xxx isolated from test chain → no traceability | High | Medium | Add cross-ref to test-plan/st-spec |
| 3 fixed interview questions → miss domain context | Medium | High | Conditional interview expansion |

---

## 7. Tom tat

### Diem manh
- Upstream chain phong phu (3 docs input)
- OWASP Top 10 integration co san
- Cross-ref override mechanism chuan
- Keigo "simple" phu hop cho technical security doc

### Van de chinh (6 bugs)
1. **BUG-01**: Generation instructions qua thin (7 dong vs 15+ cua basic-design)
2. **BUG-02**: Validator thieu 3/9 required sections (セキュリティ対策一覧, インシデント対応, 参考資料)
3. **BUG-03**: Zero PROJECT_TYPE_INSTRUCTIONS cho security-design (ALL project types)
4. **BUG-04**: Interview questions khong adapt theo project_type
5. **BUG-05**: SEC-ID table validation qua don gian (chi check 2/6 columns)
6. **BUG-06**: Khong co split mode (debatable — security la cross-cutting)

### Cases chua cover (8 cases)
1. API Security (rate limiting, CORS, API gateway)
2. Cloud Infrastructure Security (IAM, secrets, containers)
3. Supply Chain & Dependency Security (SCA, SBOM)
4. Security Testing Integration (SAST, DAST, pentest)
5. Data Privacy & GDPR/個人情報保護法 depth
6. Zero Trust Architecture
7. Secrets & Key Management lifecycle
8. Security Monitoring & SIEM integration

### Architectural gap lon nhat
**Security-design bi "isolated" khoi test chain.** `CHAIN_PAIRS` co `security-design → operation-design` nhung KHONG co `security-design → test-plan/st-spec`. Tuc la security requirements khong tu dong flow xuong test specifications — day la vi pham V-model symmetry.

---

## 8. Tracking Board

### Bugs

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-01 | Generation instructions too thin (7 lines) | High | DONE | Expanded to 39 lines with per-section guidance |
| BUG-02 | Validator missing 3 required sections | Medium | DONE | Added セキュリティ対策一覧, インシデント対応 |
| BUG-03 | No PROJECT_TYPE_INSTRUCTIONS for security-design | High | DONE | 8 project types covered |
| BUG-04 | Interview questions not project-type-aware | Medium | DONE | 5 base + 6 conditional questions |
| BUG-05 | SEC-ID table validation too simple (2/6 columns) | Medium | DONE | Now checks 4 columns |
| BUG-06 | No split mode support | Low | WONTFIX | Security is cross-cutting |

### Improvements

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| IMP-01 | Enrich generation instructions to 20+ lines | Critical | DONE | 39 lines, 9 sections covered |
| IMP-02 | Add PROJECT_TYPE_INSTRUCTIONS per project type | High | DONE | 8 project types |
| IMP-03 | Fix validator completeness (sections + columns) | High | DONE | 8 sections + 4 columns |
| IMP-04 | Add security-design → test-plan/st-spec chain pairs | High | DONE | V-model symmetry restored |
| IMP-05 | Expand conditional interview questions | Medium | DONE | 5 base + 6 conditional |
| IMP-06 | Template enhancement (API sec, cloud, supply chain) | Medium | DONE | 3 optional sections added |
| IMP-07 | Security-specific staleness rules | Low | DEFERRED | Generic staleness adequate |

### Uncovered Cases

| ID | Case | Priority | Status |
|----|------|----------|--------|
| CASE-01 | API Security | High | DONE | Template section + project type instructions |
| CASE-02 | Cloud Infrastructure Security | Medium | DONE | Project type instructions (microservice, saas) |
| CASE-03 | Supply Chain Security | Medium | DONE | Template section サプライチェーンセキュリティ |
| CASE-04 | Security Testing Integration | High | DONE | Chain pairs → test-plan/st-spec |
| CASE-05 | Data Privacy depth | Medium | DONE | Generation instructions + government/healthcare types |
| CASE-06 | Zero Trust Architecture | Low | PARTIAL | Covered in generation instructions, no dedicated section |
| CASE-07 | Secrets & Key Management | Medium | DONE | Template section 鍵管理 |
| CASE-08 | Security Monitoring & SIEM | Medium | DONE | Generation instructions (監査ログ section) + finance type |
