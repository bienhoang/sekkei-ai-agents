# Phase 3: Create New Industry Glossaries

## Context Links

- [Plan Overview](./plan.md)
- [Phase 1 (prerequisite)](./phase-01-schema-code-changes.md)
- [Vietnamese BrSE Research](./research/researcher-02-vietnamese-brse-terminology.md)
- [Brainstorm -- sub-contexts](../reports/brainstorm-260222-1909-glossary-expansion.md)
- [Target directory](../../sekkei/packages/mcp-server/templates/glossaries/)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Description:** Create 10 new industry glossary YAML files (~250 terms each, trilingual ja/en/vi)

## Key Insights

- Vietnamese translation strategy varies by industry (from research):
  - **Formal Vietnamese preferred:** government, education, insurance, energy
  - **English loanwords acceptable:** telecom, logistics, automotive (technical terms)
  - **Mixed:** retail, construction, food-service
- IT system terms (API, DB, UI, server, deploy, etc.) always kept as English in `vi` field
- Each industry has 8 sub-contexts; target ~31 terms per sub-context
- Two parallel batches recommended: 5 files each

## Requirements

### Functional
- FR-1: Create 10 new YAML files in `templates/glossaries/`
- FR-2: Each file has ~250 terms (200-300 acceptable)
- FR-3: All terms follow schema: `{ ja, en, vi, context }`
- FR-4: File header includes `industry` and `language` fields
- FR-5: Terms organized by `context` matching sub-context names
- FR-6: No duplicate `ja` values within a file

### Non-Functional
- NFR-1: Terms sourced from JIS/IPA standards where applicable
- NFR-2: Vietnamese follows BrSE conventions per industry
- NFR-3: Balanced sub-context coverage (25-35 terms each)

## Target YAML Format

Every new file follows this structure:
```yaml
industry: logistics   # kebab-case industry ID
language: ja
terms:
  - ja: 倉庫管理システム
    en: warehouse management system
    vi: hệ thống quản lý kho
    context: 倉庫管理
  - ja: 配送ルート
    en: delivery route
    vi: tuyến giao hàng
    context: 配送
  - ja: API連携
    en: API integration
    vi: API integration
    context: トラッキング
```

## Related Code Files

### Create (10 new files)
- `sekkei/packages/mcp-server/templates/glossaries/logistics.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/retail.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/insurance.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/education.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/government.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/construction.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/telecom.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/automotive.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/energy.yaml`
- `sekkei/packages/mcp-server/templates/glossaries/food-service.yaml`

## Implementation Steps

### Batch 1 (5 files)

#### 1. logistics.yaml (~250 terms) -- vi: English loanwords acceptable

| Sub-context | Target | Example terms (ja / en / vi) |
|-------------|--------|------------------------------|
| 倉庫管理 (warehouse) | 32 | 入庫/receiving/nhập kho, 出庫/shipping/xuất kho, ロケーション/location/vị trí |
| 配送 (delivery) | 32 | 配送先/delivery destination/địa chỉ giao hàng, 積載量/load capacity/tải trọng |
| 輸出入 (import/export) | 30 | 輸出申告/export declaration/khai báo xuất khẩu, 関税/tariff/thuế quan |
| 在庫 (inventory) | 30 | 在庫回転率/inventory turnover/vòng quay tồn kho, 欠品/stockout/hết hàng |
| トラッキング (tracking) | 32 | 追跡番号/tracking number/mã theo dõi, GPS/GPS/GPS |
| 3PL | 30 | 委託先/outsourcing partner/đối tác thuê ngoài, SLA/SLA/SLA |
| 冷蔵物流 (cold chain) | 32 | 温度管理/temperature control/kiểm soát nhiệt độ, 冷凍庫/freezer/kho đông lạnh |
| 通関 (customs) | 32 | 通関手続き/customs clearance/thủ tục hải quan, HSコード/HS code/mã HS |

#### 2. retail.yaml (~250 terms) -- vi: mixed

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| POS | 32 | レジ/register/máy tính tiền, バーコード/barcode/mã vạch |
| EC (e-commerce) | 32 | カート/cart/giỏ hàng, 決済画面/checkout/trang thanh toán |
| 在庫管理 (inventory) | 30 | 発注点/reorder point/điểm đặt hàng lại, SKU/SKU/SKU |
| CRM | 30 | 顧客管理/customer management/quản lý khách hàng, ポイント/loyalty points/điểm tích lũy |
| 棚割 (planogram) | 32 | 陳列/display/trưng bày, フェイス数/facing count/số mặt hàng |
| プロモーション (promo) | 30 | クーポン/coupon/phiếu giảm giá, セール/sale/khuyến mãi |
| オムニチャネル (omni) | 32 | 店舗受取/store pickup/nhận tại cửa hàng, 在庫連携/inventory sync/đồng bộ tồn kho |
| 決済 (payment) | 32 | 電子マネー/e-money/tiền điện tử, 分割払い/installment/trả góp |

#### 3. insurance.yaml (~250 terms) -- vi: formal Vietnamese preferred

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 生命保険 (life) | 32 | 終身保険/whole life/bảo hiểm trọn đời, 年金/annuity/niên kim |
| 損害保険 (non-life) | 32 | 火災保険/fire insurance/bảo hiểm hỏa hoạn, 自動車保険/auto insurance/bảo hiểm ô tô |
| 査定 (assessment) | 30 | 損害査定/claims assessment/giám định tổn thất, 現場調査/field survey/khảo sát hiện trường |
| 引受 (underwriting) | 30 | 引受審査/underwriting review/thẩm định bảo lãnh, リスク評価/risk assessment/đánh giá rủi ro |
| 保全 (policy admin) | 32 | 契約変更/policy change/thay đổi hợp đồng, 解約/cancellation/hủy hợp đồng |
| 再保険 (reinsurance) | 30 | 出再/cession/nhượng tái, 受再/assumption/nhận tái |
| アクチュアリー (actuary) | 32 | 死亡率/mortality rate/tỷ lệ tử vong, 準備金/reserve/dự phòng |
| コンプライアンス (compliance) | 32 | 金融庁/FSA/Cơ quan Tài chính, 約款/policy terms/điều khoản |

#### 4. education.yaml (~250 terms) -- vi: formal Vietnamese preferred

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 学校管理 (school admin) | 32 | 学年/academic year/năm học, 時間割/timetable/thời khóa biểu |
| LMS | 32 | 学習管理/learning management/quản lý học tập, コース/course/khóa học |
| 成績管理 (grades) | 30 | 成績表/report card/phiếu điểm, 評価基準/grading criteria/tiêu chí đánh giá |
| 入試 (admissions) | 30 | 入学試験/entrance exam/thi tuyển sinh, 合格/pass/đậu |
| 学生情報 (student info) | 32 | 学籍番号/student ID/mã sinh viên, 出席/attendance/điểm danh |
| eラーニング (e-learning) | 30 | 動画教材/video content/nội dung video, 進捗率/completion rate/tỷ lệ hoàn thành |
| 教材管理 (materials) | 32 | 教科書/textbook/sách giáo khoa, シラバス/syllabus/đề cương |
| 校務 (school ops) | 32 | 教職員/faculty/giảng viên, 保護者/guardian/phụ huynh |

#### 5. government.yaml (~250 terms) -- vi: formal Vietnamese REQUIRED

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 住民基本台帳 (resident reg) | 32 | 住民票/resident card/sổ hộ khẩu, 転入届/move-in notice/thông báo nhập cư |
| 税務 (tax) | 32 | 住民税/resident tax/thuế cư trú, 納税者/taxpayer/người nộp thuế |
| 福祉 (welfare) | 30 | 生活保護/welfare assistance/trợ cấp xã hội, 介護保険/nursing care insurance/bảo hiểm chăm sóc |
| 戸籍 (family reg) | 30 | 戸籍謄本/family register copy/bản sao hộ tịch, 婚姻届/marriage notice/giấy đăng ký kết hôn |
| 電子申請 (e-gov) | 32 | 電子署名/digital signature/chữ ký điện tử, マイナポータル/MynaPortal/cổng Myna |
| マイナンバー (My Number) | 30 | 個人番号/individual number/số cá nhân, 本人確認/identity verification/xác minh danh tính |
| 公共調達 (procurement) | 32 | 入札/bidding/đấu thầu, 落札/winning bid/trúng thầu |
| 統計 (statistics) | 32 | 国勢調査/census/điều tra dân số, 人口動態/demographics/biến động dân số |

### Batch 2 (5 files)

#### 6. construction.yaml (~250 terms) -- vi: mixed

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 施工管理 (site mgmt) | 32 | 施工計画/construction plan/kế hoạch thi công, 現場監督/site supervisor/giám sát công trường |
| 積算 (estimation) | 32 | 見積書/estimate/bản dự toán, 単価/unit price/đơn giá |
| BIM | 30 | 3Dモデル/3D model/mô hình 3D, IFC/IFC/IFC |
| 安全管理 (safety) | 30 | KY活動/KY activity/hoạt động KY, ヘルメット/helmet/mũ bảo hộ |
| 工程管理 (scheduling) | 32 | ガントチャート/Gantt chart/biểu đồ Gantt, クリティカルパス/critical path/đường găng |
| 資材調達 (materials) | 30 | 生コン/ready-mixed concrete/bê tông trộn sẵn, 鉄筋/rebar/cốt thép |
| 図面管理 (drawings) | 32 | 設計図/blueprint/bản thiết kế, CAD/CAD/CAD |
| 検査 (inspection) | 32 | 中間検査/interim inspection/kiểm tra giữa kỳ, 竣工検査/completion inspection/nghiệm thu |

#### 7. telecom.yaml (~250 terms) -- vi: English heavy

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 基地局 (base station) | 32 | アンテナ/antenna/ăng-ten, セル/cell/cell |
| 回線 (circuit) | 32 | 光回線/fiber optic/cáp quang, 帯域/bandwidth/băng thông |
| 課金 (billing) | 30 | 従量課金/usage-based billing/tính phí theo lượng, 定額制/flat rate/cước cố định |
| CRM | 30 | 解約率/churn rate/tỷ lệ rời mạng, MNP/MNP/MNP |
| ネットワーク (network) | 32 | ルーター/router/router, ファイアウォール/firewall/firewall |
| VoIP | 30 | SIPサーバー/SIP server/SIP server, 音声品質/voice quality/chất lượng thoại |
| 5G | 32 | ミリ波/millimeter wave/sóng mm, スライシング/slicing/slicing |
| MVNO | 32 | 仮想移動体/virtual mobile/nhà mạng ảo, SIMカード/SIM card/SIM card |

#### 8. automotive.yaml (~250 terms) -- vi: mixed

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 車両設計 (vehicle design) | 32 | シャーシ/chassis/khung gầm, ボディ/body/thân xe |
| 生産ライン (production) | 32 | 組立/assembly/lắp ráp, 溶接/welding/hàn |
| 品質 (quality) | 30 | リコール/recall/thu hồi, FMEA/FMEA/FMEA |
| サプライチェーン (supply) | 30 | ティア1/tier 1/nhà cung cấp cấp 1, JIT/JIT/JIT |
| コネクテッドカー (connected) | 32 | テレマティクス/telematics/telematics, OTA更新/OTA update/cập nhật OTA |
| ADAS | 30 | 自動ブレーキ/auto brake/phanh tự động, LiDAR/LiDAR/LiDAR |
| EV | 32 | バッテリー/battery/pin, 充電ステーション/charging station/trạm sạc |
| アフターサービス (after-sales) | 32 | 車検/vehicle inspection/đăng kiểm, 整備/maintenance/bảo dưỡng |

#### 9. energy.yaml (~250 terms) -- vi: formal Vietnamese preferred

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 発電 (generation) | 32 | 火力発電/thermal power/nhiệt điện, 原子力/nuclear/điện hạt nhân |
| 送配電 (transmission) | 32 | 変電所/substation/trạm biến áp, 送電線/power line/đường dây tải điện |
| スマートグリッド (smart grid) | 30 | スマートメーター/smart meter/đồng hồ thông minh, デマンドレスポンス/demand response/đáp ứng nhu cầu |
| 再生可能エネルギー (renewable) | 30 | 太陽光発電/solar power/điện mặt trời, 風力発電/wind power/điện gió |
| ガス (gas) | 32 | 都市ガス/city gas/khí đốt thành phố, パイプライン/pipeline/đường ống |
| 需要予測 (demand forecast) | 30 | 電力需要/power demand/nhu cầu điện, ピーク/peak/cao điểm |
| カーボン (carbon) | 32 | CO2排出量/CO2 emissions/lượng phát thải CO2, 排出権取引/carbon trading/giao dịch tín chỉ carbon |
| 設備管理 (asset mgmt) | 32 | 定期点検/periodic inspection/kiểm tra định kỳ, 耐用年数/useful life/tuổi thọ sử dụng |

#### 10. food-service.yaml (~250 terms) -- vi: mixed

| Sub-context | Target | Example terms |
|-------------|--------|---------------|
| 店舗管理 (store mgmt) | 32 | 売上日報/daily sales report/báo cáo doanh thu ngày, シフト/shift/ca làm việc |
| メニュー (menu) | 32 | 原価率/food cost ratio/tỷ lệ giá vốn, アレルゲン/allergen/chất gây dị ứng |
| 予約 (reservation) | 30 | テーブル管理/table management/quản lý bàn, 予約台帳/reservation ledger/sổ đặt chỗ |
| 食材調達 (ingredients) | 30 | 仕入先/supplier/nhà cung cấp, 産地/origin/xuất xứ |
| HACCP | 32 | 危害分析/hazard analysis/phân tích mối nguy, 重要管理点/CCP/điểm kiểm soát tới hạn |
| 衛生管理 (hygiene) | 30 | 食品衛生/food hygiene/vệ sinh thực phẩm, 手洗い/handwashing/rửa tay |
| デリバリー (delivery) | 32 | 配達エリア/delivery area/khu vực giao hàng, Uber Eats/Uber Eats/Uber Eats |
| POSレジ (POS register) | 32 | 会計/checkout/thanh toán, テイクアウト/takeout/mang về |

## Todo List

- [ ] Create logistics.yaml (~250 terms, 8 sub-contexts)
- [ ] Create retail.yaml (~250 terms, 8 sub-contexts)
- [ ] Create insurance.yaml (~250 terms, 8 sub-contexts)
- [ ] Create education.yaml (~250 terms, 8 sub-contexts)
- [ ] Create government.yaml (~250 terms, 8 sub-contexts)
- [ ] Create construction.yaml (~250 terms, 8 sub-contexts)
- [ ] Create telecom.yaml (~250 terms, 8 sub-contexts)
- [ ] Create automotive.yaml (~250 terms, 8 sub-contexts)
- [ ] Create energy.yaml (~250 terms, 8 sub-contexts)
- [ ] Create food-service.yaml (~250 terms, 8 sub-contexts)
- [ ] Create common.yaml (~50 terms: V-model document names + universal IT terms)
- [ ] Verify YAML validity for all 11 files
<!-- Updated: Validation Session 1 - Added common.yaml for V-model terms -->
- [ ] Verify no duplicate `ja` values within each file
- [ ] Verify term counts: 200-300 range per file

## Success Criteria

- 11 new YAML files exist in `templates/glossaries/` (10 industry + 1 common)
<!-- Updated: Validation Session 1 - Updated count for common.yaml -->
- Each file has 200-300 terms
- Every term has non-empty `ja`, `en`, `vi`, `context`
- `yaml.safe_load()` succeeds on all files
- File names match industry IDs in code (kebab-case)
- Sub-context distribution balanced (~25-35 per sub-context)
- `manage_glossary import` works for each new industry

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vietnamese accuracy for niche domains (actuarial, telecom) | Medium | Use English loanwords where BrSE convention allows; flag uncertain terms |
| Term count padding with low-value terms | Medium | Sub-context structure forces breadth; review for redundancy |
| File naming mismatch with code enum | High | Use exact same kebab-case IDs as Phase 1 `INDUSTRIES` const |
| Large PR size (~2500 new terms) | Low | Split into 2 batches; each batch reviewable independently |

## Next Steps

- After completion, Phase 4 validates all 14 files together
- Cross-industry duplicate check happens in Phase 4
