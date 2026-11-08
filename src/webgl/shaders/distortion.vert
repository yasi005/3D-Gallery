// Image plane vertex shader.
// The plane geometry is 1×1 and scaled to its DOM box, so displacements
// here are fractions of the plane's size (scale.z = plane height).

uniform float uTime;
uniform float uVelocity; // -1..1 smoothed scroll velocity
uniform float uBend;     // strength multiplier (0 = off)
uniform float uHover;    // 0..1
uniform vec2 uMouse;     // hover position in uv space
uniform float uReveal;   // 0..1 entrance

varying vec2 vUv;

#define PI 3.14159265

void main() {
  vUv = uv;
  vec3 p = position;

  // Entrance: the sheet starts curled back from its lower edge and
  // straightens as it unfolds.
  float r = 1.0 - uReveal;
  float fromBottom = 1.0 - uv.y;
  p.z -= r * fromBottom * fromBottom * 0.55 * uBend;
  p.y -= r * 0.08 * uBend;

  // Scroll bend: the plane curves like a sheet of paper dragged through air.
  float bend = sin(uv.x * PI);
  p.y -= bend * uVelocity * 0.07 * uBend;
  p.z += bend * abs(uVelocity) * 0.12 * uBend;

  // Hover ripple from the cursor.
  float d = distance(uv, uMouse);
  float ripple = sin(d * 22.0 - uTime * 4.0) * exp(-d * 5.0);
  p.z += ripple * uHover * 0.025 * uBend;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
