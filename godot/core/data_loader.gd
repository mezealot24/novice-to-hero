## Loads the balance tables exported from the web game's TS data (tools/export-godot-data.mjs).
## Plain static functions with no autoload or class_name, so headless tests can preload it directly.
extends RefCounted

const DATA_DIR := "res://data/"
const TABLES: PackedStringArray = ["monsters", "dungeons", "affixes"]


## Returns the `rows` array of one table, or an empty array (with an error) if the file is missing or broken.
static func load_rows(table: String) -> Array:
	var path := DATA_DIR + table + ".json"
	if not FileAccess.file_exists(path):
		push_error("data file missing: %s (run: npm run export:godot)" % path)
		return []
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY or not (parsed as Dictionary).has("rows"):
		push_error("data file is not {version, rows}: %s" % path)
		return []
	return (parsed as Dictionary)["rows"]


## Turns rows into a Dictionary keyed by each row's `id`.
static func index_by_id(rows: Array) -> Dictionary:
	var out := {}
	for row: Variant in rows:
		if typeof(row) == TYPE_DICTIONARY and (row as Dictionary).has("id"):
			out[(row as Dictionary)["id"]] = row
	return out
