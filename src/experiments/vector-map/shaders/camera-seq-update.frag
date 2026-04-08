precision highp float;

uniform sampler2D u_prevSeq;       // previous camera sequence texture
uniform sampler2D u_motionVec;     // current motion vectors from motion-detect pass
uniform float u_seqCounterHigh;    // current sequence counter, high byte (0..255)/255
uniform float u_seqCounterLow;     // current sequence counter, low byte (0..255)/255
uniform float u_triggerDecay;      // per-frame alpha decay for idle triggers
uniform float u_motionThreshold;   // min neighbors with motion to accept (0-4)

varying vec2 v_uv;

const float PI = 3.14159265359;

void main() {
    vec4 prev = texture2D(u_prevSeq, v_uv);
    vec4 motion = texture2D(u_motionVec, v_uv);

    // Check if this pixel AND enough neighbors have motion (kills isolated noise)
    if (motion.a > 0.01) {
        float t = 1.0 / 256.0;
        int neighbors = 0;
        if (texture2D(u_motionVec, v_uv + vec2( t, 0.0)).a > 0.01) neighbors++;
        if (texture2D(u_motionVec, v_uv + vec2(-t, 0.0)).a > 0.01) neighbors++;
        if (texture2D(u_motionVec, v_uv + vec2(0.0,  t)).a > 0.01) neighbors++;
        if (texture2D(u_motionVec, v_uv + vec2(0.0, -t)).a > 0.01) neighbors++;

        if (float(neighbors) >= u_motionThreshold) {
            // Real motion — arm this trigger
            vec2 dir = -(motion.xy * 2.0 - 1.0);
            float angle = atan(dir.y, dir.x);
            float angleByte = (angle + PI) / (2.0 * PI);
            gl_FragColor = vec4(u_seqCounterHigh, u_seqCounterLow, angleByte, 1.0);
        } else {
            // Isolated noise pixel — ignore, decay previous
            gl_FragColor = vec4(prev.rgb, prev.a * u_triggerDecay);
        }
    } else {
        // No motion — decay
        gl_FragColor = vec4(prev.rgb, prev.a * u_triggerDecay);
    }
}
