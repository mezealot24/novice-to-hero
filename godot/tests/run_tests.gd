# Headless test runner. Exit code 1 on any failure.
#   godot --headless --path godot --import        (once per fresh checkout)
#   godot --headless --path godot --script res://tests/run_tests.gd
# The runner script is compiled before autoloads exist, so the tests live in suite.gd, loaded here.
extends SceneTree


func _initialize() -> void:
	var suite_script := load("res://tests/suite.gd") as GDScript
	if suite_script == null or not suite_script.can_instantiate():
		push_error("FAIL: tests/suite.gd does not compile")
		quit(1)
		return
	var suite: Node = suite_script.new()
	await process_frame # root joins the tree on the first frame
	root.add_child(suite)
