# @bienhoang/sekkei-preview

[![GitHub Package](https://img.shields.io/github/v/release/bienhoang/sekkei-ai-agents?label=sekkei-preview)](https://github.com/bienhoang/sekkei-ai-agents/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

Express+React live preview + WYSIWYG editor for Sekkei specification documents.

## Features

- **Express+React** — fast, responsive document preview server
- **Tiptap v3 WYSIWYG** — rich-text editing for specification documents
- **Auto sidebar** — generates navigation from `sekkei.config.yaml`
- **Tailwind CSS v4** — clean, responsive styling with Japanese document support
- **Full-text search** — instant search across all generated documents
- **Mermaid rendering** — diagram support in preview
- **Live reload** — instant preview updates on file changes

## Installation

```bash
npm install -g @bienhoang/sekkei-preview
```

Or run directly:

```bash
npx @bienhoang/sekkei-preview
```

## Quick Start

```bash
# 1. Generate documents with sekkei-mcp-server
/sekkei:functions-list @rfp.md

# 2. Start preview server
npx @bienhoang/sekkei-preview

# 3. Open browser and edit in WYSIWYG mode
```

## Usage

```bash
sekkei-preview [options]

Options:
  --docs-dir <path>   Path to workspace-docs directory (default: ./workspace-docs)
  --port <number>     Preview server port (default: 5173)
```

The CLI reads `sekkei.config.yaml` from the project root to generate VitePress configuration, sidebar navigation, and document ordering.

## How It Works

1. Reads `sekkei.config.yaml` to discover generated documents
2. Generates sidebar navigation from document chain
3. Serves the `workspace-docs/` directory with Express backend
4. Tiptap v3 editor provides WYSIWYG editing with live preview

## Ecosystem

| Package | Description |
|---------|-------------|
| [@bienhoang/sekkei-mcp-server](../mcp-server/) | Core MCP server — generates the documents this package previews |
| [@bienhoang/sekkei-skills](../skills/) | Claude Code slash commands — `/sekkei:preview` starts this server |
| [@bienhoang/sekkei-dashboard](../dashboard/) | Analytics dashboard — quality metrics, traceability graphs |

## 日本語

sekkei-previewは、Sekkeiで生成された日本語設計書をExpress+Reactベースでプレビュー・編集するツールです。

Tiptap v3 WYSIWYGエディタにより、ブラウザ上でリッチテキスト編集が可能です。`sekkei.config.yaml`からサイドバーナビゲーションを自動生成し、ドキュメントチェーンの順序で表示します。

## License

MIT
