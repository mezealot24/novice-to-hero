extends Node
## Read-only balance data. monsters.json / dungeons.json are exported from the web game's src/data
## (npm run export:godot); slice.json holds the real-time numbers that only this prototype needs.

const DATA_DIR := "res://data"

var monsters: Dictionary[String, Dictionary] = {}
var dungeons: Dictionary[String, Dictionary] = {}
var slice: Dictionary = {}


func _ready() -> void:
	monsters = _index(_read("monsters"))
	dungeons = _index(_read("dungeons"))
	slice = _read("slice")


func monster(id: String) -> Dictionary:
	return monsters.get(id, {})


func dungeon(id: String) -> Dictionary:
	return dungeons.get(id, {})


## A section of slice.json, e.g. cfg("hero") or cfg("ai", "hopper").
func cfg(section: String, sub: String = "") -> Dictionary:
	var d: Dictionary = slice.get(section, {})
	if sub.is_empty():
		return d
	var inner: Dictionary = d.get(sub, {})
	return inner


func _read(table: String) -> Dictionary:
	var path := "%s/%s.json" % [DATA_DIR, table]
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if parsed is Dictionary:
		var d: Dictionary = parsed
		return d
	push_error("GameData: cannot read %s" % path)
	return {}


func _index(table: Dictionary) -> Dictionary[String, Dictionary]:
	var out: Dictionary[String, Dictionary] = {}
	var rows: Array = table.get("rows", [])
	for row: Variant in rows:
		if row is Dictionary:
			var d: Dictionary = row
			out[str(d.get("id", ""))] = d
	return out
