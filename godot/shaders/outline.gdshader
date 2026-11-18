// Inverted hull outline, used as next_pass of the toon material.
// world_vertex_coords keeps the line the same thickness on scaled and squashed meshes.
shader_type spatial;
render_mode unshaded, cull_front, world_vertex_coords;

uniform vec4 outline_color : source_color = vec4(0.16, 0.1, 0.13, 1.0);
uniform float width : hint_range(0.0, 0.2) = 0.022;

void vertex() {
	VERTEX += normalize(NORMAL) * width;
}

void fragment() {
	ALBEDO = outline_color.rgb;
}
