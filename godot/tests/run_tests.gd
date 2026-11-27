## Headless test runner. Exits 1 if any check fails, so CI can gate on it.
## godot --headless --path godot --import
## godot --headless --path godot -s res://tests/run_tests.gd
extends SceneTree

const DataLoader := preload("res://core/data_loader.gd")

var failures := 0


func _init() -> void:
	_test_tables_load()
	_test_d1_is_complete()
	print("tests: %s" % ("FAILED (%d)" % failures if failures > 0 else "all passed"))
	quit(1 if failures > 0 else 0)


func check(ok: bool, what: String) -> void:
	if not ok:
		failures += 1
		printerr("FAIL: " + what)


func _test_tables_load() -> void:
	for table in DataLoader.TABLES:
		check(not DataLoader.load_rows(table).is_empty(), "table %s has rows" % table)


func _test_d1_is_complete() -> void:
	var monsters := DataLoader.index_by_id(DataLoader.load_rows("monsters"))
	var dungeons := DataLoader.index_by_id(DataLoader.load_rows("dungeons"))
	check(dungeons.has("d1"), "d1 exists")
	var rooms: Array = (dungeons.get("d1", {}) as Dictionary).get("rooms", [])
	check(rooms.size() >= 2, "d1 has rooms")
	for room: Dictionary in rooms:
		for pair: Array in room.get("spawn", []):
			var def: Dictionary = monsters.get(pair[0], {})
			check(not def.is_empty(), "d1 monster %s exists" % pair[0])
			check(float(def.get("hp", 0)) > 0.0, "%s has hp" % pair[0])
			check(float(def.get("moveSpeed", 0)) > 0.0, "%s has moveSpeed" % pair[0])
