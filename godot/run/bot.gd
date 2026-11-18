class_name Bot
extends RefCounted
## A simple autoplayer (run with `-- --autoplay`): used for soak tests and for recording clips.
## It plays like a cautious human: fights the nearest monster, uses skills when they are up, and
## walks into the exit portal when a room is clear.

var _dodge_cd := 0.0


func drive(hero: Hero, arena: Arena, portal: Vector3, portal_open: bool, dt: float) -> void:
	if not hero.alive:
		return
	_dodge_cd -= dt
	var foe := arena.nearest_monster(hero.position, 60.0)
	if foe == null:
		if portal_open:
			hero.command_move(portal)
		return
	hero.aim_point = foe.position
	if hero.order != Hero.Order.ATTACK or hero.target != foe:
		hero.command_attack(foe)
	var dist := hero.flat_distance_to(foe.position)
	var crowd := arena.monsters_in_radius(hero.position, 5.0).size()
	if hero.cooldowns["r"] <= 0.0 and (crowd >= 3 or foe.is_boss) and dist < 5.0:
		hero.cast("r")
	if hero.cooldowns["q"] <= 0.0 and dist < 8.0:
		hero.cast("q")
	if hero.cooldowns["e"] <= 0.0 and dist < 5.5 and (hero.combo_points >= 3 or foe.hp < 40):
		hero.cast("e")
	# Step out when hurt, like a player kiting.
	if hero.cooldowns["w"] <= 0.0 and _dodge_cd <= 0.0 and hero.hp * 2 < hero.max_hp and dist < 3.0:
		hero.aim_point = hero.position - hero.flat_direction_to(foe.position) * 5.0
		hero.cast("w")
		_dodge_cd = 2.0
