class_name Meadow
extends Node3D
## The D1 meadow: ground with a winding dirt path, swaying grass, flowers, trees and rocks, plus the
## late-afternoon look (warm low sun, cool shadows, bloom, haze, floating dust).
## Everything is placed from a seed, so a run seed always gives the same field.

const GROUND_SHADER: Shader = preload("res://shaders/ground.gdshader")
const GRASS_SHADER: Shader = preload("res://shaders/grass.gdshader")

const PATH_BASE := 0.0
const PATH_AMP := 2.2
const PATH_FREQ := 0.16
const PATH_HALF_WIDTH := 1.5
## Grass and scenery extend past the playable arena so the screen edges are never empty.
const FIELD_MARGIN := Vector2(12.0, 8.0)
const GRASS_PER_M2 := 15.0
const SUN_COLOR := Color(1.0, 0.76, 0.5)
const SUN_ENERGY := 2.1
const AMBIENT_COLOR := Color(0.55, 0.64, 1.0)
const AMBIENT_ENERGY := 0.72

## Circles (x, z, radius) that block movement; the game hands them to the arena.
var obstacles: Array[Vector3] = []

var _half := Vector2(21.0, 11.5)
var _rng := RandomNumberGenerator.new()
var _sun: DirectionalLight3D
var _env: Environment
var _grass_material: ShaderMaterial
var _dust: GPUParticles3D
var _dim := 0.0


## Centre line of the dirt path. Must match ground.gdshader.
static func path_z(x: float) -> float:
	return PATH_BASE + PATH_AMP * sin(x * PATH_FREQ)


static func on_path(x: float, z: float, pad: float = 0.0) -> bool:
	return absf(z - path_z(x)) < PATH_HALF_WIDTH + pad


func build(arena_half: Vector2, layout_seed: int) -> void:
	_half = arena_half
	_rng.seed = layout_seed
	var cloud := _noise_texture(0.012, 3)
	_build_light_and_sky()
	_build_ground(cloud)
	_build_scenery()
	_build_grass(cloud)
	_build_flowers()
	_build_dust()


## Bend the grass around the hero and keep the dust near the camera.
func track(hero_pos: Vector3, camera_focus: Vector3) -> void:
	_grass_material.set_shader_parameter("pusher", hero_pos)
	_dust.position = Vector3(camera_focus.x, 1.8, camera_focus.z)


## 0 = normal daylight, 1 = dimmed backdrop (ultimate).
func set_dim(amount: float, time: float = 0.25) -> void:
	var tw := create_tween()
	tw.tween_method(_apply_dim, _dim, amount, time)


func _apply_dim(amount: float) -> void:
	_dim = amount
	_sun.light_energy = SUN_ENERGY * (1.0 - 0.6 * amount)
	_env.ambient_light_energy = AMBIENT_ENERGY * (1.0 - 0.45 * amount)


# ---------------------------------------------------------------- light

func _build_light_and_sky() -> void:
	_sun = DirectionalLight3D.new()
	# Low sun from behind-left: long shadows fall toward the camera's right.
	_sun.rotation_degrees = Vector3(-34.0, -128.0, 0.0)
	_sun.light_color = SUN_COLOR
	_sun.light_energy = SUN_ENERGY
	_sun.shadow_enabled = true
	_sun.shadow_blur = 1.2
	_sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	_sun.directional_shadow_max_distance = 70.0
	add_child(_sun)

	_env = Environment.new()
	_env.background_mode = Environment.BG_COLOR
	_env.background_color = Color(0.62, 0.74, 0.62)
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_env.ambient_light_color = AMBIENT_COLOR
	_env.ambient_light_energy = AMBIENT_ENERGY
	_env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	_env.tonemap_white = 1.6
	_env.glow_enabled = true
	_env.glow_intensity = 0.55
	_env.glow_bloom = 0.06
	_env.glow_hdr_threshold = 0.95
	_env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	_env.fog_enabled = true
	_env.fog_light_color = Color(1.0, 0.88, 0.7)
	_env.fog_density = 0.004
	_env.fog_sun_scatter = 0.25
	_env.ssao_enabled = true
	_env.ssao_intensity = 1.2
	_env.adjustment_enabled = true
	_env.adjustment_saturation = 1.12
	_env.adjustment_contrast = 1.04
	var world_env := WorldEnvironment.new()
	world_env.environment = _env
	add_child(world_env)


# ---------------------------------------------------------------- ground

func _build_ground(cloud: Texture2D) -> void:
	var plane := PlaneMesh.new()
	plane.size = (_half + FIELD_MARGIN) * 2.0 + Vector2(60.0, 60.0)
	var mat := ShaderMaterial.new()
	mat.shader = GROUND_SHADER
	mat.set_shader_parameter("noise_tex", _noise_texture(0.02, 4))
	mat.set_shader_parameter("cloud_tex", cloud)
	mat.set_shader_parameter("path_base", PATH_BASE)
	mat.set_shader_parameter("path_amp", PATH_AMP)
	mat.set_shader_parameter("path_freq", PATH_FREQ)
	mat.set_shader_parameter("path_half_width", PATH_HALF_WIDTH)
	var ground := MeshInstance3D.new()
	ground.mesh = plane
	ground.material_override = mat
	ground.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(ground)


func _noise_texture(frequency: float, octaves: int) -> NoiseTexture2D:
	var noise := FastNoiseLite.new()
	noise.seed = _rng.randi()
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.frequency = frequency
	noise.fractal_octaves = octaves
	var tex := NoiseTexture2D.new()
	tex.noise = noise
	tex.width = 256
	tex.height = 256
	tex.seamless = true
	tex.generate_mipmaps = true
	return tex


# ---------------------------------------------------------------- grass

func _build_grass(cloud: Texture2D) -> void:
	_grass_material = ShaderMaterial.new()
	_grass_material.shader = GRASS_SHADER
	_grass_material.set_shader_parameter("cloud_tex", cloud)

	var field := _half + FIELD_MARGIN
	var want := int(field.x * 2.0 * field.y * 2.0 * GRASS_PER_M2)
	var spots: Array[Vector3] = [] # x, z, random
	for i: int in want:
		var x := _rng.randf_range(-field.x, field.x)
		var z := _rng.randf_range(-field.y, field.y)
		var r := _rng.randf()
		# Thin out toward the path edge, none on the path itself.
		var edge := absf(z - path_z(x)) - PATH_HALF_WIDTH
		if edge < 0.1 or (edge < 0.7 and r > edge / 0.7):
			continue
		if _blocked(x, z, 0.05):
			continue
		spots.append(Vector3(x, z, r))

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _grass_tuft_mesh()
	mm.instance_count = spots.size()
	for i: int in spots.size():
		var s := spots[i]
		var height := 0.6 + s.z * 0.75
		var xf := Transform3D(Basis(Vector3.UP, s.z * TAU).scaled(Vector3(1.0, height, 1.0)), Vector3(s.x, 0.0, s.y))
		mm.set_instance_transform(i, xf)
		mm.set_instance_custom_data(i, Color(s.x, s.y, s.z, 0.0))
	var grass := MultiMeshInstance3D.new()
	grass.multimesh = mm
	grass.material_override = _grass_material
	grass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(grass)


## Four tapered blades fanned around the root. UV.y = 0 at the root, 1 at the tip.
func _grass_tuft_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for b: int in 4:
		var turn := Basis(Vector3.UP, TAU * float(b) / 4.0 + 0.4)
		var lean := 0.08 + 0.04 * float(b)
		var w := 0.03
		var h := 0.36 - 0.045 * float(b)
		# Rows: root, middle, tip. Each row leans a little further out.
		var rows: Array[Vector3] = [Vector3(w, 0.0, 0.0), Vector3(w * 0.7, h * 0.55, lean * 0.4), Vector3(0.0, h, lean)]
		var left: Array[Vector3] = []
		var right: Array[Vector3] = []
		for row: Vector3 in rows:
			left.append(turn * Vector3(-row.x, row.y, row.z + 0.03))
			right.append(turn * Vector3(row.x, row.y, row.z + 0.03))
		var v := [0.0, 0.55, 1.0]
		_tri(st, left[0], right[0], right[1], v[0], v[0], v[1])
		_tri(st, left[0], right[1], left[1], v[0], v[1], v[1])
		_tri(st, left[1], right[1], left[2], v[1], v[1], v[2])
	st.generate_normals()
	return st.commit()


func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, va: float, vb: float, vc: float) -> void:
	st.set_uv(Vector2(0.5, va))
	st.add_vertex(a)
	st.set_uv(Vector2(0.5, vb))
	st.add_vertex(b)
	st.set_uv(Vector2(0.5, vc))
	st.add_vertex(c)


func _build_flowers() -> void:
	var mesh := Toon.sphere(0.06)
	mesh.radial_segments = 8
	mesh.rings = 4
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	# Unshaded: petals stay their own colour in sun and shade, like painted dots.
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var colors: Array[Color] = [Color(0.96, 0.94, 0.86), Color(0.98, 0.8, 0.3), Color(0.96, 0.62, 0.7), Color(0.98, 0.9, 0.55)]
	var field := _half + FIELD_MARGIN * 0.5
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	var spots: Array[Vector3] = []
	# Flowers grow in patches, not evenly.
	for patch: int in 26:
		var cx := _rng.randf_range(-field.x, field.x)
		var cz := _rng.randf_range(-field.y, field.y)
		for i: int in _rng.randi_range(8, 18):
			var x := cx + _rng.randfn(0.0, 1.0)
			var z := cz + _rng.randfn(0.0, 1.0)
			if not on_path(x, z, 0.3):
				spots.append(Vector3(x, z, float(patch % colors.size())))
	mm.instance_count = spots.size()
	for i: int in spots.size():
		var s := spots[i]
		var xf := Transform3D(Basis.from_scale(Vector3(1.0, 0.5, 1.0) * _rng.randf_range(0.7, 1.3)), Vector3(s.x, _rng.randf_range(0.22, 0.34), s.y))
		mm.set_instance_transform(i, xf)
		mm.set_instance_color(i, colors[int(s.z)])
	var flowers := MultiMeshInstance3D.new()
	flowers.multimesh = mm
	flowers.material_override = mat
	flowers.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(flowers)


# ---------------------------------------------------------------- scenery

func _build_scenery() -> void:
	# Far side and both ends: a tree line. Near side (toward the camera): only low bushes and rocks,
	# so nothing tall hides the fight.
	var x := -_half.x - FIELD_MARGIN.x
	while x < _half.x + FIELD_MARGIN.x:
		_tree(Vector3(x + _rng.randf_range(-1.0, 1.0), 0.0, -_half.y - _rng.randf_range(1.6, 4.5)))
		if _rng.randf() < 0.6:
			_tree(Vector3(x + _rng.randf_range(0.5, 2.5), 0.0, -_half.y - _rng.randf_range(6.0, 10.0)))
		if _rng.randf() < 0.7:
			_bush(Vector3(x + _rng.randf_range(-1.5, 1.5), 0.0, _half.y + _rng.randf_range(1.0, 3.0)))
		x += _rng.randf_range(3.0, 4.6)
	for side: float in [-1.0, 1.0]:
		var z := -_half.y
		while z < _half.y:
			var px := side * (_half.x + _rng.randf_range(1.5, 5.0))
			if not on_path(px, z, 2.0):
				_tree(Vector3(px, 0.0, z))
			z += _rng.randf_range(3.0, 5.0)
	# A few rocks and bushes inside the arena: cover to play around.
	var placed := 0
	var tries := 0
	while placed < 9 and tries < 200:
		tries += 1
		var p := Vector3(_rng.randf_range(-_half.x + 5.0, _half.x - 3.0), 0.0, _rng.randf_range(-_half.y + 1.5, _half.y - 1.5))
		if on_path(p.x, p.z, 1.6) or _blocked(p.x, p.z, 3.0):
			continue
		var r := _rock(p) if placed % 3 != 2 else _bush(p)
		obstacles.append(Vector3(p.x, p.z, r))
		placed += 1


func _blocked(x: float, z: float, pad: float) -> bool:
	for o: Vector3 in obstacles:
		if Vector2(x - o.x, z - o.y).length() < o.z + pad:
			return true
	return false


func _tree(pos: Vector3) -> void:
	var tree := Node3D.new()
	tree.position = pos
	tree.rotation.y = _rng.randf() * TAU
	var s := _rng.randf_range(0.85, 1.35)
	tree.scale = Vector3.ONE * s
	add_child(tree)
	var bark := Toon.material(Color(0.45, 0.31, 0.24), 0.03)
	Toon.part(tree, Toon.cylinder(0.22, 0.34, 1.9, 8), bark, Vector3(0.0, 0.95, 0.0))
	var greens: Array[Color] = [Color(0.26, 0.5, 0.24), Color(0.34, 0.6, 0.26), Color(0.44, 0.68, 0.28)]
	var tone := _rng.randi_range(0, 1)
	Toon.part(tree, _blob(1.35), Toon.material(greens[tone], 0.035), Vector3(0.0, 2.5, 0.0), Vector3(1.0, 0.85, 1.0))
	Toon.part(tree, _blob(1.0), Toon.material(greens[tone + 1], 0.035), Vector3(0.6, 3.2, 0.2), Vector3(1.0, 0.85, 1.0))
	Toon.part(tree, _blob(0.9), Toon.material(greens[tone + 1], 0.035), Vector3(-0.6, 3.0, -0.3), Vector3(1.0, 0.85, 1.0))


func _bush(pos: Vector3) -> float:
	var bush := Node3D.new()
	bush.position = pos
	bush.rotation.y = _rng.randf() * TAU
	add_child(bush)
	var s := _rng.randf_range(0.8, 1.15)
	var mat := Toon.material(Color(0.3, 0.56, 0.26), 0.028)
	Toon.part(bush, _blob(0.55 * s), mat, Vector3(0.0, 0.35 * s, 0.0), Vector3(1.0, 0.8, 1.0))
	Toon.part(bush, _blob(0.4 * s), Toon.material(Color(0.4, 0.66, 0.28), 0.028), Vector3(0.4 * s, 0.3 * s, 0.15), Vector3(1.0, 0.8, 1.0))
	Toon.part(bush, _blob(0.35 * s), mat, Vector3(-0.38 * s, 0.26 * s, -0.1), Vector3(1.0, 0.8, 1.0))
	return 0.7 * s


func _rock(pos: Vector3) -> float:
	var rock := Node3D.new()
	rock.position = pos
	rock.rotation.y = _rng.randf() * TAU
	add_child(rock)
	var s := _rng.randf_range(0.7, 1.2)
	var mat := Toon.material(Color(0.62, 0.62, 0.68), 0.028)
	Toon.part(rock, _blob(0.6 * s, 7, 4), mat, Vector3(0.0, 0.3 * s, 0.0), Vector3(1.15, 0.75, 0.95))
	Toon.part(rock, _blob(0.34 * s, 6, 3), Toon.material(Color(0.7, 0.7, 0.75), 0.028), Vector3(0.45 * s, 0.16 * s, 0.25 * s), Vector3(1.0, 0.7, 1.0))
	return 0.72 * s


func _blob(radius: float, segments: int = 12, rings: int = 6) -> SphereMesh:
	var m := Toon.sphere(radius)
	m.radial_segments = segments
	m.rings = rings
	return m


# ---------------------------------------------------------------- dust

func _build_dust() -> void:
	_dust = GPUParticles3D.new()
	_dust.amount = 110
	_dust.lifetime = 8.0
	_dust.preprocess = 8.0
	_dust.visibility_aabb = AABB(Vector3(-24.0, -3.0, -16.0), Vector3(48.0, 8.0, 32.0))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(18.0, 1.6, 11.0)
	pm.gravity = Vector3(0.12, 0.04, 0.0)
	pm.direction = Vector3(1.0, 0.2, 0.0)
	pm.spread = 180.0
	pm.initial_velocity_min = 0.05
	pm.initial_velocity_max = 0.25
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.3
	pm.turbulence_noise_scale = 2.5
	pm.scale_min = 0.5
	pm.scale_max = 1.5
	# Fade in and out so motes never pop.
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array([0.0, 0.2, 0.8, 1.0])
	fade.colors = PackedColorArray([Color(1, 1, 1, 0), Color(1, 1, 1, 1), Color(1, 1, 1, 1), Color(1, 1, 1, 0)])
	var ramp := GradientTexture1D.new()
	ramp.gradient = fade
	pm.color_ramp = ramp
	_dust.process_material = pm
	var quad := QuadMesh.new()
	quad.size = Vector2(0.09, 0.09)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_color = Color(2.2, 1.9, 1.3, 0.75) # warm and over 1.0: catches the bloom
	mat.albedo_texture = Fx.dot_texture()
	quad.material = mat
	_dust.draw_pass_1 = quad
	_dust.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_dust)
