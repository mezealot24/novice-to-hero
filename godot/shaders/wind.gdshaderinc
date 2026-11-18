// Shared by ground and grass so cloud shadows line up.
uniform sampler2D cloud_tex : repeat_enable, filter_linear;
uniform float cloud_strength : hint_range(0.0, 1.0) = 0.28;

float cloud_shade(vec2 world_xz) {
	float c = texture(cloud_tex, world_xz * 0.018 + vec2(TIME * 0.006, TIME * 0.003)).r;
	return 1.0 - cloud_strength * smoothstep(0.45, 0.75, c);
}
