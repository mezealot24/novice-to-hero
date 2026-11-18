extends Node3D
## Main scene: builds the meadow, arena, hero, camera and HUD, turns input into hero orders, and
## runs the dungeon flow (room -> clear -> portal -> next room -> boss -> win, or death).
##
## Optional arguments after `--`:  --seed=123  --room=3  --autoplay

enum Phase { FIGHT, CLEARED, TRAVEL, DEAD, WON }

const PORTAL_RADIUS := 1.3
const PICK_PAD := 0.7

var meadow: Meadow
var arena: Arena
var hero: Hero
var cam: MobaCamera
var hud: Hud
var run: RunState

var _phase := Phase.FIGHT
var _half := Vector2(21.0, 11.5)
var _portal: Node3D
var _bot: Bot
var _options: Dictionary[String, String] = {}


func _ready() -> void:
	_options = _parse_args()
	if _options.has("autoplay"):
		_bot = Bot.new()
	_start_run(int(_options.get("seed", str(randi() % 1000000))), int(_options.get("room", "1")) - 1)


func _start_run(run_seed: int, first_room: int = 0) -> void:
	for child: Node in get_children():
		child.queue_free()
	Feedback.reset()
	var arena_cfg := GameData.cfg("arena")
	_half = Vector2(float(arena_cfg.get("half_x", 21.0)), float(arena_cfg.get("half_z", 11.5)))
	run = RunState.new(run_seed, str(GameData.slice.get("dungeon", "d1")))
	run.room_index = clampi(first_room, 0, maxi(run.rooms().size() - 1, 0))

	meadow = Meadow.new()
	add_child(meadow)
	meadow.build(_half, run.scenery_seed())

	arena = Arena.new()
	arena.half = _half
	arena.obstacles = meadow.obstacles
	arena.rng.seed = run_seed
	add_child(arena)
	hero = Hero.new()
	arena.set_hero(hero)
	hero.died.connect(_on_hero_died)
	hero.ult_changed.connect(func(active: bool) -> void: meadow.set_dim(1.0 if active else 0.0))
	arena.monster_died.connect(_on_monster_died)

	cam = MobaCamera.new()
	cam.bounds = _half
	add_child(cam)
	hud = Hud.new()
	add_child(hud)
	hud.bind(hero, arena, cam.camera)

	_portal = _build_portal()
	add_child(_portal)
	_enter_room()


func _process(delta: float) -> void:
	if run == null:
		return
	var cursor: Variant = cam.ground_point(get_viewport().get_mouse_position())
	if cursor != null:
		hero.aim_point = cursor
	if _bot != null and _phase != Phase.TRAVEL:
		_bot.drive(hero, arena, _portal.position, _phase == Phase.CLEARED, delta)
	elif _phase != Phase.TRAVEL and (Input.is_action_pressed("cmd_move") or Input.is_action_pressed("cmd_select")):
		# Holding the button keeps steering, like a MOBA.
		_order_at_cursor(false)
	if _phase != Phase.TRAVEL:
		arena.step(delta)
	if _phase == Phase.FIGHT:
		run.elapsed += delta
		if arena.alive_monsters().is_empty():
			_room_cleared()
	elif _phase == Phase.CLEARED and hero.flat_distance_to(_portal.position) < PORTAL_RADIUS:
		_travel()
	cam.update(delta, hero.position, Input.is_action_pressed("camera_center"))
	meadow.track(hero.position, cam.focus)
	_portal.rotation.y += delta * 1.5


func _unhandled_input(event: InputEvent) -> void:
	if run == null:
		return
	if event.is_action_pressed("run_restart"):
		_start_run(randi() % 1000000)
		return
	if (_phase == Phase.DEAD or _phase == Phase.WON) and event.is_action_pressed("ui_continue"):
		_start_run(randi() % 1000000)
		return
	var mb := event as InputEventMouseButton
	if mb != null and mb.pressed:
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			cam.zoom(-1.0)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			cam.zoom(1.0)
	if event.is_action_pressed("camera_lock"):
		cam.locked = not cam.locked
		hud.toast("กล้อง: ล็อกตามตัว" if cam.locked else "กล้อง: อิสระ (เลื่อนเมาส์ชิดขอบจอ)")
	if _bot != null or _phase == Phase.TRAVEL:
		return
	if event.is_action_pressed("cmd_move") or event.is_action_pressed("cmd_select"):
		_order_at_cursor(true)
	elif event.is_action_pressed("cmd_stop"):
		hero.command_stop()
	else:
		for key: String in Hero.SKILL_KEYS:
			if event.is_action_pressed("skill_" + key):
				hero.cast(key)


## Click on a monster = attack it; click on the ground = walk there.
func _order_at_cursor(fresh_click: bool) -> void:
	var point: Variant = cam.ground_point(get_viewport().get_mouse_position())
	if point == null:
		return
	var ground: Vector3 = point
	var foe := arena.nearest_monster(ground, PICK_PAD)
	if foe != null:
		hero.command_attack(foe)
	elif fresh_click or hero.order != Hero.Order.ATTACK:
		hero.command_move(ground)
		if fresh_click:
			arena.fx.click_marker(ground)


# ---------------------------------------------------------------- dungeon flow

func _enter_room() -> void:
	arena.clear_room()
	hero.position = RunState.entry_point(_half)
	hero.rotation.y = PI * 0.5
	hero.command_stop()
	cam.snap_to(hero.position)
	_portal.visible = false
	_portal.position = RunState.exit_point(_half)
	var safe := float(GameData.cfg("arena").get("safe_start", 8.0))
	var boss: Monster = null
	for spawn: Dictionary in run.spawn_points(run.room_index, hero.position, _half, arena.obstacles, safe):
		var pos: Vector3 = spawn["pos"]
		var m := arena.spawn_monster(str(spawn["id"]), pos)
		if m != null and m.is_boss:
			boss = m
	hud.set_room(run.room_title(), boss)
	hud.hide_banner()
	_phase = Phase.FIGHT


func _room_cleared() -> void:
	if run.is_last_room():
		_phase = Phase.WON
		hud.show_banner("ชนะแล้ว!", "%s · เวลา %s · Lv %d · seed %d\nEnter = เล่นอีกรอบ" % [
			str(run.dungeon.get("name", "")), _clock(run.elapsed), hero.level, run.run_seed])
		Feedback.impact(Feedback.Tier.LARGE, hero.position, Color(1.0, 0.9, 0.5))
		return
	_phase = Phase.CLEARED
	hero.heal(roundi(float(hero.max_hp) * float(GameData.cfg("arena").get("room_heal", 0.35))))
	_portal.visible = true
	arena.fx.puff(_portal.position, Color(0.6, 0.9, 1.0))
	hud.show_banner("เคลียร์!", "เดินเข้าประตูทางขวาเพื่อไปต่อ")


func _travel() -> void:
	_phase = Phase.TRAVEL
	hud.fade_through(func() -> void:
		run.room_index += 1
		_enter_room())


func _on_hero_died(_actor: Actor) -> void:
	_phase = Phase.DEAD
	hud.show_banner("พ่ายแพ้", "%s · ล้ม %d ตัว · seed %d\nEnter = เริ่มใหม่" % [run.room_title(), hero.kills, run.run_seed])


func _on_monster_died(m: Monster) -> void:
	hero.kills += 1
	hero.add_xp(m.xp)


func _build_portal() -> Node3D:
	var portal := Node3D.new()
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.95
	torus.outer_radius = 1.2
	ring.mesh = torus
	ring.material_override = Toon.material(Color(0.5, 0.85, 1.0), 0.03)
	ring.position.y = 0.15
	portal.add_child(ring)
	var glow := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(3.4, 3.4)
	glow.mesh = plane
	glow.material_override = Fx.glow_material(Color(0.5, 0.9, 1.0), 2.4)
	glow.position.y = 0.2
	portal.add_child(glow)
	return portal


func _clock(seconds: float) -> String:
	var total := int(seconds)
	@warning_ignore("integer_division")
	return "%d:%02d" % [total / 60, total % 60]


func _parse_args() -> Dictionary[String, String]:
	var out: Dictionary[String, String] = {}
	for arg: String in OS.get_cmdline_user_args():
		var parts := arg.trim_prefix("--").split("=", true, 1)
		out[parts[0]] = parts[1] if parts.size() > 1 else "1"
	return out
