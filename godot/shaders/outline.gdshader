// Inverted-hull outline: draws the back faces pushed out along the normal, in a flat dark colour.
shader_type spatial;
render_mode unshaded, cull_front;

uniform vec4 outline_color : source_color = vec4(0.09, 0.07, 0.12, 1.0);
uniform float thickness : hint_range(0.0, 0.2) = 0.03;

void vertex() {
	VERTEX += NORMAL * thickness;
}

void fragment() {
	ALBEDO = outline_color.rgb;
}
