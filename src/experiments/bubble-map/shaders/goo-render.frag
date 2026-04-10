precision highp float;

uniform sampler2D u_density;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_shininess;
uniform vec3 u_lightDir;
uniform float u_specStrength;
uniform float u_opacity;
uniform float u_baseHue;
uniform float u_baseSat;
uniform float u_baseVal;
uniform float u_useBaseColor;
uniform float u_depthScale;
uniform float u_absorption;
uniform float u_fresnelF0;
uniform float u_envBright;
uniform float u_bgBright;       // background brightness (0=black, 1=white)

varying vec2 v_uv;

vec3 hsv2rgb(float h, float s, float v) {
  vec3 c = vec3(h, s, v);
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

// Fake HDRI: warm horizon band, cooler top/bottom
vec3 envColor(vec3 dir) {
  float y = dir.y * 0.5 + 0.5;
  vec3 sky = vec3(0.85, 0.9, 1.0);
  vec3 horizon = vec3(1.0, 0.97, 0.9);
  vec3 ground = vec3(0.3, 0.28, 0.35);
  vec3 col = y < 0.45
    ? mix(ground, horizon, smoothstep(0.0, 0.45, y))
    : mix(horizon, sky, smoothstep(0.45, 1.0, y));
  col += vec3(0.5, 0.45, 0.4) * exp(-pow((y - 0.45) * 8.0, 2.0));
  return col * u_envBright;
}

// White gallery void — soft gradient with subtle depth cues
vec3 roomBackground(vec2 uv) {
  vec3 white = mix(vec3(0.93, 0.92, 0.94), vec3(1.0), u_bgBright);

  // Soft radial vignette from center
  vec2 center = uv - 0.5;
  float aspect = u_resolution.x / u_resolution.y;
  center.x *= aspect;
  float dist = length(center);
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist) * 0.12;

  // Subtle horizon darkening — gives a sense of infinite floor
  float horizon = 1.0 - smoothstep(0.0, 0.06, abs(uv.y - 0.52)) * 0.04;

  // Very gentle vertical gradient — slightly warmer at bottom
  vec3 tint = mix(vec3(0.98, 0.97, 0.95), vec3(1.0), uv.y);

  return white * tint * vignette * horizon;
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 step2 = texel * 2.0;

  float dc = texture2D(u_density, v_uv).r;

  float dl = texture2D(u_density, v_uv - vec2(step2.x, 0.0)).r;
  float dr = texture2D(u_density, v_uv + vec2(step2.x, 0.0)).r;
  float db = texture2D(u_density, v_uv - vec2(0.0, step2.y)).r;
  float dt = texture2D(u_density, v_uv + vec2(0.0, step2.y)).r;

  vec4 samp = texture2D(u_density, v_uv);
  float strokeHue = samp.r > 0.001 ? samp.g / samp.r : 0.5;
  float hue = mix(strokeHue, u_baseHue, u_useBaseColor);
  float sat = mix(0.7, u_baseSat, u_useBaseColor);
  float val = mix(0.9, u_baseVal, u_useBaseColor);

  // Background is always visible (the room)
  vec3 bgColor = roomBackground(v_uv);

  if (dc < u_threshold) {
    // Show background with subtle halo near fluid
    float edgeDist = dc / u_threshold;
    float glow = smoothstep(0.0, 1.0, edgeDist) * 0.08;
    vec3 glowColor = hsv2rgb(hue, sat * 0.5, val);
    gl_FragColor = vec4(mix(bgColor, glowColor, glow), 1.0);
    return;
  }

  // === Thickness ===
  float thickness = dc - u_threshold;

  // === Normal ===
  float fwdX = dr - dc;
  float bwdX = dc - dl;
  float dzdx = abs(fwdX) < abs(bwdX) ? fwdX : bwdX;
  float fwdY = dt - dc;
  float bwdY = dc - db;
  float dzdy = abs(fwdY) < abs(bwdY) ? fwdY : bwdY;

  float gradMag = u_depthScale * 15.0;
  vec3 normal = normalize(vec3(-dzdx * gradMag, -dzdy * gradMag, 0.3));

  // === Vectors ===
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(u_lightDir);
  vec3 H = normalize(L + V);
  vec3 R = reflect(-V, normal);

  float NdotV = max(dot(normal, V), 0.0);
  float NdotL = max(dot(normal, L), 0.0);
  float NdotH = max(dot(normal, H), 0.0);

  // === Beer's Law through the background ===
  vec3 fluidColor = hsv2rgb(hue, sat, val);
  // Absorption coefficient: fluid color determines which wavelengths pass through
  // Use the color's complement scaled by absorption strength
  vec3 absorbCoeff = (vec3(1.0) - fluidColor) * u_absorption + vec3(u_absorption * 0.15);
  vec3 transmittance = exp(-absorbCoeff * thickness);
  vec3 refractionColor = bgColor * transmittance;

  // === Schlick Fresnel ===
  float fresnel = u_fresnelF0 + (1.0 - u_fresnelF0) * pow(1.0 - NdotV, 5.0);
  fresnel = clamp(fresnel, 0.0, 1.0);

  // === Environment reflection ===
  vec3 reflectionColor = envColor(R);

  // === Specular ===
  float spec = pow(NdotH, u_shininess);
  float spec2 = pow(NdotH, u_shininess * 0.15) * 0.12;

  // === Subsurface scattering ===
  float sssThickness = 1.0 / (1.0 + thickness * 2.0);
  vec3 sssColor = fluidColor * sssThickness * 0.4;
  float backlit = max(dot(normal, -L), 0.0);
  sssColor += fluidColor * backlit * sssThickness * 0.2;

  // === Composite ===
  vec3 color = mix(refractionColor, reflectionColor, fresnel);
  color += sssColor;
  color += vec3(1.0) * (spec * u_specStrength + spec2);
  color += fluidColor * NdotL * 0.06;

  // Always fully opaque — transparency is handled by Beer's law showing the room through
  gl_FragColor = vec4(color, u_opacity);
}
