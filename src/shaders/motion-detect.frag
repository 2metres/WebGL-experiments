precision highp float;

uniform sampler2D u_currentFrame;
uniform sampler2D u_prevFrame;

varying vec2 v_uv;

const int SEARCH_RADIUS = 3;  // 7x7 search window
const int BLOCK_RADIUS = 1;   // 3x3 block

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    float bestSAD = 1e10;
    float zeroSAD = 0.0;
    vec2 bestOffset = vec2(0.0);
    float texelSize = 1.0 / 256.0;

    for (int sy = -SEARCH_RADIUS; sy <= SEARCH_RADIUS; sy++) {
        for (int sx = -SEARCH_RADIUS; sx <= SEARCH_RADIUS; sx++) {
            float sad = 0.0;
            for (int by = -BLOCK_RADIUS; by <= BLOCK_RADIUS; by++) {
                for (int bx = -BLOCK_RADIUS; bx <= BLOCK_RADIUS; bx++) {
                    vec2 blockOff = vec2(float(bx), float(by)) * texelSize;
                    vec2 searchOff = vec2(float(sx), float(sy)) * texelSize;
                    float cur = luminance(texture2D(u_currentFrame, v_uv + blockOff).rgb);
                    float prev = luminance(texture2D(u_prevFrame, v_uv + blockOff + searchOff).rgb);
                    sad += abs(cur - prev);
                }
            }

            if (sx == 0 && sy == 0) zeroSAD = sad;

            if (sad < bestSAD) {
                bestSAD = sad;
                bestOffset = vec2(float(sx), float(sy));
            }
        }
    }

    float blockArea = float((2 * BLOCK_RADIUS + 1) * (2 * BLOCK_RADIUS + 1));
    float magnitude = length(bestOffset) / float(SEARCH_RADIUS);
    float improvement = (zeroSAD - bestSAD) / max(zeroSAD, 0.001);
    float avgZeroSAD = zeroSAD / blockArea;

    if (magnitude < 0.15 || improvement < 0.3 || avgZeroSAD < 0.04) {
        gl_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
        return;
    }

    float avgSAD = bestSAD / blockArea;
    float confidence = 1.0 - clamp(avgSAD * 4.0, 0.0, 1.0);

    if (confidence < 0.2) {
        gl_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
        return;
    }

    vec2 motionEncoded = bestOffset / (float(SEARCH_RADIUS) * 2.0) + 0.5;
    gl_FragColor = vec4(motionEncoded, confidence, magnitude);
}
