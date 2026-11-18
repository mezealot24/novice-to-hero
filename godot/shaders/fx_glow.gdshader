// Soft additive blob for dust motes, sparks, slashes and portal light. Bright values feed the bloom.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;

uniform vec4 color : source_color = vec4(1.0, 0.95, 0.8, 1.0);
uniform float energy = 1.5;
// 0 = round blob, 1 = crescent slash (uses UV as a polar arc).
uniform float slash : hint_range(0.0, 1.0) = 0.0;
uniform float alpha : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float blob = 1.0 - smoothstep(0.0, 1.0, r);
	blob *= blob;
	float arc = smoothstep(0.55, 0.8, r) * (1.0 - smoothstep(0.86, 1.0, r));
	arc *= smoothstep(-0.2, 0.5, p.y); // half ring, fading at the ends
	float a = mix(blob, arc, slash);
	ALBEDO = color.rgb * energy * COLOR.rgb;
	ALPHA = a * alpha * color.a * COLOR.a;
}
