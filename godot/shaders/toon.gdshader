// Trickster-style cel shading: 2 tones (lit / shade), hard shadow edge, soft rim light.
// Keeps the model's own albedo texture (KayKit uses one shared atlas).
shader_type spatial;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, hint_default_white;
uniform float shade_threshold : hint_range(-1.0, 1.0) = 0.2;
uniform float shade_softness : hint_range(0.0, 0.5) = 0.03;
uniform float shade_floor : hint_range(0.0, 1.0) = 0.45; // brightness of the shaded tone
uniform vec4 rim_color : source_color = vec4(1.0, 0.95, 0.85, 1.0);
uniform float rim_strength : hint_range(0.0, 1.0) = 0.25;

void fragment() {
	ALBEDO = albedo.rgb * texture(albedo_tex, UV).rgb;
	float rim = 1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0);
	EMISSION = rim_color.rgb * ALBEDO * smoothstep(0.62, 0.72, rim) * rim_strength;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	float lit = smoothstep(shade_threshold - shade_softness, shade_threshold + shade_softness, ndl);
	lit *= smoothstep(0.45, 0.55, ATTENUATION); // hard-edged shadows too
	DIFFUSE_LIGHT += LIGHT_COLOR / PI * mix(shade_floor, 1.0, lit);
}
