// Ground telegraphs and markers on a flat quad: a ring that fills from the centre as `fill` goes 0..1.
// Unshaded and additive-free so it reads on grass and dirt alike.
shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, shadows_disabled;

uniform vec4 color : source_color = vec4(1.0, 0.25, 0.2, 1.0);
uniform float fill : hint_range(0.0, 1.0) = 0.0;
uniform float alpha : hint_range(0.0, 1.0) = 1.0;
// 0 = circle, 1 = rectangle (line telegraph): the quad is scaled by the caller.
uniform float rect : hint_range(0.0, 1.0) = 0.0;
uniform float glow = 1.0;
// Faint tint over the whole shape, so the danger area reads before it fills.
uniform float base : hint_range(0.0, 1.0) = 0.14;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float d = mix(length(p), max(abs(p.x), abs(p.y)), rect);
	float inside = 1.0 - smoothstep(0.97, 1.0, d);
	float edge = smoothstep(0.86, 0.93, d) * inside;
	// Rectangles fill along their length (UV.y), circles from the centre out.
	float fill_d = mix(d, UV.y, rect);
	float filled = (1.0 - smoothstep(fill - 0.02, fill, fill_d)) * inside;
	float a = max(edge * 0.95, max(filled * 0.42, inside * base));
	ALBEDO = color.rgb * glow;
	ALPHA = a * alpha * color.a;
}
