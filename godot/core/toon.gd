## Toon look helpers: toon material (+ outline pass) for placeholders and imported models,
## plus finding / loading character models dropped into res://assets/.
extends RefCounted

const TOON := preload("res://shaders/toon.gdshader")
const OUTLINE := preload("res://shaders/outline.gdshader")


## A toon material with an outline pass. `outline` is in the mesh's own units (before node scale).
static func material(color: Color, tex: Texture2D = null, outline := 0.03) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = TOON
	m.set_shader_parameter("albedo", color)
	if tex != null:
		m.set_shader_parameter("albedo_tex", tex)
	if outline > 0.0:
		var o := ShaderMaterial.new()
		o.shader = OUTLINE
		o.set_shader_parameter("thickness", outline)
		m.next_pass = o
	return m


## Replaces every surface material under `root` with a toon one that keeps its colour and texture.
static func apply(root: Node, outline := 0.03) -> void:
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi.mesh == null:
			continue
		for i in mi.mesh.get_surface_count():
			var src := mi.get_active_material(i)
			var color := Color.WHITE
			var tex: Texture2D = null
			if src is BaseMaterial3D:
				color = (src as BaseMaterial3D).albedo_color
				tex = (src as BaseMaterial3D).albedo_texture
			mi.set_surface_override_material(i, material(color, tex, outline))


## Finds the .glb / .gltf under `root` whose file name contains `keyword` (shortest name wins,
## so "Rogue.glb" beats "Rogue_Hooded.glb"). Returns "" if none.
static func find_model(root: String, keyword: String) -> String:
	var hits: PackedStringArray = []
	_collect(root, keyword.to_lower(), hits)
	var best := ""
	for h in hits:
		if best == "" or h.get_file().length() < best.get_file().length():
			best = h
	return best


static func _collect(dir_path: String, keyword: String, hits: PackedStringArray) -> void:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return
	for f in dir.get_files():
		var low := f.to_lower()
		if (low.ends_with(".glb") or low.ends_with(".gltf")) and low.contains(keyword):
			hits.append(dir_path.path_join(f))
	for d in dir.get_directories():
		_collect(dir_path.path_join(d), keyword, hits)


## Instances a model scene scaled to `height` metres and turned to face -Z (Godot's look_at forward).
## Returns null if the file can't be loaded.
static func load_character(path: String, height: float) -> Node3D:
	var scene := load(path) as PackedScene
	if scene == null:
		return null
	var model := scene.instantiate() as Node3D
	if model == null:
		return null
	var h := 0.0
	for n in model.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi.mesh != null:
			h = maxf(h, mi.mesh.get_aabb().size.y)
	if h > 0.0:
		model.scale = Vector3.ONE * (height / h)
	model.rotation.y = PI # glTF models face +Z
	return model


## First animation whose name contains any of `keys` (case-insensitive), or "".
static func pick_anim(ap: AnimationPlayer, keys: PackedStringArray) -> String:
	for k in keys:
		for a in ap.get_animation_list():
			if String(a).to_lower().contains(k):
				return a
	return ""
