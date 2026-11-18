class_name Actor
extends Node3D
## Anything with HP on the battlefield. Lives on the ground plane (y = 0); models face +Z.

signal hurt(amount: int, crit: bool)
signal died(actor: Actor)

const FLASH_TIME := 0.12
const FLASH_PEAK := 0.7

var arena: Arena
var max_hp := 1
var hp := 1
var radius := 0.4
var alive := true
## Seconds of invulnerability left (dodges).
var invulnerable_left := 0.0
## Absorbs damage before HP.
var shield := 0

var _flash_left := 0.0
var _flash_color := Color.WHITE


## Returns the damage that got through (0 when dodged).
func take_damage(amount: int, crit: bool, _from: Vector3) -> int:
	if not alive or amount <= 0 or invulnerable_left > 0.0:
		return 0
	var left := amount
	if shield > 0:
		var absorbed := mini(shield, left)
		shield -= absorbed
		left -= absorbed
	hp = maxi(hp - left, 0)
	_flash_left = FLASH_TIME
	hurt.emit(amount, crit)
	if hp == 0:
		alive = false
		_on_death()
		died.emit(self)
	return amount


func heal(amount: int) -> void:
	if alive:
		hp = mini(hp + amount, max_hp)


func flat_distance_to(point: Vector3) -> float:
	return Vector2(point.x - position.x, point.z - position.z).length()


func flat_direction_to(point: Vector3) -> Vector3:
	var d := Vector3(point.x - position.x, 0.0, point.z - position.z)
	return d.normalized() if d.length_squared() > 0.000001 else Vector3.ZERO


## Turn toward a direction; rate <= 0 snaps.
func face(dir: Vector3, dt: float = 0.0, rate: float = 0.0) -> void:
	if dir.length_squared() < 0.000001:
		return
	var want := atan2(dir.x, dir.z)
	rotation.y = want if rate <= 0.0 else lerp_angle(rotation.y, want, 1.0 - exp(-rate * dt))


func forward() -> Vector3:
	return Vector3(sin(rotation.y), 0.0, cos(rotation.y))


func flash(color: Color = Color.WHITE, time: float = FLASH_TIME) -> void:
	_flash_color = color
	_flash_left = time


func _tick_flash(dt: float, mats: Array[ShaderMaterial]) -> void:
	if _flash_left <= 0.0:
		return
	_flash_left -= dt
	Toon.set_flash(mats, clampf(_flash_left / FLASH_TIME, 0.0, 1.0) * FLASH_PEAK, _flash_color)


func _on_death() -> void:
	pass
