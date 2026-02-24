---
title: "Phase 03 — setup.sh One-Line Installer"
status: pending
effort: 2h
---

## Overview

- **Priority:** P1
- New `setup.sh` at repo root; replaces the "clone and run install.sh manually" workflow
- Designed for `curl -fsSL https://raw.githubusercontent.com/bienhoang/sekkei/main/setup.sh | bash`
- Clones repo to `~/.sekkei/` (pulls if already exists), delegates to existing `install.sh`, adds PATH symlink, then runs `sekkei doctor`
- **Thin wrapper** — business logic stays in `install.sh`; `setup.sh` handles clone + PATH only

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Clone to `~/.sekkei/` | Predictable location; no pkg registry needed (GitHub Packages restricted) |
| Delegate to `install.sh` | DRY — avoid duplicating build/register logic |
| Symlink `~/.local/bin/sekkei` | Standard XDG location; no sudo; works on macOS + Linux |
| `sekkei doctor` at end | Self-verifying install; catches broken states before user hits them |
| `git pull` on re-run | Idempotent; users can run `setup.sh` to update |

## Related Code Files

**Create:**
- `setup.sh` (repo root)

**Modify (minor):**
- `install.sh` — remove final `echo 'Then run npx sekkei init...'` line (setup.sh prints its own next-step message)
- `packages/mcp-server/bin/cli.js` — must be executable (`chmod +x`); confirm in build output (already in package.json `bin` field, verify)

**No changes needed:**
- `packages/mcp-server/src/cli/main.ts` — doctor command registered in Phase 02
- MCP registration logic — already in `install.sh`

## setup.sh Structure

```
setup.sh
├── 0. Color helpers (same palette as install.sh)
├── 1. Detect OS (macOS/Linux only — exit on Windows)
├── 2. Check prerequisites: node 20+, npm, git, ~/.claude
├── 3. Clone or pull ~/.sekkei/
│     git clone https://github.com/bienhoang/sekkei ~/.sekkei
│     OR cd ~/.sekkei && git pull --ff-only
├── 4. Delegate: bash ~/.sekkei/install.sh "$@"
│     (passes --with-python flag through if provided)
├── 5. Add sekkei to PATH
│     mkdir -p ~/.local/bin
│     ln -sf ~/.sekkei/packages/mcp-server/bin/cli.js ~/.local/bin/sekkei
│     chmod +x ~/.sekkei/packages/mcp-server/bin/cli.js
│     PATH export + shell rc hint (if not already in PATH)
├── 6. Run: node ~/.sekkei/packages/mcp-server/dist/cli/main.js doctor
│     (use node directly — sekkei may not be in PATH yet in same shell)
└── 7. Print next step message
```

## PATH Shell RC Hint

After creating symlink, detect and hint:
```bash
SHELL_RC=""
[[ "$SHELL" == *zsh* ]]  && SHELL_RC="$HOME/.zshrc"
[[ "$SHELL" == *bash* ]] && SHELL_RC="$HOME/.bashrc"
if [[ -n "$SHELL_RC" ]] && ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
  warn "Added ~/.local/bin to PATH in $SHELL_RC. Restart your shell or run: source $SHELL_RC"
fi
```

## Implementation Steps

1. Create `setup.sh` with `set -euo pipefail`, color helpers matching `install.sh`.

2. OS guard:
   ```bash
   case "$(uname -s)" in
     Linux|Darwin) ;;
     *) fail "Windows not supported. Use WSL2."; exit 1 ;;
   esac
   ```

3. Prerequisite checks (node 20+, npm, git, `~/.claude` dir). Mirror `install.sh` checks — do not duplicate logic if avoidable.

4. Clone or pull:
   ```bash
   SEKKEI_HOME="$HOME/.sekkei"
   if [[ -d "$SEKKEI_HOME/.git" ]]; then
     step "Updating ~/.sekkei"
     git -C "$SEKKEI_HOME" pull --ff-only
   else
     step "Installing to ~/.sekkei"
     git clone https://github.com/bienhoang/sekkei "$SEKKEI_HOME"
   fi
   ```

5. Delegate to `install.sh`:
   ```bash
   step "Running installer"
   bash "$SEKKEI_HOME/install.sh" "$@"
   ```

6. Symlink CLI:
   ```bash
   CLI_JS="$SEKKEI_HOME/packages/mcp-server/bin/cli.js"
   chmod +x "$CLI_JS"
   mkdir -p "$HOME/.local/bin"
   ln -sf "$CLI_JS" "$HOME/.local/bin/sekkei"
   ok "Linked: ~/.local/bin/sekkei → $CLI_JS"
   ```

7. PATH detection + shell rc update (see above).

8. Run doctor:
   ```bash
   step "Verifying installation"
   node "$SEKKEI_HOME/packages/mcp-server/dist/cli/main.js" doctor || true
   # || true so setup.sh doesn't exit 1 on warn-only doctor output
   ```

9. Final banner:
   ```
   ✓ Sekkei installed successfully!

     Restart Claude Code to activate the MCP server.
     Then run: sekkei init   (in your project folder)
   ```

## Success Criteria

- `curl -fsSL .../setup.sh | bash` completes without error on clean macOS (Node 20+, git, Claude Code installed)
- Re-running setup.sh does `git pull` instead of re-clone
- `sekkei doctor` is available in a new shell after install
- `sekkei --help` shows all subcommands
- `~/.claude/settings.json` contains `mcpServers.sekkei` entry

## Risk

- `git pull --ff-only` fails if user has local changes in `~/.sekkei/` → add fallback message: "Run `git -C ~/.sekkei reset --hard origin/main` to reset"
- `~/.local/bin` not in PATH on some Linux distros → shell rc hint covers this; user must restart shell
- Private repo: `git clone` requires GitHub auth → document in README that user must have SSH key or PAT; setup.sh prints a clear error if clone fails
