// Grass tuft card: 3 pointed blades cut from a quad, dark at the root, light at the tip,
// swaying in a slow wind wave across the field. Cheap enough for thousands via MultiMesh.
shader_type spatial;
render_mode cull_disabled;

uniform vec4 root_color : source_color = vec4(0.20, 0.38, 0.17, 1.0);
uniform vec4 tip_color : source_color = vec4(0.66, 0.84, 0.40, 1.0);
uniform float sway = 0.09;
uniform float wind_speed = 1.4;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float h = 1.0 - UV.y; // QuadMesh: UV.y = 0 at the top
	VERTEX.x += sin(TIME * wind_speed + wp.x * 0.6 + wp.z * 0.4) * sway * h;
}

void fragment() {
	float w = abs(fract(UV.x * 3.0) - 0.5) * 2.0;
	if (w > UV.y * 0.95) {
		discard;
	}
	ALBEDO = mix(root_color.rgb, tip_color.rgb, 1.0 - UV.y);
	BACKLIGHT = vec3(0.25, 0.3, 0.1); // light glowing through blades
}
