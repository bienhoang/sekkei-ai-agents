---
doc_type: screen-design
version: "1.0"
language: ja
parent: basic-design
description: "画面設計書 — 各画面の詳細仕様"
sections:
  - screen-layout
  - screen-items
  - validation-rules
  - event-list
  - screen-transition
  - permissions
status: draft
author: ""
reviewer: ""
approver: ""
---

<!-- NOTE: This template is NOT loaded via loadTemplate/generate_document (screen-design is not in DOC_TYPES).
     It serves as a reference structure for SKILL.md's buildScreenDesignInstruction()-driven generation
     and as a customization point via SEKKEI_TEMPLATE_OVERRIDE_DIR for future direct loading. -->

# 画面設計書 — {画面名} (SCR-XXX-001)

## 1. 画面レイアウト

<!-- AI: Provide a structured YAML layout block (see instructions).
     The YAML will be auto-rendered to a PNG mockup with numbered annotations.
     After rendering, this section will contain an image: ![SCR-xxx](./images/SCR-xxx.png) -->

## 2. 画面項目定義

<!-- AI: Define all screen items/fields.
     - 型: text / number / date / select / checkbox / textarea / file / hidden
     - 必須: ○ (required) or blank (optional) -->

| # | 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |
|----|--------|--------|-----|------|--------|------|

## 3. バリデーション一覧

<!-- AI: Define validation rules for each input field.
     - タイミング: onBlur / onSubmit / onChange
     - ルール examples: 必須入力, 最大{N}文字, 数値のみ, 日付形式(YYYY-MM-DD) -->

| 項目ID | ルール | メッセージ | タイミング |
|--------|--------|------------|-----------|

## 4. イベント一覧

<!-- AI: List all screen events and their actions.
     - トリガー: ボタンクリック / ページロード / フォーム送信 / etc. -->

| トリガー | アクション | 遷移先/処理 |
|----------|-----------|------------|

## 5. 画面遷移

<!-- AI: Define screen transitions.
     Reference SCR-xxx IDs for source/destination screens. -->

| 遷移元 | 遷移先 | 条件 |
|--------|--------|------|

## 6. 権限

<!-- AI: Define role-based permissions.
     - Cell values: ○ (permitted) / × (denied) / - (not applicable) -->

| ロール | 閲覧 | 編集 | 削除 |
|--------|------|------|------|
