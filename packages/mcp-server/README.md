# sekkei-mcp-server

[![npm version](https://img.shields.io/npm/v/sekkei-mcp-server)](https://www.npmjs.com/package/sekkei-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

MCP Server for generating Japanese software specification documents (設計書) following the V-model chain.

## Features

- **10 MCP tools** — generate, validate, chain-validate, export, translate, glossary, RFP workspace, and more
- **V-model chain** — branching document chain with phase-grouped types (requirements, design, test, supplementary)
- **18 document templates** — functions-list, requirements, NFR, basic/detail/security design, project-plan, test-plan, UT/IT/ST/UAT spec, and more
- **15 industry glossaries** — automotive, finance, medical, manufacturing, retail, and more
- **3 presets** — standard, enterprise, agile project configurations
- **RFP workflow** — MCP tool + resources for cross-editor presales workflow
- **Template system** — Markdown templates with YAML frontmatter, override support
- **Excel/PDF/DOCX export** — IPA-standard 4-sheet Excel, PDF with Japanese fonts, Word
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

# 2. Initialize a project (run in terminal)
npx sekkei init

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
| `validate_chain` | Validates cross-references across the entire document chain |
| `manage_rfp_workspace` | RFP presales workflow — create, status, transition, read, write |

## MCP Resources

**Template resources** via `templates://{doc_type}/{language}`:

| URI | Description |
|-----|-------------|
| `templates://functions-list/ja` | 機能一覧 template |
| `templates://requirements/ja` | 要件定義書 template |
| `templates://nfr/ja` | 非機能要件定義書 template |
| `templates://basic-design/ja` | 基本設計書 template |
| `templates://security-design/ja` | セキュリティ設計書 template |
| `templates://detail-design/ja` | 詳細設計書 template |
| `templates://project-plan/ja` | プロジェクト計画書 template |
| `templates://test-plan/ja` | テスト計画書 template |
| `templates://ut-spec/ja` | 単体テスト仕様書 template |
| `templates://it-spec/ja` | 結合テスト仕様書 template |
| `templates://st-spec/ja` | システムテスト仕様書 template |
| `templates://uat-spec/ja` | 受入テスト仕様書 template |
| `templates://crud-matrix/ja` | CRUD図 template |
| `templates://traceability-matrix/ja` | トレーサビリティマトリックス template |
| `templates://operation-design/ja` | 運用設計書 template |
| `templates://migration-design/ja` | 移行設計書 template |

**RFP instruction resources** via `rfp://`:

| URI | Description |
|-----|-------------|
| `rfp://instructions/analyze` | RFP analysis flow prompt |
| `rfp://instructions/questions` | Q&A generation prompt |
| `rfp://instructions/draft` | Draft/wait decision prompt |
| `rfp://instructions/impact` | Answer impact assessment prompt |
| `rfp://instructions/proposal` | Proposal generation prompt |
| `rfp://instructions/freeze` | Scope freeze prompt |
| `rfp://routing` | Phase → flow mapping table |

## Document Types

### Requirements Phase

| Type | Japanese | Description |
|------|----------|-------------|
| functions-list | 機能一覧 | 10-column table (大分類→中分類→小機能 hierarchy) |
| requirements | 要件定義書 | Functional and non-functional requirements |
| nfr | 非機能要件定義書 | Performance, security, availability requirements |
| project-plan | プロジェクト計画書 | Project timeline, milestones, resource plan |

### Design Phase

| Type | Japanese | Description |
|------|----------|-------------|
| basic-design | 基本設計書 | System architecture, screens, DB, API design |
| security-design | セキュリティ設計書 | Security architecture and threat modeling |
| detail-design | 詳細設計書 | Modules, classes, API specs, validation rules |

### Test Phase

| Type | Japanese | Description |
|------|----------|-------------|
| test-plan | テスト計画書 | Test strategy, scope, schedule |
| ut-spec | 単体テスト仕様書 | Unit test cases per module |
| it-spec | 結合テスト仕様書 | Integration test cases |
| st-spec | システムテスト仕様書 | System-level test cases |
| uat-spec | 受入テスト仕様書 | User acceptance test cases |

### Supplementary

| Type | Japanese | Description |
|------|----------|-------------|
| operation-design | 運用設計書 | Operation procedures and monitoring |
| migration-design | 移行設計書 | Data/system migration plans |
| glossary | 用語集 | Project terminology dictionary |
| crud-matrix | CRUD図 | Create/Read/Update/Delete matrix |
| traceability-matrix | トレーサビリティ | Requirements-to-test traceability |

## Template Customization

Override default templates with company-specific versions:

```bash
export SEKKEI_TEMPLATE_OVERRIDE_DIR=./company-templates
mkdir -p company-templates/ja
cp templates/ja/functions-list.md company-templates/ja/functions-list.md
```

Resolution order: override dir → default templates.

## Industry Glossaries

15 built-in glossaries for domain-specific terminology:

`automotive`, `common`, `construction`, `education`, `energy`, `finance`, `food-service`, `government`, `insurance`, `logistics`, `manufacturing`, `medical`, `real-estate`, `retail`, `telecom`

Set via `industry` field in `sekkei.config.yaml`.

## Project Presets

3 configuration presets: `standard`, `enterprise`, `agile` — pre-configured project settings for different development methodologies.

## Export (Excel/PDF/DOCX)

Requires Python 3.9+ with dependencies:

```bash
cd python
python3 -m pip install -r requirements.txt
```

- **Excel (.xlsx)**: IPA-standard 4-sheet structure — 表紙 (Cover), 更新履歴 (History), 目次 (TOC), 本文 (Content)
- **PDF**: Japanese fonts, professional layout via WeasyPrint
- **Word (.docx)**: Standard document format

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

18種類のドキュメントテンプレート（要件定義、NFR、基本設計、セキュリティ設計、詳細設計、UT/IT/ST/UAT仕様書など）、15業界対応の用語集、3つのプロジェクトプリセットを搭載。V字モデルの分岐チェーンをサポートし、各ドキュメントの出力が下流ドキュメントの入力となります。RFPプリセールスワークフロー、Markdownテンプレートシステム、Excel/PDF/DOCXエクスポート、用語集管理、クロスリファレンスバリデーションを備えています。

## License

MIT
