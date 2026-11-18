class_name HeroVisual
extends Node3D
## What the hero logic needs from any hero look (placeholder chibi or an imported model).
## Models face +Z. The owner calls tick() every frame.

var flash_materials: Array[ShaderMaterial] = []
## 0 = standing, 1 = full run.
var locomotion := 0.0


func tick(_dt: float) -> void:
	pass


## One basic attack swing lasting `duration` seconds.
func attack(_duration: float) -> void:
	pass


## Quick throw / cast gesture.
func cast() -> void:
	pass


func dash(_duration: float) -> void:
	pass


## Ultimate: spin while active.
func set_spinning(_active: bool) -> void:
	pass


func die() -> void:
	pass


func revive() -> void:
	pass
