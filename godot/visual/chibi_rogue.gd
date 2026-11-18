class_name ChibiRogue
extends HeroVisual
## Placeholder Rogue built from primitives: about 2.5 heads tall, big head, hood, scarf, two daggers.
## Original design. Animated in code so no art files are needed until real models arrive.

const SKIN := Color(1.0, 0.82, 0.68)
const HOOD := Color(0.24, 0.2, 0.36)
const CLOTH := Color(0.3, 0.27, 0.45)
const SCARF := Color(0.86, 0.22, 0.26)
const HAIR := Color(0.95, 0.9, 0.82)
const BOOT := Color(0.2, 0.16, 0.2)
const STEEL := Color(0.86, 0.9, 0.96)
const EYE := Color(0.13, 0.1, 0.16)

var _body: Node3D
var _torso: Node3D
var _head: Node3D
var _arm_l: Node3D
var _arm_r: Node3D
var _leg_l: Node3D
var _leg_r: Node3D
var _scarf_tail: Node3D

var _time := 0.0
var _stride := 0.0
var _attack_left := 0.0
var _attack_dur := 0.3
var _attack_side := 1.0
var _cast_left := 0.0
var _dash_left := 0.0
var _spinning := false
var _spin := 0.0
var _dead := false
var _fall := 0.0


func _init() -> void:
	_body = Node3D.new()
	add_child(_body)

	_leg_l = _limb(_body, Vector3(-0.11, 0.3, 0.0), 0.085, 0.3, BOOT)
	_leg_r = _limb(_body, Vector3(0.11, 0.3, 0.0), 0.085, 0.3, BOOT)

	_torso = Node3D.new()
	_torso.position = Vector3(0.0, 0.3, 0.0)
	_body.add_child(_torso)
	_mesh(_torso, Toon.capsule(0.19, 0.42), CLOTH, Vector3(0.0, 0.2, 0.0))
	# Short cloak flaring at the hips.
	_mesh(_torso, Toon.cylinder(0.17, 0.27, 0.22), HOOD, Vector3(0.0, 0.1, -0.02))
	# Scarf ring and a tail that trails behind.
	_mesh(_torso, Toon.sphere(0.2), SCARF, Vector3(0.0, 0.41, 0.01), Vector3(1.05, 0.42, 1.05))
	_scarf_tail = Node3D.new()
	_scarf_tail.position = Vector3(0.08, 0.4, -0.16)
	_torso.add_child(_scarf_tail)
	_mesh(_scarf_tail, Toon.capsule(0.05, 0.36), SCARF, Vector3(0.0, -0.05, -0.15), Vector3.ONE, Vector3(65.0, 0.0, 0.0))

	_arm_l = _limb(_torso, Vector3(-0.24, 0.36, 0.0), 0.065, 0.28, CLOTH)
	_arm_r = _limb(_torso, Vector3(0.24, 0.36, 0.0), 0.065, 0.28, CLOTH)
	_dagger(_arm_l)
	_dagger(_arm_r)

	_head = Node3D.new()
	_head.position = Vector3(0.0, 0.78, 0.0)
	_torso.add_child(_head)
	_mesh(_head, Toon.sphere(0.3), SKIN)
	# Hood: a shell around the back and top of the head, with a point.
	_mesh(_head, Toon.sphere(0.33), HOOD, Vector3(0.0, 0.04, -0.07), Vector3(1.0, 1.0, 0.94))
	_mesh(_head, Toon.cylinder(0.0, 0.13, 0.26), HOOD, Vector3(0.0, 0.3, -0.2), Vector3.ONE, Vector3(-55.0, 0.0, 0.0))
	# Fringe peeking out of the hood.
	_mesh(_head, Toon.sphere(0.12), HAIR, Vector3(-0.1, 0.17, 0.2), Vector3(1.2, 0.6, 0.7), Vector3.ZERO, 0.012)
	_mesh(_head, Toon.sphere(0.12), HAIR, Vector3(0.11, 0.18, 0.19), Vector3(1.1, 0.55, 0.7), Vector3.ZERO, 0.012)
	for side: float in [-1.0, 1.0]:
		_mesh(_head, Toon.sphere(0.05), EYE, Vector3(0.11 * side, 0.0, 0.265), Vector3(0.8, 1.25, 0.4), Vector3.ZERO, 0.0)
		_mesh(_head, Toon.sphere(0.016), Color.WHITE, Vector3(0.12 * side + 0.012, 0.025, 0.287), Vector3.ONE, Vector3.ZERO, 0.0)
		_mesh(_head, Toon.sphere(0.035), Color(1.0, 0.6, 0.6), Vector3(0.19 * side, -0.08, 0.215), Vector3(1.2, 0.6, 0.4), Vector3.ZERO, 0.0)


func tick(dt: float) -> void:
	_time += dt
	if _dead:
		_fall = minf(_fall + dt * 4.0, 1.0)
		_body.rotation.x = -ease(_fall, 0.4) * PI * 0.5
		_body.position.y = lerpf(0.0, 0.18, _fall)
		return
	_stride += dt * (4.0 + 9.0 * locomotion)
	var run := locomotion
	var swing := sin(_stride) * run

	_body.position.y = absf(cos(_stride)) * 0.05 * run + sin(_time * 2.4) * 0.012 * (1.0 - run)
	_body.rotation.x = 0.2 * run
	_leg_l.rotation.x = swing * 0.95
	_leg_r.rotation.x = -swing * 0.95
	var arm_l := -swing * 0.8
	var arm_r := swing * 0.8
	var twist := 0.0
	var arm_spread := 0.12

	if _attack_left > 0.0:
		_attack_left -= dt
		var t := 1.0 - clampf(_attack_left / _attack_dur, 0.0, 1.0)
		# Anticipation (raise) for the first 30 %, then a fast slash with a little follow-through.
		var slash := -2.3 + ease(clampf((t - 0.3) / 0.35, 0.0, 1.0), 0.35) * 3.1 if t > 0.3 else -2.3 * ease(t / 0.3, 0.5)
		if _attack_side > 0.0:
			arm_r = slash
		else:
			arm_l = slash
		twist = -_attack_side * sin(t * PI) * 0.5
	if _cast_left > 0.0:
		_cast_left -= dt
		var c := sin(clampf(_cast_left / 0.28, 0.0, 1.0) * PI)
		arm_l = lerpf(arm_l, -1.5, c)
		arm_r = lerpf(arm_r, -1.5, c)
	if _dash_left > 0.0:
		_dash_left -= dt
		_body.rotation.x = 0.7
		arm_l = 1.2
		arm_r = 1.2
	if _spinning:
		_spin += dt * 22.0
		arm_l = -1.5
		arm_r = -1.5
		arm_spread = 1.4
	else:
		_spin = lerp_angle(_spin, 0.0, 1.0 - exp(-14.0 * dt))

	_arm_l.rotation = Vector3(arm_l, 0.0, -arm_spread)
	_arm_r.rotation = Vector3(arm_r, 0.0, arm_spread)
	_torso.rotation.y = twist
	_body.rotation.y = _spin
	_head.rotation.x = -0.1 * run + sin(_time * 1.7) * 0.03
	_scarf_tail.rotation.x = -0.7 * run + sin(_time * 5.0) * (0.08 + 0.2 * run)


func attack(duration: float) -> void:
	_attack_dur = maxf(duration, 0.05)
	_attack_left = _attack_dur
	_attack_side = -_attack_side


func cast() -> void:
	_cast_left = 0.28


func dash(duration: float) -> void:
	_dash_left = duration


func set_spinning(active: bool) -> void:
	_spinning = active


func die() -> void:
	_dead = true
	_fall = 0.0


func revive() -> void:
	_dead = false
	_body.rotation = Vector3.ZERO
	_body.position = Vector3.ZERO


func _mesh(parent: Node3D, mesh: Mesh, color: Color, pos: Vector3 = Vector3.ZERO, scl: Vector3 = Vector3.ONE,
		rot_deg: Vector3 = Vector3.ZERO, outline_width: float = Toon.OUTLINE_WIDTH) -> MeshInstance3D:
	var mat := Toon.material(color, outline_width)
	flash_materials.append(mat)
	return Toon.part(parent, mesh, mat, pos, scl, rot_deg)


## A limb hangs from its pivot, so rotating the pivot swings it.
func _limb(parent: Node3D, pivot_pos: Vector3, radius: float, length: float, color: Color) -> Node3D:
	var pivot := Node3D.new()
	pivot.position = pivot_pos
	parent.add_child(pivot)
	_mesh(pivot, Toon.capsule(radius, length), color, Vector3(0.0, -length * 0.5 + radius * 0.5, 0.0))
	return pivot


func _dagger(arm: Node3D) -> void:
	var hand := Vector3(0.0, -0.27, 0.0)
	_mesh(arm, Toon.sphere(0.07), SKIN, hand)
	_mesh(arm, Toon.cylinder(0.03, 0.03, 0.12, 8), BOOT, hand + Vector3(0.0, 0.0, 0.03), Vector3.ONE, Vector3(90.0, 0.0, 0.0), 0.012)
	_mesh(arm, Toon.cylinder(0.0, 0.045, 0.3, 4), STEEL, hand + Vector3(0.0, 0.0, 0.24), Vector3(1.0, 1.0, 0.35), Vector3(90.0, 0.0, 0.0), 0.012)
