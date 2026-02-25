#!/usr/bin/env bash
# Sekkei (設計) — One-line installer for Claude Code
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash
#   curl -fsSL ... | bash -s -- --skip-python  # skip Python venv for export
#
# What it does:
#   1. Checks prerequisites (Node 20+, npm, git, Claude Code)
#   2. Clones/updates repo to ~/.sekkei/
#   3. Runs install.sh (builds MCP server, installs skill, registers MCP)
#   4. Symlinks 'sekkei' CLI to ~/.local/bin/
#   5. Runs 'sekkei doctor' to verify installation

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'
DIM='\033[2m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  [OK]${RESET} $1"; }
warn() { echo -e "${YELLOW}  [WARN]${RESET} $1"; }
fail() { echo -e "${RED}  [FAIL]${RESET} $1"; }
step() { echo -e "\n${BOLD}▸ $1${RESET}"; }

SEKKEI_HOME="$HOME/.sekkei"
REPO_URL="https://github.com/bienhoang/sekkei-ai-agents.git"
REPO_URL_SSH="git@github.com:bienhoang/sekkei-ai-agents.git"

# ── Banner ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  Sekkei (設計) — AI Documentation Agent${RESET}"
echo -e "${DIM}  One-line installer for Claude Code${RESET}"
echo ""

# ── 1. OS Check ─────────────────────────────────────────────────────────
case "$(uname -s)" in
  Linux|Darwin) ;;
  *) fail "Unsupported OS. Use macOS or Linux (WSL2 on Windows)."; exit 1 ;;
esac

# ── 2. Prerequisites ───────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node.js 20+ from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_VER < 20 )); then
  fail "Node.js v$NODE_VER found, need 20+. Upgrade at https://nodejs.org"
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  fail "npm not found. It should come with Node.js."
  exit 1
fi
ok "npm $(npm -v)"

if ! command -v git &>/dev/null; then
  fail "git not found. Install git first."
  exit 1
fi
ok "git $(git --version | cut -d' ' -f3)"

CLAUDE_DIR="$HOME/.claude"
if [[ ! -d "$CLAUDE_DIR" ]]; then
  fail "~/.claude not found. Install Claude Code first:"
  echo "  https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi
ok "Claude Code detected"

# ── 3. Clone or Update ─────────────────────────────────────────────────
if [[ -d "$SEKKEI_HOME/.git" ]]; then
  step "Updating ~/.sekkei"
  # Clean build artifacts that block git pull (package-lock.json from npm install, etc.)
  git -C "$SEKKEI_HOME" checkout -- package-lock.json 2>/dev/null || true
  git -C "$SEKKEI_HOME" checkout -- '*/package-lock.json' 2>/dev/null || true
  if git -C "$SEKKEI_HOME" pull --ff-only 2>/dev/null; then
    ok "Updated to latest"
  else
    warn "git pull failed. Fetching and resetting to origin/main..."
    git -C "$SEKKEI_HOME" fetch origin
    git -C "$SEKKEI_HOME" reset --hard origin/main
    ok "Reset to origin/main"
  fi
else
  step "Installing to ~/.sekkei"
  # Try SSH first (for private repo), fallback to HTTPS
  if git clone "$REPO_URL_SSH" "$SEKKEI_HOME" 2>/dev/null; then
    ok "Cloned via SSH"
  elif git clone "$REPO_URL" "$SEKKEI_HOME" 2>/dev/null; then
    ok "Cloned via HTTPS"
  else
    fail "Failed to clone repository."
    echo ""
    echo "  This is a private repository. You need GitHub access:"
    echo ""
    echo "  Option 1 — SSH key (recommended):"
    echo "    ssh-keygen -t ed25519 && cat ~/.ssh/id_ed25519.pub"
    echo "    Add to: https://github.com/settings/keys"
    echo ""
    echo "  Option 2 — Personal Access Token:"
    echo "    Create at: https://github.com/settings/tokens"
    echo "    Then run: git clone https://<TOKEN>@github.com/bienhoang/sekkei-ai-agents.git ~/.sekkei"
    echo ""
    exit 1
  fi
fi

# ── 4. Run install.sh ──────────────────────────────────────────────────
step "Running installer"
bash "$SEKKEI_HOME/install.sh" "$@"

# ── 5. Symlink CLI to PATH ─────────────────────────────────────────────
step "Setting up CLI"

CLI_JS="$SEKKEI_HOME/packages/mcp-server/bin/cli.js"
PREVIEW_JS="$SEKKEI_HOME/packages/preview/dist/server.js"
if [[ -f "$CLI_JS" ]]; then
  chmod +x "$CLI_JS"
  mkdir -p "$HOME/.local/bin"
  ln -sf "$CLI_JS" "$HOME/.local/bin/sekkei"
  ok "Linked: ~/.local/bin/sekkei"

  # Link sekkei-preview if built
  if [[ -f "$PREVIEW_JS" ]]; then
    ln -sf "$PREVIEW_JS" "$HOME/.local/bin/sekkei-preview"
    ok "Linked: ~/.local/bin/sekkei-preview"
  fi

  # Ensure ~/.local/bin is in PATH
  SHELL_RC=""
  if [[ "${SHELL:-}" == *zsh* ]]; then
    SHELL_RC="$HOME/.zshrc"
  elif [[ "${SHELL:-}" == *bash* ]]; then
    SHELL_RC="$HOME/.bashrc"
  fi

  if [[ -n "$SHELL_RC" ]] && ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    warn "Added ~/.local/bin to PATH in $SHELL_RC"
    warn "Run: source $SHELL_RC (or restart your terminal)"
  fi
else
  warn "CLI entry point not found — sekkei command may not be available"
fi

# ── 6. Run Doctor ───────────────────────────────────────────────────────
step "Verifying installation"

DOCTOR_JS="$SEKKEI_HOME/packages/mcp-server/dist/cli/main.js"
if [[ -f "$DOCTOR_JS" ]]; then
  node "$DOCTOR_JS" doctor || warn "Doctor reported issues — see above"
fi

# ── 7. Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✓ Sekkei installed successfully!${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo "  1. Restart Claude Code to activate the MCP server"
echo "  2. cd into your project folder"
echo "  3. Run: sekkei init"
echo ""
echo -e "  ${DIM}Check health anytime: sekkei doctor${RESET}"
echo -e "  ${DIM}Update anytime: curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei-ai-agents/main/setup.sh | bash${RESET}"
echo ""
