precision highp float;

attribute vec2 a_position;    // grid position (-1..1)
attribute vec2 a_vertex;      // wedge geometry vertex OR quad vertex

uniform vec2 u_resolution;
uniform sampler2D u_velocityField;
uniform sampler2D u_triggerMap;
uniform sampler2D u_cameraSeqMap;
uniform sampler2D u_audioHistory;  // 256x1 luminance: rolling delta history
uniform float u_audioActive;
uniform float u_hasTriggers;
uniform float u_hasCameraSeq;
uniform float u_maxSequenceIndex;
uniform float u_maxCameraSeqIndex;
uniform float u_time;
uniform float u_arrowScale;
uniform vec2 u_cellSize;
uniform float u_renderMode;   // 0=arrows, 1=digits, 2=lines
uniform float u_atlasCells;   // number of cells in glyph atlas

varying float v_speed;
varying float v_angle;
varying vec2 v_digitUV;       // UV into digit atlas (only used in digit mode)
varying float v_digitIndex;   // which digit 0-9

const float PI = 3.14159265359;

void main() {
    vec2 uv = a_position * 0.5 + 0.5;

    // Sample trigger map: R=seq high, G=seq low, B=angle, A=armed(255) or 0
    vec4 triggerInfo = texture2D(u_triggerMap, uv);
    float drawArmed = step(0.5, triggerInfo.a);

    // Sample camera sequence map: same format, persisted from motion detection
    vec4 camSeqInfo = texture2D(u_cameraSeqMap, uv);
    float camArmed = step(0.5, camSeqInfo.a) * u_hasCameraSeq;

    // Sample velocity field
    vec4 vel = texture2D(u_velocityField, uv);
    vec2 velocity = vel.xy * 2.0 - 1.0;

    float speed = length(velocity);
    speed = speed < 0.04 ? 0.0 : speed;
    float angle = atan(velocity.y, velocity.x);

    // Audio drives arrow size on triggered cells
    // Drawn triggers take priority over camera triggers
    float triggerScale = 0.0;

    if (u_hasTriggers > 0.5 && drawArmed > 0.5) {
        // Drawn trigger — use drawn sequence and direction
        float dirAngle = triggerInfo.b * 2.0 * PI - PI;
        angle = dirAngle;
        float seqNorm = (triggerInfo.r * 255.0 * 256.0 + triggerInfo.g * 255.0) / u_maxSequenceIndex;
        seqNorm = clamp(seqNorm, 0.0, 1.0);
        float audioVal = texture2D(u_audioHistory, vec2(seqNorm, 0.5)).r;
        triggerScale = (0.3 + audioVal * u_audioActive) * drawArmed;
    } else if (camArmed > 0.5) {
        // Camera trigger — use camera sequence and direction
        float dirAngle = camSeqInfo.b * 2.0 * PI - PI;
        angle = dirAngle;
        float seqNorm = (camSeqInfo.r * 255.0 * 256.0 + camSeqInfo.g * 255.0) / u_maxCameraSeqIndex;
        seqNorm = clamp(seqNorm, 0.0, 1.0);
        float audioVal = texture2D(u_audioHistory, vec2(seqNorm, 0.5)).r;
        triggerScale = (0.3 + audioVal * u_audioActive) * camArmed;
    }

    float finalSpeed = max(speed, triggerScale);

    v_speed = finalSpeed;
    v_angle = angle;

    float scale = u_arrowScale * finalSpeed;

    float cellPixels = min(u_cellSize.x * u_resolution.x, u_cellSize.y * u_resolution.y) * 0.5;
    vec2 pixelToClip = vec2(2.0 / u_resolution.x, 2.0 / u_resolution.y);

    vec2 pos;
    if (u_renderMode > 0.5) {
        // Glyph mode: no rotation, map angle to atlas cell
        float cellCount = u_atlasCells;
        float digitF = floor(((angle + PI) / (2.0 * PI)) * cellCount);
        digitF = clamp(digitF, 0.0, cellCount - 1.0);
        v_digitIndex = digitF;
        // UV: vertex goes -0.5..0.5, map to 0..1 within the glyph's atlas cell
        v_digitUV = vec2(
            (a_vertex.x + 0.5) / cellCount + digitF / cellCount,
            1.0 - (a_vertex.y + 0.5)
        );
        vec2 scaledVertex = a_vertex * scale * cellPixels;
        pos = a_position + scaledVertex * pixelToClip;
    } else {
        // Arrow mode: rotate
        float c = cos(angle);
        float s = sin(angle);
        mat2 rot = mat2(c, s, -s, c);
        vec2 rotatedVertex = rot * (a_vertex * scale * cellPixels);
        pos = a_position + rotatedVertex * pixelToClip;
        v_digitUV = vec2(0.0);
        v_digitIndex = 0.0;
    }

    gl_Position = vec4(pos, 0.0, 1.0);
}
