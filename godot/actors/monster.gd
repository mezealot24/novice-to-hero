class_name Monster
extends Actor
## Base monster. Stats come from monsters.json (web game data); the subclass is picked by its `ai`.
## Every attack is telegraphed on the ground first, so damage is always dodgeable.

const CORPSE_TIME := 0.4
const DANGER := Color(1.0, 0.28, 0.2)
const KNOCKBACK := 3.5

var def: Dictionary = {}
var id := ""
var display_name := ""
var dmg := 1
var xp := 0
var speed := 2.0
var is_boss := false
var visual: MonsterVisual

var _corpse_left := CORPSE_TIME
var _knock := Vector3.ZERO
var _time_in_state := 0.0


static func create(monster_def: Dictionary) -> Monster:
	var m: Monster
	match str(monster_def.get("ai", "hopper")):
		"dasher": m = Dasher.new()
		"boss": m = BossKing.new()
		_: m = Hopper.new()
	m.def = monster_def
	m._read_def()
	return m


func _read_def() -> void:
	var scale_cfg := GameData.cfg("monster")
	id = str(def.get("id", ""))
	display_name = str(def.get("name", id))
	max_hp = int(def.get("hp", 10))
	hp = max_hp
	dmg = int(def.get("dmg", 1))
	xp = int(def.get("xp", 0))
	speed = float(def.get("moveSpeed", 300.0)) * float(scale_cfg.get("speed_scale", 0.006))
	radius = float(def.get("radius", 15.0)) * float(scale_cfg.get("radius_scale", 0.0333))
	visual = _make_visual()
	add_child(visual)


## Called once the monster is in the arena.
func setup() -> void:
	pass


func tick(dt: float) -> void:
	_tick_flash(dt, visual.flash_materials)
	visual.tick(dt)
	if not alive:
		_corpse_left -= dt
		return
	_time_in_state += dt
	if _knock.length_squared() > 0.01:
		position = arena.clamp_point(position + _knock * dt, radius)
		_knock = _knock.lerp(Vector3.ZERO, 1.0 - exp(-12.0 * dt))
	_think(dt)


func is_gone() -> bool:
	return not alive and _corpse_left <= 0.0


## Mid-hop monsters cannot be pushed around.
func airborne() -> bool:
	return visual.air > 0.05


func take_damage(amount: int, is_crit: bool, from: Vector3) -> int:
	var taken := super(amount, is_crit, from)
	if taken > 0 and alive and not is_boss and not airborne():
		var away := Vector3(position.x - from.x, 0.0, position.z - from.z)
		if away.length_squared() > 0.0001:
			_knock = away.normalized() * KNOCKBACK * (1.6 if is_crit else 1.0)
	return taken


func _on_death() -> void:
	visual.die()


func _think(_dt: float) -> void:
	pass


func _make_visual() -> MonsterVisual:
	return JellyVisual.new(radius)


func _hero() -> Hero:
	var h := arena.hero
	return h if h != null and h.alive else null


func _hit_hero(amount: int) -> void:
	var h := _hero()
	if h != null:
		h.take_damage(amount, false, position)


func _roll_idle() -> float:
	var range_ms: Array = def.get("idleMs", [500, 1000])
	return arena.rng.randf_range(float(range_ms[0]), float(range_ms[1])) / 1000.0
