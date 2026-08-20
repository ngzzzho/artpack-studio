#!/bin/sh
# Mac 常駐設置：喺 studio 資料夾行  sh deploy/mac/setup-mac.sh
set -e
STUDIO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "❌ 未裝 Node.js — 行：brew install node@20（或去 nodejs.org 裝 LTS）"
  exit 1
fi
cd "$STUDIO_DIR"
npm install
npm run build
PLIST="$HOME/Library/LaunchAgents/com.artpack.studio.plist"
mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s|__NODE__|$NODE_BIN|g" -e "s|__DIR__|$STUDIO_DIR|g" deploy/mac/com.artpack.studio.plist > "$PLIST"
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
sleep 2
if curl -sf http://localhost:4747/api/config > /dev/null 2>&1; then
  echo "✅ ArtPack Studio 常駐咗（開機自動起、死咗自動翻生）"
  echo "   本機：http://localhost:4747   log：/tmp/artpack-studio.log"
else
  echo "⚠️ server 未回應，睇下 /tmp/artpack-studio.log"
fi
