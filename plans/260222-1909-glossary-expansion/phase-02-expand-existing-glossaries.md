# Phase 2: Expand Existing Glossaries

## Context Links

- [Plan Overview](./plan.md)
- [Phase 1 (prerequisite)](./phase-01-schema-code-changes.md)
- [Vietnamese BrSE Research](./research/researcher-02-vietnamese-brse-terminology.md)
- [Existing glossaries](../../sekkei/packages/mcp-server/templates/glossaries/)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 2h
- **Description:** Add `vi` field to all existing terms in 4 glossary files + expand each from 30-40 terms to ~250 terms organized by sub-contexts

## Key Insights

- Existing terms already have `ja` + `en` + `context` -- only `vi` needs adding
- Vietnamese strategy per industry (from research):
  - **finance**: mix -- formal Vietnamese for accounting/banking, English for fintech terms
  - **medical**: Vietnamese preferred -- government/patient-facing terminology
  - **manufacturing**: Japanese loanwords heavy in BrSE context; formal Vietnamese for safety/QC
  - **real-estate**: Vietnamese preferred -- legal/contract terms need formal translation
- Universal IT terms (API, DB, UI, UX, SQL, JSON) kept as English in `vi` field
- Sub-contexts ensure ~30 terms per sub-context (8 sub-contexts x ~31 = ~250)

## Requirements

### Functional
- FR-1: All existing terms get accurate `vi` translations
- FR-2: Each file expanded to ~250 terms (200-300 acceptable range)
- FR-3: Terms organized by `context` field matching sub-context names
- FR-4: No duplicate `ja` values within a file
- FR-5: YAML structure matches target schema: `{ ja, en, vi, context }`

### Non-Functional
- NFR-1: Vietnamese translations follow BrSE conventions (formal for client-facing, English loanwords for IT-internal)
- NFR-2: Terms sourced from JIS/IPA standards where applicable
- NFR-3: Each sub-context has 25-35 terms for balanced coverage

## Target YAML Format

```yaml
industry: finance
language: ja
terms:
  - ja: 勘定科目
    en: account category
    vi: danh mục tài khoản
    context: 会計
  - ja: 仕訳
    en: journal entry
    vi: bút toán
    context: 会計
  - ja: API連携
    en: API integration
    vi: API integration
    context: フィンテック
```

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/templates/glossaries/finance.yaml` -- 40 -> 250 terms + vi
- `sekkei/packages/mcp-server/templates/glossaries/medical.yaml` -- 40 -> 250 terms + vi
- `sekkei/packages/mcp-server/templates/glossaries/manufacturing.yaml` -- 36 -> 250 terms + vi
- `sekkei/packages/mcp-server/templates/glossaries/real-estate.yaml` -- 30 -> 250 terms + vi

## Implementation Steps

### 1. finance.yaml (40 -> 250 terms)

**Step 1a.** Add `vi` to all 40 existing terms. Vietnamese finance terms:
- 勘定科目 -> danh mục tài khoản, 仕訳 -> bút toán, 元帳 -> sổ cái, etc.

**Step 1b.** Expand by sub-context (8 sub-contexts, ~26 new terms each = ~210 new):

| Sub-context | Current | Target | New terms needed | Example new terms |
|-------------|---------|--------|-----------------|-------------------|
| 会計 (accounting) | 10 | 35 | 25 | 減価償却/depreciation/khấu hao, 棚卸/inventory count/kiểm kê |
| 銀行 (banking) | 6 | 30 | 24 | 口座振替/direct debit/ghi nợ trực tiếp, 為替/exchange/ngoại hối |
| 証券 (securities) | 5 | 30 | 25 | 株式/stock/cổ phiếu, 配当/dividend/cổ tức |
| 保険 (insurance) | 4 | 30 | 26 | 保険料/premium/phí bảo hiểm, 免責/deductible/mức miễn thường |
| 税務 (tax) | 5 | 30 | 25 | 確定申告/tax return/khai thuế, 控除/deduction/khấu trừ |
| フィンテック (fintech) | 4 | 30 | 26 | 電子決済/e-payment/thanh toán điện tử, ブロックチェーン/blockchain/blockchain |
| リスク管理 (risk mgmt) | 3 | 35 | 32 | 信用リスク/credit risk/rủi ro tín dụng, コンプライアンス/compliance/tuân thủ |
| 決済 (settlement) | 3 | 30 | 27 | 即時決済/instant payment/thanh toán tức thì, QRコード決済/QR payment/thanh toán QR |

### 2. medical.yaml (40 -> 250 terms)

**Step 2a.** Add `vi` to all 40 existing terms. Vietnamese medical terms use formal register:
- 患者/patient/bệnh nhân, 診察/examination/khám bệnh, etc.

**Step 2b.** Expand by sub-context:

| Sub-context | Current | Target | New | Example new terms |
|-------------|---------|--------|-----|-------------------|
| 診療 (clinical) | 8 | 35 | 27 | 外来/outpatient/ngoại trú, 入院/hospitalization/nhập viện |
| 薬学 (pharmacy) | 6 | 30 | 24 | 処方箋/prescription/đơn thuốc, 投薬/medication/dùng thuốc |
| 医療機器 (devices) | 5 | 30 | 25 | 内視鏡/endoscope/nội soi, 超音波/ultrasound/siêu âm |
| 電子カルテ (EMR) | 5 | 30 | 25 | 診療記録/clinical record/hồ sơ bệnh án, SOAP記録/SOAP note/ghi chú SOAP |
| 検査 (testing) | 5 | 30 | 25 | 血液検査/blood test/xét nghiệm máu, CT検査/CT scan/chụp CT |
| 保険請求 (claims) | 4 | 30 | 26 | レセプト/receipt claim/phiếu thanh toán, 点数/points/điểm |
| 病院管理 (hospital mgmt) | 4 | 35 | 31 | 病床管理/bed management/quản lý giường bệnh |
| 遠隔医療 (telemedicine) | 3 | 30 | 27 | オンライン診療/online consultation/khám trực tuyến |

### 3. manufacturing.yaml (36 -> 250 terms)

**Step 3a.** Add `vi` to 36 existing terms. Manufacturing uses mix of formal vi + JP loanwords:
- 生産計画/production plan/kế hoạch sản xuất, 品質管理/QC/quản lý chất lượng

**Step 3b.** Expand by sub-context:

| Sub-context | Current | Target | New | Example new terms |
|-------------|---------|--------|-----|-------------------|
| 生産管理 (production) | 8 | 35 | 27 | 工程表/process chart/bảng quy trình, ライン/line/dây chuyền |
| 品質管理 (QC) | 6 | 30 | 24 | 不良率/defect rate/tỷ lệ lỗi, 検査基準/inspection criteria/tiêu chí kiểm tra |
| 在庫管理 (inventory) | 5 | 30 | 25 | 安全在庫/safety stock/tồn kho an toàn, 棚卸/stocktaking/kiểm kê |
| 調達 (procurement) | 4 | 30 | 26 | 発注書/purchase order/đơn đặt hàng, 納期/delivery date/ngày giao hàng |
| 設備保全 (maintenance) | 4 | 30 | 26 | 予防保全/preventive maint./bảo trì phòng ngừa |
| IoT | 3 | 30 | 27 | センサー/sensor/cảm biến, エッジ処理/edge processing/xử lý biên |
| 安全管理 (safety) | 3 | 35 | 32 | 労災/work injury/tai nạn lao động, 安全教育/safety training/đào tạo an toàn |
| 原価管理 (cost mgmt) | 3 | 30 | 27 | 直接費/direct cost/chi phí trực tiếp, 間接費/indirect cost/chi phí gián tiếp |

### 4. real-estate.yaml (30 -> 250 terms)

**Step 4a.** Add `vi` to 30 existing terms. Real estate uses formal Vietnamese:
- 契約書/contract/hợp đồng, 賃貸/rental/cho thuê

**Step 4b.** Expand by sub-context:

| Sub-context | Current | Target | New | Example new terms |
|-------------|---------|--------|-----|-------------------|
| 売買 (sales) | 6 | 35 | 29 | 売買契約/sales contract/hợp đồng mua bán |
| 賃貸 (rental) | 5 | 30 | 25 | 敷金/deposit/tiền đặt cọc, 礼金/key money/tiền lễ |
| 仲介 (brokerage) | 4 | 30 | 26 | 仲介手数料/brokerage fee/phí môi giới |
| 物件管理 (property mgmt) | 4 | 30 | 26 | 管理費/management fee/phí quản lý |
| 登記 (registration) | 3 | 30 | 27 | 所有権/ownership/quyền sở hữu, 抵当権/mortgage/thế chấp |
| 建築法規 (building regs) | 3 | 30 | 27 | 建ぺい率/building coverage ratio/tỷ lệ xây dựng |
| 不動産投資 (RE investment) | 3 | 35 | 32 | 利回り/yield/tỷ suất lợi nhuận, REIT/REIT/REIT |
| 査定 (appraisal) | 2 | 30 | 28 | 路線価/roadside land price/giá đất mặt đường |

## Todo List

- [ ] Add `vi` to all 40 existing finance.yaml terms
- [ ] Expand finance.yaml to ~250 terms across 8 sub-contexts
- [ ] Add `vi` to all 40 existing medical.yaml terms
- [ ] Expand medical.yaml to ~250 terms across 8 sub-contexts
- [ ] Add `vi` to all 36 existing manufacturing.yaml terms
- [ ] Expand manufacturing.yaml to ~250 terms across 8 sub-contexts
- [ ] Add `vi` to all 30 existing real-estate.yaml terms
- [ ] Expand real-estate.yaml to ~250 terms across 8 sub-contexts
- [ ] Verify YAML validity for all 4 files
- [ ] Verify no duplicate `ja` values within each file
- [ ] Verify term counts: 200-300 range per file

## Success Criteria

- All 4 files have 200-300 terms each
- Every term has non-empty `ja`, `en`, `vi`, `context` fields
- No duplicate `ja` values within a file
- `yaml.safe_load()` succeeds on all files
- Sub-context distribution is roughly balanced (25-35 per sub-context)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vietnamese translations inaccurate for specialized domains | Medium | Use formal Vietnamese for govt/medical; validate with BrSE conventions from research |
| Existing terms modified accidentally | Medium | Only ADD `vi` field to existing terms; do not modify `ja`/`en`/`context` |
| YAML formatting broken by large file edits | Low | Validate with `yaml.safe_load()` after each file |

## Next Steps

- Can run in parallel with Phase 3
- Both feed into Phase 4 (validation)
