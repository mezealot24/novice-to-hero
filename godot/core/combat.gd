class_name Combat
extends RefCounted
## Pure combat maths, shared by hero and tests. No nodes, no globals: pass the RNG in.

## One damage roll: atk x skill multiplier, +-variance, optional crit. Rounded once, at the end.
static func roll(atk: float, mul: float, crit_chance: float, crit_mul: float, variance: float,
		rng: RandomNumberGenerator, force_crit: bool = false) -> Dictionary:
	var crit := force_crit or rng.randf() < crit_chance
	var dmg := atk * mul * rng.randf_range(1.0 - variance, 1.0 + variance)
	if crit:
		dmg *= crit_mul
	return {"amount": maxi(1, roundi(dmg)), "crit": crit}


## Back Stab finisher: spends combo points for +per each.
static func finisher_mul(base_mul: float, points: int, per_point: float) -> float:
	return base_mul * (1.0 + per_point * float(points))


## XP needed to go from `level` to the next one.
static func xp_to_next(level: int, base: float, growth: float) -> int:
	return roundi(base * pow(growth, float(level - 1)))


## Stable sub-seed per (run, room, purpose): combat rolls never shift room layouts.
static func sub_seed(run_seed: int, room: int, purpose: int) -> int:
	var h := (run_seed * 73856093) ^ ((room + 1) * 19349663) ^ ((purpose + 1) * 83492791)
	return h & 0x7fffffff
