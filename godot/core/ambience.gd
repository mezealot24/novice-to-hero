## "Cozy diorama" vibe (reference: warm tilt-shift look): warm sun + cool shadows, bloom, filmic tone,
## tilt-shift depth of field, swaying grass and floating dust motes. Needs the Forward+ renderer.
extends RefCounted

const GRASS_SHADER := preload("res://shaders/grass.gdshader")


static func environment() -> WorldEnvironment:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("2a2a3a")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("7f8fc4") # cool fill, so shadows read blue against the warm sun
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.7
	env.glow_bloom = 0.08
	env.glow_hdr_threshold = 0.9
	env.fog_enabled = true
	env.fog_light_color = Color("e8c9a0")
	env.fog_density = 0.006
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.15
	env.adjustment_contrast = 1.05
	var we := WorldEnvironment.new()
	we.environment = env
	return we


static func sun() -> DirectionalLight3D:
	var s := DirectionalLight3D.new()
	s.rotation_degrees = Vector3(-50.0, -40.0, 0.0)
	s.light_color = Color("ffdcae") # late-afternoon warm
	s.light_energy = 1.25
	s.shadow_enabled = true
	s.shadow_blur = 1.5
	return s


## Tilt-shift: the band around the focus stays sharp, nearer and farther things blur.
static func camera_attributes() -> CameraAttributesPractical:
	var a := CameraAttributesPractical.new()
	a.dof_blur_far_enabled = true
	a.dof_blur_near_enabled = true
	a.dof_blur_amount = 0.12
	return a


## Call when the camera distance changes (zoom).
static func focus_dof(a: CameraAttributesPractical, cam_dist: float) -> void:
	a.dof_blur_near_distance = cam_dist - 5.0
	a.dof_blur_near_transition = 3.0
	a.dof_blur_far_distance = cam_dist + 4.0
	a.dof_blur_far_transition = 8.0


## `count` grass tufts scattered over `size` (x, z), skipping points where `skip.call(pos)` is true.
static func grass(size: Vector2, count: int, skip: Callable) -> MultiMeshInstance3D:
	var quad := QuadMesh.new()
	quad.size = Vector2(0.45, 0.4)
	quad.center_offset = Vector3(0.0, 0.2, 0.0)
	var mat := ShaderMaterial.new()
	mat.shader = GRASS_SHADER
	quad.material = mat
	var spots: Array[Transform3D] = []
	var half := size * 0.5
	for i in count:
		var p := Vector3(randf_range(-half.x, half.x), 0.0, randf_range(-half.y, half.y))
		if skip.call(p):
			continue
		var b := Basis(Vector3.UP, randf() * TAU).scaled(Vector3.ONE * randf_range(0.6, 1.4))
		spots.append(Transform3D(b, p))
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = quad
	mm.instance_count = spots.size()
	for i in spots.size():
		mm.set_instance_transform(i, spots[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mmi


## Warm glowing motes drifting up through the air over `size` (x, z).
static func dust(size: Vector2) -> GPUParticles3D:
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(size.x * 0.5, 2.0, size.y * 0.5)
	pm.gravity = Vector3(0.0, 0.06, 0.0)
	pm.initial_velocity_min = 0.05
	pm.initial_velocity_max = 0.2
	pm.direction = Vector3(0.3, 1.0, 0.1)
	pm.spread = 60.0
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.4
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 0))
	fade.set_color(1, Color(1, 1, 1, 0))
	fade.add_point(0.3, Color(1, 1, 1, 1))
	fade.add_point(0.7, Color(1, 1, 1, 1))
	var ramp := GradientTexture1D.new()
	ramp.gradient = fade
	pm.color_ramp = ramp

	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.vertex_color_use_as_albedo = true
	m.albedo_color = Color(1.0, 0.86, 0.55)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.8, 0.45)
	m.emission_energy_multiplier = 2.5
	var q := QuadMesh.new()
	q.size = Vector2(0.06, 0.06)
	q.material = m

	var p := GPUParticles3D.new()
	p.amount = 160
	p.lifetime = 7.0
	p.preprocess = 7.0
	p.process_material = pm
	p.draw_pass_1 = q
	p.position = Vector3(0.0, 1.5, 0.0)
	p.visibility_aabb = AABB(Vector3(-size.x, -3.0, -size.y), Vector3(size.x * 2.0, 8.0, size.y * 2.0))
	return p
