#!/bin/bash
# MindBoard launcher

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
