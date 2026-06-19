---
doc_type: db-design
version: "1.0"
language: vi
output_language: "vi"
sections:
  - revision-history
  - approval
  - distribution
  - glossary
  - db-policy
  - er-diagram
  - table-detail
  - index-design
  - partition-design
  - migration-design
  - backup-recovery
  - naming-convention
review_date: ""
approval_date: ""
status: draft
author: ""
reviewer: ""
approver: ""
---

# Tài liệu Thiết kế Cơ sở Dữ liệu

## Lịch sử sửa đổi <!-- required -->

| Phiên bản | Ngày | Nội dung thay đổi | Người thay đổi |
|-----------|------|-------------------|----------------|

## Phê duyệt <!-- required -->

| Vai trò | Họ tên | Ngày |
|---------|--------|------|
| Người tạo | | |
| Người kiểm tra | | |
| Người phê duyệt | | |

## Kiểm duyệt

| Giai đoạn review | Người review | Ngày review | Số vấn đề | Kết quả |
|-----------------|-------------|------------|-----------|---------|
| Review lần 1 | | | | |
| Review lần 2 | | | | |
| Phê duyệt cuối | | | | |

## Nơi phân phối <!-- required -->

## Thuật ngữ <!-- required -->

| Thuật ngữ | Giải thích | Tiếng Anh |
|-----------|-----------|-----------|

## 1. Chính sách thiết kế CSDL <!-- required -->

### 1.1 Loại cơ sở dữ liệu

### 1.2 Phương châm thiết kế schema

### 1.3 Phương châm mô hình hóa dữ liệu

## 2. Sơ đồ ER <!-- required -->

```mermaid
erDiagram
```

## 3. Bảng <!-- required -->

### Mẫu định nghĩa bảng

| Tên cột | Tên vật lý | Kiểu dữ liệu | Độ dài | NOT NULL | Mặc định | Mô tả |
|--------|-----------|------------|-------|---------|---------|------|

## 4. Thiết kế chỉ mục <!-- required -->

| DB-ID | Tên bảng | Tên chỉ mục | Cột | Loại | Mục đích |
|-------|---------|-----------|-----|------|---------|

## 5. Thiết kế phân vùng

| Tên bảng | Phương thức phân vùng | Khóa | Ước tính dữ liệu | Thời gian lưu |
|---------|---------------------|------|----------------|-------------|

## 6. Thiết kế chuyển đổi dữ liệu

## 7. Sao lưu và phục hồi

| Đối tượng | Phương thức sao lưu | Tần suất | RPO | RTO | Nơi lưu |
|---------|-------------------|---------|-----|-----|--------|

## 8. Quy ước đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---------|---------|------|
| Tên bảng | snake_case, tiền tố m_/t_/l_ | m_users, t_orders |
| Tên cột | snake_case | created_at, user_id |
| Tên chỉ mục | idx_{table}_{columns} | idx_users_email |
