# Sekkei (設計) - AI Documentation Agent

MCP Server + AI Skills for generating Japanese software specification documents following the V-model hierarchy.

## Overview

Sekkei generates structured Japanese specification documents (設計書) from RFP/requirements input using the **Chain-of-Documents** pattern — each document's output becomes the next document's input:

```
RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書 → テスト仕様書
       (Function    (Requirements   (Basic         (Detail        (Test
        List)        Definition)     Design)        Design)        Specification)
```

## Quick Start

### 1. Install

```bash
npm install -g sekkei-mcp-server
npx sekkei-skills # Install Claude Code skills
```

Or use directly with npx:

```bash
npx sekkei-mcp-server
npx sekkei-skills
```

### 2. Setup

```bash
npx sekkei-setup
```

Auto-detects your editor (Claude Code, Cursor, VS Code/Copilot) and configures MCP integration.

### 3. Generate

```
/sekkei:init                              # Create project config
/sekkei:functions-list @rfp.md            # Generate function list
/sekkei:requirements @functions-list.md   # Generate requirements
```

## Platform Setup

### Claude Code

Copy the skill to your Claude Code skills folder:

```bash
cp -r packages/skills/content/ ~/.claude/skills/sekkei/
```

Add MCP server to `~/.claude/settings.json`:

```json
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

Copy `adapters/cursor/mcp.json` to `.cursor/mcp/mcp.json`:

```bash
mkdir -p .cursor/mcp
cp adapters/cursor/mcp.json .cursor/mcp/mcp.json
```

Optionally add `.cursorrules` from `adapters/cursor/cursorrules.md` for tool guidance.

### VS Code / Copilot

Copy Copilot instructions:

```bash
mkdir -p .github
cp adapters/copilot/copilot-instructions.md .github/
```

Configure MCP in VS Code settings for Agent Mode.

## Usage

### Sub-Commands (Claude Code)

| Command | Description |
|---------|-------------|
| `/sekkei:init` | Initialize project with `sekkei.config.yaml` |
| `/sekkei:functions-list` | Generate 機能一覧 (Function List) |
| `/sekkei:requirements` | Generate 要件定義書 (Requirements Definition) |
| `/sekkei:basic-design` | Generate 基本設計書 (Basic Design) |
| `/sekkei:detail-design` | Generate 詳細設計書 (Detail Design) |
| `/sekkei:test-spec` | Generate テスト仕様書 (Test Specification) |
| `/sekkei:validate` | Validate document completeness |
| `/sekkei:status` | Show V-model chain progress |
| `/sekkei:export` | Export to Excel (.xlsx) or PDF |
| `/sekkei:translate` | Translate document to another language |
| `/sekkei:glossary` | Manage project terminology |
| `/sekkei:update` | Analyze upstream changes for impact |

### MCP Tools

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

### MCP Resources

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
# Set env var to your override directory
export SEKKEI_TEMPLATE_OVERRIDE_DIR=./company-templates

# Create override (same structure as templates/)
mkdir -p company-templates/ja
cp templates/ja/functions-list.md company-templates/ja/functions-list.md
# Edit to match your company format
```

Resolution order: override dir → default templates.

## Export (Excel/PDF)

Requires Python 3.9+ with dependencies:

```bash
cd python
python3 -m pip install -r requirements.txt
```

Excel output follows IPA-standard 4-sheet structure: 表紙 (Cover), 更新履歴 (History), 目次 (TOC), 本文 (Content).

PDF output includes cover page, table of contents, and Japanese font support (Noto Sans JP).

## Development

```bash
cd mcp-server
npm install
npm run build        # Compile TypeScript
npm run dev          # Run with tsx (development)
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run lint         # Type check
```

## Project Structure

```
sekkei/
├── package.json             # Root: npm workspaces
├── tsconfig.base.json       # Shared TypeScript config
├── packages/
│   ├── mcp-server/          # sekkei-mcp-server (npm)
│   │   ├── src/
│   │   │   ├── index.ts     # STDIO entry point
│   │   │   ├── server.ts    # McpServer factory
│   │   │   ├── config.ts    # Environment config
│   │   │   ├── tools/       # 8 MCP tool handlers
│   │   │   ├── resources/   # MCP resource handlers
│   │   │   ├── lib/         # Shared utilities
│   │   │   └── types/       # TypeScript type definitions
│   │   ├── templates/       # Document templates (ja, shared)
│   │   ├── python/          # Python export layer
│   │   ├── bin/setup.js     # Setup script (npx sekkei-setup)
│   │   ├── adapters/        # Platform-specific configs
│   │   └── tests/
│   ├── preview/             # sekkei-preview (npm)
│   │   ├── src/             # CLI, VitePress config generator
│   │   ├── theme/           # Custom VitePress theme + Vue
│   │   └── plugins/         # VitePress plugins
│   └── skills/              # sekkei-skills (npm)
│       ├── bin/install.js   # Install script (npx sekkei-skills)
│       └── content/         # SKILL.md and references
└── sekkei.config.example.yaml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SEKKEI_TEMPLATE_DIR` | Path to templates directory | `../../templates` (relative to dist) |
| `SEKKEI_TEMPLATE_OVERRIDE_DIR` | Path to override templates | None |
| `SEKKEI_PYTHON` | Python executable path | `.venv/bin/python3` |
| `SEKKEI_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## FAQ

**Q: Do I need Python?**
A: Only for Excel/PDF export. Core document generation and validation work without Python.

**Q: Can I customize templates?**
A: Yes. Set `SEKKEI_TEMPLATE_OVERRIDE_DIR` to a directory with your custom templates. Same structure as `templates/`.

**Q: What languages are supported?**
A: Templates are in Japanese (ja). Use `/sekkei:translate` to translate generated documents to any language.

**Q: Does it work with Cursor/Copilot?**
A: Yes. Run `npx sekkei-setup` or manually copy adapter files from `adapters/`.

## License

MIT
