class_name Dasher
extends Monster
## Wolf AI: keep a middle distance and circle, then crouch (line marker) and dash straight through.
## Sidestep the line to dodge.

enum State { APPROACH, WINDUP, DASH, RECOVER }

var _state := State.APPROACH
var _cooldown := 0.0
var _dash_dir := Vector3.ZERO
var _dash_left := 0.0
var _dash_hit := false
var _strafe := 1.0
var _cfg: Dictionary = {}


func setup() -> void:
	_cfg = GameData.cfg("ai", "dasher")
	_cooldown = arena.rng.randf_range(0.8, 1.6)
	_strafe = 1.0 if arena.rng.randf() < 0.5 else -1.0


func _make_visual() -> MonsterVisual:
	return WolfVisual.new(radius)


func _think(dt: float) -> void:
	var h := _hero()
	match _state:
		State.APPROACH:
			visual.squash = 0.0
			if h == null:
				visual.locomotion = 0.0
				return
			_cooldown -= dt
			var dist := flat_distance_to(h.position)
			var to_hero := flat_direction_to(h.position)
			var band_min := float(_cfg.get("band_min", 3.5))
			var band_max := float(_cfg.get("band_max", 6.5))
			var move := to_hero.rotated(Vector3.UP, PI * 0.5) * _strafe * 0.6
			if dist > band_max:
				move = to_hero
			elif dist < band_min:
				move = -to_hero + move * 0.5
			var before := position
			position = arena.clamp_point(position + move.normalized() * speed * dt, radius)
			if position.distance_to(before) < speed * dt * 0.3:
				_strafe = -_strafe # ran into a wall or a rock: circle the other way
			visual.locomotion = 1.0
			face(to_hero, dt, 10.0)
			if _cooldown <= 0.0 and dist <= band_max + 1.0:
				_dash_dir = to_hero
				face(to_hero)
				arena.fx.telegraph_line(position, _dash_dir, float(_cfg.get("dash_len", 7.5)),
					float(_cfg.get("dash_width", 0.9)) + radius, float(_cfg.get("windup", 0.6)), DANGER)
				_enter(State.WINDUP)
		State.WINDUP:
			visual.locomotion = 0.0
			visual.squash = -minf(_time_in_state / 0.25, 1.0)
			if _time_in_state >= float(_cfg.get("windup", 0.6)):
				_dash_left = float(_cfg.get("dash_len", 7.5))
				_dash_hit = false
				_enter(State.DASH)
		State.DASH:
			visual.locomotion = 1.0
			visual.squash = 0.4
			var step := minf(float(_cfg.get("dash_speed", 15.0)) * dt, _dash_left)
			var before := position
			position = arena.clamp_point(position + _dash_dir * step, radius)
			_dash_left -= step
			if not _dash_hit and h != null and h.flat_distance_to(position) <= float(_cfg.get("dash_width", 0.9)) * 0.5 + radius + h.radius:
				_dash_hit = true
				_hit_hero(dmg)
			if _dash_left <= 0.0 or position.distance_to(before) < step * 0.5:
				_enter(State.RECOVER)
		State.RECOVER:
			visual.locomotion = 0.0
			visual.squash = 0.0
			if _time_in_state >= float(_cfg.get("recover", 0.9)):
				_cooldown = float(_cfg.get("cooldown", 1.6))
				_strafe = 1.0 if arena.rng.randf() < 0.5 else -1.0
				_enter(State.APPROACH)


func _enter(state: State) -> void:
	_state = state
	_time_in_state = 0.0
