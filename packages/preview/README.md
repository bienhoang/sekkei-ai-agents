# @bienhoang/sekkei-preview

[![GitHub Package](https://img.shields.io/github/v/release/bienhoang/sekkei-ai-agents?label=sekkei-preview)](https://github.com/bienhoang/sekkei-ai-agents/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

VitePress-based live preview + WYSIWYG editor for Sekkei specification documents.

## Features

- **VitePress SSG** — fast, Markdown-native documentation preview
- **Milkdown WYSIWYG** — rich-text editing for specification documents
- **Auto sidebar** — generates navigation from `sekkei.config.yaml`
- **Vue 3** — custom theme with Japanese document styling
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
2. Generates VitePress config with sidebar from document chain
3. Serves the `workspace-docs/` directory as a VitePress site
4. Milkdown editor provides WYSIWYG editing with live preview

## Ecosystem

| Package | Description |
|---------|-------------|
| [@bienhoang/sekkei-mcp-server](../mcp-server/) | Core MCP server — generates the documents this package previews |
| [@bienhoang/sekkei-skills](../skills/) | Claude Code slash commands — `/sekkei:preview` starts this server |

## 日本語

sekkei-previewは、Sekkeiで生成された日本語設計書をVitePressベースでプレビュー・編集するツールです。

Milkdown WYSIWYGエディタにより、ブラウザ上でリッチテキスト編集が可能です。`sekkei.config.yaml`からサイドバーナビゲーションを自動生成し、ドキュメントチェーンの順序で表示します。

## License

MIT
