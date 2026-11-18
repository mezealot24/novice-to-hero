class_name WolfVisual
extends MonsterVisual
## Grey wolf: chunky chibi proportions, big head, running legs.

const FUR := Color(0.6, 0.62, 0.7)
const FUR_DARK := Color(0.4, 0.42, 0.52)
const BELLY := Color(0.9, 0.9, 0.92)
const EYE := Color(1.0, 0.8, 0.2)
const NOSE := Color(0.14, 0.12, 0.16)

var _body: Node3D
var _legs: Array[Node3D] = []
var _tail: Node3D
var _stride := 0.0


func _init(size: float = 0.5) -> void:
	var k := size / 0.5
	_body = Node3D.new()
	_body.scale = Vector3.ONE * k
	add_child(_body)
	_add(_body, Toon.capsule(0.26, 0.9), FUR, Vector3(0.0, 0.52, 0.0), Vector3.ONE, Vector3(90.0, 0.0, 0.0))
	_add(_body, Toon.sphere(0.22), BELLY, Vector3(0.0, 0.42, 0.12), Vector3(0.8, 0.6, 1.4), Vector3.ZERO, 0.0)
	var head := Node3D.new()
	head.position = Vector3(0.0, 0.74, 0.5)
	_body.add_child(head)
	_add(head, Toon.sphere(0.27), FUR)
	_add(head, Toon.cylinder(0.07, 0.14, 0.26, 10), BELLY, Vector3(0.0, -0.07, 0.26), Vector3.ONE, Vector3(90.0, 0.0, 0.0))
	_add(head, Toon.sphere(0.05), NOSE, Vector3(0.0, -0.04, 0.4), Vector3.ONE, Vector3.ZERO, 0.0)
	for side: float in [-1.0, 1.0]:
		_add(head, Toon.cylinder(0.0, 0.09, 0.22, 6), FUR_DARK, Vector3(0.15 * side, 0.27, -0.04), Vector3(1.0, 1.0, 0.6), Vector3(0.0, 0.0, -14.0 * side))
		_add(head, Toon.sphere(0.045), EYE, Vector3(0.12 * side, 0.05, 0.235), Vector3(1.0, 0.8, 0.4), Vector3(0.0, 0.0, 20.0 * side), 0.0)
	for z: float in [0.3, -0.3]:
		for side: float in [-1.0, 1.0]:
			var pivot := Node3D.new()
			pivot.position = Vector3(0.16 * side, 0.36, z)
			_body.add_child(pivot)
			_add(pivot, Toon.capsule(0.07, 0.36), FUR_DARK, Vector3(0.0, -0.16, 0.0))
			_legs.append(pivot)
	_tail = Node3D.new()
	_tail.position = Vector3(0.0, 0.62, -0.46)
	_body.add_child(_tail)
	_add(_tail, Toon.capsule(0.09, 0.44), FUR_DARK, Vector3(0.0, 0.08, -0.16), Vector3.ONE, Vector3(-55.0, 0.0, 0.0))


func _pose(dt: float) -> void:
	_stride += dt * (3.0 + 15.0 * locomotion)
	for i: int in _legs.size():
		# Diagonal pairs move together.
		var phase := 0.0 if i == 0 or i == 3 else PI
		_legs[i].rotation.x = sin(_stride + phase) * 0.9 * locomotion
	_tail.rotation.y = sin(_time * 6.0) * 0.3
	# Crouch on wind-up, stretch flat while dashing.
	_body.position.y = -0.1 * maxf(-_squash_shown, 0.0) + absf(sin(_stride)) * 0.04 * locomotion
	_body.rotation.x = 0.25 * maxf(-_squash_shown, 0.0)
