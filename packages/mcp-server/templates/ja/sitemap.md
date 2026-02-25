---
doc_type: sitemap
version: "1.0"
language: ja
sections:
  - revision-history
  - approval
  - system-overview
  - sitemap-tree
  - page-list
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- AI Instructions:
Generate a サイトマップ (Sitemap / System Structure Map) showing the functional structure and page/screen hierarchy.

Input sources (hybrid):
1. User description of system structure
2. F-xxx IDs from 機能一覧 (if available)
3. Code route/page analysis (if available)

Output TWO sections:

Section 1 - サイトマップツリー: Indented markdown list showing parent-child hierarchy.
Example:
- トップページ (TOP)
  - ユーザー管理 (F-001)
    - ユーザー一覧
    - ユーザー登録
  - 注文管理 (F-002)

Section 2 - ページ一覧: Table with columns:
| ページID | ページ名 | URL/ルート | 親ページ | 関連機能 (F-xxx) | 処理概要 |

Every page/screen gets a unique PG-xxx ID.
For web: URL paths. For mobile: screen names. For API: endpoint groups. For batch: job categories.
Include user-facing AND admin/management pages.
-->

# サイトマップ

## 改訂履歴 <!-- required -->

| 版数 | 日付 | 変更者 | 変更内容 |
|------|------|--------|----------|
| 1.0  |      |        | 初版作成 |

## 承認欄 <!-- required -->

| 役割 | 氏名 | 日付 | 署名 |
|------|------|------|------|
| 作成者 | | | |
| 確認者 | | | |
| 承認者 | | | |

## システム概要 <!-- optional -->

<!-- Brief description of system type (web/mobile/API/internal/SaaS) and scope -->

## サイトマップツリー <!-- required -->

<!-- Generate hierarchical tree structure here based on input sources -->

## ページ一覧 <!-- required -->

<!-- Generate page list table here with PG-xxx IDs -->
