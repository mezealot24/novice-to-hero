// Grass blades in a MultiMesh: sway in the wind, bend away from the hero, root-to-tip gradient.
// UV.y is 0 at the root and 1 at the tip. INSTANCE_CUSTOM = (root x, root z, random 0..1, unused).
shader_type spatial;
render_mode cull_disabled, world_vertex_coords;

#include "wind.gdshaderinc"

uniform vec3 root_color : source_color = vec3(0.2, 0.4, 0.15);
uniform vec3 tip_color : source_color = vec3(0.5, 0.74, 0.26);
uniform vec3 dry_color : source_color = vec3(0.74, 0.78, 0.34);
uniform float wind_strength = 0.16;
uniform float wind_speed = 1.6;
uniform vec3 pusher = vec3(0.0, -100.0, 0.0); // hero position
uniform float push_radius = 1.1;

varying float tint_rand;
varying vec2 world_xz;

void vertex() {
	float h = UV.y;
	tint_rand = INSTANCE_CUSTOM.b;
	vec2 root = INSTANCE_CUSTOM.rg;
	// Two waves at unrelated rates: gusts roll across the field instead of a uniform wobble.
	float gust = sin(root.x * 0.45 + root.y * 0.3 + TIME * wind_speed)
		+ 0.5 * sin(root.x * 1.3 - root.y * 0.9 + TIME * wind_speed * 1.7 + tint_rand * 6.28);
	vec2 bend = vec2(1.0, 0.35) * gust * wind_strength;
	vec2 away = root - pusher.xz;
	float d = length(away);
	bend += (away / max(d, 0.001)) * (1.0 - smoothstep(0.0, push_radius, d)) * 0.5;
	VERTEX.xz += bend * h * h;
	VERTEX.y -= dot(bend, bend) * h * 0.6;
	NORMAL = vec3(0.0, 1.0, 0.0); // light blades like the ground under them, no flicker
	world_xz = VERTEX.xz;
}

void fragment() {
	vec3 tip = mix(tip_color, dry_color, smoothstep(0.85, 1.0, tint_rand));
	ALBEDO = mix(root_color, tip, UV.y) * cloud_shade(world_xz);
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
}
