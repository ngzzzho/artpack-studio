#!/bin/sh
# studio 自我更新：由 /api/update 觸發（撳 🔄 掣）。log: /tmp/artpack-update.log
set -e
cd "$(dirname "$0")/.."
echo "== self-update $(date) =="
git fetch origin main
git reset --hard origin/main
npm install
npm run build
echo "== done, exiting for launchd restart =="
