## Global read-only access to the exported balance data: GameData.monster("jellop"), GameData.dungeon("d1").
## Also registers the input actions in code, so project.godot stays small and hand-editable.
extends Node

const DataLoader := preload("res://core/data_loader.gd")

## action -> physical keys (WASD + arrows). Gamepad / touch come in a later milestone.
const INPUT_KEYS := {
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"move_up": [KEY_W, KEY_UP],
	"move_down": [KEY_S, KEY_DOWN],
}

var monsters: Dictionary = {}
var dungeons: Dictionary = {}
var affixes: Dictionary = {}


func _ready() -> void:
	monsters = DataLoader.index_by_id(DataLoader.load_rows("monsters"))
	dungeons = DataLoader.index_by_id(DataLoader.load_rows("dungeons"))
	affixes = DataLoader.index_by_id(DataLoader.load_rows("affixes"))
	_register_inputs()


func monster(id: String) -> Dictionary:
	return monsters.get(id, {})


func dungeon(id: String) -> Dictionary:
	return dungeons.get(id, {})


func _register_inputs() -> void:
	for action: String in INPUT_KEYS:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action, 0.2)
		for key: int in INPUT_KEYS[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)
