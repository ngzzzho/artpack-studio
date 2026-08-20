# StarDoll.gd — ArtPack Studio 球星零件 loader（Godot 4）
# 場景結構（全部 Sprite2D 都 centered = false、position = (0,0)，因為所有零件共用同一個 128 座標 canvas）：
#   StarDoll (Node2D) ← 掛呢個 script
#     ├─ Skin  (Sprite2D)  ← skin_1.png
#     ├─ Beard (Sprite2D)
#     ├─ Mouth (Sprite2D)
#     ├─ Eyes  (Sprite2D)
#     ├─ Brows (Sprite2D)
#     └─ Hair  (Sprite2D)
# 將成個「Football Pack/球星部件」資料夾 copy 入 res://art/star_parts/
extends Node2D

const PARTS_DIR := "res://art/star_parts/"

@onready var _slots: Dictionary = {
	"hair": $Hair, "eye": $Eyes, "brow": $Brows, "mouth": $Mouth, "beard": $Beard
}
var _manifest: Dictionary = {}

func _ready() -> void:
	var f := FileAccess.open(PARTS_DIR + "manifest.json", FileAccess.READ)
	if f:
		_manifest = JSON.parse_string(f.get_as_text())

## 裝彩色版零件：equip("hair", "hair_short_36")
func equip(slot: String, part_id: String) -> void:
	var sp: Sprite2D = _slots[slot]
	sp.texture = load(PARTS_DIR + part_id + "/" + part_id + ".png")
	sp.modulate = Color.WHITE

## 裝灰階版 + 染色（髮色/鬚色隨你變）：equip_tinted("hair", "hair_short_36", Color("8B4513"))
func equip_tinted(slot: String, part_id: String, color: Color) -> void:
	var sp: Sprite2D = _slots[slot]
	sp.texture = load(PARTS_DIR + part_id + "/" + part_id + "_tint.png")
	sp.modulate = color

## 除低零件：unequip("beard")
func unequip(slot: String) -> void:
	_slots[slot].texture = null

## 例：砌一個「阿根廷傳奇」
## equip_tinted("hair", "hair_short_39", Color("5b4632"))
## equip("eye", "eye_24")
## equip_tinted("brow", "brow_11", Color("4a3a2a"))
## equip("mouth", "mouth_14")
## equip_tinted("beard", "beard_12", Color("5b4632"))
