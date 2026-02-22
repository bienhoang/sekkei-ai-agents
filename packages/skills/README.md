# sekkei-skills

[![npm version](https://img.shields.io/npm/v/sekkei-skills)](https://www.npmjs.com/package/sekkei-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Claude Code skill for generating Japanese specification documents (設計書) following the V-model chain.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [sekkei-mcp-server](../mcp-server/) configured as MCP server

## Installation

Auto-install to `~/.claude/skills/sekkei/`:

```bash
npx sekkei-skills
```

Or manual copy (from repo root):

```bash
cp -r packages/skills/content/ ~/.claude/skills/sekkei/
```

## Sub-Commands

| Command | Description |
|---------|-------------|
| `/sekkei:init` | Initialize project config (`sekkei.config.yaml`) |
| `/sekkei:functions-list @input` | Generate 機能一覧 (Function List) |
| `/sekkei:requirements @input` | Generate 要件定義書 (Requirements Definition) |
| `/sekkei:basic-design @input` | Generate 基本設計書 (Basic Design) |
| `/sekkei:detail-design @input` | Generate 詳細設計書 (Detail Design) |
| `/sekkei:test-spec @input` | Generate テスト仕様書 (Test Specification) |
| `/sekkei:matrix` | Generate CRUD図 or トレーサビリティマトリックス |
| `/sekkei:operation-design @input` | Generate 運用設計書 (Operation Design) |
| `/sekkei:migration-design @input` | Generate 移行設計書 (Migration Design) |
| `/sekkei:validate @doc` | Validate document completeness |
| `/sekkei:status` | Show V-model chain progress |
| `/sekkei:export @doc --format=xlsx\|pdf\|docx` | Export to Excel, PDF, or Word |
| `/sekkei:translate @doc --lang=en` | Translate with glossary context |
| `/sekkei:glossary [add\|list\|find\|export]` | Manage project terminology |
| `/sekkei:update @doc` | Detect upstream changes |
| `/sekkei:diff-visual @before @after` | Color-coded revision Excel (朱書き) |
| `/sekkei:plan @doc-type` | Create generation plan for large documents |
| `/sekkei:implement @plan-path` | Execute a generation plan phase by phase |
| `/sekkei:preview` | Start VitePress docs preview server |

## Workflow Example

```bash
# 1. Initialize project
/sekkei:init

# 2. Generate documents following V-model chain
/sekkei:functions-list @rfp.md          # RFP → 機能一覧
/sekkei:requirements @functions-list.md  # 機能一覧 → 要件定義書
/sekkei:basic-design @requirements.md    # 要件定義書 → 基本設計書
/sekkei:detail-design @basic-design.md   # 基本設計書 → 詳細設計書
/sekkei:test-spec @detail-design.md      # 詳細設計書 → テスト仕様書

# 3. Validate and export
/sekkei:validate @test-spec.md
/sekkei:export @basic-design.md --format=xlsx

# 4. Preview all documents
/sekkei:preview
```

## Using with MCP Server

Skills invoke MCP tools via Claude Code's MCP integration. Ensure `sekkei-mcp-server` is configured:

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

## Ecosystem

| Package | Description |
|---------|-------------|
| [sekkei-mcp-server](../mcp-server/) | Core MCP server that skills invoke for document generation |
| [sekkei-preview](../preview/) | VitePress live preview started by `/sekkei:preview` |

## 日本語

sekkei-skillsは、Claude Codeのスラッシュコマンドで日本語設計書を生成するスキルです。

V字モデルのドキュメントチェーン（機能一覧→要件定義書→基本設計書→詳細設計書→テスト仕様書）に沿って、各種設計書を順番に生成できます。19のサブコマンドで、初期化・生成・検証・エクスポート・翻訳・プレビューまでの全ワークフローをカバーします。

## License

MIT
