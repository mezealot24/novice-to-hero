class_name JellyVisual
extends MonsterVisual
## Jellop family: a wobbly jelly drop with a leaf sprout. The king is the same body with a crown.
## `size` is the body radius in metres.

const BODY := Color(0.45, 0.85, 0.5)
const BODY_KING := Color(0.4, 0.75, 0.95)
const BELLY := Color(0.8, 1.0, 0.8)
const LEAF := Color(0.25, 0.6, 0.25)
const GOLD := Color(1.0, 0.8, 0.25)
const EYE := Color(0.12, 0.1, 0.16)

var _body: Node3D
var _size := 0.5


func _init(size: float = 0.5, king: bool = false) -> void:
	_size = size
	_body = Node3D.new()
	add_child(_body)
	var color := BODY_KING if king else BODY
	var line := Toon.OUTLINE_WIDTH * (1.6 if king else 1.0)
	# Drop shape: wide base, slightly narrower top.
	_add(_body, Toon.sphere(size), color, Vector3(0.0, size * 0.78, 0.0), Vector3(1.0, 0.82, 1.0), Vector3.ZERO, line)
	_add(_body, Toon.sphere(size * 0.6), color.lightened(0.25), Vector3(0.0, size * 1.02, size * 0.2), Vector3(1.0, 0.6, 0.9), Vector3.ZERO, 0.0)
	_add(_body, Toon.sphere(size * 0.2), Color.WHITE, Vector3(-size * 0.38, size * 1.2, size * 0.5), Vector3(1.0, 0.7, 0.5), Vector3.ZERO, 0.0)
	for side: float in [-1.0, 1.0]:
		_add(_body, Toon.sphere(size * 0.13), EYE, Vector3(size * 0.3 * side, size * 0.8, size * 0.88), Vector3(0.8, 1.3, 0.5), Vector3.ZERO, 0.0)
		_add(_body, Toon.sphere(size * 0.12), Color(1.0, 0.55, 0.6), Vector3(size * 0.56 * side, size * 0.58, size * 0.74), Vector3(1.2, 0.6, 0.4), Vector3.ZERO, 0.0)
	if king:
		var crown := Node3D.new()
		crown.position = Vector3(0.0, size * 1.5, 0.0)
		_body.add_child(crown)
		_add(crown, Toon.cylinder(size * 0.42, size * 0.36, size * 0.22, 10), GOLD)
		for i: int in 5:
			var a := TAU * float(i) / 5.0
			_add(crown, Toon.cylinder(0.0, size * 0.1, size * 0.26, 6), GOLD, Vector3(cos(a) * size * 0.34, size * 0.22, sin(a) * size * 0.34))
		_add(crown, Toon.sphere(size * 0.09), Color(0.95, 0.25, 0.35), Vector3(0.0, size * 0.02, size * 0.4), Vector3.ONE, Vector3.ZERO, 0.0)
	else:
		_add(_body, Toon.cylinder(0.012, 0.02, size * 0.4, 6), LEAF, Vector3(0.0, size * 1.6, 0.0), Vector3.ONE, Vector3.ZERO, 0.012)
		_add(_body, Toon.sphere(size * 0.2), LEAF, Vector3(size * 0.18, size * 1.82, 0.0), Vector3(1.3, 0.3, 0.8), Vector3(0.0, 0.0, 25.0), 0.012)


func _pose(_dt: float) -> void:
	# Keep volume: taller means thinner. A slow idle wobble sits on top of the AI's squash.
	var wobble := sin(_time * 3.2 + _size * 9.0) * 0.04
	var s := clampf(_squash_shown + wobble, -0.6, 0.6)
	var y := 1.0 + s * 0.5
	var xz := 1.0 / sqrt(maxf(y, 0.3))
	_body.scale = Vector3(xz, y, xz)
