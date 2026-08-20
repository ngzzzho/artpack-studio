# Mac 24×7 自架（+Tailscale 遠端）

## 前提
- studio 必須擺喺 ArtPack 素材庫資料夾入面（ROOT = studio 上一層），
  或者用 ARTPACK_ROOT 環境變數指去素材庫
- .env（API keys）永遠唔入 git — 舊 studio 有嘅話搬過嚟

## 步驟
1. cd ~/ArtPack && git clone https://github.com/ngzzzho/artpack-studio.git studio
   （原有 studio 資料夾：先 backup .env，rm -rf studio 再 clone，然後放返 .env）
2. cd studio && sh deploy/mac/setup-mac.sh
   → 裝依賴、build 前端、launchd 常駐（開機自動起 + 自動翻生）
3. Tailscale：brew install --cask tailscale → 開 app → 用 Emma 帳號登入
4. 驗證：curl http://localhost:4747/api/config 應見 "version"
5. 報告 tailnet 機名（tailscale status 第一行）俾 Emma

## 之後點用
- 任何裝住 Tailscale 嘅裝置（PC/iPad）開 http://<mac機名>:4747
- 生成品寫落 Mac 素材庫（正本）；第二部機撳「⬇️ 出品」zip 攞
- 更新 studio：cd studio && git pull && npm install && npm run build
  && launchctl kickstart -k gui/$(id -u)/com.artpack.studio
