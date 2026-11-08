// Procedural placeholder: soft two-colour gradient + drifting noise + grain.
// Prepended to distortion.frag (GLSL has no includes).

float ph_hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float ph_noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(ph_hash(i), ph_hash(i + vec2(1.0, 0.0)), u.x),
    mix(ph_hash(i + vec2(0.0, 1.0)), ph_hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec3 placeholder(vec2 uv, vec3 a, vec3 b, float angle, float seed) {
  vec2 dir = vec2(cos(angle), sin(angle));
  float t = dot(uv - 0.5, dir) + 0.5;
  float n = ph_noise(uv * 2.2 + seed * 17.0);
  t = smoothstep(0.0, 1.0, t + (n - 0.5) * 0.45);
  vec3 col = mix(a, b, t);
  // soft inner light
  col += 0.035 * (1.0 - smoothstep(0.0, 0.75, distance(uv, vec2(0.35 + seed * 0.3, 0.65))));
  // static film grain in screen space
  col += (ph_hash(gl_FragCoord.xy) - 0.5) * 0.035;
  return col;
}
