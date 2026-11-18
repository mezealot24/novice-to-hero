class_name Hud
extends CanvasLayer
## Heads-up display: hero HP / XP / combo points, the Q W E R bar, room title, boss bar, banners.
## It only reads the hero and arena; game rules live elsewhere.

const THAI_FONTS: PackedStringArray = ["Leelawadee UI", "Noto Sans Thai", "Sarabun", "Tahoma", "Loma", "Garuda", "Thonburi", "sans-serif"]
const KEY_COLORS: Dictionary[String, Color] = {
	"q": Color(0.6, 0.88, 1.0), "w": Color(0.72, 0.6, 1.0), "e": Color(1.0, 0.8, 0.35), "r": Color(1.0, 0.5, 0.55),
}

var font: SystemFont
var overlay: WorldOverlay

var _hero: Hero
var _arena: Arena
var _slots: Dictionary[String, SkillSlot] = {}
var _hp_bar: ProgressBar
var _hp_label: Label
var _xp_bar: ProgressBar
var _pips: Array[Panel] = []
var _title: Label
var _boss_box: Control
var _boss_bar: ProgressBar
var _boss_name: Label
var _banner: Label
var _banner_sub: Label
var _toast: Label
var _hint: Label
var _fade: ColorRect
var _toast_left := 0.0
var _boss: Monster


func _init() -> void:
	font = SystemFont.new()
	font.font_names = THAI_FONTS
	font.font_weight = 600
	var theme := Theme.new()
	theme.default_font = font
	theme.default_font_size = 16

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = theme
	add_child(root)

	overlay = WorldOverlay.new()
	overlay.font = font
	root.add_child(overlay)

	# --- top: room title + boss bar
	var top := VBoxContainer.new()
	top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	top.grow_horizontal = Control.GROW_DIRECTION_BOTH
	top.offset_top = 14.0
	top.alignment = BoxContainer.ALIGNMENT_CENTER
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top)
	_title = _label(top, 22, Color(1.0, 0.97, 0.88))
	_boss_box = VBoxContainer.new()
	_boss_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boss_box.visible = false
	top.add_child(_boss_box)
	_boss_name = _label(_boss_box, 16, Color(1.0, 0.8, 0.8))
	_boss_bar = _bar(_boss_box, Vector2(460.0, 16.0), Color(0.9, 0.25, 0.3))
	_toast = _label(top, 20, Color(1.0, 0.85, 0.4))

	# --- centre: banners
	var mid := VBoxContainer.new()
	mid.set_anchors_preset(Control.PRESET_CENTER)
	mid.grow_horizontal = Control.GROW_DIRECTION_BOTH
	mid.grow_vertical = Control.GROW_DIRECTION_BOTH
	mid.offset_top = -120.0
	mid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(mid)
	_banner = _label(mid, 54, Color(1.0, 0.95, 0.75))
	_banner_sub = _label(mid, 20, Color.WHITE)

	# --- bottom: combo pips, HP, XP, skills
	var bottom := VBoxContainer.new()
	bottom.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	bottom.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bottom.grow_vertical = Control.GROW_DIRECTION_BEGIN
	bottom.offset_bottom = -14.0
	bottom.alignment = BoxContainer.ALIGNMENT_END
	bottom.add_theme_constant_override("separation", 5)
	bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bottom)
	var pip_row := HBoxContainer.new()
	pip_row.alignment = BoxContainer.ALIGNMENT_CENTER
	pip_row.add_theme_constant_override("separation", 6)
	pip_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(pip_row)
	for i: int in 5:
		var pip := Panel.new()
		pip.custom_minimum_size = Vector2(22.0, 10.0)
		pip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		pip_row.add_child(pip)
		_pips.append(pip)
	_hp_bar = _bar(bottom, Vector2(330.0, 20.0), Color(0.35, 0.82, 0.4))
	_hp_label = _label(_hp_bar, 14, Color.WHITE)
	_hp_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hp_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_xp_bar = _bar(bottom, Vector2(330.0, 6.0), Color(0.95, 0.8, 0.3))
	var skills := HBoxContainer.new()
	skills.alignment = BoxContainer.ALIGNMENT_CENTER
	skills.add_theme_constant_override("separation", 8)
	skills.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(skills)
	for key: String in Hero.SKILL_KEYS:
		var slot := SkillSlot.new()
		slot.key_label = key.to_upper()
		slot.font = font
		slot.accent = KEY_COLORS[key]
		skills.add_child(slot)
		_slots[key] = slot

	_hint = _label(root, 13, Color(1.0, 1.0, 1.0, 0.8))
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_hint.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_hint.offset_left = 14.0
	_hint.offset_bottom = -12.0
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_hint.text = "คลิกขวา/ซ้าย: เดิน · โจมตี\nQ W E R: สกิล (เล็งด้วยเมาส์)\nS: หยุด · Y: ล็อกกล้อง · Space: กลับมาที่ตัว\nล้อเมาส์: ซูม · F9: เริ่มใหม่"

	_fade = ColorRect.new()
	_fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade.color = Color(0.05, 0.04, 0.08, 0.0)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_fade)


func bind(hero: Hero, arena: Arena, camera: Camera3D) -> void:
	_hero = hero
	_arena = arena
	overlay.camera = camera
	overlay.arena = arena
	for key: String in Hero.SKILL_KEYS:
		_slots[key].skill_name = hero.skill_name(key)
	arena.damage_shown.connect(overlay.add_number)
	arena.announced.connect(toast)
	hero.leveled_up.connect(_on_level_up)
	hero.skill_failed.connect(_on_skill_failed)


func set_room(title: String, boss: Monster) -> void:
	_title.text = title
	_boss = boss
	_boss_box.visible = boss != null
	if boss != null:
		_boss_name.text = boss.display_name


func show_banner(text: String, sub: String = "") -> void:
	_banner.text = text
	_banner_sub.text = sub
	_banner.pivot_offset = _banner.size * 0.5
	_banner.scale = Vector2(0.6, 0.6)
	var tw := create_tween()
	tw.set_ignore_time_scale(true)
	tw.tween_property(_banner, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func hide_banner() -> void:
	_banner.text = ""
	_banner_sub.text = ""


func toast(text: String) -> void:
	_toast.text = text
	_toast_left = 2.2


## Fades to dark, runs `midway`, fades back.
func fade_through(midway: Callable) -> void:
	var tw := create_tween()
	tw.tween_property(_fade, "color:a", 1.0, 0.25)
	tw.tween_callback(midway)
	tw.tween_property(_fade, "color:a", 0.0, 0.3)


func _process(delta: float) -> void:
	if _hero == null:
		return
	_hp_bar.max_value = _hero.max_hp
	_hp_bar.value = _hero.hp
	_hp_label.text = "HP %d / %d   ·   Lv %d" % [_hero.hp, _hero.max_hp, _hero.level]
	_xp_bar.max_value = _hero.xp_needed()
	_xp_bar.value = _hero.xp if not _hero.is_max_level() else _hero.xp_needed()
	for i: int in _pips.size():
		_pips[i].visible = i < _hero.combo_max
		_pips[i].modulate = Color(1.0, 0.8, 0.3) if i < _hero.combo_points else Color(0.3, 0.3, 0.36, 0.8)
	for key: String in Hero.SKILL_KEYS:
		_slots[key].refresh(_hero.cooldown_ratio(key), _hero.cooldowns[key])
	if _boss != null and is_instance_valid(_boss):
		_boss_bar.max_value = _boss.max_hp
		_boss_bar.value = _boss.hp
		_boss_name.text = _boss.display_name + ("   · เกราะ %d" % _boss.shield if _boss.shield > 0 else "")
		_boss_box.visible = _boss.alive
	if _toast_left > 0.0:
		_toast_left -= delta
		_toast.modulate.a = clampf(_toast_left / 0.4, 0.0, 1.0)
		if _toast_left <= 0.0:
			_toast.text = ""


func _on_level_up(level: int) -> void:
	overlay.add_text(_hero.position + Vector3(0.0, 1.9, 0.0), "LEVEL %d" % level, Color(1.0, 0.92, 0.4))


func _on_skill_failed(_key: String, reason: String) -> void:
	overlay.add_text(_hero.position + Vector3(0.0, 1.7, 0.0), reason, Color(0.9, 0.9, 0.95))


func _label(parent: Node, size: int, color: Color) -> Label:
	var l := Label.new()
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(0.1, 0.07, 0.1))
	l.add_theme_constant_override("outline_size", maxi(4, roundi(float(size) * 0.2)))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	return l


func _bar(parent: Node, bar_size: Vector2, color: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = bar_size
	bar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	bar.show_percentage = false
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var back := StyleBoxFlat.new()
	back.bg_color = Color(0.1, 0.08, 0.12, 0.85)
	back.set_corner_radius_all(4)
	back.set_border_width_all(2)
	back.border_color = Color(0.1, 0.08, 0.12)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	fill.set_border_width_all(2)
	fill.border_color = Color(0.1, 0.08, 0.12, 0.0)
	bar.add_theme_stylebox_override("background", back)
	bar.add_theme_stylebox_override("fill", fill)
	parent.add_child(bar)
	return bar
