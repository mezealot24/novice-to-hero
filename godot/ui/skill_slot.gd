class_name SkillSlot
extends Control
## One skill button on the HUD: key, name, cooldown sweep and seconds left.

const SIZE := Vector2(74.0, 74.0)

var key_label := "Q"
var skill_name := ""
var font: Font
## 1 = just used, 0 = ready.
var cooldown_ratio := 0.0
var cooldown_seconds := 0.0
var accent := Color(0.6, 0.85, 1.0)

var _pulse := 0.0


func _init() -> void:
	custom_minimum_size = SIZE
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func refresh(ratio: float, seconds: float) -> void:
	if cooldown_ratio > 0.0 and ratio <= 0.0:
		_pulse = 1.0 # ready again: a short glow
	cooldown_ratio = ratio
	cooldown_seconds = seconds
	queue_redraw()


func _process(delta: float) -> void:
	if _pulse > 0.0:
		_pulse = maxf(_pulse - delta * 3.0, 0.0)
		queue_redraw()


func _draw() -> void:
	var rect := Rect2(Vector2.ZERO, size)
	var ready := cooldown_ratio <= 0.0
	draw_rect(rect, Color(0.1, 0.09, 0.14, 0.88))
	draw_rect(rect.grow(-3.0), Color(0.2, 0.19, 0.3) if ready else Color(0.13, 0.12, 0.18))
	if not ready:
		var h := (size.y - 6.0) * cooldown_ratio
		draw_rect(Rect2(3.0, 3.0, size.x - 6.0, h), Color(0.0, 0.0, 0.0, 0.55))
	draw_rect(rect, accent if ready else Color(0.35, 0.35, 0.42), false, 2.0)
	if _pulse > 0.0:
		draw_rect(rect.grow(3.0 * _pulse), Color(accent.r, accent.g, accent.b, _pulse), false, 3.0)
	if font == null:
		return
	draw_string(font, Vector2(7.0, 22.0), key_label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 18, accent if ready else Color(0.6, 0.6, 0.65))
	draw_string(font, Vector2(4.0, size.y - 9.0), skill_name, HORIZONTAL_ALIGNMENT_CENTER, size.x - 8.0, 13, Color(0.92, 0.92, 0.96))
	if not ready:
		draw_string(font, Vector2(0.0, size.y * 0.5 + 9.0), "%.0f" % ceilf(cooldown_seconds) if cooldown_seconds >= 1.0 else "%.1f" % cooldown_seconds,
			HORIZONTAL_ALIGNMENT_CENTER, size.x, 24, Color.WHITE)
