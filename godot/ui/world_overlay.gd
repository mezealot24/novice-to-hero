class_name WorldOverlay
extends Control
## Draws things that follow the 3D world on top of it: monster HP bars and floating damage numbers.

const BAR_SIZE := Vector2(46.0, 6.0)
const NUMBER_LIFE := 0.8

var camera: Camera3D
var arena: Arena
var font: Font

var _numbers: Array[Dictionary] = []


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)


func add_number(world_pos: Vector3, amount: int, crit: bool, to_hero: bool) -> void:
	_numbers.append({
		"pos": world_pos, "text": str(amount) + ("!" if crit else ""), "age": 0.0, "crit": crit, "to_hero": to_hero,
		"drift": randf_range(-18.0, 18.0),
	})


func add_text(world_pos: Vector3, text: String, color: Color) -> void:
	_numbers.append({"pos": world_pos, "text": text, "age": 0.0, "crit": true, "to_hero": false, "drift": 0.0, "color": color})


func _process(delta: float) -> void:
	var kept: Array[Dictionary] = []
	for n: Dictionary in _numbers:
		n["age"] = float(n["age"]) + delta
		if float(n["age"]) < NUMBER_LIFE:
			kept.append(n)
	_numbers = kept
	queue_redraw()


func _draw() -> void:
	if camera == null or arena == null:
		return
	for m: Monster in arena.monsters:
		if not m.alive or m.is_boss or m.hp >= m.max_hp:
			continue
		var head := m.position + Vector3(0.0, m.radius * 2.0 + 0.5 + m.visual.air, 0.0)
		if camera.is_position_behind(head):
			continue
		var at := camera.unproject_position(head) - Vector2(BAR_SIZE.x * 0.5, 0.0)
		draw_rect(Rect2(at - Vector2(1.0, 1.0), BAR_SIZE + Vector2(2.0, 2.0)), Color(0.1, 0.08, 0.1, 0.85))
		draw_rect(Rect2(at, Vector2(BAR_SIZE.x * float(m.hp) / float(m.max_hp), BAR_SIZE.y)), Color(0.95, 0.3, 0.3))
	for n: Dictionary in _numbers:
		var world: Vector3 = n["pos"]
		if camera.is_position_behind(world):
			continue
		var t := float(n["age"]) / NUMBER_LIFE
		var crit: bool = n["crit"]
		var to_hero: bool = n["to_hero"]
		# Pop up fast, then drift and fade.
		var rise := (1.0 - pow(1.0 - t, 3.0)) * 46.0
		var at := camera.unproject_position(world) + Vector2(float(n["drift"]) * t, -rise)
		var size := 30 if crit else 21
		var color: Color = n.get("color", Color(1.0, 0.45, 0.4) if to_hero else (Color(1.0, 0.85, 0.3) if crit else Color.WHITE))
		color.a = 1.0 - smoothstep(0.6, 1.0, t)
		var text: String = n["text"]
		var width := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size).x
		var origin := at - Vector2(width * 0.5, 0.0)
		draw_string_outline(font, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, 6, Color(0.1, 0.07, 0.1, color.a))
		draw_string(font, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, color)
