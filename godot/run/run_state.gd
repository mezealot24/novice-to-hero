class_name RunState
extends RefCounted
## One roguelike run through a dungeon: which room we are in and where things spawn.
## Layout randomness comes from sub-seeds of the run seed, never from the combat RNG, so the same
## seed always gives the same rooms no matter how the fights went.

enum Purpose { SCENERY, SPAWNS }

const MIN_SPACING := 1.8
const MAX_TRIES := 400

var run_seed := 0
var dungeon: Dictionary = {}
var room_index := 0
var elapsed := 0.0
## The web game's rooms are sized for turn-based fights; real-time packs are this many times bigger.
var pack_mul := 1.0


func _init(seed_value: int, dungeon_id: String) -> void:
	run_seed = seed_value
	dungeon = GameData.dungeon(dungeon_id)
	pack_mul = float(GameData.cfg("arena").get("pack_mul", 1.0))


func rooms() -> Array:
	var list: Array = dungeon.get("rooms", [])
	return list


func room() -> Dictionary:
	var list := rooms()
	var d: Dictionary = list[room_index] if room_index < list.size() else {}
	return d


func is_last_room() -> bool:
	return room_index >= rooms().size() - 1


func is_boss_room() -> bool:
	return bool(room().get("boss", false))


func room_title() -> String:
	return "%s  ·  %s" % [str(dungeon.get("name", "")), str(room().get("title", ""))]


func scenery_seed() -> int:
	return Combat.sub_seed(run_seed, 0, Purpose.SCENERY)


## Where the hero enters (west end of the path) and where the exit portal opens (east end).
static func entry_point(half: Vector2) -> Vector3:
	var x := -half.x + 2.5
	return Vector3(x, 0.0, Meadow.path_z(x))


static func exit_point(half: Vector2) -> Vector3:
	var x := half.x - 2.5
	return Vector3(x, 0.0, Meadow.path_z(x))


## Spawn list for a room: [{id, pos}]. Nothing spawns within `safe_start` metres of the hero.
func spawn_points(index: int, hero_pos: Vector3, half: Vector2, obstacles: Array[Vector3], safe_start: float) -> Array[Dictionary]:
	var rng := RandomNumberGenerator.new()
	rng.seed = Combat.sub_seed(run_seed, index, Purpose.SPAWNS)
	var list := rooms()
	var out: Array[Dictionary] = []
	if index >= list.size():
		return out
	var room_def: Dictionary = list[index]
	var groups: Array = room_def.get("spawn", [])
	for group: Variant in groups:
		var pair: Array = group
		var id := str(pair[0])
		var is_boss_room := bool(room_def.get("boss", false))
		var count := int(pair[1]) if is_boss_room else roundi(float(pair[1]) * pack_mul)
		for n: int in count:
			var pos := Vector3(half.x * 0.35, 0.0, Meadow.path_z(half.x * 0.35))
			if not is_boss_room:
				pos = _free_spot(rng, hero_pos, half, obstacles, safe_start, out)
			out.append({"id": id, "pos": pos})
	return out


func _free_spot(rng: RandomNumberGenerator, hero_pos: Vector3, half: Vector2, obstacles: Array[Vector3],
		safe_start: float, taken: Array[Dictionary]) -> Vector3:
	var pos := Vector3.ZERO
	for attempt: int in MAX_TRIES:
		pos = Vector3(rng.randf_range(-half.x + 2.0, half.x - 2.0), 0.0, rng.randf_range(-half.y + 2.0, half.y - 2.0))
		if Vector2(pos.x - hero_pos.x, pos.z - hero_pos.z).length() < safe_start:
			continue
		var clear := true
		for o: Vector3 in obstacles:
			if Vector2(pos.x - o.x, pos.z - o.y).length() < o.z + 1.0:
				clear = false
				break
		for other: Dictionary in taken:
			var p: Vector3 = other["pos"]
			if p.distance_to(pos) < MIN_SPACING:
				clear = false
				break
		if clear:
			return pos
	return pos
