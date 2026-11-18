class_name MobaCamera
extends Node3D
## MOBA-style camera: fixed tilt looking down at a focus point on the ground.
## Locked = follows the hero; unlocked = pan with the mouse at the screen edges. Wheel zooms.
## Depth of field keeps the focus plane sharp and blurs the near and far ground (tilt-shift look).
## Lives on its own branch (not a child of the hero) and is updated after the hero moves.

const PITCH_DEG := 55.0
const FOV := 36.0
const DIST_MIN := 9.0
const DIST_MAX := 24.0
const DIST_DEFAULT := 14.0
const FOLLOW_RATE := 9.0
const ZOOM_RATE := 10.0
const ZOOM_STEP := 1.5
const EDGE_PAN_PX := 14.0
const EDGE_PAN_SPEED := 20.0
## Shake (trauma model): the offset is added after the follow, so they never fight.
const SHAKE_DECAY := 1.6
const SHAKE_MAX_OFFSET := 0.45
const SHAKE_MAX_ROLL := 0.035

var camera: Camera3D
var focus := Vector3.ZERO
var locked := true
var distance := DIST_DEFAULT
var trauma := 0.0
## Focus stays inside this half-size rectangle (x, z).
var bounds := Vector2(21.0, 11.5)

var _want_distance := DIST_DEFAULT
var _attributes: CameraAttributesPractical
var _shake_time := 0.0


func _init() -> void:
	camera = Camera3D.new()
	camera.fov = FOV
	camera.near = 0.5
	camera.far = 120.0
	_attributes = CameraAttributesPractical.new()
	_attributes.dof_blur_far_enabled = true
	_attributes.dof_blur_near_enabled = true
	_attributes.dof_blur_amount = 0.1
	camera.attributes = _attributes
	add_child(camera)


func _ready() -> void:
	camera.make_current()
	Feedback.shake_requested.connect(add_trauma)
	_place(0.0)


## Frame-rate independent smoothing: the same feel at 30 and 144 FPS.
static func smooth(current: Vector3, goal: Vector3, rate: float, dt: float) -> Vector3:
	return current.lerp(goal, 1.0 - exp(-rate * dt))


func add_trauma(amount: float) -> void:
	trauma = clampf(trauma + amount, 0.0, 1.0)


func zoom(steps: float) -> void:
	_want_distance = clampf(_want_distance + steps * ZOOM_STEP, DIST_MIN, DIST_MAX)


func snap_to(point: Vector3) -> void:
	focus = _clamp_focus(point)
	_place(0.0)


## Call once per frame, after the hero has moved.
func update(dt: float, hero_pos: Vector3, hold_center: bool) -> void:
	if hold_center:
		focus = _clamp_focus(hero_pos)
	elif locked:
		focus = smooth(focus, _clamp_focus(hero_pos), FOLLOW_RATE, _real(dt))
	else:
		focus = _clamp_focus(focus + _edge_pan() * EDGE_PAN_SPEED * _real(dt))
	distance = lerpf(distance, _want_distance, 1.0 - exp(-ZOOM_RATE * _real(dt)))
	_place(dt)


## Where a screen position hits the ground plane, or null when it points at the sky.
func ground_point(screen_pos: Vector2) -> Variant:
	var from := camera.project_ray_origin(screen_pos)
	var dir := camera.project_ray_normal(screen_pos)
	return Plane(Vector3.UP, 0.0).intersects_ray(from, dir)


func _place(dt: float) -> void:
	var pitch := deg_to_rad(PITCH_DEG)
	var eye := focus + Vector3(0.0, sin(pitch), cos(pitch)) * distance
	camera.look_at_from_position(eye, focus, Vector3.UP)
	# Shake decays in real time so it keeps settling during hit-stop.
	if trauma > 0.0:
		var real_dt := _real(dt)
		trauma = maxf(trauma - SHAKE_DECAY * real_dt, 0.0)
		_shake_time += real_dt * 32.0
		var s := trauma * trauma
		camera.translate_object_local(Vector3(sin(_shake_time * 1.7), sin(_shake_time * 2.3), 0.0) * SHAKE_MAX_OFFSET * s)
		camera.rotate_object_local(Vector3.FORWARD, sin(_shake_time * 1.1) * SHAKE_MAX_ROLL * s)
	# Sharp band around the focus point, soft toward the bottom and top of the screen.
	_attributes.dof_blur_near_distance = distance - 3.5
	_attributes.dof_blur_near_transition = 4.0
	_attributes.dof_blur_far_distance = distance + 4.5
	_attributes.dof_blur_far_transition = 9.0


func _clamp_focus(point: Vector3) -> Vector3:
	return Vector3(clampf(point.x, -bounds.x, bounds.x), 0.0, clampf(point.z, -bounds.y, bounds.y))


func _real(dt: float) -> float:
	return dt / maxf(Engine.time_scale, 0.0001)


func _edge_pan() -> Vector3:
	var vp := get_viewport()
	if vp == null or not get_window().has_focus():
		return Vector3.ZERO
	var size := vp.get_visible_rect().size
	var mouse := vp.get_mouse_position()
	if mouse.x < 0.0 or mouse.y < 0.0 or mouse.x > size.x or mouse.y > size.y:
		return Vector3.ZERO
	var pan := Vector3.ZERO
	if mouse.x < EDGE_PAN_PX:
		pan.x -= 1.0
	elif mouse.x > size.x - EDGE_PAN_PX:
		pan.x += 1.0
	if mouse.y < EDGE_PAN_PX:
		pan.z -= 1.0
	elif mouse.y > size.y - EDGE_PAN_PX:
		pan.z += 1.0
	return pan
