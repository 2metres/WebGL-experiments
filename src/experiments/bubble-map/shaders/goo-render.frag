precision mediump float;

uniform sampler2D u_density;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_shininess;
uniform vec3 u_lightDir;
uniform float u_ambient;
uniform float u_specStrength;
uniform float u_rimPower;
uniform float u_rimStrength;
uniform float u_opacity;
uniform float u_baseHue;
uniform float u_baseSat;
uniform float u_baseVal;
uniform float u_useBaseColor;
uniform float u_depthScale;

varying vec2 v_uv;

vec3 hsv2rgb(float h, float s, float v) {
  vec3 c = vec3(h, s, v);
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
  vec2 texel = 1.0 / u_resolution;

  // Sample wider for smoother normals (2-texel step)
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

  if (dc < u_threshold) {
    float edgeDist = dc / u_threshold;
    float glow = smoothstep(0.0, 1.0, edgeDist) * 0.2;
    if (glow < 0.01) discard;

    vec3 glowColor = hsv2rgb(hue, sat * 0.85, val);
    gl_FragColor = vec4(glowColor * glow, glow * u_opacity);
    return;
  }

  // Depth relative to threshold — rescale so small density values still give full range
  // With densityScale=0.05, peak density might be ~0.3, so we scale relative to threshold
  float aboveThreshold = dc - u_threshold;
  float depth = clamp(aboveThreshold / max(0.01, u_threshold * u_depthScale), 0.0, 1.0);

  // Compute normal from density gradient
  float dzdx = (dr - dl) * 0.25; // divided by 4 texels (2-step each side)
  float dzdy = (dt - db) * 0.25;

  // Scale gradient into dramatic normals — key to 3D look
  // Higher depthScale = steeper perceived surface
  float gradMag = u_depthScale * 60.0;
  vec3 normal = normalize(vec3(-dzdx * gradMag, -dzdy * gradMag, u_threshold));

  // Color layers: bright surface → rich deep interior
  vec3 surfaceColor = hsv2rgb(hue, sat * 0.8, val);
  vec3 midColor = hsv2rgb(hue, sat, val * 0.7);
  vec3 deepColor = hsv2rgb(hue, min(sat + 0.2, 1.0), val * 0.35);
  vec3 baseColor = depth < 0.5
    ? mix(surfaceColor, midColor, depth * 2.0)
    : mix(midColor, deepColor, (depth - 0.5) * 2.0);

  // Subsurface scattering: thin edges glow with transmitted light
  float sssAmount = pow(1.0 - depth, 2.0) * 0.4;
  vec3 sssColor = hsv2rgb(hue, sat * 0.4, 1.0) * sssAmount;

  // Phong lighting
  vec3 L = normalize(u_lightDir);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V); // Blinn-Phong half-vector (more stable specular)
  vec3 R = reflect(-L, normal);

  float NdotL = max(dot(normal, L), 0.0);
  float diffuse = NdotL;

  // Blinn-Phong specular (sharper, more visible highlights)
  float NdotH = max(dot(normal, H), 0.0);
  float spec = pow(NdotH, u_shininess);

  // Fresnel-approximated rim (view-dependent edge glow)
  float NdotV = max(dot(normal, V), 0.0);
  float fresnel = pow(1.0 - NdotV, u_rimPower);
  float rim = fresnel * u_rimStrength;

  // Environment-style fill: soft hemisphere lighting
  float hemiLight = 0.5 + 0.5 * normal.y;

  vec3 color = baseColor * (u_ambient + diffuse * 0.6 + hemiLight * 0.15)
             + sssColor
             + vec3(1.0) * spec * u_specStrength
             + surfaceColor * rim;

  float alpha = smoothstep(u_threshold, u_threshold + 0.015, dc) * u_opacity;

  gl_FragColor = vec4(color, alpha);
}
