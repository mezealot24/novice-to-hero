class_name Hero
extends Actor
## The Rogue. Orders come from the player (or the bot): move, attack, stop, cast Q/W/E/R.
## Kit (real-time take on the web game's Rogue): basic hits build Combo Points and every third
## hit throws a flying knife; Q knife fan, W shadow step (dodge + crit), E Back Stab finisher,
## R knife storm. All numbers live in data/slice.json.

signal leveled_up(level: int)
signal skill_cast(key: String)
signal skill_failed(key: String, reason: String)
signal ult_changed(active: bool)
signal xp_changed

enum Order { NONE, MOVE, ATTACK }

const SKILL_KEYS: Array[String] = ["q", "w", "e", "r"]
const KNIFE_COLOR := Color(0.75, 0.9, 1.0)
const CRIT_COLOR := Color(1.0, 0.8, 0.3)
const SHADOW_COLOR := Color(0.5, 0.35, 0.9)
const TURN_RATE := 18.0
## Chibi read: the hero is drawn a little larger than its collision size.
const VISUAL_SCALE := 1.25

var visual: HeroVisual
var atk := 10.0
var crit := 0.1
var crit_mul := 1.75
var variance := 0.1
var move_speed := 5.0
var attack_range := 1.3
var attack_interval := 0.6
var attack_windup := 0.16
var acquire_range := 4.5

var level := 1
var xp := 0
var combo_points := 0
var combo_max := 5
var cooldowns: Dictionary[String, float] = {"q": 0.0, "w": 0.0, "e": 0.0, "r": 0.0}
## Where skills aim: the cursor's point on the ground.
var aim_point := Vector3.ZERO
var order := Order.NONE
var target: Monster
var kills := 0

var _move_target := Vector3.ZERO
var _attack_cd := 0.0
var _swing_left := 0.0
var _hit_count := 0
var _crit_buff_left := 0.0
var _dash_left := 0.0
var _dash_velocity := Vector3.ZERO
var _ult_left := 0.0
var _ult_knives_left := 0
var _ult_next := 0.0
var _moving := false
var _skills: Dictionary = {}
var _combo: Dictionary = {}
var _level_cfg: Dictionary = {}


func _init() -> void:
	var cfg := GameData.cfg("hero")
	_skills = GameData.cfg("skills")
	_combo = GameData.cfg("combo")
	_level_cfg = GameData.cfg("level")
	max_hp = int(cfg.get("hp", 100))
	hp = max_hp
	atk = float(cfg.get("atk", 10.0))
	crit = float(cfg.get("crit", 0.1))
	crit_mul = float(cfg.get("crit_mul", 1.75))
	variance = float(cfg.get("variance", 0.1))
	move_speed = float(cfg.get("move_speed", 5.0))
	radius = float(cfg.get("radius", 0.4))
	attack_range = float(cfg.get("attack_range", 1.3))
	attack_interval = float(cfg.get("attack_interval", 0.6))
	attack_windup = float(cfg.get("attack_windup", 0.16))
	acquire_range = float(cfg.get("acquire_range", 4.5))
	combo_max = int(_combo.get("max", 5))
	var model := ModelRogue.try_load()
	visual = model if model != null else ChibiRogue.new()
	visual.scale = Vector3.ONE * VISUAL_SCALE
	add_child(visual)


# ---------------------------------------------------------------- orders

func command_move(point: Vector3) -> void:
	if not alive:
		return
	order = Order.MOVE
	target = null
	_swing_left = 0.0
	_move_target = arena.clamp_point(point, radius)


func command_attack(monster: Monster) -> void:
	if not alive or monster == null or not monster.alive:
		return
	if target != monster:
		_swing_left = 0.0
	order = Order.ATTACK
	target = monster


func command_stop() -> void:
	order = Order.NONE
	target = null
	_swing_left = 0.0


func cooldown_ratio(key: String) -> float:
	var total := float(_skill(key).get("cd", 1.0))
	return clampf(cooldowns[key] / total, 0.0, 1.0) if total > 0.0 else 0.0


func skill_name(key: String) -> String:
	return str(_skill(key).get("name", key.to_upper()))


func is_ulting() -> bool:
	return _ult_left > 0.0


func xp_needed() -> int:
	return Combat.xp_to_next(level, float(_level_cfg.get("xp_base", 8.0)), float(_level_cfg.get("xp_growth", 1.45)))


func is_max_level() -> bool:
	return level >= int(_level_cfg.get("max", 10))


func cast(key: String) -> bool:
	if not alive or _dash_left > 0.0 or not cooldowns.has(key):
		return false
	if cooldowns[key] > 0.0:
		skill_failed.emit(key, "ยังคูลดาวน์")
		return false
	var ok := false
	match key:
		"q": ok = _cast_knife_fan()
		"w": ok = _cast_shadow_step()
		"e": ok = _cast_back_stab()
		"r": ok = _cast_knife_storm()
	if ok:
		cooldowns[key] = float(_skill(key).get("cd", 1.0))
		skill_cast.emit(key)
	return ok


func add_xp(amount: int) -> void:
	if amount <= 0 or is_max_level():
		return
	xp += amount
	while not is_max_level() and xp >= xp_needed():
		xp -= xp_needed()
		level += 1
		max_hp += int(_level_cfg.get("hp_per_level", 10))
		atk += float(_level_cfg.get("atk_per_level", 1.0))
		heal(roundi(float(max_hp) * float(_level_cfg.get("heal", 0.25))))
		flash(Color(1.0, 0.95, 0.5), 0.3)
		leveled_up.emit(level)
	if is_max_level():
		xp = 0
	xp_changed.emit()


# ---------------------------------------------------------------- per frame

func tick(dt: float) -> void:
	_tick_flash(dt, visual.flash_materials)
	if not alive:
		visual.tick(dt)
		return
	invulnerable_left = maxf(invulnerable_left - dt, 0.0)
	_attack_cd = maxf(_attack_cd - dt, 0.0)
	_crit_buff_left = maxf(_crit_buff_left - dt, 0.0)
	for key: String in SKILL_KEYS:
		cooldowns[key] = maxf(cooldowns[key] - dt, 0.0)
	_moving = false
	if _dash_left > 0.0:
		_dash_left -= dt
		position = arena.clamp_point(position + _dash_velocity * dt, radius)
	else:
		_tick_order(dt)
	if _ult_left > 0.0:
		_tick_knife_storm(dt)
	visual.locomotion = lerpf(visual.locomotion, 1.0 if _moving else 0.0, 1.0 - exp(-14.0 * dt))
	visual.tick(dt)


func _tick_order(dt: float) -> void:
	if order == Order.ATTACK and (target == null or not is_instance_valid(target) or not target.alive):
		order = Order.NONE
		target = null
	if order == Order.NONE:
		# Like a MOBA champion standing still: pick a fight with whatever walks close.
		var near := arena.nearest_monster(position, acquire_range)
		if near != null:
			order = Order.ATTACK
			target = near
	match order:
		Order.MOVE:
			if _walk_to(_move_target, 0.05, dt):
				order = Order.NONE
		Order.ATTACK:
			_tick_attack(dt)


func _tick_attack(dt: float) -> void:
	var reach := attack_range + target.radius
	if _swing_left > 0.0:
		# Committed to the swing: it lands even if the target hops a little away.
		face(flat_direction_to(target.position), dt, TURN_RATE)
		_swing_left -= dt
		if _swing_left <= 0.0:
			_land_basic(target)
		return
	if flat_distance_to(target.position) > reach:
		_walk_to(target.position, reach * 0.9, dt)
		return
	face(flat_direction_to(target.position), dt, TURN_RATE)
	if _attack_cd <= 0.0:
		_swing_left = attack_windup
		_attack_cd = attack_interval
		visual.attack(attack_interval * 0.85)


## Returns true on arrival.
func _walk_to(point: Vector3, stop_distance: float, dt: float) -> bool:
	var dist := flat_distance_to(point)
	if dist <= stop_distance:
		return true
	var dir := flat_direction_to(point)
	face(dir, dt, TURN_RATE)
	var step := minf(move_speed * dt, dist - stop_distance)
	position = arena.clamp_point(position + dir * step, radius)
	_moving = true
	return false


# ---------------------------------------------------------------- damage

## One hit on a monster. Returns the roll ({amount, crit}).
func deal(monster: Monster, mul: float, force_crit: bool, tier: Feedback.Tier, gain_cp: int = 0) -> Dictionary:
	var roll := Combat.roll(atk, mul, crit, crit_mul, variance, arena.rng, force_crit)
	var is_crit: bool = roll["crit"]
	var amount: int = roll["amount"]
	var was_alive := monster.alive
	monster.take_damage(amount, is_crit, position)
	if gain_cp > 0:
		combo_points = mini(combo_points + gain_cp, combo_max)
	var feel := tier
	if is_crit and feel == Feedback.Tier.SMALL:
		feel = Feedback.Tier.MEDIUM
	if was_alive and not monster.alive and feel == Feedback.Tier.SMALL:
		feel = Feedback.Tier.MEDIUM
	Feedback.impact(feel, monster.position + Vector3(0.0, monster.radius, 0.0), CRIT_COLOR if is_crit else KNIFE_COLOR)
	return roll


func take_damage(amount: int, is_crit: bool, from: Vector3) -> int:
	var taken := super(amount, is_crit, from)
	if taken > 0:
		flash(Color(1.0, 0.3, 0.3))
		arena.show_damage(position + Vector3(0.0, 1.5, 0.0), taken, is_crit, true)
		Feedback.impact(Feedback.Tier.MEDIUM, position + Vector3(0.0, 0.7, 0.0), Color(1.0, 0.4, 0.4))
	return taken


func _on_death() -> void:
	order = Order.NONE
	target = null
	_ult_left = 0.0
	visual.set_spinning(false)
	visual.die()
	ult_changed.emit(false)


func _land_basic(monster: Monster) -> void:
	if not is_instance_valid(monster) or not monster.alive:
		return
	var force := _crit_buff_left > 0.0
	_crit_buff_left = 0.0
	arena.fx.slash(position, rotation.y, attack_range + 0.3, CRIT_COLOR if force else KNIFE_COLOR)
	deal(monster, 1.0, force, Feedback.Tier.SMALL, 1)
	_hit_count += 1
	if _hit_count % int(_combo.get("knife_every", 3)) == 0:
		# Signature: every few hits a flying knife seeks another monster (or the same one if alone).
		var other := arena.random_monster(position, float(_combo.get("knife_range", 8.0)), monster)
		if other != null:
			_throw_seeking_knife(other, position + Vector3(0.0, 0.8, 0.0), float(_combo.get("knife_mul", 0.4)), Feedback.Tier.SMALL)


func _throw_seeking_knife(monster: Monster, from: Vector3, mul: float, tier: Feedback.Tier, speed: float = -1.0) -> void:
	var knife_speed := float(_combo.get("knife_speed", 20.0)) if speed <= 0.0 else speed
	var on_hit := func(m: Monster) -> void: deal(m, mul, false, tier)
	arena.add_knife(Knife.seeking(from, monster, knife_speed, on_hit))


# ---------------------------------------------------------------- skills

func _skill(key: String) -> Dictionary:
	var d: Dictionary = _skills.get(key, {})
	return d


func _aim_direction() -> Vector3:
	var dir := flat_direction_to(aim_point)
	return dir if dir != Vector3.ZERO else forward()


## Q: a fan of knives along the ground toward the cursor. Each hit builds a Combo Point.
func _cast_knife_fan() -> bool:
	var s := _skill("q")
	var dir := _aim_direction()
	face(dir)
	visual.cast()
	_swing_left = 0.0
	var count := int(s.get("knives", 3))
	var spread := deg_to_rad(float(s.get("spread_deg", 12.0)))
	var mul := float(s.get("mul", 0.7))
	var on_hit := func(m: Monster) -> void: deal(m, mul, false, Feedback.Tier.SMALL, 1)
	for i: int in count:
		var angle := (float(i) - float(count - 1) * 0.5) * spread
		arena.add_knife(Knife.straight(position + Vector3(0.0, 0.7, 0.0), dir.rotated(Vector3.UP, angle),
			float(s.get("speed", 20.0)), float(s.get("range", 8.0)), float(s.get("radius", 0.4)), on_hit))
	return true


## W: dash toward the cursor, untouchable on the way, next basic hit is a sure crit.
func _cast_shadow_step() -> bool:
	var s := _skill("w")
	var dir := _aim_direction()
	var want := clampf(flat_distance_to(aim_point), 1.5, float(s.get("distance", 4.0)))
	var duration := float(s.get("duration", 0.16))
	face(dir)
	_dash_left = duration
	_dash_velocity = dir * (want / duration)
	invulnerable_left = float(s.get("iframe", 0.4))
	_crit_buff_left = float(s.get("crit_window", 3.0))
	_swing_left = 0.0
	if order == Order.MOVE:
		order = Order.NONE
	visual.dash(duration)
	arena.fx.puff(position, SHADOW_COLOR)
	arena.fx.streak(position, position + dir * want, SHADOW_COLOR)
	return true


## E: blink behind a monster and stab. Sure crit; spends every Combo Point for extra damage.
func _cast_back_stab() -> bool:
	var s := _skill("e")
	var victim := arena.nearest_monster(aim_point, float(s.get("pick_radius", 2.5)))
	if victim == null:
		victim = target if target != null and is_instance_valid(target) and target.alive else arena.nearest_monster(position, float(s.get("range", 6.0)))
	if victim == null:
		skill_failed.emit("e", "ไม่มีเป้าหมาย")
		return false
	if flat_distance_to(victim.position) > float(s.get("range", 6.0)) + victim.radius:
		skill_failed.emit("e", "ไกลเกินไป")
		return false
	var behind := flat_direction_to(victim.position)
	if behind == Vector3.ZERO:
		behind = forward()
	arena.fx.puff(position, SHADOW_COLOR)
	position = arena.clamp_point(victim.position + behind * (victim.radius + radius + 0.15), radius)
	face(flat_direction_to(victim.position))
	visual.attack(0.25)
	arena.fx.puff(position, SHADOW_COLOR)
	arena.fx.slash(position, rotation.y, attack_range + 0.6, CRIT_COLOR)
	var spent := combo_points
	combo_points = 0
	var mul := Combat.finisher_mul(float(s.get("mul", 2.0)), spent, float(s.get("cp_per", 0.2)))
	deal(victim, mul, true, Feedback.Tier.LARGE if spent >= 3 else Feedback.Tier.MEDIUM)
	_swing_left = 0.0
	_attack_cd = attack_interval * 0.5
	if victim.alive:
		order = Order.ATTACK
		target = victim
	return true


## R: knives rain on everything around the hero; the last one hits hardest. The hero can keep moving.
func _cast_knife_storm() -> bool:
	var s := _skill("r")
	_ult_left = float(s.get("duration", 2.4))
	_ult_knives_left = int(s.get("knives", 12))
	_ult_next = 0.0
	visual.set_spinning(true)
	arena.fx.vortex(self, float(s.get("radius", 6.0)), _ult_left, KNIFE_COLOR)
	ult_changed.emit(true)
	return true


func _tick_knife_storm(dt: float) -> void:
	var s := _skill("r")
	var total := int(s.get("knives", 12))
	var interval := float(s.get("duration", 2.4)) / float(maxi(total, 1))
	_ult_left -= dt
	_ult_next -= dt
	while _ult_next <= 0.0 and _ult_knives_left > 0:
		_ult_next += interval
		_ult_knives_left -= 1
		var last := _ult_knives_left == 0
		var victim := arena.random_monster(position, float(s.get("radius", 6.0)))
		if victim == null:
			continue
		var sky := victim.position + Vector3(arena.rng.randf_range(-2.0, 2.0), 9.0, arena.rng.randf_range(-1.0, 3.0))
		_throw_seeking_knife(victim, sky, float(s.get("last_mul" if last else "mul", 0.5)),
			Feedback.Tier.LARGE if last else Feedback.Tier.SMALL, 30.0)
	if _ult_left <= 0.0 and _ult_knives_left <= 0:
		_ult_left = 0.0
		visual.set_spinning(false)
		ult_changed.emit(false)
