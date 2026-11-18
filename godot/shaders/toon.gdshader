// Cel shading for characters and props: two tones with a hard edge, cool shadows, soft rim.
// Shadows are tinted, not just darkened, so warm sun + cool shade read like late afternoon.
shader_type spatial;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, hint_default_white;
uniform vec3 shade_color : source_color = vec3(0.42, 0.44, 0.72);
uniform float shade_threshold : hint_range(-1.0, 1.0) = 0.08;
uniform float shade_softness : hint_range(0.001, 0.5) = 0.035;
uniform vec3 rim_color : source_color = vec3(1.0, 0.9, 0.72);
uniform float rim_strength : hint_range(0.0, 1.0) = 0.22;
// Hit feedback: 0 = normal, 1 = solid flash_color.
uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec3 flash_color : source_color = vec3(1.0, 1.0, 1.0);

void fragment() {
	vec3 base = albedo.rgb * texture(albedo_tex, UV).rgb;
	ALBEDO = mix(base, flash_color, flash);
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
	float rim = 1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0);
	EMISSION = rim_color * base * smoothstep(0.6, 0.7, rim) * rim_strength + flash_color * flash * 0.5;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	float lit = smoothstep(shade_threshold - shade_softness, shade_threshold + shade_softness, ndl);
	lit *= smoothstep(0.4, 0.6, ATTENUATION); // cast shadows get the same hard edge
	DIFFUSE_LIGHT += LIGHT_COLOR / PI * mix(shade_color, vec3(1.0), lit);
}
