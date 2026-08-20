# ArtPack Studio 版本紀錄

睇自己行緊邊個版：頁面左上角 logo 旁邊有 `v0.x.x`，或者 server 啟動嗰行 log。
改完 `web/` 前端要 `npm run build`（`npm start` 會自動 build）；改 `lib/`、`server.js` 淨係重啟就得。

## v0.9.2 — 2026-08-20
- 🚀 出品掣全程 feedback：撳落變「⏳ 出品緊…」兼 disable，旁邊常駐狀態字
  （成功「✅ 出品咗 N 檔」/ 冇新嘢 / 錯誤原因全文），唔再係得個 3 秒 toast

## v0.9.1 — 2026-08-20
- 卡框 master 改九宮格（S/M 直卡 + L 方卡一套框通用）：裝飾鎖四角、四邊淨色
- 波徽拆做獨立零件 Frame_Emblem（引擎貼喺框底中間 — 避開九宮格邊中變形死穴）
- 銀/金/紫金變體自動繼承 master 嘅 ninepatch margins（四級 slices.json 齊）

## v0.9.0 — 2026-08-20
- **卡框改「1 AI master + 3 程式染色」**：AI 只出銅框 master，銀/金/紫金由
  lib/recolor.js 確定性衍生（保留線稿+光影，淨換金屬色相；紫金高光位轉金）
  — 100% 同形、零 API 費、秒出。解決 AI 鏈式生成走形問題
- 銅框 master prompt 加辣：厚邊、粗黑 outline、卡通金屬光澤（對治「銀框似草稿」）
- series 新增 local:'metal' 步驟類型，master 自動追蹤

## v0.8.1 — 2026-08-20
- **🕘「啱啱生成」面板**（藍圖 tab 頂）：生成中 job 進度、失敗步驟紅字直接顯示、
  最新生成品縮圖牆（按時間排，撳圖放大）— 唔使再喺資料夾度搵
- 每 4 秒自動刷新，生成緊嘅嘢一完成就彈出嚟

## v0.8.0 — 2026-08-20
- **🚀 出品直達 game repo**：header 個出品掣改為「批准出品」— 將 Football Pack 全部生成品
  copy 入 wordfootball_ui repo 嘅 assets/skin/generated/、重建 skin_manifest.json
  （每件連 ninepatch margins），自動 git commit + push。UI session pull 就攞到做合併
- 需要 Mac 端 .env 設 PUBLISH_REPO=<wordfootball_ui clone 路徑>（一次性）
- ⬇️ zip 降級做後備細掣（想落 own 機先用）
- 位置角章藍圖改 v6 規格：四色 icon 方章（GK手套/DEF盾/MID雙箭/FWD前箭），256 畫布，下半留空帶俾引擎壓字

## v0.7.0 — 2026-08-20
- **🔄 自我更新掣**（header）：任何裝置撳一下 → Mac 自動 git pull + install + build + 重啟，
  約一分鐘後 refresh 就係新版。更新 log 喺 Mac 嘅 /tmp/artpack-update.log
- 成條更新鏈自此全自動：同 Claude 講改乜 → push repo → 撳 🔄 → 完

## v0.6.0 — 2026-08-20
- **上雲套件**（deploy/）：Dockerfile + entrypoint（素材庫 seed 落 volume）+ fly.toml + DEPLOY.md 教學
- **密碼保護**：設 ARTPACK_PASSWORD 環境變數即全站上鎖（瀏覽器原生登入，iPad 適用）
- **⬇️ 出品 zip**：header 一掣下載 Football Pack；/api/export.zip?what=generated|starparts|all
- ARTPACK_ROOT 環境變數：素材庫位置可指定（雲端用 /data volume）

## v0.5.1 — 2026-08-20
- Port 自動閃避：4747 被霸佔就自動試 4748…4757，唔會再 EADDRINUSE 死機
- ARTPACK_OPEN=1 時起機自動開瀏覽器
- 桌面一撳即開：Desktop 嘅「ArtPack Studio.bat」（閂咗個窗 = 熄 server）
- studio 入 git 版本管理（.gitignore 排除 .env／node_modules／dist）

## v0.5.0 — 2026-08-20
- **WF卡面 / WF圖鑑 兩個新類別（12 項）**：跟 wordfootball_ui repo 嘅 ART-DIRECTION.md 零件清單
  - 六屬性 icon + GK 六數 icon（series 同族、512 畫布）
  - Line 徽章底板 ×4（ninepatch 同形四色）、風格/習慣 chip 底、必殺/裝備 slot 框（ninepatch）
  - 體力電池格（着/熄）、MAX 章、Panini 簿封面/頁底紋、計數牌
- 習慣組 icon 未加 — 等隱藏屬性正式清單（QUESTIONS Q6）

## v0.4.0 — 2026-08-20
- **九宮格（ninepatch）系統**：`ninepatch` kind / `nine: true`
  - prompt 自動鎖「裝飾只落四角、四邊筆直均勻、中間平淨」
  - 生成後逐行逐列分析可拉伸帶 → 出 `X_slices.json`（Godot NinePatchRect margins）
  - 出 `X_stretchtest.png` 2× 拉伸驗收圖；邊唔均勻會標 ⚠️ 兼 fallback 三等分
- 彈窗面板框轉九宮格（拆走頂部絲帶）；通用按鈕 ×4 轉九宮格
- Header 同 server log 顯示版本編號

## v0.3.0 — 2026-08-20
- **洋紅幕 `chroma: 'magenta'`**：主體本身有綠色嘅項目（綠按鈕、球場草地、彩虹波、
  木寶箱綠邊、HUD 綠加號）唔再被綠幕去背蝕爛
- **防漂移 `refMode: 'first'` / `'first+auto'`**：卡框銀/金/紫金全部錨住銅框原稿，
  按鈕三色錨住綠色母版，資源 icon 錨住第一件 —— 唔再逐級鏈住漂形
- **統一畫布 `canvas: N`**：四資源 icon 去背後居中 fit 落 512×512 透明畫布，HUD 排列齊整
- 自動參考圖改揀**最大版本**（之前撞到 128px 細圖就用，風格訊號弱）
- series 項目生成 modal 唔再顯示冇作用嘅 prompt 輸入框

## v0.2.0 — 2026-08-20
- **「通用」類別**（美術簡報交付次序 ①②優先）：四資源 icon 套、HUD 資源條、
  卡框 ×4 級（銅/銀/金/紫金）、通用按鈕 ×4 色、彈窗面板框、標題橫幅
- **`series` kind**：一套多件、鏈式參考出圖
- OpenAI 直連直向比例修正（3:4 / 9:16 之前會出正方形）
- Windows 環境打通（Node 24 LTS + Windows 版 sharp）

## v0.1.0 — 2026-08-17
- 初版：素材庫掃描、Nano Banana + GPT Image 2 雙模型 PK、綠幕去背、
  足球藍圖 53 項、球星部件 128 座標系、Godot export
