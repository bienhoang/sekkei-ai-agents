# Review & Approval — Quy Tắc Duyệt Tài Liệu

Xem thêm: [Team Playbook](./index.md) | [Scenarios](./scenarios.md) | [Checklists](./checklists.md)

---

## Quy tắc Review

**AI output LUÔN cần human review.** Sekkei sinh đúng cấu trúc IPA và cross-reference IDs, nhưng không biết nghiệp vụ cụ thể của bạn. Domain knowledge là của team — Sekkei chỉ là người viết nhanh.

**Nguyên tắc phân công review:**

- **BA review:** logic nghiệp vụ trong REQ-xxx có đúng không — quy trình HR, quy tắc tính lương, luồng chấm công có match thực tế của khách hàng không. BA cũng review UAT scenarios để đảm bảo map đúng về requirements gốc.

- **Dev Lead review:** độ chính xác kỹ thuật — SCR-xxx có đủ screens, TBL-xxx schema hợp lý, API-xxx RESTful chuẩn, CLS-xxx reference đúng IDs đã có. Dev Lead cũng review security design cho threat coverage.

- **QA review:** test coverage có thực tế không — test cases đủ edge cases chưa, exit criteria trong test plan có đo được không, traceability matrix không có REQ orphaned.

- **PM review:** tính nhất quán toàn chain trước khi approve gate — không nhất thiết phải hiểu sâu kỹ thuật, nhưng phải đảm bảo cross-reference IDs khớp nhau và `/sekkei:validate` pass.

**Review không phải là rewrite.** Khi AI output có lỗi, hãy fix đúng chỗ sai thay vì viết lại từ đầu. Nếu thấy muốn rewrite toàn bộ section — đó là dấu hiệu input (meeting notes, RFP) chưa đủ rõ, nên bổ sung input và chạy lại.

---

## Approval Chain Config

> [!WARNING]
> **[Beta]** Tính năng `approval_chain` đang trong giai đoạn thử nghiệm. Cú pháp config đúng nhưng hành vi enforcement có thể thay đổi ở phiên bản sau. Khi dùng feature này, luôn kết hợp với quy trình gate thủ công bên dưới.

Thêm vào `sekkei.config.yaml` để cấu hình ai cần approve từng loại tài liệu:

```yaml
approval_chain:
  要件定義書: [pm, ba]
  機能一覧: [pm, ba, dev-lead]
  基本設計書: [pm, dev-lead]
  セキュリティ設計書: [dev-lead]
  詳細設計書: [dev-lead]
  テスト計画書: [pm, qa]
  受入テスト仕様書: [pm, ba, qa]
```

Khi approval chain được cấu hình, `/sekkei:validate` sẽ báo cáo trạng thái approval cùng với ID consistency check. Tài liệu chưa đủ approvers sẽ xuất hiện trong validate output như một warning riêng.

---

## Quality Gates — 3 điểm kiểm soát

Gate là checkpoint bắt buộc trước khi chuyển phase. PM chịu trách nhiệm confirm gate.

### Gate 1: Requirements → Design

Điều kiện để mở gate:

- [ ] `/sekkei:validate @requirements` pass — zero errors
- [ ] `/sekkei:validate @functions-list` pass
- [ ] `/sekkei:validate @nfr` pass — tất cả performance targets có số cụ thể (không chấp nhận "nhanh", phải là "< 3s at p95")
- [ ] BA đã review và confirm business logic đúng
- [ ] PM đã approve requirements
- [ ] Export PDF đã gửi stakeholder (optional nhưng recommended)

Khi gate mở: BA handoff cho Dev Lead, bao gồm cả glossary đã build.

### Gate 2: Design → Test

Điều kiện để mở gate:

- [ ] `/sekkei:validate @basic-design` pass — SCR/TBL/API IDs nhất quán
- [ ] `/sekkei:validate @detail-design` pass — CLS-xxx reference đúng IDs
- [ ] CLS-xxx trong detail design đầy đủ — mỗi API-xxx quan trọng có class tương ứng
- [ ] Dev Lead đã review và confirm technical accuracy
- [ ] PM đã approve basic-design

Khi gate mở: Dev Lead handoff cho QA, bao gồm basic-design + security-design + detail-design.

### Gate 3: Test → Delivery (Final Gate)

Điều kiện để mở gate:

- [ ] `/sekkei:validate` full chain pass — zero warnings, zero errors
- [ ] `/sekkei:matrix` — 100% REQ coverage, không có REQ orphaned
- [ ] Tất cả test specs (UT/IT/ST/UAT) đã được QA review
- [ ] UAT scenarios đã được BA xác nhận map đúng requirements
- [ ] PM final approve

Khi gate mở: PM export toàn bộ bộ tài liệu và chuẩn bị delivery.

---

## Validate Reference

Hai cách dùng lệnh validate:

**Full chain validate** — kiểm tra toàn bộ tất cả tài liệu trong project:
```
/sekkei:validate
```

**Single document validate** — kiểm tra một tài liệu cụ thể (nhanh hơn, dùng trong lúc đang làm):
```
/sekkei:validate @requirements
/sekkei:validate @basic-design
```

**Validate kiểm tra những gì:**
- Cross-reference IDs: REQ-xxx có tồn tại không, F-xxx có map về REQ-xxx không, SCR-xxx có xuất hiện ở đúng tài liệu không
- Required sections: mỗi loại tài liệu có đủ sections bắt buộc theo chuẩn IPA không
- Staleness: tài liệu downstream có cũ hơn tài liệu upstream đã được update không
- 改訂履歴 consistency: version number tăng đúng thứ tự, không có gap

**Khi validate báo lỗi**, Sekkei gợi ý lệnh để fix. Ví dụ:
```
⚠ REQ-045 không có F-xxx nào map tới
→ Kiểm tra /sekkei:functions-list và thêm F-xxx cho REQ-045

⚠ API-018 mới nhưng chưa có IT test case
→ Chạy /sekkei:it-spec @basic-design để cập nhật test cases
```

---

## Khi nào dùng `/sekkei:update`

Dùng `/sekkei:update` khi tài liệu upstream đã thay đổi SAU KHI tài liệu downstream đã được sinh.

**Ví dụ:** BA cập nhật requirements (thêm REQ-046 cho tính năng báo cáo HR mới) sau khi Dev Lead đã tạo xong basic-design. Basic-design cần được update để reflect REQ-046 mới.

```
/sekkei:update @basic-design
```

Sekkei phân tích diff giữa requirements hiện tại và requirements lúc basic-design được sinh, xác định những phần nào của basic-design cần cập nhật, và tự động thêm entry vào 改訂履歴:

```
| 2024/11/25 | v1.3 | REQ-046追加に伴うSCR-031, API-022の追加 | Dev Lead |
```

**Khác với Change Request:** `/sekkei:update` dùng khi upstream thay đổi nhỏ trong quá trình làm (chưa freeze). `/sekkei:change` dùng khi spec đã freeze và cần track impact có kiểm soát qua toàn bộ chain.

---

**Xem thêm:** [Scenarios](./scenarios.md) | [Checklists](./checklists.md) | [PM Role Guide](../roles/pm.md)
