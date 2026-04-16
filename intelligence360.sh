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
export INTELLIGENCE360_SESSION="1"

# Auto-permissions on by default (skip tool confirmation prompts)
# Set to 0 to disable: INTELLIGENCE360_AUTO_PERMISSIONS=0 intelligence360
export INTELLIGENCE360_AUTO_PERMISSIONS="${INTELLIGENCE360_AUTO_PERMISSIONS:-1}"

# Disable Anthropic-internal experimental beta headers.
# These betas (redact-thinking, context-management-scope, prompt-caching-scope, etc.)
# require privileged API access and cause 500 errors with regular API keys.
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1

# Load saved API keys
[ -f ~/.intelligence360.env ] && set -a && source ~/.intelligence360.env && set +a

cd "$DIR"
exec "$BUN" run --preload "$DIR/preload.ts" "$DIR/src/entrypoints/cli.tsx" "$@"
