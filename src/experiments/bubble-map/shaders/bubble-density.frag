precision mediump float;

varying vec2 v_local;
varying float v_hue;

void main() {
  float r2 = dot(v_local, v_local);
  if (r2 > 1.0) discard;

  // Smooth polynomial falloff: (1 - r^2)^2
  float d = 1.0 - r2;
  float density = d * d;

  // Output: R=density, G=density*hue (for weighted average later), B=0, A=density
  gl_FragColor = vec4(density, density * v_hue, 0.0, density);
}
