class_name Toon
extends RefCounted
## Builds toon-shaded parts: every mesh gets the cel shader plus an inverted-hull outline.

const TOON_SHADER: Shader = preload("res://shaders/toon.gdshader")
const OUTLINE_SHADER: Shader = preload("res://shaders/outline.gdshader")
const OUTLINE_WIDTH := 0.028

static var _outlines: Dictionary[int, ShaderMaterial] = {}


## Outline materials are shared per width; toon materials are per part so each actor can flash alone.
static func outline(width: float) -> ShaderMaterial:
	var key := roundi(width * 10000.0)
	if _outlines.has(key):
		return _outlines[key]
	var mat := ShaderMaterial.new()
	mat.shader = OUTLINE_SHADER
	mat.set_shader_parameter("width", width)
	_outlines[key] = mat
	return mat


static func material(color: Color, outline_width: float = OUTLINE_WIDTH, texture: Texture2D = null) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = TOON_SHADER
	mat.set_shader_parameter("albedo", color)
	if texture != null:
		mat.set_shader_parameter("albedo_tex", texture)
	if outline_width > 0.0:
		mat.next_pass = outline(outline_width)
	return mat


static func sphere(radius: float) -> SphereMesh:
	var m := SphereMesh.new()
	m.radius = radius
	m.height = radius * 2.0
	m.radial_segments = 20
	m.rings = 10
	return m


static func capsule(radius: float, height: float) -> CapsuleMesh:
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = maxf(height, radius * 2.0)
	m.radial_segments = 14
	m.rings = 5
	return m


## A cylinder, or a cone when top is 0.
static func cylinder(top: float, bottom: float, height: float, segments: int = 14) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = top
	m.bottom_radius = bottom
	m.height = height
	m.radial_segments = segments
	m.rings = 1
	return m


static func part(parent: Node3D, mesh: Mesh, mat: Material, pos: Vector3 = Vector3.ZERO,
		scl: Vector3 = Vector3.ONE, rot_deg: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scl
	mi.rotation_degrees = rot_deg
	parent.add_child(mi)
	return mi


## Re-skins an imported model (e.g. a KayKit .glb) with the toon shader, keeping its albedo texture.
## Returns the new materials so the owner can flash them.
static func apply_to_model(root: Node, outline_width: float = OUTLINE_WIDTH) -> Array[ShaderMaterial]:
	var out: Array[ShaderMaterial] = []
	for node: Node in root.find_children("*", "MeshInstance3D", true, false):
		var mi := node as MeshInstance3D
		if mi == null or mi.mesh == null:
			continue
		for i: int in mi.mesh.get_surface_count():
			var src := mi.get_active_material(i) as BaseMaterial3D
			var color := Color.WHITE
			var tex: Texture2D = null
			if src != null:
				color = src.albedo_color
				tex = src.albedo_texture
			var mat := material(color, outline_width, tex)
			mi.set_surface_override_material(i, mat)
			out.append(mat)
	return out


static func set_flash(mats: Array[ShaderMaterial], amount: float, color: Color = Color.WHITE) -> void:
	for mat: ShaderMaterial in mats:
		mat.set_shader_parameter("flash", amount)
		mat.set_shader_parameter("flash_color", color)
