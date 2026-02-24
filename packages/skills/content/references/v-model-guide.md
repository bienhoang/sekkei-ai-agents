> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# V-Model Workflow & Chain-of-Documents Guide

## V-Model Overview

The V-model maps each specification phase to a corresponding testing phase:

```
要件定義 (Requirements)          ←→  受入テスト (UAT)
  基本設計 (Basic Design)        ←→  システムテスト (ST)
    詳細設計 (Detailed Design)   ←→  結合テスト (IT)
      実装 (Implementation)      ←→  単体テスト (UT)
```

## Chain-of-Documents (Phase 1)

```
RFP / Input
  ↓
要件定義書 (Requirements Definition)
  ↓
機能一覧 (Function List)
  ↓
基本設計書 (Basic Design)
```

Each document builds on the previous one. IDs created upstream are referenced downstream.

## Cross-Reference Flow

```
要件定義書: REQ-001 (顧客検索)
  ↓
機能一覧: F-001 references REQ-001
  ↓
基本設計書: SCR-002 references F-001 and REQ-001
            TBL-001 references F-001
            API-001 references REQ-001
```

## ID Mapping Example

| 要件定義書 | 機能一覧 | 基本設計書 (画面) | 基本設計書 (テーブル) | 基本設計書 (API) |
|----------|---------|---------------|------------------|----------------|
| REQ-001 | F-001 | SCR-001 | TBL-001 | API-001 |
| REQ-002 | F-002 | SCR-002 | TBL-001 | API-002 |
| REQ-003, REQ-004 | F-003 | SCR-003 | TBL-002 | API-003 |

## Update Synchronization

When a requirement changes, all downstream documents must be updated:

1. 要件定義書 modified → check 機能一覧 and downstream impact
2. 機能一覧 updated → update 基本設計書 cross-references
3. Bump version in 更新履歴 for each modified document

## Document Generation Best Practices

1. **Always generate in order:** 要件定義書 → 機能一覧 → 基本設計書
2. **Provide upstream output as input** to downstream generation
3. **Verify cross-references** after generation (all F-xxx, REQ-xxx IDs should exist)
4. **Review AI-generated content** — templates constrain structure, humans verify content
5. **Keep IDs stable** — once assigned, IDs should not change across versions
