#!/bin/bash
# Resolve the real directory of this script (follows symlinks)
DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")")" && pwd)"

# Find bun — prefer the version next to this repo, then PATH
if command -v bun &>/dev/null; then
  BUN="$(command -v bun)"
elif [ -f "$HOME/.bun/bin/bun" ]; then
  BUN="$HOME/.bun/bin/bun"
else
  echo "Error: bun not found. Install it: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

# Preserve the user's real CWD before we cd into the project dir
export INTELLIGENCE360_LAUNCH_CWD="$(pwd)"

# Load saved API keys
[ -f ~/.intelligence360.env ] && set -a && source ~/.intelligence360.env && set +a

cd "$DIR"
exec "$BUN" run --preload "$DIR/preload.ts" "$DIR/src/entrypoints/cli.tsx" "$@"
