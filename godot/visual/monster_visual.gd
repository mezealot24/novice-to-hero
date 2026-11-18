class_name MonsterVisual
extends Node3D
## Look of a monster. The AI writes the pose values; tick() turns them into motion.

var flash_materials: Array[ShaderMaterial] = []
## Height above the ground in metres (hops, leaps).
var air := 0.0
## -1 = flattened (wind-up, landing), +1 = stretched tall (take-off).
var squash := 0.0
## 0..1 run cycle strength, for creatures with legs.
var locomotion := 0.0

var _squash_shown := 0.0
var _time := 0.0
var _dying := -1.0


func tick(dt: float) -> void:
	_time += dt
	_squash_shown = lerpf(_squash_shown, squash, 1.0 - exp(-18.0 * dt))
	position.y = air
	if _dying >= 0.0:
		_dying += dt
		var k := clampf(_dying / 0.35, 0.0, 1.0)
		scale = Vector3(1.0 + k * 0.6, maxf(1.0 - k * 1.2, 0.02), 1.0 + k * 0.6)
		return
	_pose(dt)


## Flatten and pop: the owner frees the monster a moment later.
func die() -> void:
	_dying = 0.0


func _pose(_dt: float) -> void:
	pass


func _add(parent: Node3D, mesh: Mesh, color: Color, pos: Vector3 = Vector3.ZERO, scl: Vector3 = Vector3.ONE,
		rot_deg: Vector3 = Vector3.ZERO, outline_width: float = Toon.OUTLINE_WIDTH) -> MeshInstance3D:
	var mat := Toon.material(color, outline_width)
	flash_materials.append(mat)
	return Toon.part(parent, mesh, mat, pos, scl, rot_deg)
