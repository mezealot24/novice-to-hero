class_name Fx
extends Node3D
## Short-lived visual effects: ground telegraphs, slashes, sparks, puffs. Visual only: nothing here
## changes the simulation, so it is safe to skip in headless tests.

const RING_SHADER: Shader = preload("res://shaders/fx_ring.gdshader")
const GLOW_SHADER: Shader = preload("res://shaders/fx_glow.gdshader")
const GROUND_Y := 0.04

static var _spark_material: StandardMaterial3D
static var _dot_texture: GradientTexture2D


func _ready() -> void:
	Feedback.sparks_requested.connect(sparks)


func clear() -> void:
	for child: Node in get_children():
		child.queue_free()


static func ring_material(color: Color, rect: bool = false) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = RING_SHADER
	mat.set_shader_parameter("color", color)
	mat.set_shader_parameter("rect", 1.0 if rect else 0.0)
	return mat


static func glow_material(color: Color, energy: float = 1.5, slash_shape: bool = false) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = GLOW_SHADER
	mat.set_shader_parameter("color", color)
	mat.set_shader_parameter("energy", energy)
	mat.set_shader_parameter("slash", 1.0 if slash_shape else 0.0)
	return mat


## Soft round dot, shared by sparks and dust.
static func dot_texture() -> GradientTexture2D:
	if _dot_texture == null:
		var g := Gradient.new()
		g.set_color(0, Color(1.0, 1.0, 1.0, 1.0))
		g.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
		_dot_texture = GradientTexture2D.new()
		_dot_texture.gradient = g
		_dot_texture.fill = GradientTexture2D.FILL_RADIAL
		_dot_texture.fill_from = Vector2(0.5, 0.5)
		_dot_texture.fill_to = Vector2(1.0, 0.5)
		_dot_texture.width = 32
		_dot_texture.height = 32
	return _dot_texture


## Danger circle that fills up over `duration`, then disappears: the hit lands when it is full.
func telegraph_circle(pos: Vector3, radius: float, duration: float, color: Color) -> void:
	var quad := _flat_quad(Vector3(pos.x, GROUND_Y, pos.z), Vector2(radius, radius), ring_material(color))
	_fill_and_free(quad, duration)


## Danger lane starting at `from` along `dir`.
func telegraph_line(from: Vector3, dir: Vector3, length: float, width: float, duration: float, color: Color) -> void:
	var centre := from + dir * length * 0.5
	var quad := _flat_quad(Vector3(centre.x, GROUND_Y, centre.z), Vector2(width * 0.5, length * 0.5), ring_material(color, true))
	quad.rotation.y = atan2(dir.x, dir.z)
	_fill_and_free(quad, duration)


## Expanding ring where something landed.
func shockwave(pos: Vector3, radius: float, color: Color) -> void:
	var mat := ring_material(color)
	var quad := _flat_quad(Vector3(pos.x, GROUND_Y + 0.01, pos.z), Vector2(radius * 0.3, radius * 0.3), mat)
	var tw := quad.create_tween().set_parallel(true)
	tw.tween_property(quad, "scale", Vector3(radius, 1.0, radius), 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 1.0, 0.0, 0.28)
	tw.chain().tween_callback(quad.queue_free)


## Move-order marker: a ring that shrinks into the clicked point.
func click_marker(pos: Vector3) -> void:
	var mat := ring_material(Color(0.5, 1.0, 0.6))
	var quad := _flat_quad(Vector3(pos.x, GROUND_Y, pos.z), Vector2(0.7, 0.7), mat)
	var tw := quad.create_tween().set_parallel(true)
	tw.tween_property(quad, "scale", Vector3(0.15, 1.0, 0.15), 0.35).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 1.0, 0.0, 0.35)
	tw.chain().tween_callback(quad.queue_free)


## Crescent in front of the attacker at chest height.
func slash(pos: Vector3, facing: float, reach: float, color: Color) -> void:
	var mat := glow_material(color, 2.6, true)
	var quad := _flat_quad(Vector3(pos.x, 0.75, pos.z), Vector2(reach, reach), mat)
	quad.rotation.y = facing
	var tw := quad.create_tween().set_parallel(true)
	tw.tween_property(quad, "rotation:y", facing - 0.9, 0.14)
	tw.tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 1.0, 0.0, 0.16)
	tw.chain().tween_callback(quad.queue_free)


## Soft burst on the ground (dash start, blink, summon).
func puff(pos: Vector3, color: Color) -> void:
	var mat := glow_material(color, 1.8)
	var quad := _flat_quad(Vector3(pos.x, 0.5, pos.z), Vector2(0.5, 0.5), mat)
	var tw := quad.create_tween().set_parallel(true)
	tw.tween_property(quad, "scale", Vector3(1.6, 1.0, 1.6), 0.3).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 0.9, 0.0, 0.3)
	tw.chain().tween_callback(quad.queue_free)
	sparks(pos + Vector3(0.0, 0.5, 0.0), 8, color)


## Trail between two points (shadow step).
func streak(from: Vector3, to: Vector3, color: Color) -> void:
	var mat := glow_material(color, 1.6)
	var delta := to - from
	var centre := (from + to) * 0.5
	var quad := _flat_quad(Vector3(centre.x, 0.6, centre.z), Vector2(0.45, delta.length() * 0.6), mat)
	quad.rotation.y = atan2(delta.x, delta.z)
	var tw := quad.create_tween()
	tw.tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 0.8, 0.0, 0.35)
	tw.tween_callback(quad.queue_free)


## Knife storm: a spinning ring that follows its owner for `duration`.
func vortex(owner_node: Node3D, radius: float, duration: float, color: Color) -> void:
	var mat := ring_material(color)
	mat.set_shader_parameter("fill", 0.0)
	mat.set_shader_parameter("glow", 1.8)
	var quad := _flat_quad(Vector3(0.0, GROUND_Y, 0.0), Vector2(radius, radius), mat)
	remove_child(quad)
	owner_node.add_child(quad)
	var tw := quad.create_tween()
	tw.tween_property(quad, "rotation:y", TAU * 2.0, duration)
	tw.parallel().tween_method(func(a: float) -> void: mat.set_shader_parameter("alpha", a), 1.0, 0.3, duration)
	tw.tween_callback(quad.queue_free)


func sparks(pos: Vector3, count: int, color: Color) -> void:
	if count <= 0 or not is_inside_tree():
		return
	var p := CPUParticles3D.new()
	p.position = pos
	p.amount = count
	p.one_shot = true
	p.explosiveness = 1.0
	p.lifetime = 0.35
	p.direction = Vector3.UP
	p.spread = 180.0
	p.initial_velocity_min = 2.0
	p.initial_velocity_max = 6.0
	p.gravity = Vector3(0.0, -9.0, 0.0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.2
	p.color = Color(color.r * 2.0, color.g * 2.0, color.b * 2.0, 1.0) # over 1.0: feeds the bloom
	var quad := QuadMesh.new()
	quad.size = Vector2(0.16, 0.16)
	p.mesh = quad
	p.material_override = _sparks_material()
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	p.emitting = true
	get_tree().create_timer(0.8).timeout.connect(p.queue_free)


static func _sparks_material() -> StandardMaterial3D:
	if _spark_material == null:
		_spark_material = StandardMaterial3D.new()
		_spark_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_spark_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_spark_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		_spark_material.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		_spark_material.vertex_color_use_as_albedo = true
		_spark_material.albedo_texture = dot_texture()
	return _spark_material


## A horizontal quad whose half extents are (half.x, half.y) metres. UV.y runs along local +Z.
func _flat_quad(pos: Vector3, half_size: Vector2, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(2.0, 2.0)
	mi.mesh = plane
	mi.material_override = mat
	mi.position = pos
	mi.scale = Vector3(half_size.x, 1.0, half_size.y)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


func _fill_and_free(quad: MeshInstance3D, duration: float) -> void:
	var mat := quad.material_override as ShaderMaterial
	var tw := quad.create_tween()
	tw.tween_method(func(f: float) -> void: mat.set_shader_parameter("fill", f), 0.0, 1.0, duration)
	tw.tween_callback(quad.queue_free)
