# Tài Liệu Bổ Sung — 9 Loại Tùy Chọn

Xem thêm: [Workflow Index](./index.md) | [Testing Phase](./testing.md) | [V-Model & Tài liệu](../v-model-and-documents.md)

---

## Tổng quan

Ngoài 13 tài liệu cốt lõi trong chain, Sekkei hỗ trợ thêm 9 loại tài liệu bổ sung. Các tài liệu này **không bắt buộc** trong mọi dự án — bạn dùng khi tình huống cụ thể yêu cầu, không phải cứ có là dùng hết.

---

## Bảng tổng hợp

| Tài liệu | Khi nào dùng | Lệnh |
|---------|-------------|------|
| **CRUD図** | Muốn kiểm tra logic CRUD không bị thiếu sót | `/sekkei:matrix` |
| **トレーサビリティマトリクス** | Trước khi giao hàng, cần proof coverage | `/sekkei:matrix` |
| **サイトマップ** | Hệ thống có nhiều màn hình (> 15 SCR) | `/sekkei:sitemap` |
| **運用設計書** | Dự án có SLA cam kết, khách hàng hỏi về vận hành | `/sekkei:operation-design @input` |
| **移行設計書** | Có hệ thống cũ cần migrate data | `/sekkei:migration-design @input` |
| **画面設計書** | Tự động khi bật split mode trong 基本設計書 | (auto trong split mode) |
| **議事録** | Mỗi cuộc họp với khách hàng Nhật | (manual — dùng template) |
| **ADR** | Ghi lại quyết định kỹ thuật quan trọng | (manual — dùng template) |
| **テストエビデンス** | Sau khi chạy test, cần gửi bằng chứng cho khách hàng | (manual — screenshot/log) |
| **翻訳** | Khách hàng muốn bản tiếng Anh hoặc team Việt cần đọc | `/sekkei:translate @doc --lang=en` |

---

## CRUD図 và Traceability Matrix

**CRUD図** là bảng function × table với C/R/U/D — mỗi ô đánh dấu operation nào được thực hiện. Dùng để phát hiện logic bị thiếu trước khi code:

```
/sekkei:matrix
```

Output ví dụ (HR system):

```
Function         │ employees │ departments │ attendance │ salary
─────────────────┼───────────┼─────────────┼────────────┼────────
社員登録          │ C         │ R           │            │
社員情報更新      │ U         │ R           │            │
社員削除          │ D         │             │            │
勤怠打刻          │ R         │             │ C          │
給与計算          │ R         │             │ R          │ C U
```

Nếu có ô hoàn toàn trống trong một row quan trọng → có thể missing logic. Sekkei highlight các gaps và gợi ý F-xxx nào cần bổ sung.

**Traceability Matrix** sinh cùng lệnh `/sekkei:matrix` — hiện quan hệ đầy đủ từ REQ → F → SCR → UT → IT → ST → UAT để prove coverage với khách hàng.

---

## Export — xlsx / pdf / docx

Export bất kỳ tài liệu nào sang 3 định dạng:

```bash
# IPA 4-sheet Excel (表紙 / 更新履歴 / 目次 / 本文) — định dạng khách hàng Nhật ưa nhất
/sekkei:export @requirements --format=xlsx

# PDF với font Noto Sans JP, A4 — dùng để gửi draft review nhanh
/sekkei:export @basic-design --format=pdf

# Word với TOC tự động — dùng khi khách hàng cần edit trực tiếp
/sekkei:export @uat-spec --format=docx

# Export toàn bộ chain cùng lúc
/sekkei:export --all --format=xlsx
```

**Cấu trúc IPA 4-sheet Excel:**

| Sheet | Nội dung | Ghi chú |
|-------|---------|---------|
| **表紙** | Tên dự án, tên tài liệu, version, ngày tạo, tác giả | Tự động từ `sekkei.config.yaml` |
| **更新履歴** | Ngày, version, nội dung thay đổi, tác giả | Tự động thêm entry mỗi lần export |
| **目次** | Danh sách sections với số trang | Tự động generate |
| **本文** | Nội dung tài liệu với bảng và diagrams | Output chính |

> [!TIP]
> Excel format là lựa chọn mặc định khi giao hàng chính thức. PDF dùng cho review nội bộ hoặc gửi draft. Word chỉ dùng khi khách hàng yêu cầu cụ thể vì formatting có thể lệch khi mở trên máy khác.

---

## Translation — Dịch tài liệu

Dịch bất kỳ tài liệu nào sang tiếng Anh hoặc tiếng Việt để team đọc hoặc gửi stakeholder quốc tế:

```bash
# Dịch sang tiếng Anh
/sekkei:translate @requirements --lang=en

# Dịch sang tiếng Việt (để BA/Dev team đọc)
/sekkei:translate @basic-design --lang=vi
```

Sekkei giữ nguyên IDs (REQ-xxx, F-xxx, SCR-xxx) trong bản dịch để cross-reference không bị mất. Thuật ngữ chuyên ngành IT được dịch nhất quán theo glossary của dự án — xem `/sekkei:manage_glossary` để quản lý glossary.

> [!NOTE]
> Bản dịch là tài liệu tham khảo nội bộ. Tài liệu chính thức giao khách hàng Nhật luôn là bản tiếng Nhật gốc.

---

**Xem thêm:** [Change Request lifecycle](./change-request.md) | [Role Guides](../roles/)
