## LoL-style view: 3D world, tilted top-down camera, right-click to move.
## Camera: Y = lock/unlock, Space = snap to hero (hold), mouse at screen edge = pan (unlocked), wheel = zoom.
## Placeholder shapes only (capsule hero, sphere monsters); real models / combat come in M1.
extends Node3D

const Toon := preload("res://core/toon.gd")
const Ambience := preload("res://core/ambience.gd")
## Dirt path across the arena (x from, x to, z centre, half width): grass is kept off it.
const PATH := Vector4(-20.0, 20.0, 3.0, 1.6)
const ASSETS_DIR := "res://assets"
const HERO_HEIGHT := 1.7

const ARENA_SIZE := Vector2(40.0, 24.0) # metres (x, z)
const HERO_SPEED := 4.0 # m/s
const HERO_RADIUS := 0.45
## Web data uses px/s in a side-scroll scene; this turns it into m/s on the ground plane.
const MON_SPEED_SCALE := 0.006
const MON_RADIUS_SCALE := 1.0 / 30.0
const CAM_PITCH_DEG := 56.0 # LoL looks down at roughly this angle
const CAM_DIST_MIN := 10.0
const CAM_DIST_MAX := 24.0
const EDGE_PAN_PX := 18.0
const EDGE_PAN_SPEED := 18.0 # m/s

var cam: Camera3D
var cam_attr: CameraAttributesPractical
var hero: Node3D
var click_marker: MeshInstance3D
var info: Label
var mons: Array[Dictionary] = []

var move_target := Vector3.ZERO
var has_target := false
var cam_locked := true
var cam_focus := Vector3.ZERO
var cam_dist := 16.0
var marker_t := 0.0
## Set when a real model (e.g. KayKit Rogue) was found in res://assets.
var hero_anim: AnimationPlayer
var anim_idle := ""
var anim_walk := ""
var hero_model_name := "placeholder"


func _ready() -> void:
	_build_world()
	hero = _build_hero()
	add_child(hero)
	cam = Camera3D.new()
	cam.fov = 40.0
	cam_attr = Ambience.camera_attributes()
	cam.attributes = cam_attr
	add_child(cam)
	cam.make_current()
	cam_focus = hero.position
	_spawn_room("d1", 0)
	_build_hud()


func _unhandled_input(event: InputEvent) -> void:
	var mb := event as InputEventMouseButton
	if mb != null and mb.pressed:
		match mb.button_index:
			MOUSE_BUTTON_RIGHT:
				_order_move(mb.position, true)
			MOUSE_BUTTON_WHEEL_UP:
				cam_dist = maxf(CAM_DIST_MIN, cam_dist - 1.0)
			MOUSE_BUTTON_WHEEL_DOWN:
				cam_dist = minf(CAM_DIST_MAX, cam_dist + 1.0)
		return
	var key := event as InputEventKey
	if key != null and key.pressed and not key.echo and key.physical_keycode == KEY_Y:
		cam_locked = not cam_locked
		_update_hud()


func _process(delta: float) -> void:
	# Holding right click keeps steering, like LoL.
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		_order_move(get_viewport().get_mouse_position(), false)
	var before := hero.position
	_move_hero(delta)
	_play_move_anim(hero.position.distance_to(before) > 0.0001)
	_move_monsters(delta)
	_update_camera(delta)
	_update_marker(delta)


func _order_move(screen_pos: Vector2, show_marker: bool) -> void:
	var from := cam.project_ray_origin(screen_pos)
	var dir := cam.project_ray_normal(screen_pos)
	var hit: Variant = Plane(Vector3.UP, 0.0).intersects_ray(from, dir)
	if hit == null:
		return
	var p: Vector3 = hit
	var half := ARENA_SIZE * 0.5
	move_target = Vector3(clampf(p.x, -half.x, half.x), 0.0, clampf(p.z, -half.y, half.y))
	has_target = true
	if show_marker:
		click_marker.position = move_target + Vector3(0, 0.02, 0)
		marker_t = 0.4


func _move_hero(delta: float) -> void:
	# WASD still works as a fallback (screen-relative).
	var key_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if key_dir != Vector2.ZERO:
		has_target = false
		var step := Vector3(key_dir.x, 0.0, key_dir.y) * HERO_SPEED * delta
		_face(hero, hero.position + step)
		hero.position += step
		return
	if not has_target:
		return
	var flat := Vector3(hero.position.x, 0.0, hero.position.z)
	if flat.distance_to(move_target) < 0.05:
		has_target = false
		return
	_face(hero, move_target)
	var next := flat.move_toward(move_target, HERO_SPEED * delta)
	hero.position = Vector3(next.x, hero.position.y, next.z)


func _move_monsters(delta: float) -> void:
	for m in mons:
		var body: Node3D = m["node"]
		var to_hero := hero.position - body.position
		to_hero.y = 0.0
		if to_hero.length() > HERO_RADIUS + float(m["r"]) + 0.1:
			_face(body, hero.position)
			body.position += to_hero.normalized() * float(m["speed"]) * delta


func _update_camera(delta: float) -> void:
	if cam_locked or Input.is_physical_key_pressed(KEY_SPACE):
		cam_focus = Vector3(hero.position.x, 0.0, hero.position.z)
	else:
		var vp := get_viewport().get_visible_rect().size
		var mp := get_viewport().get_mouse_position()
		var pan := Vector3.ZERO
		if mp.x < EDGE_PAN_PX: pan.x -= 1.0
		elif mp.x > vp.x - EDGE_PAN_PX: pan.x += 1.0
		if mp.y < EDGE_PAN_PX: pan.z -= 1.0
		elif mp.y > vp.y - EDGE_PAN_PX: pan.z += 1.0
		cam_focus += pan * EDGE_PAN_SPEED * delta
	var pitch := deg_to_rad(CAM_PITCH_DEG)
	cam.position = cam_focus + Vector3(0.0, sin(pitch) * cam_dist, cos(pitch) * cam_dist)
	cam.look_at(cam_focus, Vector3.UP)
	Ambience.focus_dof(cam_attr, cam_dist)


func _play_move_anim(moving: bool) -> void:
	if hero_anim == null:
		return
	var want := anim_walk if moving and anim_walk != "" else anim_idle
	if want != "" and hero_anim.current_animation != want:
		hero_anim.play(want, 0.15)


func _update_marker(delta: float) -> void:
	marker_t = maxf(0.0, marker_t - delta)
	click_marker.visible = marker_t > 0.0
	click_marker.scale = Vector3.ONE * (0.6 + marker_t)


## Turns `node` to look at `target` on the ground plane (skips when too close, look_at would fail).
func _face(node: Node3D, target: Vector3) -> void:
	var t := Vector3(target.x, node.position.y, target.z)
	if node.position.distance_to(t) > 0.01:
		node.look_at(t, Vector3.UP)


func _spawn_room(dungeon_id: String, room_index: int) -> void:
	var rooms: Array = GameData.dungeon(dungeon_id).get("rooms", [])
	if room_index >= rooms.size():
		return
	var room: Dictionary = rooms[room_index]
	var half := ARENA_SIZE * 0.5
	for pair: Array in room.get("spawn", []):
		var def: Dictionary = GameData.monster(pair[0])
		for i in int(pair[1]):
			var r := float(def.get("radius", 15)) * MON_RADIUS_SCALE
			var body := _blob(r, Color("7fd96b"))
			body.position = Vector3(randf_range(half.x * 0.3, half.x - 2.0), r * 0.8, randf_range(-half.y + 2.0, half.y - 2.0))
			add_child(body)
			mons.append({ "node": body, "r": r, "speed": float(def.get("moveSpeed", 200)) * MON_SPEED_SCALE })


func _build_world() -> void:
	add_child(Ambience.environment())
	add_child(Ambience.sun())

	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = ARENA_SIZE
	ground.mesh = plane
	ground.material_override = _mat(Color("5f9a45"), 0.0)
	add_child(ground)

	var path := MeshInstance3D.new()
	var strip := PlaneMesh.new()
	strip.size = Vector2(PATH.y - PATH.x, PATH.w * 2.0)
	path.mesh = strip
	path.material_override = _mat(Color("c98f5a"), 0.0)
	path.position = Vector3((PATH.x + PATH.y) * 0.5, 0.01, PATH.z)
	add_child(path)

	add_child(Ambience.grass(ARENA_SIZE - Vector2(1.0, 1.0), 6000, func(p: Vector3) -> bool: return absf(p.z - PATH.z) < PATH.w + 0.2))
	add_child(Ambience.dust(ARENA_SIZE))

	# Low walls so the arena edge reads clearly from the tilted camera.
	var half := ARENA_SIZE * 0.5
	for side in [Vector4(0, -half.y, ARENA_SIZE.x, 0.4), Vector4(0, half.y, ARENA_SIZE.x, 0.4), Vector4(-half.x, 0, 0.4, ARENA_SIZE.y), Vector4(half.x, 0, 0.4, ARENA_SIZE.y)]:
		var wall := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(side.z, 0.6, side.w)
		wall.mesh = box
		wall.material_override = _mat(Color("8a6a4a"), 0.0)
		wall.position = Vector3(side.x, 0.3, side.y)
		add_child(wall)

	click_marker = MeshInstance3D.new()
	var ring := TorusMesh.new()
	ring.inner_radius = 0.25
	ring.outer_radius = 0.35
	click_marker.mesh = ring
	click_marker.material_override = _mat(Color("6bffb0"), 0.0)
	click_marker.visible = false
	add_child(click_marker)


func _build_hero() -> Node3D:
	var root := Node3D.new()
	var path := Toon.find_model(ASSETS_DIR, "rogue")
	var model: Node3D = Toon.load_character(path, HERO_HEIGHT) if path != "" else null
	if model != null:
		root.add_child(model)
		Toon.apply(model, 0.02)
		hero_model_name = path.get_file()
		var aps := model.find_children("*", "AnimationPlayer", true, false)
		if not aps.is_empty():
			hero_anim = aps[0] as AnimationPlayer
			anim_idle = Toon.pick_anim(hero_anim, ["idle"])
			anim_walk = Toon.pick_anim(hero_anim, ["walking_a", "walk", "run"])
			for a in [anim_idle, anim_walk]:
				if a != "":
					hero_anim.get_animation(a).loop_mode = Animation.LOOP_LINEAR
		return root
	# Placeholder: capsule + "nose" so you can see which way the hero faces (look_at points -Z forward).
	var body := MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = HERO_RADIUS
	cap.height = 1.6
	body.mesh = cap
	body.material_override = _mat(Color("ffd36b"))
	body.position.y = 0.8
	root.add_child(body)
	var nose := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.2, 0.2, 0.4)
	nose.mesh = box
	nose.material_override = _mat(Color("c0392b"))
	nose.position = Vector3(0.0, 1.2, -0.45)
	root.add_child(nose)
	return root


## Slime-ish placeholder monster: squashed toon sphere with two eyes on its -Z (facing) side.
func _blob(r: float, color: Color) -> Node3D:
	var root := Node3D.new()
	var body := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	body.mesh = s
	body.material_override = _mat(color)
	body.scale = Vector3(1.0, 0.8, 1.0)
	root.add_child(body)
	for side in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		var e := SphereMesh.new()
		e.radius = r * 0.16
		e.height = r * 0.32
		eye.mesh = e
		eye.material_override = _mat(Color("1b1424"), 0.0)
		eye.position = Vector3(side * r * 0.35, r * 0.15, -r * 0.82)
		root.add_child(eye)
	return root


## Toon material with outline for placeholder shapes.
func _mat(color: Color, outline := 0.03) -> ShaderMaterial:
	return Toon.material(color, null, outline)


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	info = Label.new()
	info.position = Vector2(16, 12)
	layer.add_child(info)
	_update_hud()


func _update_hud() -> void:
	var d1: Dictionary = GameData.dungeon("d1")
	info.text = "%s · hero: %s · monsters %d\nคลิกขวา = เดิน · Y = ล็อกกล้อง (%s) · Space = กลับมาที่ฮีโร่ · ล้อเมาส์ = ซูม" % [
		d1.get("name", "?"), hero_model_name, mons.size(), "ล็อก" if cam_locked else "อิสระ"]
