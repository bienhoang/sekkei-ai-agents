<p align="center">
  <img src="assets/logo-full.svg" alt="Sekkei — AI Documentation Agent" width="480">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D20-green" alt="Node.js"></a>
</p>

AI-powered generation of Japanese software specification documents following the V-model hierarchy. Works as an MCP server with Claude Code, Cursor, and VS Code/Copilot.

## What It Does

Sekkei generates structured Japanese specification documents (設計書) from RFP/requirements using a **V-Model Document Chain** — each document's output feeds downstream documents:

```
                         RFP
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              要件定義書       用語集
              Requirements    Glossary
                    │
              ┌─────┼──────────┐
              ▼     ▼          ▼
         機能一覧  NFR        プロジェクト計画書
         Function  Non-Func   Project Plan
         List      Req
              │
              ▼
         方式設計書 ────────────────────────────────────┐
         Architecture Design                          │
              │                                       │
              ▼                                       ▼
         基本設計書 ──────────────────► 受入テスト仕様書
         Basic Design                  UAT Spec
              │
        ┌─────┼──────────┬───────┐
        ▼     ▼          ▼       ▼
  セキュリティ  詳細設計書  DB設計  帳票/バッチ
  Security     Detail     DB     Report/Batch
  Design       Design     Design Design
                  │
             ┌────┼────┐
             ▼    ▼    ▼
          UT仕様書 IT仕様書 ST仕様書 ──► テスト結果報告書
          UT Spec  IT Spec  ST Spec     Test Result Report
```

Additional types: プロジェクト計画書, テスト計画書, 運用設計書, 移行設計書, CRUD図, トレーサビリティ, サイトマップ, 画面設計書, IF仕様書, テストエビデンス, 議事録, ADR.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@bienhoang/sekkei-mcp-server](./packages/mcp-server/) | 2.5.1 | Core MCP server — document generation, validation, export, CLI |
| [@bienhoang/sekkei-preview](./packages/preview/) | 1.3.4 | Express+React live preview + Tiptap v3 WYSIWYG editor |
| [@bienhoang/sekkei-skills](./packages/skills/) | 1.6.0 | Claude Code slash commands (`/sekkei:*`) — 40+ sub-commands |
| [@bienhoang/sekkei-dashboard](./packages/dashboard/) | 0.1.1 | Analytics dashboard — chain status, quality metrics, traceability graphs, snapshots |

## Quick Start

### Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
```

This installs everything: MCP server, Claude Code skill, CLI, Python export (Excel/PDF/DOCX), and runs `sekkei doctor` to verify.

**Prerequisites:** Node.js 20+, git, Python 3.9+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

### Post-Install

```bash
sekkei doctor    # Check installation health
sekkei init      # Initialize project config (interactive wizard)
```

### Generate Documents

```
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
sekkei-preview          # Live preview in browser
sekkei-preview --edit   # WYSIWYG editing mode
```

### Update

```bash
# Re-run the installer to update
curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
```

### Alternative Install (Local Dev)

```bash
git clone git@github.com:bienhoang/sekkei-ai-agents.git && cd sekkei-ai-agents
chmod +x install.sh && ./install.sh          # Build + install (includes Python)
./install.sh --skip-python                   # Skip Python export setup
```

### Windows Install

```bash
git clone https://github.com/bienhoang/sekkei-ai-agents.git
cd sekkei-ai-agents/packages/mcp-server
node bin/install.js                          # Full install (includes Python)
node bin/install.js --skip-python            # Skip Python export setup
```

## Architecture

```
┌─────────────────┐     MCP (STDIO)     ┌──────────────────┐
│  @bienhoang/     │ ──────────────────→ │ @bienhoang/        │
│  sekkei-skills   │  /sekkei:* commands │  sekkei-mcp-server │
└─────────────────┘                      └────────┬─────────┘
                                                  │ generates
                                                  ↓
                                         ┌──────────────────┐
                                         │  Markdown Docs    │
                                         │  (workspace-docs/)   │
                                         └────────┬─────────┘
                                                  │ previews
                                                  ↓
                                         ┌──────────────────┐
                                         │  @bienhoang/      │
                                         │  sekkei-preview   │
                                         └──────────────────┘
```

### MCP Server

- **Transport**: STDIO (stdout reserved for JSON-RPC, logs to stderr)
- **15 MCP Tools**: `generate_document`, `get_template`, `validate_document`, `get_chain_status`, `export_document`, `translate_document`, `manage_glossary`, `analyze_update`, `validate_chain`, `simulate_change_impact`, `import_document`, `manage_rfp_workspace`, `manage_change_request`, `update_chain_status`, `manage_plan`
- **MCP Resources**: `templates://` for doc templates, `rfp://` for RFP workflow instructions
- **27 Templates**: Japanese (ja) with YAML frontmatter, 検印欄 (review stamps) — override with `SEKKEI_TEMPLATE_OVERRIDE_DIR`
- **Python Bridge**: `execFile`-based (no shell injection) for Excel/PDF/DOCX export via `SEKKEI_INPUT` env var

### Dashboard (NEW)

Real-time analytics dashboard for specification chain monitoring:
- **5 pages**: Overview, Chain Status, Analytics, Changes, Features
- **Quality Metrics**: Traceability coverage, health scoring, risk assessment (5-dimension weighted)
- **Visualization**: Traceability DAG (Recharts + @xyflow/react + dagre), risk/health radars, completion donuts
- **Integration**: MCP client integration, cached-mcp-service, workspace-scanner
- **Client**: React SPA with Tailwind CSS, Lucide icons
- **Server**: Express backend with 7 routes
- **CLI**: `sekkei-dashboard` command

### CLI (`sekkei` command)

Built with citty. Available commands:

| Command | Description |
|---------|-------------|
| `sekkei init` | Initialize project config (interactive wizard) |
| `sekkei doctor` | Installation health check + fix suggestions |
| `sekkei version` | Version + environment info |
| `sekkei glossary` | Manage terminology |
| `sekkei update` | Update skill stubs and MCP registration |
| `sekkei migrate` | Migrate config underscore keys to hyphen format |
| `sekkei uninstall` | Remove Sekkei from system |

## Slash Commands (Claude Code)

40+ sub-commands covering the full V-model workflow:

**Requirements Phase**

| Command | Description |
|---------|-------------|
| `sekkei init` | Initialize project config (interactive wizard) |
| `/sekkei:rfp @rfp.md` | RFP analysis and presales workflow |
| `/sekkei:requirements @input` | Generate 要件定義書 (Requirements) |
| `/sekkei:functions-list @input` | Generate 機能一覧 (Function List) |
| `/sekkei:nfr @input` | Generate 非機能要件定義書 (Non-Functional Requirements) |
| `/sekkei:project-plan @input` | Generate プロジェクト計画書 (Project Plan) |

**Design Phase**

| Command | Description |
|---------|-------------|
| `/sekkei:architecture-design @input` | Generate 方式設計書 (Architecture Design) |
| `/sekkei:basic-design @input` | Generate 基本設計書 (Basic Design) |
| `/sekkei:security-design @input` | Generate セキュリティ設計書 (Security Design) |
| `/sekkei:detail-design @input` | Generate 詳細設計書 (Detail Design) |
| `/sekkei:db-design @input` | Generate データベース設計書 (DB Design) |
| `/sekkei:screen-design @input` | Generate 画面設計書 (Screen Design) |
| `/sekkei:interface-spec @input` | Generate IF仕様書 (Interface Spec) |
| `/sekkei:report-design @input` | Generate 帳票設計書 (Report Design) |
| `/sekkei:batch-design @input` | Generate バッチ処理設計書 (Batch Design) |
| `/sekkei:mockup` | Generate HTML screen mockups with screenshots from screen definitions |

**Test Phase**

| Command | Description |
|---------|-------------|
| `/sekkei:test-plan @input` | Generate テスト計画書 (Test Plan) |
| `/sekkei:ut-spec @input` | Generate 単体テスト仕様書 (Unit Test Spec) |
| `/sekkei:it-spec @input` | Generate 結合テスト仕様書 (Integration Test Spec) |
| `/sekkei:st-spec @input` | Generate システムテスト仕様書 (System Test Spec) |
| `/sekkei:uat-spec @input` | Generate 受入テスト仕様書 (UAT Spec) |
| `/sekkei:test-result-report @input` | Generate テスト結果報告書 (Test Result Report) |
| `/sekkei:test-evidence @input` | Generate テストエビデンス (Test Evidence) |

**Management**

| Command | Description |
|---------|-------------|
| `/sekkei:meeting-minutes @input` | Generate 議事録 (Meeting Minutes) |
| `/sekkei:decision-record @input` | Generate 設計判断記録 (Architecture Decision Record) |

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
| `/sekkei:preview` | Start Express+React preview server |
| `/sekkei:version` | Show version + health check |
| `/sekkei:uninstall` | Remove Sekkei from Claude Code |
| `/sekkei:rebuild` | Rebuild and re-install skill + MCP |
| `/sekkei:dashboard` | Open analytics dashboard (quality metrics, traceability, risk) |

## Platform Setup

### Claude Code

The recommended install method handles everything automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
```

This installs the skill to `~/.claude/skills/sekkei/`, registers the MCP server in `~/.claude/settings.json`, and creates all `/sekkei:*` slash commands.

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
│   ├── mcp-server/              # @bienhoang/sekkei-mcp-server (v2.4.4)
│   │   ├── src/
│   │   │   ├── tools/           # 15 MCP tool handlers
│   │   │   ├── resources/       # Template + RFP instruction resources
│   │   │   ├── lib/             # 57+ core logic modules (quality metrics, analyzers, etc.)
│   │   │   └── cli/             # CLI commands (citty-based)
│   │   ├── templates/ja/        # 27 Japanese doc templates (IPA V-Model compliant)
│   │   ├── python/              # Export layer (Excel, PDF, DOCX, glossary, diff)
│   │   ├── bin/                 # setup.js, init.js, cli.js
│   │   └── adapters/            # Platform configs (Claude Code, Cursor, Copilot)
│   ├── preview/                 # @bienhoang/sekkei-preview (v1.3.4)
│   │   └── src/
│   │       ├── client/          # React + Tiptap v3 WYSIWYG editor
│   │       └── server/          # Express server + API
│   ├── dashboard/               # @bienhoang/sekkei-dashboard (v0.1.1)
│   │   ├── src/
│   │   │   ├── pages/           # 5 dashboard pages (React)
│   │   │   ├── components/      # Charts (Recharts), traceability graph
│   │   │   ├── services/        # MCP client, snapshot, workspace scanner
│   │   │   └── server/          # Express backend (7 routes)
│   │   └── cli.ts               # CLI command entry
│   └── skills/                  # @bienhoang/sekkei-skills (v1.5.4)
│       ├── bin/install.js       # Skill installer
│       └── content/SKILL.md     # 40+ sub-commands + workflow router
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
A: Re-run the setup script: `curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash`

**Q: How do I check if everything is working?**
A: Run `sekkei doctor` — it checks all components and suggests fixes for any issues.

## License

MIT
