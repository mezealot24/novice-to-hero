class_name BossKing
extends Monster
## D1 boss, King Jellop. Hops after the hero and uses three telegraphed moves:
##  - Body slam: leaps onto the hero's position (circle marker).
##  - Charge burst: swells up, then bursts around itself (big circle, magic damage): run out.
##  - Summons mini jellops. At 50 % HP: jelly shield + a bigger wave + shorter pauses.

enum State { IDLE, HOP, SLAM_WINDUP, SLAM_LEAP, CHARGE, RECOVER }

const MAGIC := Color(0.55, 0.5, 1.0)

var _state := State.IDLE
var _wait := 1.2
var _from := Vector3.ZERO
var _to := Vector3.ZERO
var _charge_cd := 0.0
var _summon_cd := 0.0
var _enraged := false
var _matk := 1
var _minion_id := ""
var _cfg: Dictionary = {}


func setup() -> void:
	is_boss = true
	_cfg = GameData.cfg("ai", "boss")
	_matk = int(def.get("matk", dmg))
	_minion_id = str(def.get("summon", ""))
	_charge_cd = float(_cfg.get("charge_every", 9.0)) * 0.6
	_summon_cd = float(_cfg.get("summon_every", 12.0)) * 0.5


func _make_visual() -> MonsterVisual:
	return JellyVisual.new(radius, true)


func take_damage(amount: int, is_crit: bool, from: Vector3) -> int:
	var taken := super(amount, is_crit, from)
	if alive and not _enraged and hp * 2 <= max_hp:
		_enrage()
	return taken


func _think(dt: float) -> void:
	var h := _hero()
	_charge_cd -= dt
	_summon_cd -= dt
	match _state:
		State.IDLE:
			visual.air = 0.0
			visual.squash = 0.0
			_wait -= dt
			if _wait <= 0.0 and h != null:
				_decide(h)
		State.HOP:
			if _arc(float(_cfg.get("hop_time", 0.6)), float(_cfg.get("hop_height", 1.4))):
				Feedback.impact(Feedback.Tier.SMALL, position, Color(0.8, 0.9, 1.0))
				_rest(0.5)
		State.SLAM_WINDUP:
			visual.squash = -minf(_time_in_state / 0.3, 1.0)
			if _time_in_state >= float(_cfg.get("slam_windup", 1.0)):
				_from = position
				_enter(State.SLAM_LEAP)
		State.SLAM_LEAP:
			if _arc(float(_cfg.get("slam_time", 0.5)), float(_cfg.get("hop_height", 1.4)) * 2.2):
				var reach := float(_cfg.get("slam_radius", 3.0))
				if h != null and h.flat_distance_to(position) <= reach + h.radius:
					_hit_hero(roundi(float(dmg) * float(_cfg.get("slam_pow", 1.6))))
				arena.fx.shockwave(position, reach, DANGER)
				Feedback.impact(Feedback.Tier.LARGE, position, Color(0.8, 0.95, 1.0))
				_enter(State.RECOVER)
		State.CHARGE:
			# Swell and shake while charging.
			visual.squash = 0.35 + sin(_time_in_state * 30.0) * 0.12
			if _time_in_state >= float(_cfg.get("charge_windup", 1.7)):
				var reach := float(_cfg.get("charge_radius", 6.0))
				if h != null and h.flat_distance_to(position) <= reach + h.radius:
					_hit_hero(_matk)
				arena.fx.shockwave(position, reach, MAGIC)
				Feedback.impact(Feedback.Tier.LARGE, position + Vector3(0.0, radius, 0.0), MAGIC)
				_enter(State.RECOVER)
		State.RECOVER:
			visual.squash = -0.5 * maxf(1.0 - _time_in_state / 0.3, 0.0)
			if _time_in_state >= float(_cfg.get("recover", 0.8)):
				_rest(1.0)


func _decide(h: Hero) -> void:
	var dist := flat_distance_to(h.position)
	var dir := flat_direction_to(h.position)
	face(dir)
	if _summon_cd <= 0.0:
		_summon_cd = float(_cfg.get("summon_every", 12.0))
		_summon(int(_cfg.get("summon_count", 2)))
	if _charge_cd <= 0.0:
		_charge_cd = float(_cfg.get("charge_every", 9.0))
		arena.announced.emit(str(def.get("slamName", "ชาร์จพลัง!")))
		arena.fx.telegraph_circle(position, float(_cfg.get("charge_radius", 6.0)), float(_cfg.get("charge_windup", 1.7)), MAGIC)
		_enter(State.CHARGE)
		return
	if dist <= float(_cfg.get("slam_range", 5.0)) + radius:
		_to = arena.clamp_point(h.position, radius)
		arena.fx.telegraph_circle(_to, float(_cfg.get("slam_radius", 3.0)),
			float(_cfg.get("slam_windup", 1.0)) + float(_cfg.get("slam_time", 0.5)), DANGER)
		_enter(State.SLAM_WINDUP)
		return
	_from = position
	_to = arena.clamp_point(position + dir * minf(float(_cfg.get("hop_len", 2.4)), dist - 2.0), radius)
	_enter(State.HOP)


func _enrage() -> void:
	_enraged = true
	var phases: Array = def.get("phases", [])
	var phase: Dictionary = phases[0] if not phases.is_empty() else {}
	shield = roundi(float(max_hp) * float(phase.get("shield", 0.1)))
	arena.announced.emit(str(phase.get("name", "โกรธแล้ว!")))
	flash(MAGIC, 0.4)
	_summon(int(_cfg.get("phase_summons", 3)))


func _summon(count: int) -> void:
	if _minion_id.is_empty():
		return
	var alive_now := arena.alive_monsters().size() - 1
	var room := int(_cfg.get("summon_cap", 4)) - alive_now
	for i: int in mini(count, room):
		var angle := arena.rng.randf() * TAU
		var pos := position + Vector3(cos(angle), 0.0, sin(angle)) * (radius + 1.2)
		arena.spawn_monster(_minion_id, pos)
		arena.fx.puff(pos, Color(0.5, 0.9, 0.6))


func _rest(scale_idle: float) -> void:
	_enter(State.IDLE)
	_wait = (float(_cfg.get("enrage_idle", 0.6)) if _enraged else _roll_idle()) * scale_idle


func _arc(duration: float, height: float) -> bool:
	var t := clampf(_time_in_state / duration, 0.0, 1.0)
	position = _from.lerp(_to, t)
	visual.air = sin(t * PI) * height
	visual.squash = cos(t * PI) * 0.6
	if t >= 1.0:
		visual.air = 0.0
		visual.squash = -0.9
		return true
	return false


func _enter(state: State) -> void:
	_state = state
	_time_in_state = 0.0
