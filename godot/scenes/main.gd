## M0 smoke scene: proves the exported data loads and something moves in real time.
## Not the combat slice (that is M1). WASD / arrows move the hero; D1 room 1 monsters chase it.
extends Node2D

const ARENA := Rect2(40, 60, 880, 440)
const HERO_SPEED := 260.0
const HERO_RADIUS := 14.0
## Web data speeds were tuned for the old side-scroll scene; scale them down for a top-down arena.
const MON_SPEED_SCALE := 0.35

var hero_pos := ARENA.get_center()
var mons: Array[Dictionary] = []
var info: Label


func _ready() -> void:
	info = Label.new()
	info.position = Vector2(40, 16)
	add_child(info)
	var d1: Dictionary = GameData.dungeon("d1")
	var rooms: Array = d1.get("rooms", [])
	if rooms.is_empty():
		info.text = "No data. Run: npm run export:godot"
		return
	var room: Dictionary = rooms[0]
	for pair: Array in room.get("spawn", []):
		var def: Dictionary = GameData.monster(pair[0])
		for i in int(pair[1]):
			mons.append({
				"name": def.get("name", pair[0]),
				"pos": Vector2(randf_range(ARENA.position.x + 500, ARENA.end.x - 40), randf_range(ARENA.position.y + 40, ARENA.end.y - 40)),
				"r": float(def.get("radius", 14)),
				"speed": float(def.get("moveSpeed", 200)) * MON_SPEED_SCALE,
			})
	info.text = "%s · %s · monsters %d · WASD to move" % [d1.get("name", "?"), room.get("title", "?"), mons.size()]


func _process(delta: float) -> void:
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	hero_pos = (hero_pos + dir * HERO_SPEED * delta).clamp(ARENA.position, ARENA.end)
	for m in mons:
		var p: Vector2 = m["pos"]
		if p.distance_to(hero_pos) > HERO_RADIUS + float(m["r"]):
			m["pos"] = p.move_toward(hero_pos, float(m["speed"]) * delta)
	queue_redraw()


func _draw() -> void:
	draw_rect(ARENA, Color("2c3a6e"))
	draw_rect(ARENA, Color("e9a46a"), false, 2.0)
	for m in mons:
		draw_circle(m["pos"], m["r"], Color("7fd96b"))
	draw_circle(hero_pos, HERO_RADIUS, Color("ffd36b"))
