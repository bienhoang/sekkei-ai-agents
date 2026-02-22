# sekkei-mcp-server

[![npm version](https://img.shields.io/npm/v/sekkei-mcp-server)](https://www.npmjs.com/package/sekkei-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

MCP Server for generating Japanese software specification documents (設計書) following the V-model chain.

## Features

- **8 MCP tools** — generate, validate, export, translate, glossary, and more
- **V-model chain** — RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書 → テスト仕様書
- **Template system** — Markdown templates with YAML frontmatter, override support
- **Excel/PDF export** — IPA-standard 4-sheet Excel, PDF with Japanese fonts
- **Multi-platform** — Claude Code, Cursor, VS Code/Copilot via adapters

## Installation

```bash
npm install -g sekkei-mcp-server
```

Or run directly:

```bash
npx sekkei-mcp-server
```

## Quick Start

```bash
# 1. Setup MCP integration for your editor
npx sekkei-setup

# 2. Initialize a project
/sekkei:init

# 3. Generate your first document
/sekkei:functions-list @rfp.md
```

## Platform Setup

### Claude Code

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "sekkei": {
      "command": "npx",
      "args": ["sekkei-mcp-server"]
    }
  }
}
```

### Cursor

```bash
mkdir -p .cursor/mcp
cp adapters/cursor/mcp.json .cursor/mcp/mcp.json
```

### VS Code / Copilot

```bash
mkdir -p .github
cp adapters/copilot/copilot-instructions.md .github/
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `generate_document` | Returns template + AI instructions for document generation |
| `get_template` | Returns raw Markdown template for a document type |
| `validate_document` | Validates completeness, cross-references, and table structure |
| `get_chain_status` | Returns document chain progress from config |
| `export_document` | Converts Markdown to Excel (.xlsx) or PDF |
| `translate_document` | Prepares translation context with glossary for AI translation |
| `manage_glossary` | CRUD operations for project terminology glossary |
| `analyze_update` | Diffs upstream changes and finds downstream impacts |

## MCP Resources

| URI | Description |
|-----|-------------|
| `templates://functions-list/ja` | 機能一覧 template |
| `templates://requirements/ja` | 要件定義書 template |
| `templates://basic-design/ja` | 基本設計書 template |
| `templates://detail-design/ja` | 詳細設計書 template |
| `templates://test-spec/ja` | テスト仕様書 template |

## Document Types

| Type | Japanese | Structure |
|------|----------|-----------|
| functions-list | 機能一覧 | 10-column table (大分類→中分類→小機能 hierarchy) |
| requirements | 要件定義書 | 10 sections (概要 through 附録) |
| basic-design | 基本設計書 | 10 sections with 3 key tables (画面, DB, API) |
| detail-design | 詳細設計書 | 10 sections (modules, classes, API specs, validation) |
| test-spec | テスト仕様書 | 4 sections (test design, cases per level UT/IT/ST/UAT, traceability) |

## Template Customization

Override default templates with company-specific versions:

```bash
export SEKKEI_TEMPLATE_OVERRIDE_DIR=./company-templates
mkdir -p company-templates/ja
cp templates/ja/functions-list.md company-templates/ja/functions-list.md
```

Resolution order: override dir → default templates.

## Export (Excel/PDF)

Requires Python 3.9+ with dependencies:

```bash
cd python
python3 -m pip install -r requirements.txt
```

Excel output follows IPA-standard 4-sheet structure: 表紙 (Cover), 更新履歴 (History), 目次 (TOC), 本文 (Content).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SEKKEI_TEMPLATE_DIR` | Path to templates directory | `../../templates` (relative to dist) |
| `SEKKEI_TEMPLATE_OVERRIDE_DIR` | Path to override templates | None |
| `SEKKEI_PYTHON` | Python executable path | `.venv/bin/python3` |
| `SEKKEI_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Run with tsx (development)
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run lint         # Type check
```

## Ecosystem

| Package | Description |
|---------|-------------|
| [sekkei-preview](../preview/) | VitePress live preview + WYSIWYG editor for generated documents |
| [sekkei-skills](../skills/) | Claude Code slash commands (`/sekkei:*`) for the full workflow |

## 日本語

Sekkei MCP Serverは、V字モデルに従って日本語ソフトウェア設計書を生成するためのMCPサーバーです。

機能一覧→要件定義書→基本設計書→詳細設計書→テスト仕様書のドキュメントチェーンをサポートし、各ドキュメントの出力が次のドキュメントの入力となります。Markdownテンプレートシステム、Excel/PDFエクスポート、用語集管理、クロスリファレンスバリデーションを備えています。

## License

MIT
