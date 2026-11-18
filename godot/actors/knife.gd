class_name Knife
extends Node3D
## A thrown knife. Straight knives hit the first monster on their line; seeking knives fly to one
## monster and re-target if it dies first. Damage is applied by the on_hit callback on contact.

const STEEL := Color(0.9, 0.95, 1.0)

var arena: Arena
var done := false

var _seeking := false
var _dir := Vector3.FORWARD
var _speed := 20.0
var _range_left := 8.0
var _hit_radius := 0.4
var _target: Monster
var _on_hit: Callable
var _age := 0.0


static func straight(from: Vector3, dir: Vector3, speed: float, max_range: float, hit_radius: float, on_hit: Callable) -> Knife:
	var k := Knife.new()
	k.position = from
	k._dir = dir.normalized()
	k._speed = speed
	k._range_left = max_range
	k._hit_radius = hit_radius
	k._on_hit = on_hit
	return k


static func seeking(from: Vector3, target: Monster, speed: float, on_hit: Callable) -> Knife:
	var k := Knife.new()
	k.position = from
	k._seeking = true
	k._target = target
	k._speed = speed
	k._on_hit = on_hit
	return k


func _init() -> void:
	# Blade points along +Z; a small glow makes it readable at game distance and feeds the bloom.
	var blade := Toon.part(self, Toon.cylinder(0.0, 0.07, 0.55, 4), Toon.material(STEEL, 0.014),
		Vector3.ZERO, Vector3(1.0, 1.0, 0.35), Vector3(90.0, 0.0, 0.0))
	blade.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var glow := MeshInstance3D.new()
	var quad := PlaneMesh.new()
	quad.size = Vector2(0.5, 1.3)
	glow.mesh = quad
	glow.material_override = Fx.glow_material(Color(0.7, 0.9, 1.0), 1.6)
	glow.position = Vector3(0.0, 0.0, -0.3)
	glow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(glow)


func tick(dt: float) -> void:
	if done:
		return
	_age += dt
	if _seeking:
		_tick_seeking(dt)
	else:
		_tick_straight(dt)


func _tick_straight(dt: float) -> void:
	var step := _speed * dt
	position += _dir * step
	_range_left -= step
	_aim(_dir)
	for m: Monster in arena.monsters:
		if m.alive and m.flat_distance_to(position) <= _hit_radius + m.radius:
			_on_hit.call(m)
			done = true
			return
	if _range_left <= 0.0 or absf(position.x) > arena.half.x + 1.0 or absf(position.z) > arena.half.y + 1.0:
		done = true


func _tick_seeking(dt: float) -> void:
	if _target == null or not is_instance_valid(_target) or not _target.alive:
		_target = arena.nearest_monster(position, 6.0)
		if _target == null:
			done = true
			return
	var goal := _target.position + Vector3(0.0, _target.radius, 0.0)
	var to := goal - position
	var step := _speed * dt
	if to.length() <= step + _target.radius * 0.5:
		_on_hit.call(_target)
		done = true
		return
	_aim(to.normalized())
	position += to.normalized() * step
	if _age > 4.0:
		done = true


func _aim(dir: Vector3) -> void:
	if dir.length_squared() > 0.0001 and absf(dir.y) < 0.999:
		basis = Basis.looking_at(-dir, Vector3.UP)
	elif dir.length_squared() > 0.0001:
		basis = Basis.looking_at(-dir, Vector3.FORWARD)
