// Image plane fragment shader: cover-fit texture (or placeholder),
// entrance unfold, inner parallax, hover zoom + ripple refraction,
// velocity RGB shift, rounded corners.

uniform sampler2D uTexture;
uniform float uTextureMix;   // 0 = placeholder, 1 = texture
uniform float uImageAspect;  // texture width / height
uniform vec2 uSize;          // plane size in px-ish units (for corners)
uniform float uRadius;       // corner radius, same units as uSize
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAngle;
uniform float uSeed;
uniform float uTime;
uniform float uVelocity;
uniform float uRgb;          // strength multiplier for RGB shift (0 = off)
uniform float uHover;
uniform vec2 uMouse;
uniform float uOpacity;
uniform float uShade;        // 0..1 darkens slightly (depth fog in 3D scenes)
uniform float uReveal;       // 0..1 entrance wipe
uniform float uParallax;     // -1..1 position of the plane in the viewport
uniform float uInner;        // 0..1 strength of the inner parallax

varying vec2 vUv;

vec2 coverUv(vec2 uv) {
  float planeAspect = uSize.x / uSize.y;
  vec2 s = planeAspect > uImageAspect
    ? vec2(1.0, uImageAspect / planeAspect)
    : vec2(planeAspect / uImageAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

vec3 sampleImage(vec2 uv) {
  vec3 ph = placeholder(uv, uColorA, uColorB, uAngle, uSeed);
  if (uTextureMix <= 0.0) return ph;
  vec3 tex = texture2D(uTexture, coverUv(uv)).rgb;
  return mix(ph, tex, uTextureMix);
}

void main() {
  vec2 uv = vUv;

  // inner parallax: the image is a touch larger than its frame and drifts
  uv = (uv - 0.5) / (1.0 + 0.12 * uInner) + 0.5;
  uv.y += uParallax * 0.05 * uInner;

  // entrance: settles from a slight zoom
  float r = 1.0 - uReveal;
  uv = (uv - 0.5) * (1.0 - 0.22 * r * r) + 0.5;

  // subtle zoom on hover
  uv = (uv - 0.5) * (1.0 - 0.06 * uHover) + 0.5;

  // ripple refraction around the cursor
  vec2 toMouse = vUv - uMouse;
  float d = length(toMouse);
  uv += (toMouse / max(d, 1e-4)) * sin(d * 22.0 - uTime * 4.0) * exp(-d * 5.0) * 0.01 * uHover;

  // RGB shift with scroll velocity
  float shift = uVelocity * 0.012 * uRgb;
  vec3 col;
  if (abs(shift) > 0.0001) {
    col.r = sampleImage(uv + vec2(0.0, shift)).r;
    col.g = sampleImage(uv).g;
    col.b = sampleImage(uv - vec2(0.0, shift)).b;
  } else {
    col = sampleImage(uv);
  }

  col = mix(col, col * vec3(0.93, 0.9, 0.88), uShade);

  // entrance wipe from the bottom, with a soft, uneven edge
  float n = ph_noise(vec2(vUv.x * 5.0 + uSeed * 13.0, uTime * 0.15)) - 0.5;
  float edge = uReveal * 1.3 - 0.15;
  float wipe = smoothstep(edge, edge - 0.1, vUv.y + n * 0.18 * r);
  // lighten the leading edge a little, like light catching paper
  col += vec3(0.06, 0.05, 0.04) * smoothstep(0.12, 0.0, abs(edge - vUv.y - n * 0.18 * r)) * r;

  // rounded corners (signed distance to a rounded box)
  vec2 px = (vUv - 0.5) * uSize;
  vec2 q = abs(px) - (uSize * 0.5 - uRadius);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float alpha = 1.0 - smoothstep(-1.0, 0.5, sd);

  float a = alpha * uOpacity * wipe;
  if (a < 0.004) discard; // never let invisible pixels hide what's behind
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
