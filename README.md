# 🎨 ArtPack Studio

用 AI 幫你隻 game 生成同風格圖像素材嘅本機工具。掃描 `ArtPack/` 入面所有素材包做參考圖庫，接駁 **Nano Banana**（Gemini）同 **GPT Image 2**（OpenAI）兩個模型，可以單獨用或者「PK 模式」並排比較。

## 點樣行

```bash
cd ~/ArtPack/studio
npm start
```

然後開 <http://localhost:4747>。（改過 `web/` 前端先需要 `npm start` 重新 build；淨係重啟用 `npm run dev`。）

## 第一次用：加 API key

撳右上角 **⚙️ 設定**，貼上你有嘅 key：

- **fal.ai**（GPT Image 2 官方 partner，Emma 主用）：<https://fal.ai/dashboard/keys> — 模型 `openai/gpt-image-2`，有參考圖自動行 `/edit`
- **Gemini**（Nano Banana）：<https://aistudio.google.com/apikey>
- **OpenAI**（GPT Image 2 官方直連，可以唔用）：<https://platform.openai.com/api-keys>

Key 淨係儲存喺 `studio/.env`，唔會離開你部機。

## ⚽ 足球藍圖（成套部件生成）

「足球藍圖」tab 有 53 個小朋友足球遊戲素材項目（核心道具、建築、獎項獎勵、球星部件、UI、場景）。撳「生成」會出**成套部件**，跟返現有 pack 嘅檔案結構存入 `ArtPack/Football Pack/`：

- **建築** → 3 個升級等級 + 每級自動計算嘅 `_Shadow.png`（跟 Building Pack 慣例）
- **寶箱** → 4 狀態：`box_X_down`（閂）、`box_X_up`（開蓋）、`X_open`（爆獎）、`X`（獎品）（跟 Reward Pack 慣例）
- **球星部件** → 頭上定位版 + 淨部件版（`_1`）+ 染色用灰階版（`_tint`）（跟 Character Pack 128 頭型系統）

每項會自動攞相關現有素材做風格參考；描述可以喺 modal 度改完先生成。生成完嘅嘢會即刻出現喺左邊素材庫，可以攞嚟做下一輪嘅參考圖。冇 API key 嗰陣可以用 🧪 測試模型行流程（出假圖）；想閂咗佢就刪走 `.env` 入面 `ARTPACK_MOCK=1`。

想加/改藍圖項目：編輯 `lib/blueprint.js`（或者叫 Claude 加）。

## 工作流程

1. 左邊揀資料夾（或者搜尋），**㩒圖加入參考**（最多 8 張）— AI 會模仿佢哋嘅畫風
2. 揀類別（道具/寶箱/建築/角色/UI）、寫 prompt、揀比例質素
3. 兩個模型都著 = **⚔️ PK 模式**，同一條 prompt 兩邊同時出圖比較
4. 「透明背景」預設開著：生成時用綠幕，然後本機自動 chroma-key 去背 + 裁切，出即用透明 PNG
5. 結果自動儲存喺 `ArtPack/Generated/<日期>/`（連 prompt 記錄），去背前原圖係 `*_raw.png`
6. 每張圖有「📎 做參考」— 攞住張圖再迭代係做角色一致性嘅關鍵

## 慳錢貼士

| 模型 | 大約價錢/張 |
|---|---|
| Gemini `gemini-3-pro-image-preview`（Nano Banana Pro） | ~US$0.134（1K–2K）/ $0.24（4K） |
| Gemini `gemini-3.1-flash-image`（Nano Banana 2） | ~US$0.02–0.04 |
| OpenAI `gpt-image-2` | ~$0.01（慳錢）/ $0.05（標準）/ $0.17（高清） |

試稿用平模型（設定入面改 model ID），滿意先用 Pro 出正稿。

## 結構

```
studio/
  server.js        # Hono API server (port 4747)
  lib/packs.js     # 素材庫掃描 + 搜尋
  lib/providers.js # Gemini + OpenAI adapters
  lib/removebg.js  # 綠幕 chroma-key 去背（flood fill + 羽化 + 裁切）
  lib/store.js     # config / keys / 生成歷史
  web/             # React 前端 (Vite)
  config.json      # 模型 ID、風格 preset、類別 preset（可手改）
```

風格同類別 preset 想加想改：直接編輯 `config.json` 再重啟，或者叫 Claude 幫你加。
