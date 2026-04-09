// CRTS PUBLIC DOMAIN CRT-STYLED SCALAR by Timothy Lottes
// Adapted for Ghostty by Qwerasd. Public domain (Unlicense).
// Ported to WebGL1 with uniform-based parameters.

precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_scale;        // scanlines per pixel (default 0.33333)
uniform float u_warp;         // tube warp enable (0.0 = none, 1.0 = full)
uniform float u_minVin;       // vignette darkness (default 0.5)
uniform float u_thin;         // scanline thinness (default 0.75)
uniform float u_blur;         // horizontal blur (default -2.75)
uniform float u_mask;         // shadow mask intensity (default 0.65)
uniform float u_maskType;     // 0=shadow, 1=grille, 2=grille_lite, 3=none
uniform float u_time;         // for future VHS effects
uniform vec2 u_videoSize;     // native video dimensions (e.g. 640x480)

// VHS effect uniforms
uniform float u_chromatic;    // chromatic aberration strength (default 0.0, range 0-10)
uniform float u_noise;        // static noise amount (default 0.0, range 0-1)
uniform float u_trackingSpeed; // tracking line scroll speed (default 0.0, range 0-5)
uniform float u_trackingIntensity; // tracking line strength (default 0.0, range 0-1)
uniform float u_trackingBlend;    // 0=subtract, 1=multiply, 2=add, 3=screen
uniform float u_noiseShape;   // 0=snow, 1=glitch, 2=rgb, 3=fine

varying vec2 v_uv;

float FromSrgb1(float c) {
  return (c <= 0.04045) ? c * (1.0 / 12.92) :
    pow(c * (1.0 / 1.055) + (0.055 / 1.055), 2.4);
}

vec3 FromSrgb(vec3 c) {
  return vec3(FromSrgb1(c.r), FromSrgb1(c.g), FromSrgb1(c.b));
}

float ToSrgb1(float c) {
  return (c < 0.0031308) ? c * 12.92 :
    1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

vec3 ToSrgb(vec3 c) {
  return vec3(ToSrgb1(c.r), ToSrgb1(c.g), ToSrgb1(c.b));
}

vec3 CrtsFetch(vec2 uv) {
  return FromSrgb(texture2D(u_texture, uv).rgb);
}

float CrtsMax3F1(float a, float b, float c) {
  return max(a, max(b, c));
}

// Returns tone curve parameters (ab) based on scanline thinness and mask.
// Handles mask type adjustments:
//   grille_lite: mask effectively = 0.5 + mask * 0.5
//   none:        mask effectively = 1.0
vec2 CrtsTone(float thin, float mask) {
  float m = mask;
  if (u_maskType > 2.5) {
    // none
    m = 1.0;
  } else if (u_maskType > 1.5) {
    // grille_lite
    m = 0.5 + mask * 0.5;
  }
  vec2 ret;
  float midOut = 0.18 / ((1.5 - thin) * (0.5 * m + 0.5));
  float pMidIn = 0.18;
  ret.x = ((-pMidIn) + midOut) / ((1.0 - pMidIn) * midOut);
  ret.y = ((-pMidIn) * midOut + pMidIn) / (midOut * (-pMidIn) + midOut);
  return ret;
}

// Shadow/phosphor mask. Returns per-pixel RGB darkening mask.
// maskType: 0=shadow, 1=grille, 2=grille_lite, 3=none
vec3 CrtsMask(vec2 pos, float dark) {
  vec3 m;
  if (u_maskType > 2.5) {
    // none
    return vec3(1.0);
  } else if (u_maskType > 1.5) {
    // grille_lite: bright background, one dark channel
    float x = fract(pos.x * (1.0 / 3.0));
    m = vec3(1.0, 1.0, 1.0);
    if (x < (1.0 / 3.0)) m.r = dark;
    else if (x < (2.0 / 3.0)) m.g = dark;
    else m.b = dark;
    return m;
  } else if (u_maskType > 0.5) {
    // grille: dark background, one bright channel
    float x = fract(pos.x * (1.0 / 3.0));
    m = vec3(dark, dark, dark);
    if (x < (1.0 / 3.0)) m.r = 1.0;
    else if (x < (2.0 / 3.0)) m.g = 1.0;
    else m.b = 1.0;
    return m;
  } else {
    // shadow: offset rows, 1/6 period RGB
    vec2 p = pos;
    p.x += p.y * 3.0;
    m = vec3(dark, dark, dark);
    float x = fract(p.x * (1.0 / 6.0));
    if (x < (1.0 / 3.0)) m.r = 1.0;
    else if (x < (2.0 / 3.0)) m.g = 1.0;
    else m.b = 1.0;
    return m;
  }
}

// Main CRT filter:
//   fragCoord  — pixel coordinate
//   inputSizeMul — typically vec2(1.0)
//   inputSizeHalf — inputSize * 0.5
//   inputSizeRcp — 1.0 / inputSize
//   outputSizeRcp — 1.0 / outputSize
//   outputSize2Rcp — 2.0 / outputSize
//   outputSizeY — outputSize.y
//   warp — barrel warp amount per axis (x=horiz, y=vert)
//   thin — scanline thinness
//   blur — horizontal blur strength
//   mask — shadow mask intensity
//   tone — precomputed tone curve (from CrtsTone)
vec3 CrtsFilter(
  vec2 ipos,
  vec2 inputSizeDivOutputSize,
  vec2 halfInputSize,
  vec2 rcpInputSize,
  vec2 rcpOutputSize,
  vec2 twoDivOutputSize,
  float inputHeight,
  vec2 warp,
  float thin,
  float blur,
  float mask,
  vec2 tone
) {
  // Convert to {-1 to 1} range
  vec2 pos = ipos * twoDivOutputSize - vec2(1.0);

  // Spherical barrel distortion (radial from center)
  float r2 = dot(pos, pos);
  pos *= 1.0 + r2 * warp * u_warp;

  // Leave in {0 to inputSize}
  pos = pos * halfInputSize + halfInputSize;

  // Snap to center of first scanline
  float y0 = floor(pos.y - 0.5) + 0.5;
  // Snap to center of one of four pixels
  float x0 = floor(pos.x - 1.5) + 0.5;

  // Initial UV position
  vec2 p = vec2(x0 * rcpInputSize.x, y0 * rcpInputSize.y);
  // Fetch 4 nearest texels from 2 nearest scanlines
  vec3 colA0 = CrtsFetch(p);
  p.x += rcpInputSize.x;
  vec3 colA1 = CrtsFetch(p);
  p.x += rcpInputSize.x;
  vec3 colA2 = CrtsFetch(p);
  p.x += rcpInputSize.x;
  vec3 colA3 = CrtsFetch(p);
  p.y += rcpInputSize.y;
  vec3 colB3 = CrtsFetch(p);
  p.x -= rcpInputSize.x;
  vec3 colB2 = CrtsFetch(p);
  p.x -= rcpInputSize.x;
  vec3 colB1 = CrtsFetch(p);
  p.x -= rcpInputSize.x;
  vec3 colB0 = CrtsFetch(p);

  // Vertical filter: scanline intensity via cosine wave
  float off = pos.y - y0;
  float pi2 = 6.28318530717958;
  float hlf = 0.5;
  float scanA = cos(min(0.5, off * thin) * pi2) * hlf + hlf;
  float scanB = cos(min(0.5, (-off) * thin + thin) * pi2) * hlf + hlf;

  // Horizontal kernel: gaussian filter
  float off0 = pos.x - x0;
  float off1 = off0 - 1.0;
  float off2 = off0 - 2.0;
  float off3 = off0 - 3.0;
  float pix0 = exp2(blur * off0 * off0);
  float pix1 = exp2(blur * off1 * off1);
  float pix2 = exp2(blur * off2 * off2);
  float pix3 = exp2(blur * off3 * off3);
  float pixT = 1.0 / (pix0 + pix1 + pix2 + pix3);

  // (vignette applied as post-process)

  scanA *= pixT;
  scanB *= pixT;

  // Apply horizontal and vertical filters
  vec3 color =
    (colA0 * pix0 + colA1 * pix1 + colA2 * pix2 + colA3 * pix3) * scanA +
    (colB0 * pix0 + colB1 * pix1 + colB2 * pix2 + colB3 * pix3) * scanB;

  // Apply phosphor mask
  color *= CrtsMask(ipos, mask);

  // Tonal control
  float peak = max(1.0 / (256.0 * 65536.0),
    CrtsMax3F1(color.r, color.g, color.b));
  vec3 ratio = color * (1.0 / peak);
  peak = peak * (1.0 / (peak * tone.x + tone.y));
  return ratio * peak;
}

// Pseudo-random hash for noise
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// VHS tracking line: a bright horizontal band that scrolls vertically
float trackingLine(vec2 uv, float time, float speed) {
  if (speed <= 0.0) return 0.0;
  float linePos = fract(time * speed * 0.1);
  float dist = abs(uv.y - linePos);
  // Main thick band
  float line = smoothstep(0.05, 0.0, dist);
  // Slight UV distortion near the band
  line += smoothstep(0.1, 0.02, dist) * 0.3;
  return line;
}

void main() {
  vec2 fragCoord = v_uv * u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 inputSize = u_resolution * u_scale;

  // Apply tracking line UV distortion before sampling
  vec2 uv = v_uv;
  float track = trackingLine(uv, u_time, u_trackingSpeed);
  // Shift UV inward toward center near tracking line (smooth gradient, no center seam)
  float xOff = uv.x - 0.5;
  uv.x -= xOff * track * 0.02 * u_trackingIntensity;

  // Recalculate fragCoord from potentially distorted UV
  fragCoord = uv * u_resolution;

  // Compute warp edge mask: black out areas pushed outside the tube
  vec2 warpPos = (v_uv * 2.0 - 1.0);
  float wr2 = dot(warpPos, warpPos);
  warpPos *= 1.0 + wr2 * vec2(1.0 / (50.0 * aspect), 1.0 / 50.0) * u_warp;
  float warpEdge = smoothstep(1.0, 0.98, max(abs(warpPos.x), abs(warpPos.y)));

  vec3 color = CrtsFilter(
    fragCoord,
    vec2(1.0),
    inputSize * 0.5,
    1.0 / inputSize,
    1.0 / u_resolution,
    2.0 / u_resolution,
    u_resolution.y,
    vec2(1.0 / (50.0 * aspect), 1.0 / 50.0),
    u_thin,
    u_blur,
    u_mask,
    CrtsTone(u_thin, u_mask)
  );

  // Chromatic aberration: offset R and B channels
  if (u_chromatic > 0.0) {
    float baseOffset = u_chromatic * 0.001;
    float trackBoost = track * u_trackingIntensity * u_chromatic * 0.0005;
    float offset = baseOffset + trackBoost;
    vec2 dir = uv - 0.5; // Direction from center
    float r = texture2D(u_texture, uv + dir * offset).r;
    float b = texture2D(u_texture, uv - dir * offset).b;
    // Blend chromatic aberration with CRT-filtered color
    color.r = mix(color.r, FromSrgb1(r) * color.r / max(color.r, 0.001), 0.5);
    color.b = mix(color.b, FromSrgb1(b) * color.b / max(color.b, 0.001), 0.5);
  }

  // Static noise (shape modes)
  if (u_noise > 0.0) {
    float noiseAmt = u_noise * 0.3;
    vec2 nCoord = fragCoord + fract(u_time * 43.758);

    if (u_noiseShape < 0.5) {
      // Snow: chunky analog TV static (8x8 pixel blocks)
      vec2 blockCoord = floor(nCoord / 8.0);
      float ts = floor(u_time * 30.0);
      float n = hash(blockCoord + ts * vec2(127.1, 311.7)) * 2.0 - 1.0;
      color += vec3(n) * noiseAmt;
    } else if (u_noiseShape < 1.5) {
      // Glitch: horizontal blocky bands (height matches scanline scale)
      float bandSize = max(2.0, 16.0 * u_scale);
      float bandY = floor(nCoord.y / bandSize);
      float bandHash = hash(vec2(bandY, floor(u_time * 12.0)));
      if (bandHash > 0.85) {
        float shift = (hash(vec2(bandY, u_time)) - 0.5) * noiseAmt * 2.0;
        color = FromSrgb(texture2D(u_texture, v_uv + vec2(shift, 0.0)).rgb);
      }
      float n = hash(vec2(floor(nCoord.x / 4.0), bandY)) * 2.0 - 1.0;
      color += vec3(n) * noiseAmt * 0.3;
    } else if (u_noiseShape < 2.5) {
      // RGB: per-channel color noise (4x4 blocks)
      vec2 blockCoord = floor(nCoord / 4.0);
      float ts = floor(u_time * 30.0);
      vec3 rgbNoise = vec3(
        hash(blockCoord + ts * vec2(127.1, 311.7)),
        hash(blockCoord + ts * vec2(127.1, 311.7) + 127.0),
        hash(blockCoord + ts * vec2(127.1, 311.7) + 311.0)
      ) * 2.0 - 1.0;
      color += rgbNoise * noiseAmt;
    } else {
      // Fine: original per-pixel grain
      float n = hash(nCoord) * 2.0 - 1.0;
      color += vec3(n) * noiseAmt;
    }
  }

  // Tracking line blend
  float t = track * u_trackingIntensity * 0.2;
  if (u_trackingBlend < 0.5) {
    color -= vec3(t);                          // subtract (darken)
  } else if (u_trackingBlend < 1.5) {
    color *= 1.0 - t;                          // multiply (dim)
  } else if (u_trackingBlend < 2.5) {
    color += vec3(t);                          // add (brighten)
  } else {
    color = 1.0 - (1.0 - color) * (1.0 - t);  // screen
  }

  // Post-process vignette: radial gradient overlay (not affected by warp)
  if (u_minVin < 0.99) {
    vec2 vigUV = v_uv * 2.0 - 1.0;
    float vigDist = length(vigUV);
    // Soft radial falloff: center is clear, edges darken
    float vig = smoothstep(0.3, 1.4, vigDist);
    color *= mix(1.0, 1.0 - vig, 1.0 - u_minVin);
  }

  color *= warpEdge;
  gl_FragColor = vec4(ToSrgb(max(color, vec3(0.0))), 1.0);
}
