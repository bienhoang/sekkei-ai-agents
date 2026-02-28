#!/usr/bin/env bash
# Sekkei (設計) — Local install script for Claude Code
# Re-run anytime to update: rebuilds MCP server, re-copies skill, refreshes config.
#
# Usage:
#   chmod +x install.sh && ./install.sh
#   ./install.sh --skip-python   # skip Python venv setup for Excel/PDF export

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  [OK]${RESET} $1"; }
warn() { echo -e "${YELLOW}  [WARN]${RESET} $1"; }
fail() { echo -e "${RED}  [FAIL]${RESET} $1"; }
step() { echo -e "\n${BOLD}▸ $1${RESET}"; }

# ── Resolve paths ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$SCRIPT_DIR/packages/mcp-server"
SKILL_SRC="$SCRIPT_DIR/packages/skills/content"
TEMPLATES_DIR="$SCRIPT_DIR/packages/mcp-server/templates"
PYTHON_DIR="$SCRIPT_DIR/packages/mcp-server/python"

CLAUDE_DIR="$HOME/.claude"
SKILL_DEST="$CLAUDE_DIR/skills/sekkei"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

WITH_PYTHON=true
for arg in "$@"; do
  [[ "$arg" == "--skip-python" ]] && WITH_PYTHON=false
done

echo -e "\n${BOLD}Sekkei (設計) — Local Install${RESET}"
echo "Source: $SCRIPT_DIR"

# ── 1. Prerequisites ───────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node.js 20+ first."
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_VER < 20 )); then
  fail "Node.js $NODE_VER found, need 20+. Upgrade Node.js."
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  fail "npm not found."
  exit 1
fi
ok "npm $(npm -v)"

if [[ ! -d "$CLAUDE_DIR" ]]; then
  fail "~/.claude not found. Install Claude Code first."
  exit 1
fi
ok "Claude Code detected"

# ── 2. Build MCP Server ────────────────────────────────────────────────
step "Building MCP server"

cd "$MCP_DIR"
npm install --no-fund --no-audit 2>&1 | tail -1
ok "Dependencies installed"

rm -rf dist/
npm run build 2>&1 | tail -1
ok "TypeScript compiled → dist/"

MCP_ENTRY="$MCP_DIR/dist/index.js"
if [[ ! -f "$MCP_ENTRY" ]]; then
  fail "Build failed — dist/index.js not found"
  exit 1
fi
ok "Entry point: $MCP_ENTRY"

# Install Playwright Chromium browser for mockup screenshots
if npx playwright --version &>/dev/null; then
  npx playwright install chromium 2>&1 | tail -1
  ok "Playwright Chromium browser installed"
else
  warn "Playwright not found — mockup screenshots unavailable"
fi

# ── 2b. Build sekkei-preview Package ─────────────────────────────────
PREVIEW_DIR="$SCRIPT_DIR/packages/preview"
PREVIEW_CLI=""
if [[ -d "$PREVIEW_DIR" && -f "$PREVIEW_DIR/package.json" ]]; then
  step "Building sekkei-preview package"
  cd "$PREVIEW_DIR"
  npm install --legacy-peer-deps --no-fund --no-audit 2>&1 | tail -1
  ok "Preview dependencies installed"
  rm -rf dist/
  npm run build 2>&1 | tail -1
  ok "Preview built (Express+React+Tiptap)"
  PREVIEW_CLI="$PREVIEW_DIR/dist/server.js"
  ok "sekkei-preview built: $PREVIEW_CLI"
  cd "$SCRIPT_DIR"
else
  warn "sekkei-preview package not found — skipping (preview unavailable)"
fi

# ── 3. Install Skill + Slash Command ──────────────────────────────────
step "Installing Claude Code skill"

if [[ ! -d "$SKILL_SRC" ]]; then
  fail "Skill source not found: $SKILL_SRC"
  exit 1
fi

mkdir -p "$SKILL_DEST"
cp -R "$SKILL_SRC/" "$SKILL_DEST/"
ok "Copied skill → $SKILL_DEST"

# Copy wireframe CSS files for mockup generation
CSS_DIR="$TEMPLATES_DIR/wireframe"
CSS_COUNT=0
for css_file in "$CSS_DIR"/*-shell.css; do
  if [[ -f "$css_file" ]]; then
    cp "$css_file" "$SKILL_DEST/$(basename "$css_file")"
    CSS_COUNT=$((CSS_COUNT + 1))
  fi
done
if [[ $CSS_COUNT -gt 0 ]]; then
  ok "Copied $CSS_COUNT shell CSS files → $SKILL_DEST"
else
  warn "No *-shell.css files found at $CSS_DIR — mockup CSS unavailable"
fi

# Register /sekkei slash command + sub-commands in Claude Code
COMMANDS_DIR="$CLAUDE_DIR/commands"
SUBCMD_DIR="$COMMANDS_DIR/sekkei"
mkdir -p "$COMMANDS_DIR" "$SUBCMD_DIR"
ln -sf "$SKILL_DEST/SKILL.md" "$COMMANDS_DIR/sekkei.md"
ok "Linked slash command → /sekkei"

# Create sub-command stubs that reference the full SKILL.md
create_subcmd() {
  local name="$1" desc="$2" hint="$3"
  cat > "$SUBCMD_DIR/$name.md" << EOF
---
description: "$desc"
argument-hint: $hint
---

Load and follow the full Sekkei SKILL.md workflow for the \`/sekkei:$name\` sub-command.

SKILL file: $SKILL_DEST/SKILL.md
EOF
}

# ── Document generation commands ──
create_subcmd "init" "Initialize Sekkei project config" ""
create_subcmd "rfp" "Presales RFP lifecycle" "[@project-name]"
create_subcmd "requirements" "Generate 要件定義書 (Requirements)" "@input"
create_subcmd "functions-list" "Generate 機能一覧 (Function List)" "@input"
create_subcmd "nfr" "Generate 非機能要件定義書 (NFR)" "@requirements"
create_subcmd "project-plan" "Generate プロジェクト計画書 (Project Plan)" "@req"
create_subcmd "basic-design" "Generate 基本設計書 (Basic Design)" "@input"
create_subcmd "security-design" "Generate セキュリティ設計書 (Security Design)" "@bd"
create_subcmd "detail-design" "Generate 詳細設計書 (Detail Design)" "@input"
create_subcmd "mockup" "Generate HTML screen mockups from screen definitions" ""
# ── Test commands ──
create_subcmd "test-plan" "Generate テスト計画書 (Test Plan)" "@req"
create_subcmd "test-spec" "Generate テスト仕様書 (Test Spec)" "@input"
create_subcmd "ut-spec" "Generate 単体テスト仕様書 (UT Spec)" "@detail-design"
create_subcmd "it-spec" "Generate 結合テスト仕様書 (IT Spec)" "@basic-design"
create_subcmd "st-spec" "Generate システムテスト仕様書 (ST Spec)" "@basic-design"
create_subcmd "uat-spec" "Generate 受入テスト仕様書 (UAT Spec)" "@requirements"
# ── Cross-cutting commands ──
create_subcmd "matrix" "Generate CRUD図 or トレーサビリティ" ""
create_subcmd "sitemap" "Generate サイトマップ (System Structure Map)" ""
create_subcmd "operation-design" "Generate 運用設計書" "@input"
create_subcmd "migration-design" "Generate 移行設計書" "@input"
# ── Workflow commands ──
create_subcmd "change" "Change request lifecycle" ""
create_subcmd "plan" "Create generation plan for large documents" "@doc-type"
create_subcmd "implement" "Execute a generation plan phase by phase" "@plan-path"
# ── Utility commands ──
create_subcmd "validate" "Validate document completeness" "@doc"
create_subcmd "status" "Show document chain progress" ""
create_subcmd "export" "Export to Excel, PDF, or Word" "@doc --format=xlsx|pdf|docx"
create_subcmd "translate" "Translate with glossary context" "@doc --lang=en"
create_subcmd "glossary" "Manage project terminology" "[add|list|find|export|import]"
create_subcmd "update" "Detect upstream changes" "@doc"
create_subcmd "diff-visual" "Color-coded revision Excel (朱書き)" "@before @after"
create_subcmd "preview" "Start Express+React docs preview with WYSIWYG editor" "[--guide] [--docs path] [--port N]"
create_subcmd "version" "Show version and health check" ""
create_subcmd "uninstall" "Remove Sekkei from Claude Code" "[--force]"
create_subcmd "rebuild" "Rebuild and re-install Sekkei skill + MCP" ""
create_subcmd "doctor" "Check installation health and fix suggestions" ""

SUBCMD_COUNT=$(ls "$SUBCMD_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
ok "Created $SUBCMD_COUNT sub-commands → /sekkei:*"

# ── 4. Register MCP Server ─────────────────────────────────────────────
step "Registering MCP server in Claude Code settings"

if [[ ! -f "$SETTINGS_FILE" ]]; then
  fail "Settings file not found: $SETTINGS_FILE"
  exit 1
fi

# Use node to safely merge JSON (no jq dependency)
node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = '$SETTINGS_FILE';
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

if (!settings.mcpServers) settings.mcpServers = {};

settings.mcpServers.sekkei = {
  command: 'node',
  args: ['$MCP_ENTRY'],
  env: {
    SEKKEI_TEMPLATE_DIR: '$TEMPLATES_DIR',
    SEKKEI_PYTHON: '$PYTHON_DIR/.venv/bin/python3'
  }
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
"

ok "MCP server registered (command: node $MCP_ENTRY)"

# ── 5. Python Setup (optional) ─────────────────────────────────────────
if $WITH_PYTHON; then
  step "Setting up Python environment for export features"

  PYTHON_CMD=""
  if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
  elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
  fi

  if [[ -z "$PYTHON_CMD" ]]; then
    warn "Python not found — skipping. Export features (Excel/PDF) unavailable."
  else
    ok "Found $($PYTHON_CMD --version)"
    VENV_DIR="$PYTHON_DIR/.venv"

    if [[ ! -d "$VENV_DIR" ]]; then
      $PYTHON_CMD -m venv "$VENV_DIR"
      ok "Created venv → $VENV_DIR"
    else
      ok "Venv exists → $VENV_DIR"
    fi

    "$VENV_DIR/bin/pip" install -q -r "$PYTHON_DIR/requirements.txt"
    ok "Python dependencies installed"
  fi
else
  echo ""
  warn "Skipping Python setup (export features)."
fi

# ── 6. Verify ──────────────────────────────────────────────────────────
step "Verifying installation"

ERRORS=0

[[ -f "$SKILL_DEST/SKILL.md" ]] && ok "Skill SKILL.md present" || { fail "SKILL.md missing"; ((ERRORS++)); }
[[ -L "$COMMANDS_DIR/sekkei.md" ]] && ok "Slash command /sekkei linked" || { fail "/sekkei command missing"; ((ERRORS++)); }
[[ -f "$MCP_ENTRY" ]] && ok "MCP server binary present" || { fail "MCP entry missing"; ((ERRORS++)); }
[[ -n "$PREVIEW_CLI" && -f "$PREVIEW_CLI" ]] && ok "sekkei-preview CLI: $PREVIEW_CLI" || warn "sekkei-preview CLI not found (preview unavailable)"
DASHBOARD_CLI="$SEKKEI_HOME/packages/dashboard/dist/server.js"
[[ -f "$DASHBOARD_CLI" ]] && ok "sekkei-dashboard CLI: $DASHBOARD_CLI" || warn "sekkei-dashboard CLI not found (dashboard unavailable)"

# Verify MCP server config in settings
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf-8'));
if (s.mcpServers && s.mcpServers.sekkei) {
  process.exit(0);
} else {
  process.exit(1);
}
" && ok "MCP config in settings.json" || { fail "MCP config missing"; ((ERRORS++)); }

# ── Done ────────────────────────────────────────────────────────────────
echo ""
if (( ERRORS > 0 )); then
  fail "Installation completed with $ERRORS error(s). Check above."
  exit 1
fi

echo -e "${BOLD}${GREEN}✓ Sekkei installed successfully!${RESET}"
echo ""
echo "  Skill:  $SKILL_DEST"
echo "  MCP:    $MCP_ENTRY"
echo "  Config: $SETTINGS_FILE"
echo ""
echo "  Restart Claude Code to activate the MCP server."
echo "  Then run 'sekkei init' in your project folder to start."
if [[ -n "$PREVIEW_CLI" ]]; then
  echo "  Preview: node $PREVIEW_CLI"
  echo -e "  \033[2mPreview docs: node $PREVIEW_CLI [--guide]  (run from your project root)${RESET}"
else
  echo -e "  \033[2mPreview: unavailable (sekkei-preview not built)${RESET}"
fi
echo ""
