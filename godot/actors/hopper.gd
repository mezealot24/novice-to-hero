class_name Hopper
extends Monster
## Jellop AI: hop toward the hero, then squash down (wind-up + ground marker) and pounce on the spot
## where the hero stood. Walk out of the circle to dodge.

enum State { IDLE, HOP, WINDUP, POUNCE, RECOVER }

var _state := State.IDLE
var _wait := 0.0
var _from := Vector3.ZERO
var _to := Vector3.ZERO
var _cfg: Dictionary = {}


func setup() -> void:
	_cfg = GameData.cfg("ai", "hopper")
	# Staggered first move: a room does not jump at the hero in one frame.
	_wait = arena.rng.randf_range(0.5, 1.3)
	var h := _hero()
	if h != null:
		face(flat_direction_to(h.position))


func _think(dt: float) -> void:
	var h := _hero()
	match _state:
		State.IDLE:
			visual.air = 0.0
			visual.squash = 0.0
			_wait -= dt
			if _wait <= 0.0 and h != null:
				_decide(h)
		State.HOP:
			if _arc(dt, float(_cfg.get("hop_time", 0.42)), float(_cfg.get("hop_height", 0.7))):
				_enter(State.IDLE)
				_wait = _roll_idle() * 0.6
		State.WINDUP:
			visual.squash = -minf(_time_in_state / 0.2, 1.0)
			if _time_in_state >= float(_cfg.get("windup", 0.55)):
				_from = position
				_enter(State.POUNCE)
		State.POUNCE:
			if _arc(dt, float(_cfg.get("pounce_time", 0.3)), float(_cfg.get("hop_height", 0.7)) * 1.5):
				if h != null and h.flat_distance_to(position) <= _hit_reach():
					_hit_hero(dmg)
				arena.fx.shockwave(position, _hit_reach(), DANGER)
				_enter(State.RECOVER)
		State.RECOVER:
			visual.squash = -0.5 * maxf(1.0 - _time_in_state / 0.25, 0.0)
			if _time_in_state >= float(_cfg.get("recover", 0.7)):
				_enter(State.IDLE)
				_wait = _roll_idle() * 0.4


func _decide(h: Hero) -> void:
	var dist := flat_distance_to(h.position)
	var dir := flat_direction_to(h.position)
	face(dir)
	if dist <= float(_cfg.get("pounce_range", 2.6)) + radius:
		_to = arena.clamp_point(h.position, radius)
		arena.fx.telegraph_circle(_to, _hit_reach(), float(_cfg.get("windup", 0.55)) + float(_cfg.get("pounce_time", 0.3)), DANGER)
		_enter(State.WINDUP)
		return
	# Hops wander a little so a pack spreads out instead of queueing in a line.
	dir = dir.rotated(Vector3.UP, arena.rng.randf_range(-0.45, 0.45))
	var length := minf(float(_cfg.get("hop_len", 1.5)), maxf(dist - 1.2, 0.4))
	_from = position
	_to = arena.clamp_point(position + dir * length, radius)
	_enter(State.HOP)


func _hit_reach() -> float:
	return radius + float(_cfg.get("hit_pad", 0.55))


## Moves along a jump arc from _from to _to. Returns true on landing.
func _arc(_dt: float, duration: float, height: float) -> bool:
	var t := clampf(_time_in_state / duration, 0.0, 1.0)
	position = _from.lerp(_to, t)
	visual.air = sin(t * PI) * height
	visual.squash = cos(t * PI) * 0.7 # stretch on take-off, flatten toward landing
	if t >= 1.0:
		visual.air = 0.0
		visual.squash = -0.8
		return true
	return false


func _enter(state: State) -> void:
	_state = state
	_time_in_state = 0.0
