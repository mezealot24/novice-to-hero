extends Node
## Game feel in one place: every impact goes through impact(tier, pos) so the game stays proportional.
## Hit-stop scales time; shake only moves the camera (it never touches the simulation).

enum Tier { SMALL, MEDIUM, LARGE }

## Camera listens and adds trauma.
signal shake_requested(trauma: float)
## Fx layer listens and spawns sparks.
signal sparks_requested(pos: Vector3, count: int, color: Color)

const TRAUMA := [0.12, 0.34, 0.8]
const HIT_STOP := [0.0, 0.045, 0.11]
const SPARKS := [3, 8, 22]
const HIT_STOP_SLOW := 0.05

## Player setting 0..1 (accessibility): scales shake, 0 turns it off.
var shake_strength := 1.0
var hit_stop_enabled := true
var _hit_stop_id := 0


func impact(tier: Tier, pos: Vector3, color: Color = Color(1.0, 0.95, 0.7)) -> void:
	shake_requested.emit(float(TRAUMA[tier]) * shake_strength)
	sparks_requested.emit(pos, int(SPARKS[tier]), color)
	hit_stop(float(HIT_STOP[tier]))


## Only the newest call restores time, so overlapping hits cannot end a freeze early.
func hit_stop(duration: float) -> void:
	if duration <= 0.0 or not hit_stop_enabled or not is_inside_tree():
		return
	_hit_stop_id += 1
	var my_id := _hit_stop_id
	Engine.time_scale = HIT_STOP_SLOW
	# ignore_time_scale = true: the timer still fires while the game is slowed.
	await get_tree().create_timer(duration, true, false, true).timeout
	if my_id == _hit_stop_id:
		Engine.time_scale = 1.0


func reset() -> void:
	_hit_stop_id += 1
	Engine.time_scale = 1.0
