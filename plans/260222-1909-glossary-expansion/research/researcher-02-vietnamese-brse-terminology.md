# Vietnamese BrSE Terminology Research
**Date:** 2026-02-22 | **Scope:** Vietnamese IT/BrSE terminology for ja-vi glossary (14 industries × 250 terms)

---

## 1. Official Vietnamese IT Terminology Standards

**TCVN (Tiêu chuẩn Việt Nam)** is Vietnam's national standard system, managed by STAMEQ (Ministry of Science and Technology). TCVN/TC1 is the technical committee for Information Technology.

Key findings:
- TCVN covers "terminology standards" for IT but these are largely encoding/character-set standards (e.g., VSCII = TCVN 5712), not comprehensive IT vocabulary glossaries.
- Ministry of Information and Communications (Bộ TT&TT) has issued 132 QCVNs but these are technical regulations, not vocabulary references.
- **No comprehensive, publicly accessible official Vietnamese IT terminology database exists** analogous to JIS or ISO terminology standards.
- Vietnamese Wikipedia (`vi.wikipedia.org`) is the de facto reference for formal Vietnamese IT terms (e.g., "Cơ sở dữ liệu" for database).

**Practical implication:** No authoritative single source to cite. Wikipedia + industry practice = ground truth.

---

## 2. BrSE Terminology Conventions

BrSE = "Kỹ sư cầu nối" (bridge software engineer). Role: translate Japanese client specs → Vietnamese dev teams. JLPT N2+ required. Major employers: FPT Software, VTI, Harvey Nash, Reeracoen placements.

**Observed conventions in BrSE work:**

| Category | Vietnamese preference | Notes |
|----------|----------------------|-------|
| General IT nouns | English loanword kept as-is | "database", "server", "bug", "deploy" |
| Core CS concepts | Vietnamese translation | "cơ sở dữ liệu" (DB), "lập trình" (programming) |
| Japanese-origin project terms | Katakana-romanized or JP kept | "要件定義" often written as-is in internal docs |
| Process/methodology | Mix | "Agile", "scrum" kept; "kiểm thử" for testing |
| Role names | English kept | "backend", "frontend", "DevOps" |

**Key insight:** BrSEs operate with a **dual-register** system:
- **Formal documents** (deliverables to Japanese client): lean toward Japanese terms or formal Vietnamese equivalents
- **Internal dev communication**: heavy English loanword usage, casual register

---

## 3. Existing Multilingual IT Glossaries

**No dedicated ja-vi IT glossary found** on GitHub or public repos. Available adjacent resources:

- [`Wizcorp/japanese-dev-lingo`](https://github.com/Wizcorp/japanese-dev-lingo) — ja-en developer lingo list (useful for ja side)
- [Self Taught Japanese - CS terms](https://selftaughtjapanese.com/2014/04/26/japanese-vocabulary-list-computer-science-and-software-development-terms/) — ja-en vocabulary list
- [`Trannosaur/published_dicts`](https://github.com/Trannosaur/published_dicts) — Vietnamese dictionaries (not IT-specific)
- [Glosbe en-vi](https://vi.glosbe.com/en/vi/database) — crowdsourced en-vi, includes IT terms, inconsistent quality
- [vi.wikipedia.org](https://vi.wikipedia.org) — most reliable for formal Vietnamese IT terms

**Gap confirmed:** ja-vi IT glossary is a genuine gap. Must construct from ja-en + en-vi sources.

---

## 4. Industry-Specific Term Conventions

For the 14 target industries, the pattern is: **specialized domains keep English/Japanese; consumer-facing domains have Vietnamese equivalents.**

| Industry | Dominant convention | Examples |
|----------|--------------------|-----------------------|
| Finance (tài chính) | Mix | "giao dịch" (transaction), "lãi suất" (interest rate); "API thanh toán" |
| Medical (y tế) | Vietnamese preferred | "bệnh nhân" (patient), "hồ sơ bệnh án" (medical record) |
| Manufacturing (sản xuất) | Japanese loanwords heavy | "工程" kept in docs, "QC" universal |
| Real estate (bất động sản) | Vietnamese preferred | "hợp đồng thuê" (lease contract) |
| Logistics (logistics) | English kept | "logistics", "warehouse", "tracking" |
| Retail (bán lẻ) | Mix | "POS" kept, "hóa đơn" (invoice) |
| Insurance (bảo hiểm) | Vietnamese preferred | "bảo hiểm nhân thọ", "hợp đồng bảo hiểm" |
| Education (giáo dục) | Vietnamese preferred | "học sinh", "khóa học", "bài kiểm tra" |
| Government (chính phủ) | Vietnamese formal required | "công dân", "thủ tục hành chính" |
| Construction (xây dựng) | Mix | "công trình", "thiết kế" + "BIM" kept |
| Telecom (viễn thông) | English heavy | "SIM", "bandwidth", "roaming" |
| Automotive (ô tô) | Mix | "động cơ" (engine), "ECU" kept |
| Energy (năng lượng) | Vietnamese preferred | "điện năng", "năng lượng tái tạo" |
| Food service (F&B) | English/Vietnamese mix | "F&B" kept, "thực đơn" (menu) |

**Cross-industry pattern:** IT system terms (API, DB, UI, UX, etc.) are always kept in English regardless of industry.

---

## 5. Translation Challenges: Japanese IT → Vietnamese

### 5a. Structural challenges
- **Compound kanji → Vietnamese**: 要件定義書 has no direct single-phrase Vietnamese equivalent. Common rendering: "tài liệu định nghĩa yêu cầu" (4 words). Length expansion ~2-3x.
- **V-model document names**: Japanese spec document hierarchy (RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書) has no Vietnamese standard equivalent chain — must define translations per project.
- **Keigo in specs**: Japanese spec docs use formal teineigo/sonkeigo. Vietnamese has no grammatical equivalent; formality is conveyed via vocabulary choice ("quý khách" vs "bạn", passive constructions).

### 5b. Loanword conflicts
- Japanese IT has its own katakana loanwords (バグ, デプロイ, テスト) that don't map 1:1 to Vietnamese loanwords from English ("bug", "deploy", "test"). BrSEs must decide which source language to transliterate from.
- Japanese number/counter conventions (件数, 回数) have no direct Vietnamese counterpart.

### 5c. BrSE practical conventions observed
- Japanese 画面 (screen/UI screen) → Vietnamese "màn hình" (universal, no ambiguity)
- Japanese テーブル (table/DB table) → Vietnamese "bảng" (formal) or "table" (informal)
- Japanese バッチ処理 (batch processing) → "xử lý hàng loạt" or "batch processing" (English kept)
- Japanese 仕様書 (spec document) → "tài liệu đặc tả" or "spec" — project-dependent

### 5d. Consistency risk
BrSE teams at different companies (FPT, VTI, Harvey Nash clients) may use different Vietnamese terms for the same concept. No cross-company standard exists. This makes a canonical glossary especially valuable.

---

## Recommendations for Glossary Construction

1. **Terminology strategy: 3-tier approach**
   - `vi_formal`: Full Vietnamese translation (for document headings, government/medical/education industries)
   - `vi_technical`: English loanword accepted in Vietnamese IT context (for IT system terms used cross-industry)
   - `vi_note`: Usage note when convention varies by company/industry

2. **Source priority for Vietnamese terms:**
   - vi.wikipedia.org → first check for formal equivalents
   - Glosbe en-vi → secondary validation
   - BrSE job descriptions (Reeracoen, VTI, FPT postings) → practical vocabulary mining
   - No TCVN standard to cite for IT vocabulary

3. **For V-model document names specifically:**
   - Define a canonical set of Vietnamese document titles as part of the glossary itself — this is the highest-value output since no standard exists
   - Example: 要件定義書 → "Tài liệu Định nghĩa Yêu cầu (要件定義書)"

4. **Keep English for:** API, UI, UX, DB, SQL, HTTP, JSON, XML, SDK, IDE, CI/CD, DevOps, Agile, Scrum, SaaS, PaaS, IaaS — these are used as-is by Vietnamese engineers universally.

5. **Industry-specific depth:** Government and medical industries require the most careful Vietnamese formal translation. Telecom, logistics, manufacturing can rely more on English/Japanese passthrough.

---

## Unresolved Questions

1. Does FPT Software or VTI maintain an internal BrSE glossary that could be referenced or licensed? (Not publicly found.)
2. Is there a TCVN standard specifically for IT terminology vocabulary (beyond encoding standards)? STAMEQ portal not fully searchable in English.
3. For medical industry: Vietnamese MoH has official medical terminology — does it cover IT/HIS (Hospital Information System) terms? Unconfirmed.
4. Preferred Vietnamese rendering of V-model document chain names — needs validation with actual BrSE practitioners.

---

## Sources

- [VTI: What is BrSE](https://vti.com.vn/what-is-bridge-system-engineer-brse-6-key-points-you-should-know)
- [BrSE thực tế - phamhainam.com](https://phamhainam.com/project-management/ky-su-cau-noi-brse/)
- [Cơ sở dữ liệu - vi.wikipedia.org](https://vi.wikipedia.org/wiki/C%C6%A1_s%E1%BB%9F_d%E1%BB%AF_li%E1%BB%87u)
- [Glosbe en-vi database](https://vi.glosbe.com/en/vi/database)
- [TCVN portal](https://tcvn.gov.vn/?lang=en)
- [Vietnam Standards - Wikipedia](https://en.wikipedia.org/wiki/Vietnam_Standards)
- [Wizcorp/japanese-dev-lingo](https://github.com/Wizcorp/japanese-dev-lingo)
- [Japanese CS vocabulary list](https://selftaughtjapanese.com/2014/04/26/japanese-vocabulary-list-computer-science-and-software-development-terms/)
- [FPT Software BrSE profile](https://fptsoftware.com/newsroom/news-and-press-releases/news/meet-fpt-softwares-youngest-bridge-software-engineer)
- [Reeracoen BrSE job postings](https://www.reeracoen.com.vn/en/jobs/11423)
