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

# ── 4. Create bin dir + symlink ────────────────────────────────────────────
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/intelligence360.sh" "$BIN_DIR/$CMD"
chmod +x "$INSTALL_DIR/intelligence360.sh"
echo "  ✓ Command linked to $BIN_DIR/$CMD"

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
