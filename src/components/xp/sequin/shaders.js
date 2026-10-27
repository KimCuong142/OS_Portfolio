/**
 * GLSL for the micro-sequin wall.
 * Sequin geometry: hexagon (pointy-top) pivoted at a top pin; local coords are
 * centred on the tile in [-0.5, 0.5].
 */

export const SEQUIN_VERT = /* glsl */ `
  attribute vec3 aSeed;
  attribute vec2 aScreenUv;

  varying vec3 vWorldPos;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vSeed;
  varying vec2 vLocal;
  varying vec2 vScreenUv;

  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vT = normalize(instanceMatrix[0].xyz);
    vB = normalize(instanceMatrix[1].xyz);
    vN = normalize(instanceMatrix[2].xyz);
    vLocal = vec2(position.x, position.y + 0.4);
    vSeed = aSeed;
    vScreenUv = aScreenUv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const SEQUIN_FRAG = /* glsl */ `
  uniform sampler2D uBliss;
  uniform sampler2D uEnv;
  uniform sampler2D uNormalTex;
  uniform sampler2D uCursorTex;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;
  uniform vec2 uCursorWorld;
  uniform vec2 uTileUv;
  uniform float uCursorActive;
  uniform float uCursorScale;
  uniform float uCursorType;
  uniform float uCursorPressed;
  uniform float uSplitAmount;
  uniform float uTime;
  uniform float uEnvRot;
  uniform float uAberr;
  uniform float uLightStrength;
  uniform vec3 uLightColor;
  uniform vec3 uLightDir;
  uniform vec3 uLightPos;
  uniform vec4 uTrailLights[4];
  uniform vec3 uTrailColors[4];

  varying vec3 vWorldPos;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vSeed;
  varying vec2 vLocal;
  varying vec2 vScreenUv;

  vec3 sampleDichroicHoloLinear(float phase) {
    float p = fract(phase) * 6.0;
    int idx = int(floor(p));
    float f = smoothstep(0.0, 1.0, fract(p));

    vec3 c0 = vec3(0.98, 0.82, 0.64);
    vec3 c1 = vec3(0.80, 0.96, 0.78);
    vec3 c2 = vec3(0.55, 0.92, 0.99);
    vec3 c3 = vec3(0.36, 0.68, 0.99);
    vec3 c4 = vec3(0.72, 0.54, 0.97);
    vec3 c5 = vec3(0.96, 0.58, 0.82);

    vec3 srgbCol = mix(c5, c0, f);
    if (idx == 0) srgbCol = mix(c0, c1, f);
    else if (idx == 1) srgbCol = mix(c1, c2, f);
    else if (idx == 2) srgbCol = mix(c2, c3, f);
    else if (idx == 3) srgbCol = mix(c3, c4, f);
    else if (idx == 4) srgbCol = mix(c4, c5, f);

    return pow(srgbCol, vec3(2.2));
  }

  vec2 envUv(vec3 d) {
    d = normalize(d);
    return vec2(
      atan(d.x, d.z) / 6.2831853 + 0.5 + uEnvRot,
      asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5
    );
  }

  vec3 envSample(vec3 Nc, vec3 V) {
    vec3 R = reflect(-V, Nc);
    return texture2D(uEnv, envUv(vec3(R.xy * 4.0, R.z))).rgb;
  }

  vec3 blissSample(vec3 Nc) {
    vec2 uv = vScreenUv + vLocal * uTileUv + Nc.xy * 0.06;
    return texture2D(uBliss, clamp(uv * uUvScale + uUvOffset, 0.002, 0.998)).rgb;
  }

  void main() {
    // Rounded variant (~30% of sequins): disc inscribed in the hexagon
    float isRound = step(vSeed.x, 0.3);
    if (isRound > 0.5 && length(vLocal) > 0.43) discard;

    float hexD = max(abs(vLocal.x), dot(abs(vLocal), vec2(0.5, 0.8660254))) - 0.4330127;
    float circD = length(vLocal) - 0.43;
    float sd = mix(hexD, circD, isRound);

    // Flat (unsplit) wallpaper colour so the wall is seamless before the split
    vec3 flatCol = texture2D(
      uBliss,
      clamp((vScreenUv + vLocal * uTileUv) * uUvScale + uUvOffset, 0.002, 0.998)
    ).rgb;

    bool front = gl_FrontFacing;
    vec3 N0 = normalize(vN);
    vec3 T = normalize(vT);
    vec3 B = normalize(vB);
    if (!front) N0 = -N0;

    // Brushed / hammered micro normal
    vec2 nuv = vLocal * 1.7 + vSeed.yz * 9.0;
    vec3 nm = texture2D(uNormalTex, nuv).xyz * 2.0 - 1.0;
    float nStrength = 0.5 + vSeed.y * 0.3;
    vec3 N = normalize(T * nm.x * nStrength + B * nm.y * nStrength + N0 * nm.z);

    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uLightPos - vWorldPos);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.0);
    float tilt = length(N0.xy);

    // Chromatic aberration: split R/G/B reflection directions, stronger at rim/Fresnel
    float rim = clamp(length(vLocal) * 2.0, 0.0, 1.0);
    float ab = uAberr * (0.30 + 1.4 * rim + 1.2 * fres) * uSplitAmount;
    vec3 offW = T * vLocal.x + B * vLocal.y;
    vec3 Nr = normalize(N - offW * ab * 0.9);
    vec3 Nb = normalize(N + offW * ab * 0.9);

    vec3 envC = vec3(envSample(Nr, V).r, envSample(N, V).g, envSample(Nb, V).b);
    vec3 blissC = vec3(blissSample(Nr).r, blissSample(N).g, blissSample(Nb).b);

    float holoPhase =
      vScreenUv.y * 0.24 + N.x * 5.6 - N.y * 6.0 + (vSeed.x - 0.5) * 0.36 +
      dot(vLocal, normalize(vec2(0.55 + N.y * 4.5, 0.45 - N.x * 4.5))) * 0.55;
    vec3 holo = mix(
      sampleDichroicHoloLinear(holoPhase),
      sampleDichroicHoloLinear(holoPhase + 0.28 + vLocal.y * 0.32 + N.x * 1.4),
      0.45
    );

    vec3 Rmain = reflect(-V, N);
    float ndl = max(dot(Rmain, L), 0.0);

    // ---- Front face: mirror / holographic ----
    vec3 refl = blissC * 0.65 + envC * (0.15 + 0.32 * fres);
    float irid = clamp(0.18 + tilt * 1.8 + fres * 0.3, 0.0, 0.55);
    vec3 fc = mix(refl, refl * (0.45 + 1.15 * holo), irid);
    // Làm dịu vệt phản xạ nguồn sáng ảo mềm mại đi 10%, chống cháy trắng bệt:
    fc += (holo * pow(ndl, 42.0) * 0.252 + vec3(0.96, 0.98, 1.0) * pow(ndl, 120.0) * 0.342);

    // ---- Back face: matte black metal, some champagne gold ----
    float isGold = step(0.74, vSeed.z);
    vec3 goldC = pow(vec3(0.86, 0.66, 0.40), vec3(2.2));
    vec3 baseC = mix(vec3(0.016, 0.018, 0.024), goldC, isGold);
    vec3 envB = envSample(N, V);
    vec3 bc = baseC * (0.55 + 0.85 * envB) + baseC * pow(ndl, 30.0) * 0.315;

    vec3 col = front ? fc : bc;

    // ---- 1 vài nguồn sáng chạy sau đuôi của cursor ----
    if (uCursorActive > 0.005) {
      for (int k = 0; k < 4; k++) {
        vec2 lPos = uTrailLights[k].xy;
        float lRad = uTrailLights[k].z;
        float lInt = uTrailLights[k].w;
        if (lInt > 0.005) {
          float dL = length(vWorldPos.xy - lPos);
          if (dL < lRad) {
            float atten = pow(1.0 - dL / lRad, 2.0) * lInt;
            // Ánh sáng lan tỏa màu sắc dịu lên bề mặt kim sa
            col += uTrailColors[k] * atten * 0.45 * uSplitAmount;
            // Điểm bắt sáng specular từ nguồn sáng đuôi chuột
            vec3 Ltrail = normalize(vec3(lPos - vWorldPos.xy, 10.0));
            float tSpec = pow(max(dot(reflect(-V, N), Ltrail), 0.0), 32.0);
            col += (uTrailColors[k] * 0.75 + vec3(0.25)) * tSpec * 0.75 * atten * uSplitAmount;
          }
        }
      }
    }

    // Bevel line + soft edge falloff
    float rimLine = smoothstep(-0.05, -0.012, sd) - smoothstep(-0.012, 0.0, sd);
    col = mix(col, mix(holo, vec3(1.0), 0.5), rimLine * 0.45 * uSplitAmount);
    col *= 1.0 - smoothstep(-0.03, 0.0, sd) * 0.3 * uSplitAmount;

    // Cursor spot light (làm dịu để không bị cháy trắng tại tâm chuột)
    vec2 screenXY = cameraPosition.xy +
      (vWorldPos.xy - cameraPosition.xy) * (cameraPosition.z / max(1.0, cameraPosition.z - vWorldPos.z));
    float dMouse = length(vWorldPos.xy - uCursorWorld);
    float mouseSpot = exp(-dMouse * dMouse / (uCursorScale * uCursorScale * 16.0)) * uLightStrength;
    col += mix(pow(uLightColor, vec3(2.2)), holo, 0.6) * mouseSpot * 0.08 * uSplitAmount;

    // Reflected cursor (arrow / hand) kept from the previous design
    if (uCursorActive > 0.005) {
      vec2 mirrorShift = N.xy * (uCursorScale * 0.72) + vec2(0.06, -0.07) * uCursorScale;
      float pressScale = 1.0 - 0.10 * uCursorPressed;
      vec2 curLocal = (screenXY - (uCursorWorld + mirrorShift)) / max(0.25, uCursorScale * pressScale);
      vec2 cellUv = curLocal + 0.5;

      float prox = 1.0 - smoothstep(uCursorScale * 0.9, uCursorScale * 3.2, length(screenXY - uCursorWorld));
      float reflVis = uCursorActive * prox * uSplitAmount * (front ? 1.0 : 0.0);

      if (uCursorPressed > 0.01) {
        float ring = exp(-pow((length(curLocal) - 0.24) * 10.0, 2.0)) * uCursorPressed * reflVis;
        col = mix(col, mix(holo, vec3(1.0), 0.55), clamp(ring * 0.65, 0.0, 0.65));
      }

      if (cellUv.x > 0.02 && cellUv.x < 0.98 && cellUv.y > 0.02 && cellUv.y < 0.98) {
        float typeIdx = floor(clamp(uCursorType + 0.5, 0.0, 3.0));
        float atlasU = (typeIdx + cellUv.x) * 0.25;
        vec4 cur = texture2D(uCursorTex, vec2(atlasU, cellUv.y));
        float curR = texture2D(uCursorTex, vec2(atlasU + 0.0025, cellUv.y - 0.008)).a;
        float curB = texture2D(uCursorTex, vec2(atlasU - 0.0025, cellUv.y + 0.008)).a;
        float halo = clamp((curR + curB) * 0.5 - cur.a * 0.6, 0.0, 1.0);
        col = mix(col, mix(holo, vec3(1.0), 0.4), halo * 0.55 * reflVis);
        vec3 curRGB = mix(cur.rgb, cur.rgb * (0.65 + 0.75 * holo), 0.28);
        col = mix(col, curRGB, clamp(cur.a * 0.86 * reflVis, 0.0, 0.92));
      }
    }

    // Đường cong nén sáng mượt mà (soft shoulder), bảo toàn vân kim loại và chuyển sắc, chống bệt trắng
    vec3 toneMapped = col / (vec3(1.0) + max(vec3(0.0), col - 1.0) * 0.45);
    vec3 outgoing = mix(flatCol, toneMapped, smoothstep(0.0, 0.25, uSplitAmount));
    gl_FragColor = vec4(outgoing, 1.0);
    #include <colorspace_fragment>
  }
`;

export const GLINT_VERT = /* glsl */ `
  attribute float aGlint;
  varying vec2 vUv;
  varying float vG;

  void main() {
    vUv = uv;
    vG = aGlint;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const GLINT_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying float vG;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float a = abs(p.x);
    float b = abs(p.y);
    float h = exp(-b * 45.0) * exp(-a * 3.8);
    float v = exp(-a * 45.0) * exp(-b * 3.8);
    float core = exp(-dot(p, p) * 36.0);
    float edge = 1.0 - smoothstep(0.7, 1.0, max(a, b));
    float s = (h + v + core * 1.5) * edge * vG;
    vec3 col = mix(vec3(1.0, 0.97, 0.9), vec3(0.75, 0.9, 1.0), 0.35) * s * 0.45;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export const TRAIL_ORB_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const TRAIL_ORB_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float dist = length(p);
    if (dist > 1.0) discard;

    // Lõi sáng trắng rực rỡ + quầng hào quang mềm mại mang màu sắc
    float core = exp(-dist * dist * 12.0);
    float glow = exp(-dist * 2.8) * (1.0 - smoothstep(0.4, 1.0, dist));
    vec3 col = mix(uColor, vec3(1.0, 1.0, 1.0), core * 0.85);
    float intensity = (core * 2.0 + glow * 1.5) * uAlpha;

    gl_FragColor = vec4(col * intensity, 1.0);
    #include <colorspace_fragment>
  }
`;

