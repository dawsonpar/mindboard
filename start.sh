#!/bin/bash
# MindBoard launcher

# launchd and cron start with a minimal PATH that omits Homebrew, so node
# is not found. Prepend rather than replace, so a node from nvm or asdf
# still resolves.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js 18+ and try again."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting MindBoard on http://localhost:4737"
npm run dev
