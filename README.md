# Sekkei (設計) - AI Documentation Agent

[![npm sekkei-mcp-server](https://img.shields.io/npm/v/sekkei-mcp-server)](https://www.npmjs.com/package/sekkei-mcp-server)
[![npm sekkei-preview](https://img.shields.io/npm/v/sekkei-preview)](https://www.npmjs.com/package/sekkei-preview)
[![npm sekkei-skills](https://img.shields.io/npm/v/sekkei-skills)](https://www.npmjs.com/package/sekkei-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP Server + AI Skills for generating Japanese software specification documents following the V-model hierarchy.

## Overview

Sekkei generates structured Japanese specification documents (設計書) from RFP/requirements input using the **Chain-of-Documents** pattern — each document's output becomes the next document's input:

```
RFP → 機能一覧 → 要件定義書 → 基本設計書 → 詳細設計書 → テスト仕様書
       (Function    (Requirements   (Basic         (Detail        (Test
        List)        Definition)     Design)        Design)        Specification)
```

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [sekkei-mcp-server](./packages/mcp-server/) | Core MCP server — document generation, validation, export | [![npm](https://img.shields.io/npm/v/sekkei-mcp-server?label=)](https://www.npmjs.com/package/sekkei-mcp-server) |
| [sekkei-preview](./packages/preview/) | VitePress live preview + WYSIWYG editor | [![npm](https://img.shields.io/npm/v/sekkei-preview?label=)](https://www.npmjs.com/package/sekkei-preview) |
| [sekkei-skills](./packages/skills/) | Claude Code slash commands (`/sekkei:*`) | [![npm](https://img.shields.io/npm/v/sekkei-skills?label=)](https://www.npmjs.com/package/sekkei-skills) |

### How They Work Together

```
┌─────────────────┐     MCP (STDIO)     ┌──────────────────┐
│  sekkei-skills   │ ──────────────────→ │ sekkei-mcp-server │
│  (Claude Code)   │  /sekkei:* commands │  (Core Engine)    │
└─────────────────┘                      └────────┬─────────┘
                                                  │ generates
                                                  ↓
                                         ┌──────────────────┐
                                         │  Markdown Docs    │
                                         │  (sekkei-docs/)   │
                                         └────────┬─────────┘
                                                  │ previews
                                                  ↓
                                         ┌──────────────────┐
                                         │  sekkei-preview   │
                                         │  (VitePress)      │
                                         └──────────────────┘
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

### 4. Preview

```bash
npx sekkei-preview  # Live preview in browser
```

## Platform Setup

### Claude Code

```bash
npx sekkei-skills  # Auto-install skill
```

Add MCP server to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "sekkei": { "command": "npx", "args": ["sekkei-mcp-server"] }
  }
}
```

### Cursor

```bash
mkdir -p .cursor/mcp && cp adapters/cursor/mcp.json .cursor/mcp/mcp.json
```

### VS Code / Copilot

```bash
mkdir -p .github && cp adapters/copilot/copilot-instructions.md .github/
```

## Sub-Commands (Claude Code)

19 slash commands covering the full V-model workflow: `init`, `functions-list`, `requirements`, `basic-design`, `detail-design`, `test-spec`, `validate`, `status`, `export`, `translate`, `glossary`, `update`, `preview`, `matrix`, `operation-design`, `migration-design`, `diff-visual`, `plan`, `implement`.

See [sekkei-skills README](./packages/skills/README.md) for the full command reference with descriptions.

## MCP Tools & Resources

8 MCP tools for document generation, validation, export, translation, and more. 5 template resources for direct template access.

See [sekkei-mcp-server README](./packages/mcp-server/README.md#mcp-tools) for full reference.

## Template Customization

Override default templates with company-specific versions:

```bash
export SEKKEI_TEMPLATE_OVERRIDE_DIR=./company-templates
```

Resolution order: override dir → default templates. See [mcp-server docs](./packages/mcp-server/README.md#template-customization) for details.

## Project Structure

```
sekkei/
├── package.json             # Root: npm workspaces
├── tsconfig.base.json       # Shared TypeScript config
├── packages/
│   ├── mcp-server/          # sekkei-mcp-server (npm)
│   │   ├── src/             # TypeScript source (tools, resources, lib)
│   │   ├── templates/       # Document templates (ja, shared)
│   │   ├── python/          # Python export layer (Excel, PDF)
│   │   ├── bin/setup.js     # Setup script (npx sekkei-setup)
│   │   └── adapters/        # Platform-specific configs
│   ├── preview/             # sekkei-preview (npm)
│   │   ├── src/             # CLI, VitePress config generator
│   │   ├── theme/           # Custom VitePress theme + Vue
│   │   └── plugins/         # VitePress plugins
│   └── skills/              # sekkei-skills (npm)
│       ├── bin/install.js   # Install script (npx sekkei-skills)
│       └── content/         # SKILL.md and references
└── sekkei.config.example.yaml
```

## FAQ

**Q: Do I need Python?**
A: Only for Excel/PDF export. Core document generation and validation work without Python.

**Q: Can I customize templates?**
A: Yes. Set `SEKKEI_TEMPLATE_OVERRIDE_DIR` to a directory with your custom templates.

**Q: What languages are supported?**
A: Templates are in Japanese (ja). Use `/sekkei:translate` to translate generated documents to any language.

**Q: Does it work with Cursor/Copilot?**
A: Yes. Run `npx sekkei-setup` or manually copy adapter files from `adapters/`.

## License

MIT
