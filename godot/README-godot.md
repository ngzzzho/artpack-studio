# Godot 接駁指南（球星零件）

每件生成嘅零件有 5 個檔案，全部已經釘正喺你 Character Pack 嘅 128×128 頭型座標系：

| 檔案 | 用途 |
|---|---|
| `<id>.png` | **128 對齊版** — 同 `skin_1.png` 疊埋就啱位，Godot 直接用 |
| `<id>_hd.png` | 512 對齊版（同一座標 ×4）— 想高清就用呢個，scale 0.25 |
| `<id>_tint.png` | 512 灰階版 — 配 `modulate` 做染色（髮色/鬚色隨意變） |
| `<id>_preview.png` | 鬼影頭預覽（同 pack 嘅 `eye_1.png` 格式一樣，畀人眼 check） |
| `<id>_1.png` | 高清淨件裁切（pack `_1` 慣例，特殊用途） |

## 三步接入

1. 將 `ArtPack/Football Pack/球星部件/` 成個 copy 入你項目 `res://art/star_parts/`
2. 開個 `StarDoll` 場景照 `StarDoll.gd` 頂部註釋嘅結構砌（六個 Sprite2D，全部 `centered = false`、position `(0,0)`）
3. 掛上 `StarDoll.gd`，之後就係：

```gdscript
doll.equip("mouth", "mouth_13")                          # 耶馬箍牙笑
doll.equip_tinted("hair", "hair_short_36", Color.BLACK)  # 捲頂剷邊染黑色
```

`manifest.json` 每次生成完會自動更新，列晒所有零件同 slot，方便你寫隨機角色生成器。

貼士：texture import 用 Godot 預設就得；如果想 pixel-perfect，喺 import 設定揀 filter = Nearest。
