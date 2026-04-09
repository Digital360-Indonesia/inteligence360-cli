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

# ── 3b. Install bundled skills ─────────────────────────────────────────────
SKILLS_DIR="$HOME/.intelligence360/skills"
mkdir -p "$SKILLS_DIR"
if [ -d "$INSTALL_DIR/skills" ]; then
  for skill_dir in "$INSTALL_DIR/skills"/*/; do
    skill_name="$(basename "$skill_dir")"
    if [ ! -d "$SKILLS_DIR/$skill_name" ]; then
      cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
      echo "  ✓ Skill: $skill_name"
    fi
  done
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

if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  add_to_path "$HOME/.zshrc"
  add_to_path "$HOME/.bashrc"
  export PATH="$HOME/.local/bin:$PATH"
fi

echo ""
echo "  ✅ Intelligence360 installed successfully!"
echo ""
echo "  Run:  intelligence360"
echo ""
echo "  First time? Run /model inside the app to configure your AI provider."
echo ""
