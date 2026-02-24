# Role Guide: Dev Lead

Xem thêm: [Giới thiệu](../01-introduction.md) | [Quick Start](../03-quick-start.md) | [Workflow Design](../04-workflow/02-design.md) | [Team Playbook](../06-team-playbook/index.md)

---

## 1. Dev Lead làm gì trong dự án Sekkei?

Dev Lead nhận requirements đã validated từ BA và chịu trách nhiệm toàn bộ phase Design — từ **基本設計書** (thiết kế cơ bản) đến **詳細設計書** (thiết kế chi tiết) và **セキュリティ設計書** (thiết kế bảo mật). Bạn cũng review technical accuracy của AI output và dùng `/sekkei:diff-visual` để track thay đổi giữa các phiên bản.

Công việc chính của Dev Lead:

- Tạo 基本設計書 từ requirements + functions-list
- Review SCR-xxx (screens), TBL-xxx (tables), API-xxx (endpoints) do AI sinh ra
- Chạy security design và detail design song song sau khi basic-design hoàn chỉnh
- Cấu hình split mode cho dự án nhiều tính năng (> 20 features)
- Dùng `/sekkei:plan` + `/sekkei:implement` cho implementation planning

---

## 2. Lệnh thường dùng

| Lệnh | Dùng khi nào |
|------|--------------|
| `/sekkei:basic-design @requirements @functions-list` | Tạo 基本設計書 — input chính của phase Design |
| `/sekkei:security-design @basic-design` | Tạo セキュリティ設計書 (OWASP mapping, threat model) |
| `/sekkei:detail-design @basic-design` | Tạo 詳細設計書 với CLS-xxx class diagram |
| `/sekkei:plan @basic-design` | Sinh implementation plan từ thiết kế |
| `/sekkei:implement @plan-path` | Chạy từng phase trong plan |
| `/sekkei:validate @basic-design` | Kiểm tra SCR/TBL/API IDs nhất quán |
| `/sekkei:diff-visual @before @after` | So sánh 2 phiên bản tài liệu — highlight thay đổi |

---

## 3. Quy trình làm việc

Dev Lead đi theo luồng: **Confirm requirements validated → Basic-design → Review IDs → Security + Detail song song → Validate → Handoff QA**.

1. Xác nhận BA đã validate requirements (hỏi hoặc check `/sekkei:status`)
2. Chạy `/sekkei:basic-design @requirements @functions-list`
3. Review SCR-xxx (có đủ screens không?), TBL-xxx (schema hợp lý?), API-xxx (RESTful chuẩn?)
4. Sau khi basic-design ổn, chạy song song security và detail design
5. Validate basic-design trước khi handoff cho QA

Chi tiết từng bước: [Workflow Design](../04-workflow/02-design.md)

---

## 4. Split Mode — Dự án > 20 tính năng

Khi dự án có nhiều tính năng, basic-design một file duy nhất sẽ quá lớn. Bật split mode trong `sekkei.config.yaml`:

```yaml
output:
  split: true
  split_by: feature   # hoặc: module, layer
```

Với `split: true`, Sekkei sinh ra các file riêng theo feature thay vì một file monolithic:

```
sekkei-docs/
  basic-design/
    SCR-auth.md
    SCR-hr-management.md
    TBL-schema.md
    API-endpoints.md
```

Mỗi file vẫn giữ cross-reference IDs nhất quán với nhau.

---

## 5. Plan / Implement Flow

Sau khi design xong, Dev Lead có thể dùng Sekkei để tạo implementation plan:

```
/sekkei:plan @basic-design
```

Sekkei sẽ survey codebase (nếu có), chia thành các phases ưu tiên, và tạo plan file. Sau đó:

```
/sekkei:implement @plan-path
```

Chạy từng phase theo thứ tự. Xem chi tiết: [Workflow Supplementary](../04-workflow/04-supplementary.md)

---

## 6. Tips

- **Review API-xxx trước tiên** — API contract sai sẽ cascade xuống IT spec và cả UAT
- Dùng `/sekkei:diff-visual` khi requirements thay đổi để thấy ngay những phần design bị ảnh hưởng
- Security design nên được chạy song song với detail design — không phải sau detail
- CLS-xxx trong detail design cần reference đúng API-xxx và TBL-xxx đã có trong basic-design

---

## 7. Checklist

- [ ] SCR-xxx: đủ screens, mỗi F-xxx có ít nhất 1 screen tương ứng
- [ ] TBL-xxx: schema hợp lý, primary/foreign keys rõ ràng
- [ ] API-xxx: RESTful endpoints đủ CRUD cho các entity chính
- [ ] Security design: các threat đã map vào OWASP Top 10
- [ ] CLS-xxx trong detail design reference đúng API-xxx và TBL-xxx IDs
- [ ] Split mode đã cấu hình nếu dự án > 20 tính năng
- [ ] `/sekkei:validate @basic-design` pass
- [ ] Handoff cho QA: basic-design + detail-design đã sẵn sàng

---

## 8. Links

- [Giới thiệu Sekkei](../01-introduction.md)
- [V-Model & 13 loại tài liệu](../02-v-model-and-documents.md)
- [Quick Start](../03-quick-start.md)
- [Workflow Design](../04-workflow/02-design.md)
- [Workflow Supplementary](../04-workflow/04-supplementary.md)
- [Team Playbook](../06-team-playbook/index.md)
