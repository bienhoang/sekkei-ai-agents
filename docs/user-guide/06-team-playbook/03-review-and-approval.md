# Review & Phê duyệt — Quy trình Kiểm soát Chất lượng

Xem thêm: [Team Playbook](./index.md) | [Kịch bản phối hợp](./01-scenarios.md) | [Danh sách kiểm tra](./02-checklists.md)

---

## Nguyên tắc Review

**Kết quả từ AI LUÔN cần con người thẩm định.** Sekkei đảm bảo cấu hình tài liệu chuẩn IPA và tính nhất quán của mã định danh, nhưng trí tuệ về nghiệp vụ (Domain Knowledge) nằm ở chính đội ngũ của bạn. Sekkei đóng vai trò là "thư ký" viết nhanh, còn bạn là "tác giả" chịu trách nhiệm về nội dung.

**Phân cấp trách nhiệm rà soát:**

- **BA rà soát**: Tập trung vào tính chính xác của nghiệp vụ trong các yêu cầu (REQ-xxx). Đảm bảo các quy trình nhân sự, công thức tính lương và luồng chấm công đúng với đặc thù vận hành của khách hàng. BA cũng chịu trách nhiệm xác nhận các kịch bản kiểm thử nghiệm thu (UAT) khớp với yêu cầu ban đầu.
- **Dev Lead rà soát**: Thẩm định tính khả thi về mặt kỹ thuật. Kiểm tra số lượng màn hình (SCR-xxx), cấu trúc bảng dữ liệu (TBL-xxx), thiết kế API và sự phân cấp của các lớp (CLS-xxx). Đồng thời rà soát độ bao phủ của các rủi ro bảo mật.
- **QA rà soát**: Đánh giá tính thực tế của kịch bản kiểm thử. Đảm bảo các trường hợp giá trị biên và trường hợp lỗi được bao quát đầy đủ, ma trận truy xuất nguồn gốc không có yêu cầu nào bị bỏ sót.
- **PM rà soát**: Kiểm soát tính nhất quán và tính toàn vẹn của toàn bộ chuỗi tài liệu. Đảm bảo mọi mã ID khớp nhau và hệ thống không báo lỗi xác thực trước khi phê duyệt chốt chặn (Gate).

**Review đúng cách**: Khi phát hiện lỗi từ AI, hãy thực hiện chỉnh sửa trực tiếp vào nội dung sai thay vì viết lại toàn bộ. Nếu bạn thấy cần phải viết lại quá nhiều, đó là dấu hiệu cho thấy dữ liệu đầu vào (Input) chưa đủ rõ ràng; hãy cập nhật lại dữ liệu đầu vào và cho hệ thống khởi tạo lại.

---

## Cấu hình Chuỗi Phê duyệt (Approval Chain)

> [!WARNING]
> **[Phiên bản thử nghiệm]** Tính năng `approval_chain` hiện đang trong giai đoạn Beta. Bạn có thể sử dụng cấu hình dưới đây trong file `sekkei.config.yaml`, nhưng luôn cần kết hợp với quy trình kiểm soát thủ công tại các điểm chốt chặn (Gate).

Bạn có thể quy định các vai trò bắt buộc phải phê duyệt cho từng loại tài liệu:

```yaml
approval_chain:
  要件定義書 (Định nghĩa yêu cầu): [pm, ba]
  機能一覧 (Danh sách chức năng): [pm, ba, dev-lead]
  基本設計書 (Thiết kế cơ bản): [pm, dev-lead]
  セキュリティ設計書 (Thiết kế bảo mật): [dev-lead]
  詳細設計書 (Thiết kế chi tiết): [dev-lead]
  テスト計画書 (Kế hoạch kiểm thử): [pm, qa]
  受入テスト仕様書 (UAT): [pm, ba, qa]
```

Khi approval chain được cấu hình, `/sekkei:validate` sẽ báo cáo trạng thái approval cùng với ID consistency check. Tài liệu chưa đủ approvers sẽ xuất hiện trong validate output như một warning riêng.

---

## Chốt chặn Chất lượng (Quality Gates)

Chốt chặn (Gate) là điểm kiểm soát bắt buộc. PM chịu trách nhiệm thẩm định các tiêu chí này trước khi cho phép đội ngũ chuyển sang giai đoạn tiếp theo.

### Giai đoạn 1: Từ Yêu cầu chuyển sang Thiết kế

Điều kiện để mở gate:

- [ ] `/sekkei:validate @requirements` pass — zero errors
- [ ] `/sekkei:validate @functions-list` pass
- [ ] `/sekkei:validate @nfr` pass — tất cả performance targets có số cụ thể (không chấp nhận "nhanh", phải là "< 3s at p95")
- [ ] BA đã review và confirm business logic đúng
- [ ] PM đã approve requirements
- [ ] Export PDF đã gửi stakeholder (optional nhưng recommended)

Khi gate mở: BA handoff cho Dev Lead, bao gồm cả glossary đã build.

### Giai đoạn 2: Từ Thiết kế chuyển sang Kiểm thử

Điều kiện để mở gate:

- [ ] `/sekkei:validate @basic-design` pass — SCR/TBL/API IDs nhất quán
- [ ] `/sekkei:validate @detail-design` pass — CLS-xxx reference đúng IDs
- [ ] CLS-xxx trong detail design đầy đủ — mỗi API-xxx quan trọng có class tương ứng
- [ ] Dev Lead đã review và confirm technical accuracy
- [ ] PM đã approve basic-design

Khi gate mở: Dev Lead handoff cho QA, bao gồm basic-design + security-design + detail-design.

### Giai đoạn 3: Từ Kiểm thử tới Bàn giao (Chốt chặn cuối cùng)

Điều kiện để mở gate:

- [ ] `/sekkei:validate` full chain pass — zero warnings, zero errors
- [ ] `/sekkei:matrix` — 100% REQ coverage, không có REQ orphaned
- [ ] Tất cả test specs (UT/IT/ST/UAT) đã được QA review
- [ ] UAT scenarios đã được BA xác nhận map đúng requirements
- [ ] PM final approve

Khi gate mở: PM export toàn bộ bộ tài liệu và chuẩn bị delivery.

---

## Công cụ Xác thực (Validate)

Hai cách dùng lệnh validate:

**Xác thực toàn chuỗi** — kiểm tra tất cả các tài liệu trong project:
```
/sekkei:validate
```

**Xác thực tài liệu đơn lẻ** — kiểm tra một tài liệu cụ thể (nhanh hơn, dùng trong lúc đang làm):
```
/sekkei:validate @requirements
/sekkei:validate @basic-design
```

**Hệ thống sẽ kiểm tra những gì?**
- **Liên kết mã ID**: Kiểm tra các mã REQ, F, SCR... có tồn tại và ánh xạ đúng giữa các tài liệu hay không.
- **Cấu trúc IPA**: Đảm bảo tài liệu có đầy đủ các mục (Section) bắt buộc theo tiêu chuẩn Nhật Bản.
- **Tính cập nhật (Staleness)**: Nhắc nhở nếu tài liệu đầu ra cũ hơn tài liệu đầu vào vừa được chỉnh sửa.
- **Lịch sử sửa đổi (改訂履歴)**: Đảm bảo số phiên bản tăng dần đều và không có khoảng trống thông tin.

**Khi validate báo lỗi**, Sekkei gợi ý lệnh để fix. Ví dụ:
```
⚠ REQ-045 không có F-xxx nào map tới
→ Kiểm tra /sekkei:functions-list và thêm F-xxx cho REQ-045

⚠ API-018 mới nhưng chưa có IT test case
→ Chạy /sekkei:it-spec @basic-design để cập nhật test cases
```

---

## Phân biệt `/sekkei:update` và `/sekkei:change`

Dùng `/sekkei:update` khi tài liệu upstream đã thay đổi SAU KHI tài liệu downstream đã được sinh.

**Ví dụ:** BA cập nhật requirements (thêm REQ-046 cho tính năng báo cáo HR mới) sau khi Dev Lead đã tạo xong basic-design. Basic-design cần được update để reflect REQ-046 mới.

```
/sekkei:update @basic-design
```

Sekkei phân tích diff giữa requirements hiện tại và requirements lúc basic-design được sinh, xác định những phần nào của basic-design cần cập nhật, và tự động thêm entry vào 改訂履歴 (Lịch sử sửa đổi):

```
| 2024/11/25 | v1.3 | REQ-046追加に伴うSCR-031, API-022の追加 | Dev Lead |
```

**Khác với Change Request:** `/sekkei:update` dùng khi upstream thay đổi nhỏ trong quá trình làm (chưa freeze). `/sekkei:change` dùng khi spec đã freeze và cần track impact có kiểm soát qua toàn bộ chain.

---

**Xem thêm:** [Kịch bản phối hợp](./01-scenarios.md) | [Danh sách kiểm tra](./02-checklists.md) | [Hướng dẫn PM](../05-roles/01-pm.md)
