# Compiles every .gdshader. Errors show up as "SHADER ERROR" in the log:
#   godot --headless --path godot --script res://tests/compile_shaders.gd > shaders.log 2>&1
#   grep -nE "SHADER ERROR|Shader compilation failed" shaders.log     (no output = pass)
extends SceneTree


func _initialize() -> void:
	var paths := _find("res://", "gdshader")
	for path: String in paths:
		print("compiling ", path)
		var shader := load(path) as Shader
		shader.get_shader_uniform_list() # forces the compile; load() alone is lazy
	print("Compiled %d shaders" % paths.size())
	quit(0)


func _find(dir: String, ext: String) -> PackedStringArray:
	var found := PackedStringArray()
	for file: String in DirAccess.get_files_at(dir):
		if file.get_extension() == ext:
			found.append(dir.path_join(file))
	for sub: String in DirAccess.get_directories_at(dir):
		if not sub.begins_with("."):
			found.append_array(_find(dir.path_join(sub), ext))
	return found
