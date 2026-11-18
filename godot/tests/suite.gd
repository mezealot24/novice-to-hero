# The test suite. It is a Node (not the SceneTree runner itself) so it can use the autoloads by name:
# run it through tests/run_tests.gd.
extends Node

const DT := 1.0 / 60.0
const TESTS: Array[String] = [
	"test_data_loads", "test_damage_maths", "test_xp_curve", "test_balance_bands",
	"test_spawns_are_seeded_and_safe", "test_camera_smoothing_is_frame_rate_independent",
	"test_hit_stop_restores_time", "test_basic_attack_kills_and_builds_combo", "test_knife_fan",
	"test_shadow_step_dodges", "test_back_stab_spends_combo", "test_knife_storm_clears_pack",
	"test_pounce_is_dodgeable", "test_boss_enrages_once", "test_bot_finishes_runs", "test_main_scene_takes_input",
]

var passed := 0
var failed := 0


func _ready() -> void:
	await get_tree().process_frame
	Feedback.hit_stop_enabled = false
	for t: String in TESTS:
		if await call(t) != true: # a runtime error returns null, not true
			failed += 1
			push_error("FAIL %s: did not finish (runtime error?)" % t)
	Feedback.reset()
	print("Results: %d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)


func check(ok: bool, label: String) -> void:
	if ok:
		passed += 1
	else:
		failed += 1
		push_error("FAIL %s" % label)


func check_eq(actual: Variant, expected: Variant, label: String) -> void:
	check(actual == expected, "%s: expected %s, got %s" % [label, expected, actual])


# ---------------------------------------------------------------- helpers

func make_arena(seed_value: int = 1) -> Arena:
	var arena := Arena.new()
	arena.rng.seed = seed_value
	get_tree().root.add_child(arena)
	var hero := Hero.new()
	arena.set_hero(hero)
	return arena


func free_arena(arena: Arena) -> void:
	arena.queue_free()
	await get_tree().process_frame


func step(arena: Arena, seconds: float) -> void:
	for i: int in ceili(seconds / DT):
		arena.step(DT)


# ---------------------------------------------------------------- data and maths

func test_data_loads() -> bool:
	var d1 := GameData.dungeon("d1")
	var rooms: Array = d1.get("rooms", [])
	check_eq(rooms.size(), 4, "d1 has 4 rooms")
	for room: Dictionary in rooms:
		var spawn: Array = room.get("spawn", [])
		for pair: Array in spawn:
			check(not GameData.monster(str(pair[0])).is_empty(), "monster '%s' exists" % pair[0])
	for section: String in ["hero", "level", "combo", "skills", "ai", "arena", "monster"]:
		check(not GameData.cfg(section).is_empty(), "slice.json has '%s'" % section)
	for key: String in Hero.SKILL_KEYS:
		check(float(GameData.cfg("skills", key).get("cd", 0.0)) > 0.0, "skill %s has a cooldown" % key)
	return true


func test_damage_maths() -> bool:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var lo := 999
	var hi := 0
	for i: int in 500:
		var roll := Combat.roll(100.0, 1.0, 0.0, 2.0, 0.1, rng)
		var amount: int = roll["amount"]
		lo = mini(lo, amount)
		hi = maxi(hi, amount)
	check(lo >= 90 and hi <= 110, "variance stays within +-10%% (got %d..%d)" % [lo, hi])
	var crit := Combat.roll(100.0, 1.0, 0.0, 2.0, 0.0, rng, true)
	check_eq(crit["amount"], 200, "forced crit doubles")
	check_eq(crit["crit"], true, "forced crit is flagged")
	check_eq(Combat.roll(0.1, 1.0, 0.0, 2.0, 0.0, rng)["amount"], 1, "minimum damage is 1")
	check(is_equal_approx(Combat.finisher_mul(2.2, 5, 0.2), 4.4), "5 combo points double Back Stab")
	check_eq(Combat.sub_seed(42, 1, 0), Combat.sub_seed(42, 1, 0), "sub-seed is stable")
	check(Combat.sub_seed(42, 1, 0) != Combat.sub_seed(42, 2, 0), "sub-seed differs per room")
	return true


func test_xp_curve() -> bool:
	var cfg := GameData.cfg("level")
	var last := 0
	for level: int in range(1, int(cfg.get("max", 10))):
		var need := Combat.xp_to_next(level, float(cfg.get("xp_base", 8.0)), float(cfg.get("xp_growth", 1.45)))
		check(need > last, "xp to next rises at level %d" % level)
		last = need
	# One full clear of D1 should give a few level-ups, not zero and not the cap.
	var arena := make_arena()
	var total := 0
	var rooms: Array = GameData.dungeon("d1").get("rooms", [])
	for room: Dictionary in rooms:
		var spawn: Array = room.get("spawn", [])
		for pair: Array in spawn:
			total += int(GameData.monster(str(pair[0])).get("xp", 0)) * int(pair[1])
	arena.hero.add_xp(total)
	print("  D1 gives %d xp -> hero level %d" % [total, arena.hero.level])
	check(arena.hero.level >= 3 and not arena.hero.is_max_level(), "a D1 clear lands between level 3 and the cap")
	await free_arena(arena)
	return true


## Hits-to-kill and hits-to-die at level 1, from the real data (rpg skill bands).
func test_balance_bands() -> bool:
	var hero := GameData.cfg("hero")
	var atk := float(hero.get("atk", 1.0))
	var hp := float(hero.get("hp", 1.0))
	print("  monster      hp  dmg  hits_to_kill  hits_to_die")
	for id: String in ["jellop", "wolf", "minijellop", "king"]:
		var m := GameData.monster(id)
		var to_kill := ceili(float(m.get("hp", 1)) / atk)
		var to_die := ceili(hp / float(m.get("dmg", 1)))
		print("  %-11s %4d %4d %13d %12d" % [id, int(m.get("hp", 0)), int(m.get("dmg", 0)), to_kill, to_die])
		if id == "king":
			check(to_kill >= 25 and to_kill <= 70, "boss takes 25-70 basic hits (got %d)" % to_kill)
			check(to_die >= 5, "hero survives 5+ boss hits (got %d)" % to_die)
		else:
			check(to_kill >= 1 and to_kill <= 5, "%s dies in 1-5 basic hits (got %d)" % [id, to_kill])
			check(to_die >= 8, "hero survives 8+ hits from %s (got %d)" % [id, to_die])
	return true


func test_spawns_are_seeded_and_safe() -> bool:
	var arena_cfg := GameData.cfg("arena")
	var half := Vector2(float(arena_cfg.get("half_x", 21.0)), float(arena_cfg.get("half_z", 11.5)))
	var safe := float(arena_cfg.get("safe_start", 8.0))
	var entry := RunState.entry_point(half)
	var no_rocks: Array[Vector3] = []
	var a := RunState.new(1234, "d1").spawn_points(1, entry, half, no_rocks, safe)
	var b := RunState.new(1234, "d1").spawn_points(1, entry, half, no_rocks, safe)
	var c := RunState.new(1235, "d1").spawn_points(1, entry, half, no_rocks, safe)
	check_eq(str(a), str(b), "same seed, same room -> same spawns")
	check(str(a) != str(c), "different seed -> different spawns")
	var unsafe := 0
	var outside := 0
	for seed_value: int in 300:
		var run := RunState.new(seed_value, "d1")
		for room: int in run.rooms().size():
			for spawn: Dictionary in run.spawn_points(room, entry, half, no_rocks, safe):
				var pos: Vector3 = spawn["pos"]
				if pos.distance_to(entry) < safe:
					unsafe += 1
				if absf(pos.x) > half.x or absf(pos.z) > half.y:
					outside += 1
	check_eq(unsafe, 0, "no spawn inside the safe start radius (300 seeds)")
	check_eq(outside, 0, "no spawn outside the arena (300 seeds)")
	return true


## camera-systems check: trail distance behind a moving target must not depend on frame rate.
func test_camera_smoothing_is_frame_rate_independent() -> bool:
	var lag: Array[float] = []
	for fps: float in [30.0, 144.0]:
		var dt := 1.0 / fps
		var cam_pos := Vector3.ZERO
		var target := Vector3.ZERO
		for i: int in int(2.0 * fps):
			target.x += 5.0 * dt
			cam_pos = MobaCamera.smooth(cam_pos, target, MobaCamera.FOLLOW_RATE, dt)
		lag.append(target.x - cam_pos.x)
	print("  camera lag at 30 fps %.3f m, at 144 fps %.3f m" % [lag[0], lag[1]])
	check(absf(lag[0] - lag[1]) / lag[1] < 0.2, "follow lag is within 20% between 30 and 144 fps")
	return true


## game-feel check: two hits 30 ms apart must still end with time scale back at 1.
func test_hit_stop_restores_time() -> bool:
	Feedback.hit_stop_enabled = true
	Feedback.hit_stop(0.05)
	await get_tree().create_timer(0.03, true, false, true).timeout
	Feedback.hit_stop(0.1)
	await get_tree().create_timer(0.04, true, false, true).timeout
	check(Engine.time_scale < 1.0, "second hit-stop is still holding after the first one ended")
	await get_tree().create_timer(0.15, true, false, true).timeout
	check_eq(Engine.time_scale, 1.0, "time scale is back to 1 after overlapping hit-stops")
	Feedback.hit_stop_enabled = false
	Feedback.reset()
	return true


# ---------------------------------------------------------------- simulation

func test_basic_attack_kills_and_builds_combo() -> bool:
	var arena := make_arena()
	var hero := arena.hero
	var foe := arena.spawn_monster("jellop", Vector3(4.0, 0.0, 0.0))
	hero.command_attack(foe)
	var xp_before := hero.xp
	arena.monster_died.connect(func(m: Monster) -> void: hero.add_xp(m.xp))
	step(arena, 12.0)
	check(not foe.alive, "hero walks up and kills a jellop")
	check(hero.combo_points > 0, "basic hits build combo points")
	check(hero.xp > xp_before or hero.level > 1, "the kill gives xp")
	check_eq(arena.monsters.size(), 0, "the corpse is removed")
	await free_arena(arena)
	return true


func test_knife_fan() -> bool:
	var arena := make_arena()
	var hero := arena.hero
	var foe := arena.spawn_monster("wolf", Vector3(5.0, 0.0, 0.0))
	hero.aim_point = foe.position
	check(hero.cast("q"), "Q casts")
	check(not hero.cast("q"), "Q is on cooldown right after")
	check_eq(arena.knives.size(), int(GameData.cfg("skills", "q").get("knives", 3)), "Q throws its knives")
	step(arena, 0.6)
	check(foe.hp < foe.max_hp, "a knife hits the monster in front")
	check(hero.combo_points >= 1, "Q hits build combo points")
	step(arena, 1.5)
	check_eq(arena.knives.size(), 0, "knives are cleaned up")
	await free_arena(arena)
	return true


func test_shadow_step_dodges() -> bool:
	var arena := make_arena()
	var hero := arena.hero
	hero.aim_point = Vector3(10.0, 0.0, 0.0)
	check(hero.cast("w"), "W casts")
	check_eq(hero.take_damage(50, false, Vector3.ZERO), 0, "no damage during the dash")
	step(arena, 0.3)
	var want := float(GameData.cfg("skills", "w").get("distance", 4.0))
	check(absf(hero.position.x - want) < 0.3, "dash covers its distance (%.2f of %.2f m)" % [hero.position.x, want])
	step(arena, 0.5)
	check(hero.take_damage(5, false, Vector3.ZERO) > 0, "vulnerable again afterwards")
	await free_arena(arena)
	return true


func test_back_stab_spends_combo() -> bool:
	var arena := make_arena()
	var hero := arena.hero
	var boss := arena.spawn_monster("king", Vector3(4.0, 0.0, 0.0))
	hero.aim_point = boss.position
	var plain_hp := boss.hp
	hero.cast("e")
	var plain := plain_hp - boss.hp
	check(hero.position.x > boss.position.x, "hero lands behind the target")
	hero.cooldowns["e"] = 0.0
	hero.combo_points = hero.combo_max
	var full_hp := boss.hp
	hero.aim_point = boss.position
	hero.cast("e")
	var full := full_hp - boss.hp
	check_eq(hero.combo_points, 0, "Back Stab spends every combo point")
	check(float(full) > float(plain) * 1.5, "5 points hit much harder (%d vs %d)" % [full, plain])
	hero.cooldowns["e"] = 0.0
	hero.position = Vector3(-15.0, 0.0, 0.0)
	hero.aim_point = hero.position
	hero.target = null
	check(not hero.cast("e"), "out of range: no cast")
	check_eq(hero.cooldowns["e"], 0.0, "a failed cast does not start the cooldown")
	await free_arena(arena)
	return true


func test_knife_storm_clears_pack() -> bool:
	var arena := make_arena()
	var hero := arena.hero
	for i: int in 4:
		arena.spawn_monster("minijellop", Vector3(2.0 + float(i), 0.0, 2.0))
	check(hero.cast("r"), "R casts")
	check(hero.is_ulting(), "ult is active")
	step(arena, 4.0)
	check(not hero.is_ulting(), "ult ends")
	check_eq(arena.alive_monsters().size(), 0, "knife storm kills a pack of minis")
	await free_arena(arena)
	return true


func test_pounce_is_dodgeable() -> bool:
	# Standing still next to a jellop: it hits. Walking away during the wind-up: it misses.
	for dodge: bool in [false, true]:
		var arena := make_arena(3)
		var hero := arena.hero
		hero.acquire_range = 0.0 # do not fight back
		arena.spawn_monster("jellop", Vector3(1.8, 0.0, 0.0))
		var moved := false
		for i: int in int(4.0 / DT):
			arena.step(DT)
			if dodge and not moved and arena.fx.get_child_count() > 0:
				hero.command_move(Vector3(-8.0, 0.0, 0.0))
				moved = true
			if hero.hp < hero.max_hp:
				break
		if dodge:
			check_eq(hero.hp, hero.max_hp, "walking out of the marker dodges the pounce")
		else:
			check(hero.hp < hero.max_hp, "standing in the marker gets hit")
		await free_arena(arena)
	return true


func test_boss_enrages_once() -> bool:
	var arena := make_arena()
	var boss := arena.spawn_monster("king", Vector3(6.0, 0.0, 0.0))
	boss.take_damage(boss.max_hp / 2 + 1, false, Vector3.ZERO)
	check(boss.shield > 0, "boss gains a jelly shield at half HP")
	var minions := arena.alive_monsters().size() - 1
	check(minions > 0, "boss summons minions at half HP (%d)" % minions)
	boss.take_damage(5, false, Vector3.ZERO)
	check_eq(arena.alive_monsters().size() - 1, minions, "enrage happens only once")
	await free_arena(arena)
	return true


## The autoplay bot plays whole runs. Every run must end (win or death) with no errors; the bot
## never dodges on purpose, so it should not win every time, and it should not lose every time.
func test_bot_finishes_runs() -> bool:
	var arena_cfg := GameData.cfg("arena")
	var half := Vector2(float(arena_cfg.get("half_x", 21.0)), float(arena_cfg.get("half_z", 11.5)))
	var wins := 0
	var runs := 8
	for seed_value: int in runs:
		var arena := make_arena(seed_value)
		arena.half = half
		var hero := arena.hero
		arena.monster_died.connect(func(m: Monster) -> void: hero.add_xp(m.xp))
		var run := RunState.new(seed_value, "d1")
		var bot := Bot.new()
		var elapsed := 0.0
		var won := false
		while hero.alive and elapsed < 900.0:
			arena.clear_room()
			hero.position = RunState.entry_point(half)
			for spawn: Dictionary in run.spawn_points(run.room_index, hero.position, half, arena.obstacles, 8.0):
				var pos: Vector3 = spawn["pos"]
				arena.spawn_monster(str(spawn["id"]), pos)
			while hero.alive and not arena.alive_monsters().is_empty() and elapsed < 900.0:
				bot.drive(hero, arena, Vector3.ZERO, false, DT)
				arena.step(DT)
				elapsed += DT
			if not hero.alive:
				break
			if run.is_last_room():
				won = true
				break
			hero.heal(roundi(float(hero.max_hp) * float(arena_cfg.get("room_heal", 0.35))))
			run.room_index += 1
		print("  seed %d: %s in room %d, %.0f s, level %d, hp %d/%d" % [
			seed_value, "WIN" if won else "death", run.room_index + 1, elapsed, hero.level, hero.hp, hero.max_hp])
		check(elapsed < 900.0, "run with seed %d ends" % seed_value)
		if won:
			wins += 1
		await free_arena(arena)
	print("  bot wins %d of %d runs" % [wins, runs])
	return true


## The real main scene, driven by real input events: a click orders a move, Q casts, F9 restarts.
func test_main_scene_takes_input() -> bool:
	var scene := load("res://scenes/main.tscn") as PackedScene
	var game: Node = scene.instantiate()
	get_tree().root.add_child(game)
	await get_tree().process_frame
	await get_tree().process_frame
	var hero: Hero = game.get("hero")
	var arena: Arena = game.get("arena")
	var cam: MobaCamera = game.get("cam")
	check(hero != null and arena != null and cam != null, "main scene builds hero, arena and camera")
	check(not arena.alive_monsters().is_empty(), "room 1 has monsters")
	var start := hero.position
	check(start.distance_to(cam.focus) < 0.5, "camera starts on the hero")
	# Click a little right of the hero on screen: that is +X on the ground.
	var screen := cam.camera.unproject_position(start + Vector3(3.0, 0.0, 0.0))
	get_tree().root.warp_mouse(screen)
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_RIGHT
	click.pressed = true
	click.position = screen
	click.global_position = screen
	Input.parse_input_event(click)
	await get_tree().process_frame
	await get_tree().process_frame
	check_eq(hero.order, Hero.Order.MOVE, "right click on the ground orders a move")
	var release := click.duplicate() as InputEventMouseButton
	release.pressed = false
	Input.parse_input_event(release)
	for i: int in 30:
		await get_tree().process_frame
	check(hero.position.x > start.x + 0.2, "the hero walks toward the click (moved %.2f m)" % (hero.position.x - start.x))
	var key := InputEventKey.new()
	key.physical_keycode = KEY_Q
	key.pressed = true
	Input.parse_input_event(key)
	await get_tree().process_frame
	await get_tree().process_frame
	check(hero.cooldowns["q"] > 0.0, "pressing Q casts the knife fan")
	var seed_before: int = game.get("run").run_seed
	var f9 := InputEventKey.new()
	f9.physical_keycode = KEY_F9
	f9.pressed = true
	Input.parse_input_event(f9)
	await get_tree().process_frame
	await get_tree().process_frame
	var new_hero: Hero = game.get("hero")
	check(new_hero != hero and new_hero.hp == new_hero.max_hp, "F9 starts a fresh run")
	print("  restart: seed %d -> %d" % [seed_before, game.get("run").run_seed])
	game.queue_free()
	await get_tree().process_frame
	return true
