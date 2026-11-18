class_name Arena
extends Node3D
## The battlefield: owns the hero, monsters and projectiles and steps them in a fixed order.
## step(dt) is the only clock the simulation uses, so tests can drive it without a window.

signal monster_died(monster: Monster)
## For floating numbers. to_hero = the hero took it.
signal damage_shown(pos: Vector3, amount: int, crit: bool, to_hero: bool)
signal announced(text: String)

const SEPARATION_PASSES := 2

var hero: Hero
var monsters: Array[Monster] = []
var knives: Array[Knife] = []
## Circles (x, z, radius) nobody can walk through.
var obstacles: Array[Vector3] = []
var half := Vector2(21.0, 11.5)
## Combat rolls only. Room layouts use their own sub-seeds.
var rng := RandomNumberGenerator.new()
var fx: Fx


func _init() -> void:
	fx = Fx.new()
	add_child(fx)


func step(dt: float) -> void:
	if hero != null:
		hero.tick(dt)
	for m: Monster in monsters.duplicate():
		m.tick(dt)
	_separate()
	for k: Knife in knives.duplicate():
		k.tick(dt)
		if k.done:
			knives.erase(k)
			k.queue_free()
	for m: Monster in monsters.duplicate():
		if m.is_gone():
			monsters.erase(m)
			m.queue_free()


func set_hero(h: Hero) -> void:
	hero = h
	h.arena = self
	add_child(h)


func spawn_monster(id: String, pos: Vector3) -> Monster:
	var def := GameData.monster(id)
	if def.is_empty():
		push_error("Arena: unknown monster '%s'" % id)
		return null
	var m := Monster.create(def)
	m.arena = self
	m.position = clamp_point(pos, m.radius)
	add_child(m)
	m.setup()
	monsters.append(m)
	m.hurt.connect(_on_monster_hurt.bind(m))
	m.died.connect(_on_monster_died)
	return m


func add_knife(k: Knife) -> void:
	k.arena = self
	knives.append(k)
	add_child(k)


func clear_room() -> void:
	for m: Monster in monsters:
		m.queue_free()
	monsters.clear()
	for k: Knife in knives:
		k.queue_free()
	knives.clear()
	fx.clear()


func alive_monsters() -> Array[Monster]:
	var out: Array[Monster] = []
	for m: Monster in monsters:
		if m.alive:
			out.append(m)
	return out


func monsters_in_radius(point: Vector3, r: float) -> Array[Monster]:
	var out: Array[Monster] = []
	for m: Monster in monsters:
		if m.alive and m.flat_distance_to(point) <= r + m.radius:
			out.append(m)
	return out


func nearest_monster(point: Vector3, max_dist: float, exclude: Monster = null) -> Monster:
	var best: Monster = null
	var best_d := max_dist
	for m: Monster in monsters:
		if not m.alive or m == exclude:
			continue
		var d := m.flat_distance_to(point) - m.radius
		if d <= best_d:
			best_d = d
			best = m
	return best


func random_monster(point: Vector3, r: float, exclude: Monster = null) -> Monster:
	var pool := monsters_in_radius(point, r)
	if exclude != null and pool.size() > 1:
		pool.erase(exclude)
	return pool[rng.randi_range(0, pool.size() - 1)] if not pool.is_empty() else null


## Keeps a point inside the arena and out of obstacles.
func clamp_point(p: Vector3, pad: float = 0.0) -> Vector3:
	var x := clampf(p.x, -half.x + pad, half.x - pad)
	var z := clampf(p.z, -half.y + pad, half.y - pad)
	for o: Vector3 in obstacles:
		var away := Vector2(x - o.x, z - o.y)
		var min_d := o.z + pad
		var d := away.length()
		if d < min_d:
			away = away / d * min_d if d > 0.0001 else Vector2(min_d, 0.0)
			x = o.x + away.x
			z = o.y + away.y
	return Vector3(x, 0.0, z)


func show_damage(pos: Vector3, amount: int, crit: bool, to_hero: bool) -> void:
	damage_shown.emit(pos, amount, crit, to_hero)


## Monsters push each other apart and never stand inside the hero. Bosses do not get pushed.
func _separate() -> void:
	for _pass: int in SEPARATION_PASSES:
		for i: int in monsters.size():
			var a := monsters[i]
			if not a.alive or a.airborne():
				continue
			for j: int in range(i + 1, monsters.size()):
				var b := monsters[j]
				if not b.alive or b.airborne():
					continue
				var delta := Vector2(b.position.x - a.position.x, b.position.z - a.position.z)
				var want := a.radius + b.radius
				var d := delta.length()
				if d >= want:
					continue
				var push := (delta / d if d > 0.0001 else Vector2(1.0, 0.0)) * (want - d)
				var a_share := 0.0 if a.is_boss else (1.0 if b.is_boss else 0.5)
				a.position -= Vector3(push.x, 0.0, push.y) * a_share
				b.position += Vector3(push.x, 0.0, push.y) * (1.0 - a_share)
	if hero == null or not hero.alive:
		return
	for m: Monster in monsters:
		if not m.alive or m.airborne():
			continue
		var delta := Vector2(m.position.x - hero.position.x, m.position.z - hero.position.z)
		var want := (m.radius + hero.radius) * 0.85
		var d := delta.length()
		if d >= want:
			continue
		var push := (delta / d if d > 0.0001 else Vector2(1.0, 0.0)) * (want - d)
		if m.is_boss:
			hero.position = clamp_point(hero.position - Vector3(push.x, 0.0, push.y), hero.radius)
		else:
			m.position = clamp_point(m.position + Vector3(push.x, 0.0, push.y), m.radius)


func _on_monster_hurt(amount: int, crit: bool, m: Monster) -> void:
	show_damage(m.position + Vector3(0.0, m.radius * 2.0, 0.0), amount, crit, false)


func _on_monster_died(actor: Actor) -> void:
	var m := actor as Monster
	if m != null:
		monster_died.emit(m)
