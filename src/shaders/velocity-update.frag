precision highp float;

uniform sampler2D u_prevVelocity;
uniform vec2 u_mousePos;       // normalized 0..1
uniform vec2 u_mouseVel;       // normalized velocity
uniform float u_mouseActive;   // 1.0 if mouse is active
uniform float u_decay;         // decay factor per frame
uniform float u_radius;        // influence radius
uniform float u_dt;

uniform sampler2D u_cameraMotion;
uniform float u_cameraActive;
uniform float u_cameraStrength;
uniform float u_audioLevel;    // 0..1, current audio energy (newest sample)

varying vec2 v_uv;

void main() {
    vec4 prev = texture2D(u_prevVelocity, v_uv);

    // Decode previous velocity from 0..1 to -1..1
    vec2 vel = prev.xy * 2.0 - 1.0;

    // Apply decay
    vel *= u_decay;

    // Add mouse influence
    if (u_mouseActive > 0.5) {
        vec2 diff = v_uv - u_mousePos;
        float dist = length(diff);
        float influence = exp(-dist * dist / (u_radius * u_radius));

        // Add mouse velocity with influence falloff
        vel += u_mouseVel * influence * u_dt * 8.0;
    }

    // Add camera motion influence — audio pulses amplify camera contribution
    if (u_cameraActive > 0.5) {
        vec4 cam = texture2D(u_cameraMotion, v_uv);
        vec2 camVel = -(cam.xy * 2.0 - 1.0);
        // Quiet = near-frozen, beats = explosive (0.05x to 8x range)
        float audioBoost = mix(0.05, 8.0, u_audioLevel);
        vel += camVel * cam.a * cam.b * u_cameraStrength * audioBoost * u_dt;
    }

    // Clamp velocity magnitude
    float speed = length(vel);
    if (speed > 1.0) {
        vel = vel / speed;
    }

    // Snap to zero — must exceed UNSIGNED_BYTE quantization step (~0.008)
    if (speed < 0.04) {
        vel = vec2(0.0);
    }

    // Encode back to 0..1
    gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
}
