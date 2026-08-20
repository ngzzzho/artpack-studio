#!/bin/sh
# studio 自我更新：由 /api/update 觸發（撳 🔄 掣）。log: /tmp/artpack-update.log
set -e
# launchd 環境冇 homebrew PATH — npm/node 喺呢度先搵到
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v npm >/dev/null || { echo "FATAL: npm not in PATH"; exit 1; }
cd "$(dirname "$0")/.."
echo "== self-update $(date) =="
git fetch origin main
git reset --hard origin/main
npm install
npm run build
echo "== done, exiting for launchd restart =="
