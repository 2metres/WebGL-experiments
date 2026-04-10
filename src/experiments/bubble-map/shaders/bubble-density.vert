// Instanced vertex shader: positions a quad per bubble
// Instance data: vec4(centerX, centerY, radius, hue) in clip space
attribute vec2 a_position;       // unit quad corners: -1..1
attribute vec4 a_instance;       // per-bubble: x, y, radius, hue

varying vec2 v_local;            // local coords within quad (-1..1)
varying float v_hue;

void main() {
  vec2 center = a_instance.xy;
  float radius = a_instance.z;
  v_hue = a_instance.w;
  v_local = a_position;

  // Scale quad by bubble radius, translate to bubble center
  vec2 pos = center + a_position * radius;
  gl_Position = vec4(pos, 0.0, 1.0);
}
