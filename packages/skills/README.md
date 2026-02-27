# @bienhoang/sekkei-skills

[![GitHub Package](https://img.shields.io/github/v/release/bienhoang/sekkei-ai-agents?label=sekkei-skills)](https://github.com/bienhoang/sekkei-ai-agents/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Claude Code skill for generating Japanese specification documents (設計書) following the V-model chain.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [@bienhoang/sekkei-mcp-server](../mcp-server/) configured as MCP server

## Installation

Auto-install to `~/.claude/skills/sekkei/`:

```bash
npx @bienhoang/sekkei-skills
```

Or manual copy (from repo root):

```bash
cp -r packages/skills/content/ ~/.claude/skills/sekkei/
```

## Sub-Commands

### Requirements Phase

| Command | Description |
|---------|-------------|
| `sekkei init` | Initialize project config (interactive wizard) |
| `/sekkei:rfp @rfp.md` | RFP analysis and presales workflow |
| `/sekkei:requirements @input` | Generate 要件定義書 (Requirements Definition) |
| `/sekkei:functions-list @input` | Generate 機能一覧 (Function List) |
| `/sekkei:nfr @input` | Generate 非機能要件定義書 (Non-Functional Requirements) |
| `/sekkei:project-plan @input` | Generate プロジェクト計画書 (Project Plan) |

### Design Phase

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

### Test Phase

| Command | Description |
|---------|-------------|
| `/sekkei:test-plan @input` | Generate テスト計画書 (Test Plan) |
| `/sekkei:ut-spec @input` | Generate 単体テスト仕様書 (Unit Test Spec) |
| `/sekkei:it-spec @input` | Generate 結合テスト仕様書 (Integration Test Spec) |
| `/sekkei:st-spec @input` | Generate システムテスト仕様書 (System Test Spec) |
| `/sekkei:uat-spec @input` | Generate 受入テスト仕様書 (UAT Spec) |
| `/sekkei:test-result-report @input` | Generate テスト結果報告書 (Test Result Report) |
| `/sekkei:test-evidence @input` | Generate テストエビデンス (Test Evidence) |

### Management

| Command | Description |
|---------|-------------|
| `/sekkei:meeting-minutes @input` | Generate 議事録 (Meeting Minutes) |
| `/sekkei:decision-record @input` | Generate 設計判断記録 (Architecture Decision Record) |

### Supplementary & Utilities

| Command | Description |
|---------|-------------|
| `/sekkei:matrix` | Generate CRUD図 or トレーサビリティマトリックス |
| `/sekkei:operation-design @input` | Generate 運用設計書 (Operation Design) |
| `/sekkei:migration-design @input` | Generate 移行設計書 (Migration Design) |
| `/sekkei:glossary [add\|list\|find\|export]` | Manage project terminology |
| `/sekkei:validate @doc` | Validate document completeness |
| `/sekkei:status` | Show V-model chain progress |
| `/sekkei:export @doc --format=xlsx\|pdf\|docx` | Export to Excel, PDF, or Word |
| `/sekkei:translate @doc --lang=en` | Translate with glossary context |
| `/sekkei:update @doc` | Detect upstream changes |
| `/sekkei:diff-visual @before @after` | Color-coded revision Excel (朱書き) |
| `/sekkei:plan @doc-type` | Create generation plan for large documents |
| `/sekkei:implement @plan-path` | Execute a generation plan phase by phase |
| `/sekkei:preview` | Start Express+React docs preview server |
| `/sekkei:dashboard` | Open analytics dashboard (quality metrics, traceability, risk) |
| `/sekkei:change @doc` | Change request lifecycle (create, approve, propagate) |
| `/sekkei:mockup` | Generate HTML screen mockups with screenshots |
| `/sekkei:sitemap` | Generate サイトマップ (System Structure Map) |

## Workflow Example

```bash
# 1. Initialize project (run in terminal)
sekkei init

# 2. Generate documents following V-model chain
/sekkei:requirements @rfp.md             # RFP → 要件定義書
/sekkei:functions-list @requirements.md  # 要件定義書 → 機能一覧
/sekkei:nfr @requirements.md             # 要件定義書 → NFR
/sekkei:basic-design @requirements.md    # 要件定義書 → 基本設計書
/sekkei:detail-design @basic-design.md   # 基本設計書 → 詳細設計書
/sekkei:ut-spec @detail-design.md        # 詳細設計書 → UT仕様書
/sekkei:it-spec @basic-design.md         # 基本設計書 → IT仕様書

# 3. Validate and export
/sekkei:validate @ut-spec.md
/sekkei:export @basic-design.md --format=xlsx

# 4. Preview all documents
/sekkei:preview
```

## Using with MCP Server

Skills invoke MCP tools via Claude Code's MCP integration. Ensure `@bienhoang/sekkei-mcp-server` is configured:

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "sekkei": {
      "command": "npx",
      "args": ["@bienhoang/sekkei-mcp-server"]
    }
  }
}
```

## Ecosystem

| Package | Description |
|---------|-------------|
| [@bienhoang/sekkei-mcp-server](../mcp-server/) | Core MCP server that skills invoke for document generation |
| [@bienhoang/sekkei-preview](../preview/) | Express+React live preview started by `/sekkei:preview` |
| [@bienhoang/sekkei-dashboard](../dashboard/) | Analytics dashboard started by `/sekkei:dashboard` |

## 日本語

sekkei-skillsは、Claude Codeのスラッシュコマンドで日本語設計書を生成するスキルです。

V字モデルのドキュメントチェーン（要件定義書→方式設計書→基本設計書→DB設計書→詳細設計書→UT/IT/ST/UAT仕様書→テスト結果報告書）に沿って、IPA準拠の各種設計書を順番に生成できます。40以上のサブコマンドで、RFP分析・初期化・生成・検証・エクスポート・翻訳・プレビュー・ダッシュボード・変更管理・議事録・ADRまでの全ワークフローをカバーします。

## License

MIT
