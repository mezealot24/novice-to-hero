// Meadow floor: two grass tones, a winding dirt path and drifting cloud shadows.
// The path centre line must match Meadow.path_z() in world/meadow.gd.
shader_type spatial;
render_mode world_vertex_coords;

#include "wind.gdshaderinc"

uniform sampler2D noise_tex : repeat_enable, filter_linear_mipmap;
uniform vec3 grass_a : source_color = vec3(0.24, 0.44, 0.17);
uniform vec3 grass_b : source_color = vec3(0.33, 0.54, 0.21);
uniform vec3 dirt_a : source_color = vec3(0.68, 0.55, 0.38);
uniform vec3 dirt_b : source_color = vec3(0.6, 0.47, 0.32);
uniform float path_base = 0.0;
uniform float path_amp = 2.2;
uniform float path_freq = 0.16;
uniform float path_half_width = 1.5;

varying vec3 wpos;

void vertex() {
	wpos = VERTEX;
}

void fragment() {
	float n = texture(noise_tex, wpos.xz * 0.06).r;
	float n2 = texture(noise_tex, wpos.xz * 0.21 + vec2(0.37, 0.11)).r;
	vec3 grass = mix(grass_a, grass_b, smoothstep(0.35, 0.65, n));
	float pz = path_base + path_amp * sin(wpos.x * path_freq);
	float d = abs(wpos.z - pz) + (n2 - 0.5) * 0.9;
	float path = 1.0 - smoothstep(path_half_width - 0.25, path_half_width + 0.25, d);
	vec3 dirt = mix(dirt_b, dirt_a, smoothstep(0.3, 0.7, n2));
	// Darker worn rim where grass meets dirt.
	float rim = smoothstep(path_half_width - 0.7, path_half_width, d) * path;
	dirt = mix(dirt, dirt * 0.78, rim);
	ALBEDO = mix(grass, dirt, path) * cloud_shade(wpos.xz);
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
}
