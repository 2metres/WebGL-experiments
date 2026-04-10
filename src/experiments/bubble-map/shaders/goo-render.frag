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

// 3D box room behind the fluid — gives transparency something to show through
vec3 roomBackground(vec2 uv) {
  // Camera looking into a light room
  // uv is 0..1, map to ray direction
  vec2 ndc = uv * 2.0 - 1.0;
  float aspect = u_resolution.x / u_resolution.y;
  vec3 rayDir = normalize(vec3(ndc.x * aspect * 0.8, ndc.y * 0.8, -1.5));
  vec3 rayOrigin = vec3(0.0, 0.3, 2.0);

  // Room bounds: box from (-2,-1,-3) to (2,2,0)
  float tFloor = (-0.5 - rayOrigin.y) / rayDir.y;
  float tBack  = (-2.0 - rayOrigin.z) / rayDir.z;
  float tLeft  = (-2.0 - rayOrigin.x) / rayDir.x;
  float tRight = ( 2.0 - rayOrigin.x) / rayDir.x;
  float tCeil  = ( 2.0 - rayOrigin.y) / rayDir.y;

  vec3 bgBase = mix(vec3(0.92, 0.91, 0.93), vec3(1.0), u_bgBright);
  vec3 color = bgBase; // miss color
  float tMin = 100.0;
  vec3 hitNormal = vec3(0.0);
  vec3 hitPos = vec3(0.0);

  // Test each plane
  if (tFloor > 0.0 && tFloor < tMin) {
    vec3 p = rayOrigin + rayDir * tFloor;
    if (p.x > -2.0 && p.x < 2.0 && p.z > -3.0 && p.z < 0.5) {
      tMin = tFloor; hitNormal = vec3(0.0, 1.0, 0.0); hitPos = p;
    }
  }
  if (tBack > 0.0 && tBack < tMin) {
    vec3 p = rayOrigin + rayDir * tBack;
    if (p.x > -2.0 && p.x < 2.0 && p.y > -0.5 && p.y < 2.0) {
      tMin = tBack; hitNormal = vec3(0.0, 0.0, 1.0); hitPos = p;
    }
  }
  if (tLeft > 0.0 && tLeft < tMin && rayDir.x < 0.0) {
    vec3 p = rayOrigin + rayDir * tLeft;
    if (p.y > -0.5 && p.y < 2.0 && p.z > -3.0 && p.z < 0.5) {
      tMin = tLeft; hitNormal = vec3(1.0, 0.0, 0.0); hitPos = p;
    }
  }
  if (tRight > 0.0 && tRight < tMin && rayDir.x > 0.0) {
    vec3 p = rayOrigin + rayDir * tRight;
    if (p.y > -0.5 && p.y < 2.0 && p.z > -3.0 && p.z < 0.5) {
      tMin = tRight; hitNormal = vec3(-1.0, 0.0, 0.0); hitPos = p;
    }
  }
  if (tCeil > 0.0 && tCeil < tMin) {
    vec3 p = rayOrigin + rayDir * tCeil;
    if (p.x > -2.0 && p.x < 2.0 && p.z > -3.0 && p.z < 0.5) {
      tMin = tCeil; hitNormal = vec3(0.0, -1.0, 0.0); hitPos = p;
    }
  }

  if (tMin < 100.0) {
    // Base wall color — white with slight warmth
    vec3 wallColor = mix(vec3(0.88, 0.87, 0.89), vec3(0.98, 0.97, 0.96), u_bgBright);

    // Floor: subtle grid pattern
    if (hitNormal.y > 0.5) {
      vec2 gridUV = hitPos.xz;
      float gridX = smoothstep(0.02, 0.0, abs(fract(gridUV.x) - 0.5) - 0.47);
      float gridZ = smoothstep(0.02, 0.0, abs(fract(gridUV.y) - 0.5) - 0.47);
      float grid = max(gridX, gridZ) * 0.15;
      wallColor = mix(wallColor, wallColor * 0.7, grid);
    }

    // Simple diffuse lighting
    vec3 L = normalize(u_lightDir);
    float diff = max(dot(hitNormal, L), 0.0) * 0.5 + 0.5;

    // Soft ambient occlusion at corners — only from perpendicular edges
    float ao = 1.0;
    if (abs(hitNormal.x) < 0.5) {                   // skip for side walls
      ao *= smoothstep(0.0, 0.5, hitPos.x + 2.0);   // left edge
      ao *= smoothstep(0.0, 0.5, 2.0 - hitPos.x);   // right edge
    }
    if (abs(hitNormal.y) < 0.5) {                    // skip for floor/ceiling
      ao *= smoothstep(0.0, 0.4, hitPos.y + 0.5);   // floor edge
    }
    if (abs(hitNormal.z) < 0.5) {                    // skip for back wall
      ao *= smoothstep(0.0, 0.8, hitPos.z + 2.0);   // back edge
    }

    // Distance fade
    float fade = 1.0 / (1.0 + tMin * 0.08);

    color = wallColor * diff * ao * fade;
  }

  return color;
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

  // === Beer's Law through the room background ===
  vec3 fluidColor = hsv2rgb(hue, sat, val);
  vec3 transmittance = exp(-u_absorption * thickness * (vec3(1.0) - fluidColor));
  // See the room through the fluid, tinted by absorption
  vec3 refractionColor = bgColor * transmittance + fluidColor * (vec3(1.0) - transmittance);

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
