# Role Guide: QA (Quality Assurance)

Xem thêm: [Giới thiệu](../introduction.md) | [Quick Start](../quick-start.md) | [Workflow Testing](../workflow/testing.md) | [Team Playbook](../team-playbook/index.md)

---

## 1. QA làm gì trong dự án Sekkei?

QA chịu trách nhiệm toàn bộ phase Test — từ **テスト計画書** (test plan) đến 4 loại test spec (UT/IT/ST/UAT), traceability matrix, validate chain, và export để giao khách hàng. Bạn là người cuối cùng đảm bảo bộ tài liệu nhất quán trước khi delivery.

Công việc chính của QA:

- Tạo テスト計画書 làm input chung cho 4 specs
- Chạy 4 test specs — song song khi detail-design đã sẵn sàng
- Tạo **traceability matrix** đảm bảo 100% REQ-xxx có test coverage
- Validate toàn bộ chain từ requirements đến test specs
- Export Excel/PDF để giao khách hàng

---

## 2. Lệnh thường dùng

| Lệnh | Dùng khi nào |
|------|--------------|
| `/sekkei:test-plan @requirements @nfr @basic-design` | Tạo テスト計画書 — phải chạy trước 4 specs |
| `/sekkei:ut-spec @detail-design @test-plan` | Tạo 単体テスト仕様書 — cần detail-design |
| `/sekkei:it-spec @basic-design @test-plan` | Tạo 結合テスト仕様書 — API integration tests |
| `/sekkei:st-spec @basic-design @functions-list @test-plan` | Tạo システムテスト仕様書 — end-to-end F-xxx scenarios |
| `/sekkei:uat-spec @requirements @nfr @test-plan` | Tạo 受入テスト仕様書 — business acceptance |
| `/sekkei:matrix` | Sinh traceability matrix REQ-xxx ↔ test cases |
| `/sekkei:validate` | Validate toàn bộ chain — chạy sau khi tất cả specs xong |
| `/sekkei:export @spec --format=xlsx` | Export Excel IPA 4-sheet để giao khách hàng |

---

## 3. Quy trình làm việc

QA đi theo luồng: **Confirm basic-design validated → Test-plan → 4 specs song song → Matrix → Validate chain → Export**.

1. Xác nhận Dev Lead đã validate basic-design
2. Chạy `/sekkei:test-plan` với 3 inputs: requirements, nfr, basic-design
3. Khi detail-design sẵn sàng: chạy song song cả 4 specs
4. Chạy `/sekkei:matrix` để generate traceability matrix
5. Chạy `/sekkei:validate` để kiểm tra toàn bộ chain — fix bất kỳ broken cross-refs
6. Export xlsx + PDF toàn bộ specs

Chi tiết từng bước: [Workflow Testing](../workflow/testing.md)

---

## 4. Coverage Standards

Sekkei generate test cases theo chuẩn tối thiểu sau — QA cần verify AI output đáp ứng:

| Loại spec | Coverage tối thiểu |
|-----------|-------------------|
| **UT** (単体テスト) | Tối thiểu 5 test cases/module: 正常系 (happy path) + 異常系 (error cases) + 境界値 (boundary values) |
| **IT** (結合テスト) | Tất cả API-xxx integrations phải có ít nhất 1 test |
| **ST** (システムテスト) | Tất cả F-xxx scenarios phải có end-to-end test |
| **UAT** (受入テスト) | Tất cả REQ-xxx phải map vào ít nhất 1 UAT scenario |

> [!TIP]
> Dùng `/sekkei:matrix` ngay sau khi tạo xong các specs — matrix sẽ chỉ rõ REQ-xxx nào chưa có test coverage.

---

## 5. Tips

- **Test-plan trước, specs sau** — 4 specs đều lấy test-plan làm input chung. Bỏ qua bước này sẽ khiến specs thiếu strategy và scope
- UT spec phụ thuộc vào detail-design; IT/ST/UAT chỉ cần basic-design — bạn có thể chạy IT/ST/UAT song song ngay khi basic-design xong, không cần chờ detail-design
- `/sekkei:validate` ở cuối phase QA là "gate" cuối cùng — nếu có broken cross-refs, fix trước khi export
- Export xlsx cho khách hàng Nhật (format quen thuộc), export PDF cho stakeholder nội bộ review nhanh

---

## 6. Checklist

- [ ] テスト計画書 đã hoàn chỉnh với test scope, strategy, và schedule
- [ ] UT spec: tối thiểu 5 cases/module (正常系 + 異常系 + 境界値)
- [ ] IT spec: tất cả API-xxx integrations có test
- [ ] ST spec: tất cả F-xxx có end-to-end scenario
- [ ] UAT spec: tất cả REQ-xxx map vào ít nhất 1 UAT case
- [ ] `/sekkei:matrix` đã chạy — 100% REQ-xxx có coverage
- [ ] `/sekkei:validate` pass toàn bộ chain
- [ ] Export xlsx và PDF hoàn chỉnh, file size hợp lý

---

## 7. Links

- [Giới thiệu Sekkei](../introduction.md)
- [V-Model & 13 loại tài liệu](../v-model-and-documents.md)
- [Quick Start](../quick-start.md)
- [Workflow Testing](../workflow/testing.md)
- [Team Playbook](../team-playbook/index.md)
