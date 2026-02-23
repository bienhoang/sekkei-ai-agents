# Sekkei (設計) - AI Documentation Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green)](https://nodejs.org)

AI-powered generation of Japanese software specification documents following the V-model hierarchy. Works as an MCP server with Claude Code, Cursor, and VS Code/Copilot.

## What It Does

Sekkei generates structured Japanese specification documents (設計書) from RFP/requirements using a **V-Model Document Chain** — each document's output feeds downstream documents:

```
                         RFP
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              機能一覧        用語集
              Function List   Glossary
                    │
                    ▼
              要件定義書 ──────────────────► 受入テスト仕様書
              Requirements                  UAT Spec
                    │
              ┌─────┼──────────┐
              ▼     ▼          ▼
            NFR   基本設計書    セキュリティ設計書
                  Basic Design Security Design
                    │
              ┌─────┼─────┐
              ▼     ▼     ▼
         詳細設計書 IT仕様書 ST仕様書
         Detail    IT Spec  ST Spec
              │
              ▼
         UT仕様書
         UT Spec
```

Additional types: プロジェクト計画書, テスト計画書, 運用設計書, 移行設計書, CRUD図, トレーサビリティ, サイトマップ.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [sekkei-mcp-server](./packages/mcp-server/) | 2.0.0 | Core MCP server — document generation, validation, export, CLI |
| [sekkei-preview](./packages/preview/) | 0.3.0 | VitePress live preview + Milkdown WYSIWYG editor |
| [sekkei-skills](./packages/skills/) | 2.0.0 | Claude Code slash commands (`/sekkei:*`) |

## Quick Start

### Install (Local Dev)

```bash
git clone <repo-url> && cd sekkei
chmod +x install.sh && ./install.sh
# With Python export support:
./install.sh --with-python
```

### Install (npm)

```bash
npm install -g sekkei-mcp-server
npx sekkei-skills   # Install Claude Code skill
npx sekkei-setup    # Auto-detect editor and configure MCP
```

### Generate Documents

```
npx sekkei init                           # Create project config (run in terminal)
/sekkei:requirements @rfp.md              # Generate requirements (first after RFP)
/sekkei:functions-list @requirements.md   # Generate function list
/sekkei:nfr @requirements.md              # Generate non-functional requirements
/sekkei:basic-design @requirements.md     # Generate basic design
/sekkei:detail-design @basic-design.md    # Generate detail design
/sekkei:ut-spec @detail-design.md         # Generate unit test spec
/sekkei:it-spec @basic-design.md          # Generate integration test spec
```

### Preview

```bash
npx sekkei-preview   # Live preview in browser
```

## Architecture

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

### MCP Server

- **Transport**: STDIO (stdout reserved for JSON-RPC, logs to stderr)
- **10 MCP Tools**: `generate_document`, `get_template`, `validate_document`, `get_chain_status`, `export_document`, `translate_document`, `manage_glossary`, `analyze_update`, `validate_chain`, `manage_rfp_workspace`
- **MCP Resources**: `templates://` for doc templates, `rfp://` for RFP workflow instructions
- **18 Templates**: Japanese (ja) with YAML frontmatter — override with `SEKKEI_TEMPLATE_OVERRIDE_DIR`
- **Python Bridge**: `execFile`-based (no shell injection) for Excel/PDF/DOCX export via `SEKKEI_INPUT` env var

### CLI (`sekkei` command)

Built with citty. Available commands:

| Command | Description |
|---------|-------------|
| `sekkei generate` | Generate documents from CLI |
| `sekkei validate` | Validate document completeness |
| `sekkei export` | Export to Excel/PDF/DOCX |
| `sekkei status` | Show chain progress |
| `sekkei glossary` | Manage terminology |
| `sekkei watch` | Watch for changes |
| `sekkei version` | Version + environment health check |
| `sekkei update` | Update Sekkei installation |
| `sekkei uninstall` | Remove Sekkei from system |

## Slash Commands (Claude Code)

30 sub-commands covering the full V-model workflow:

**Requirements Phase**

| Command | Description |
|---------|-------------|
| `npx sekkei init` | Initialize project config (CLI) |
| `/sekkei:rfp @rfp.md` | RFP analysis and presales workflow |
| `/sekkei:functions-list @input` | Generate 機能一覧 (Function List) |
| `/sekkei:requirements @input` | Generate 要件定義書 (Requirements) |
| `/sekkei:nfr @input` | Generate 非機能要件定義書 (Non-Functional Requirements) |
| `/sekkei:project-plan @input` | Generate プロジェクト計画書 (Project Plan) |

**Design Phase**

| Command | Description |
|---------|-------------|
| `/sekkei:basic-design @input` | Generate 基本設計書 (Basic Design) |
| `/sekkei:security-design @input` | Generate セキュリティ設計書 (Security Design) |
| `/sekkei:detail-design @input` | Generate 詳細設計書 (Detail Design) |

**Test Phase**

| Command | Description |
|---------|-------------|
| `/sekkei:test-plan @input` | Generate テスト計画書 (Test Plan) |
| `/sekkei:ut-spec @input` | Generate 単体テスト仕様書 (Unit Test Spec) |
| `/sekkei:it-spec @input` | Generate 結合テスト仕様書 (Integration Test Spec) |
| `/sekkei:st-spec @input` | Generate システムテスト仕様書 (System Test Spec) |
| `/sekkei:uat-spec @input` | Generate 受入テスト仕様書 (UAT Spec) |

**Supplementary & Utilities**

| Command | Description |
|---------|-------------|
| `/sekkei:matrix` | Generate CRUD図 or トレーサビリティ |
| `/sekkei:sitemap` | Generate サイトマップ (System Structure Map) |
| `/sekkei:operation-design @input` | Generate 運用設計書 (Operation Design) |
| `/sekkei:migration-design @input` | Generate 移行設計書 (Migration Design) |
| `/sekkei:glossary` | Manage project terminology |
| `/sekkei:validate @doc` | Validate completeness and cross-references |
| `/sekkei:status` | Show document chain progress |
| `/sekkei:export @doc --format=xlsx\|pdf\|docx` | Export document |
| `/sekkei:translate @doc --lang=en` | Translate with glossary context |
| `/sekkei:update @doc` | Detect upstream changes |
| `/sekkei:diff-visual @before @after` | Color-coded revision Excel (朱書き) |
| `/sekkei:plan @doc-type` | Create generation plan for large docs |
| `/sekkei:implement @plan-path` | Execute generation plan phase by phase |
| `/sekkei:preview` | Start VitePress preview server |
| `/sekkei:version` | Show version + health check |
| `/sekkei:uninstall` | Remove Sekkei from Claude Code |
| `/sekkei:rebuild` | Rebuild and re-install skill + MCP |

## Platform Setup

### Claude Code

```bash
npx sekkei-skills   # Auto-install skill
```

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "sekkei": { "command": "npx", "args": ["sekkei-mcp-server"] }
  }
}
```

### Cursor

```bash
npx sekkei-setup   # Auto-detect and configure
# Or manually:
mkdir -p .cursor/mcp && cp adapters/cursor/mcp.json .cursor/mcp/mcp.json
```

### VS Code / Copilot

```bash
npx sekkei-setup
# Or manually:
mkdir -p .github && cp adapters/copilot/copilot-instructions.md .github/
```

## Template Customization

Override default templates with company-specific versions:

```bash
export SEKKEI_TEMPLATE_OVERRIDE_DIR=./company-templates
```

Resolution order: override dir → default templates. Templates use Markdown with YAML frontmatter.

## Build & Test

```bash
# From sekkei/ root (monorepo)
npm run build           # Build all packages
npm test                # Run tests (mcp-server)

# From packages/mcp-server/
npm run build           # tsc compile
npm run lint            # tsc --noEmit (type check)
npm test                # Jest with ESM
npm run test:unit       # Unit tests only
```

## Project Structure

```
sekkei/
├── package.json                 # Root: npm workspaces
├── tsconfig.base.json           # Shared TypeScript config
├── install.sh                   # Local install script for Claude Code
├── sekkei.config.example.yaml   # Template for project config
├── packages/
│   ├── mcp-server/              # sekkei-mcp-server
│   │   ├── src/
│   │   │   ├── tools/           # 10 MCP tool handlers
│   │   │   ├── resources/       # Template + RFP instruction resources
│   │   │   ├── lib/             # Core logic (template-loader, python-bridge, etc.)
│   │   │   └── cli/             # CLI commands (citty-based)
│   │   ├── templates/ja/        # 18 Japanese doc templates
│   │   ├── python/              # Export layer (Excel, PDF, DOCX, glossary, diff)
│   │   ├── bin/                 # setup.js, init.js, cli.js
│   │   └── adapters/            # Platform configs (Claude Code, Cursor, Copilot)
│   ├── preview/                 # sekkei-preview
│   │   ├── src/                 # CLI, VitePress config generator
│   │   ├── theme/               # Custom VitePress theme + Vue components
│   │   └── plugins/             # VitePress plugins
│   └── skills/                  # sekkei-skills
│       ├── bin/install.js       # Skill installer
│       └── content/SKILL.md     # 30 sub-commands + workflow router
└── .github/                     # CI/CD
```

## Requirements

- **Node.js** >= 20.0.0
- **Python 3** (optional) — only for Excel/PDF/DOCX export
  - Dependencies: `openpyxl`, `weasyprint`, `mistune`, `pyyaml`

## FAQ

**Q: Do I need Python?**
A: Only for Excel/PDF/DOCX export. Core document generation and validation work without Python.

**Q: Can I customize templates?**
A: Yes. Set `SEKKEI_TEMPLATE_OVERRIDE_DIR` to your custom templates directory.

**Q: What languages are supported?**
A: Templates are in Japanese (ja). Use `/sekkei:translate` to translate to any language.

**Q: Does it work with Cursor/Copilot?**
A: Yes. Run `npx sekkei-setup` or manually copy adapter files.

**Q: How do I update?**
A: Run `sekkei update` or `/sekkei:rebuild` in Claude Code.

## License

MIT
