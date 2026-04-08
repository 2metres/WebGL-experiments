precision highp float;

uniform sampler2D u_velocity;
uniform vec2 u_texelSize;
uniform float u_diffusion;

varying vec2 v_uv;

void main() {
    // Sample neighbors for diffusion
    vec4 center = texture2D(u_velocity, v_uv);
    vec4 left   = texture2D(u_velocity, v_uv + vec2(-u_texelSize.x, 0.0));
    vec4 right  = texture2D(u_velocity, v_uv + vec2( u_texelSize.x, 0.0));
    vec4 up     = texture2D(u_velocity, v_uv + vec2(0.0,  u_texelSize.y));
    vec4 down   = texture2D(u_velocity, v_uv + vec2(0.0, -u_texelSize.y));

    // Simple diffusion: blend with neighbors
    vec4 avg = (left + right + up + down) * 0.25;
    vec4 result = mix(center, avg, u_diffusion);

    gl_FragColor = result;
}
