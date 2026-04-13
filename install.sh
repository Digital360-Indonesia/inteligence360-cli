#!/bin/bash
set -e

REPO="https://github.com/Digital360-Indonesia/inteligence360-cli.git"
INSTALL_DIR="$HOME/.local/share/intelligence360"
BIN_DIR="$HOME/.local/bin"
CMD="intelligence360"

echo ""
echo "  Installing Intelligence360 CLI..."
echo ""

# ── 1. Check / install Bun ─────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "  Bun not found — installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
BUN=$(command -v bun)
echo "  ✓ Bun $(bun --version)"

# ── 2. Clone or update repo ────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "  Updating existing installation..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "  Cloning repository..."
  git clone "$REPO" "$INSTALL_DIR"
fi
echo "  ✓ Repository ready at $INSTALL_DIR"

# ── 3. Install dependencies ────────────────────────────────────────────────
echo "  Installing dependencies..."
cd "$INSTALL_DIR"
bun install --frozen-lockfile 2>/dev/null || bun install
echo "  ✓ Dependencies installed"

# ── 3b. Install bundled skills (copy if missing or outdated) ──────────────
SKILLS_DIR="$HOME/.intelligence360/skills"
mkdir -p "$SKILLS_DIR"
if [ -d "$INSTALL_DIR/skills" ]; then
  for skill_dir in "$INSTALL_DIR/skills"/*/; do
    skill_name="$(basename "$skill_dir")"
    bundled_ver=$(grep -m1 'version:' "$skill_dir/SKILL.md" 2>/dev/null | tr -d ' "' | cut -d: -f2)
    installed_ver=$(grep -m1 'version:' "$SKILLS_DIR/$skill_name/SKILL.md" 2>/dev/null | tr -d ' "' | cut -d: -f2)
    if [ ! -d "$SKILLS_DIR/$skill_name" ]; then
      cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
      echo "  ✓ Skill installed: $skill_name"
    elif [ -n "$bundled_ver" ] && [ "$bundled_ver" != "$installed_ver" ]; then
      cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
      echo "  ↑ Skill updated: $skill_name ($installed_ver → $bundled_ver)"
    fi
  done
fi

# ── 3c. Create memory hook wrapper + wire it up ────────────────────────────
HOOK_WRAPPER="$BIN_DIR/i360-memory-hook"
cat > "$HOOK_WRAPPER" << HOOKSCRIPT
#!/bin/bash
[ -z "\$INTELLIGENCE360_SESSION" ] && exit 0
if command -v bun &>/dev/null; then BUN="\$(command -v bun)"
elif [ -f "\$HOME/.bun/bin/bun" ]; then BUN="\$HOME/.bun/bin/bun"
else exit 0; fi
I360_BIN="\$(which intelligence360 2>/dev/null || echo "$BIN_DIR/intelligence360")"
if [ -L "\$I360_BIN" ]; then
  REAL_PATH="\$(readlink -f "\$I360_BIN" 2>/dev/null)"
  INSTALL_DIR="\$(cd "\$(dirname "\$REAL_PATH")" && pwd)"
else
  INSTALL_DIR="$INSTALL_DIR"
fi
HOOK_SCRIPT="\$INSTALL_DIR/src/intelligence360/memoryHook.ts"
[ ! -f "\$HOOK_SCRIPT" ] && exit 0
exec "\$BUN" run "\$HOOK_SCRIPT" "\$1"
HOOKSCRIPT
chmod +x "$HOOK_WRAPPER"

CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"

if [ ! -f "$CLAUDE_SETTINGS" ]; then
  echo '{}' > "$CLAUDE_SETTINGS"
fi

# Only add hooks if not already present
if ! grep -q "i360-memory-hook" "$CLAUDE_SETTINGS" 2>/dev/null; then
  if command -v bun &>/dev/null; then
    bun -e "
      const fs = require('fs');
      const path = '$CLAUDE_SETTINGS';
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
      cfg.hooks = cfg.hooks || {};
      cfg.hooks.UserPromptSubmit = cfg.hooks.UserPromptSubmit || [];
      const hookEntry = { matcher: '', hooks: [{ type: 'command', command: 'bash $HOOK_WRAPPER session-start' }] };
      const alreadyAdded = (cfg.hooks.UserPromptSubmit || []).some(h => JSON.stringify(h).includes('i360-memory-hook'));
      if (!alreadyAdded) cfg.hooks.UserPromptSubmit.push(hookEntry);
      fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
    " 2>/dev/null && echo "  ✓ Memory hooks configured" || true
  fi
fi

# ── 4. Create bin dir + launcher with dynamic bun detection ───────────────
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/$CMD" << LAUNCHER
#!/bin/bash
if command -v bun &>/dev/null; then
  BUN="\$(command -v bun)"
elif [ -f "\$HOME/.bun/bin/bun" ]; then
  BUN="\$HOME/.bun/bin/bun"
else
  echo "Error: bun not found. Install it: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi
export INTELLIGENCE360_LAUNCH_CWD="\$(pwd)"
export INTELLIGENCE360_SESSION="1"
export INTELLIGENCE360_AUTO_PERMISSIONS="\${INTELLIGENCE360_AUTO_PERMISSIONS:-1}"
[ -f ~/.intelligence360.env ] && set -a && source ~/.intelligence360.env && set +a
cd "$INSTALL_DIR"
exec "\$BUN" run --preload "$INSTALL_DIR/preload.ts" "$INSTALL_DIR/src/entrypoints/cli.tsx" "\$@"
LAUNCHER
chmod +x "$BIN_DIR/$CMD"
echo "  ✓ Launcher created at $BIN_DIR/$CMD"

# ── 5. Add ~/.local/bin to PATH if needed ──────────────────────────────────
add_to_path() {
  local profile="$1"
  if [ -f "$profile" ] && ! grep -q 'local/bin' "$profile"; then
    echo "" >> "$profile"
    echo '# Intelligence360' >> "$profile"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$profile"
    echo "  ✓ Added ~/.local/bin to PATH in $profile"
  fi
}

PATH_WAS_ADDED=false
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  add_to_path "$HOME/.zshrc"
  add_to_path "$HOME/.bashrc"
  export PATH="$HOME/.local/bin:$PATH"
  PATH_WAS_ADDED=true
fi

echo ""
echo "  ✅ Intelligence360 installed successfully!"
echo ""

if [ "$PATH_WAS_ADDED" = true ]; then
  echo "  ⚠️  PATH was updated — reload your shell first:"
  echo ""
  echo "     source ~/.bashrc        # bash users"
  echo "     source ~/.zshrc         # zsh users"
  echo ""
  echo "  Or run directly without reloading:"
  echo ""
  echo "     $BIN_DIR/$CMD"
  echo ""
else
  echo "  Run:  intelligence360"
  echo ""
fi

echo "  First time? Run /model inside the app to configure your AI provider."
echo ""
