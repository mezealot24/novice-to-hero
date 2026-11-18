class_name ModelRogue
extends HeroVisual
## Wraps an imported model (e.g. KayKit Rogue.glb, CC0) behind the same interface as the placeholder.
## Clips are found by name, so any rig with idle / run / attack style names works.

const ASSETS_DIR := "res://assets"
const MODEL_EXTENSIONS: Array[String] = ["glb", "gltf"]
const TARGET_HEIGHT := 1.35
## Clip name fragments in order of preference (lower case).
const CLIP_HINTS: Dictionary[String, Array] = {
	"idle": ["idle"],
	"run": ["running_a", "run", "jog", "walk"],
	"attack": ["dualwield_melee_attack_slice", "1h_melee_attack_slice_diagonal", "melee_attack", "attack", "slice", "stab"],
	"cast": ["throw", "spellcast_shoot", "cast"],
	"dash": ["dodge_forward", "dodge", "roll", "dash"],
	"spin": ["spin", "whirl", "dualwield_melee_attack_chop"],
	"death": ["death_a", "death", "die"],
}

var _anim: AnimationPlayer
var _clips: Dictionary[String, StringName] = {}
var _busy_left := 0.0
var _spinning := false
var _dead := false
var _model: Node3D


## Returns null when res://assets has no model with "rogue" in its file name.
static func try_load() -> ModelRogue:
	var path := find_model_path()
	if path.is_empty():
		return null
	var scene := load(path) as PackedScene
	if scene == null:
		push_warning("ModelRogue: %s is not imported yet (open the project in the editor once)" % path)
		return null
	var model := scene.instantiate() as Node3D
	if model == null:
		return null
	var visual := ModelRogue.new()
	visual._setup(model, path)
	return visual


static func find_model_path() -> String:
	var files := DirAccess.get_files_at(ASSETS_DIR)
	files.sort()
	for file: String in files:
		if file.to_lower().contains("rogue") and file.get_extension().to_lower() in MODEL_EXTENSIONS:
			return ASSETS_DIR.path_join(file)
	return ""


func tick(dt: float) -> void:
	if _spinning and not _dead:
		_model.rotation.y += dt * 22.0
	if _anim == null or _dead:
		return
	if _busy_left > 0.0:
		_busy_left -= dt
		return
	if _spinning and _clips.has("spin"):
		_play("spin", 2.0)
		return
	_play("run" if locomotion > 0.15 else "idle", 1.0)


func attack(duration: float) -> void:
	_one_shot("attack", duration)


func cast() -> void:
	_one_shot("cast", 0.3)


func dash(duration: float) -> void:
	_one_shot("dash", duration)


func set_spinning(active: bool) -> void:
	_spinning = active
	if not active:
		_model.rotation.y = 0.0


func die() -> void:
	_dead = true
	if _anim != null and _clips.has("death"):
		_anim.play(_clips["death"], 0.1)


func revive() -> void:
	_dead = false
	_busy_left = 0.0


func _setup(model: Node3D, path: String) -> void:
	_model = model
	add_child(model)
	flash_materials = Toon.apply_to_model(model)
	_fit_height(model)
	_anim = _find_player(model)
	if _anim == null or _anim.get_animation_list().is_empty():
		_anim = _borrow_animations(model, path)
	if _anim == null:
		push_warning("ModelRogue: %s has no animations; the model will slide" % path)
		return
	for key: String in CLIP_HINTS:
		var clip := _match_clip(CLIP_HINTS[key])
		if not clip.is_empty():
			_clips[key] = clip
	for key: String in ["idle", "run"]:
		if _clips.has(key):
			_anim.get_animation(_clips[key]).loop_mode = Animation.LOOP_LINEAR


func _fit_height(model: Node3D) -> void:
	var top := 0.0
	for node: Node in model.find_children("*", "MeshInstance3D", true, false):
		var mi := node as MeshInstance3D
		var box := mi.global_transform * mi.get_aabb() if mi.is_inside_tree() else mi.transform * mi.get_aabb()
		top = maxf(top, box.end.y)
	if top > 0.01:
		model.scale = Vector3.ONE * (TARGET_HEIGHT / top)


func _find_player(root: Node) -> AnimationPlayer:
	var found := root.find_children("*", "AnimationPlayer", true, false)
	return found[0] as AnimationPlayer if not found.is_empty() else null


## KayKit ships characters and clips in separate files that share one rig: take the clips from
## the other models in the folder and play them on this skeleton.
func _borrow_animations(model: Node3D, own_path: String) -> AnimationPlayer:
	var player := _find_player(model)
	if player == null:
		player = AnimationPlayer.new()
		model.add_child(player)
	var count := 0
	for file: String in DirAccess.get_files_at(ASSETS_DIR):
		var path := ASSETS_DIR.path_join(file)
		if path == own_path or not file.get_extension().to_lower() in MODEL_EXTENSIONS:
			continue
		var scene := load(path) as PackedScene
		if scene == null:
			continue
		var donor := scene.instantiate()
		var donor_player := _find_player(donor)
		if donor_player != null:
			for lib_name: StringName in donor_player.get_animation_library_list():
				var lib := donor_player.get_animation_library(lib_name)
				var new_name := StringName("%s_%d" % [file.get_basename(), count])
				if not player.has_animation_library(new_name):
					player.add_animation_library(new_name, lib)
					count += lib.get_animation_list().size()
		donor.free()
	return player if count > 0 else null


func _match_clip(hints: Array) -> StringName:
	var names := _anim.get_animation_list()
	for hint: String in hints:
		for clip: String in names:
			if clip.to_lower().contains(hint):
				return StringName(clip)
	return &""


func _one_shot(key: String, duration: float) -> void:
	if _anim == null or _dead or not _clips.has(key):
		return
	var length := _anim.get_animation(_clips[key]).length
	_busy_left = duration
	_anim.stop()
	_anim.play(_clips[key], 0.05, length / maxf(duration, 0.05))


func _play(key: String, speed: float) -> void:
	if not _clips.has(key) or _anim.current_animation == _clips[key]:
		return
	_anim.play(_clips[key], 0.15, speed)
