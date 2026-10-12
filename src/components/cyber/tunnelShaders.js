// GLSL Shaders for 3D Cyber Wireframe Tunnel
// - Rectangular corridor wireframe extending to a dark vanishing portal
// - Serpentine curved path (sine spline) along Z
// - Undulating surface waves on the tunnel floor
// - 3D ray-hit mouse repulsion (lines curve smoothly around cursor without blowing out into white)
// - Dual-tone neon wireframes + racing photon data streaks (neon pink/magenta)
// - Clean pitch-black space background with crisp bloom, subtle CRT scanlines & chromatic aberration

export const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const tunnelVertexShader = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uScale;
uniform float uBendAmp;
uniform float uRepel;
uniform float uAspect;
uniform float uPointSize;
uniform float uPixelRatio;
uniform vec2 uMouse;

// aInfo.x: 0 = track, 1 = transverse ring, 2 = photon streak track, 3 = node/particle, 4 = vanishing box
// aInfo.y: random seed per line / particle
// aInfo.z: travel speed multiplier along Z (1.0 for rings/particles, 0.0 for static rails)
attribute vec3 aInfo;

varying float vRepelForce;
varying float vZ;
varying float vSeed;
varying float vKind;

${SIMPLEX_NOISE}

// Centerline serpentine curve
vec2 getSplineCenter(float z, float t) {
  // Near camera, smoothly straightens out so the viewport aligns cleanly with the UI
  float nearWeight = smoothstep(-2.0, -22.0, z);
  
  float waveX = sin(z * 0.032 - t * 0.65) * 2.4 + cos(z * 0.068 + 1.1) * 1.1;
  float waveY = cos(z * 0.026 - t * 0.50) * 1.8 + sin(z * 0.052 + 0.8) * 0.8;
  
  return vec2(waveX, waveY) * nearWeight * uBendAmp;
}

void main() {
  vec3 pos = position;
  pos.xy *= uScale;

  float z = pos.z;

  // Traveling rings, nodes and particles move toward the camera
  if (aInfo.z > 0.0) {
    float span = 165.0; // tunnel length
    z = mod(z + uTravel * aInfo.z, span) - span - 2.0;
  }

  // 1. Serpentine centerline curve
  vec2 center = getSplineCenter(z, uTime);
  pos.xy += center;

  // 2. Gentle undulating wave ripples on the floor (y < -3.6)
  if (pos.y < -3.6 + center.y) {
    float floorWave = sin(z * 0.085 - uTime * 2.0 + pos.x * 0.32) * 0.38
                    + cos(z * 0.15 + uTime * 1.2) * 0.15;
    pos.y += floorWave;
  }

  // 3. Subtle cyber noise vibration along the rails
  float jitter = snoise(vec3(pos.xy * 0.15, z * 0.045 + uTime * 0.4)) * 0.06;
  pos.xy += vec2(jitter, jitter * 0.5);

  pos.z = z;

  // 4. Ultra-Smooth Continuous Space-Bending & Elastic Curvature
  // Calculates an unprojected ray through the cursor into the 3D tunnel corridor
  vec3 rayDir = normalize(vec3(uMouse.x * uAspect * 0.75, uMouse.y * 0.75, -1.0));
  
  // Find where this ray intersects the tunnel surface (halfW = 8.2, halfH = 4.9)
  float tx = (abs(rayDir.x) > 1e-4) ? (8.2 / abs(rayDir.x)) : 999.0;
  float ty = (abs(rayDir.y) > 1e-4) ? (4.9 / abs(rayDir.y)) : 999.0;
  float tHit = clamp(min(tx, ty), 3.5, 50.0);
  vec3 mouseHit3D = rayDir * tHit;

  // Vector from cursor hit point to vertex in 3D world space
  vec3 delta = pos - mouseHit3D;
  float dist3D = length(delta);
  
  // Broader, sweeping warp radius: allows lines to bend gracefully across multiple grid cells
  float repelRadius = 9.2;
  float normDist = clamp(dist3D / repelRadius, 0.0, 1.0);
  float t = 1.0 - normDist;

  // C2 Continuous Quintic Bell Falloff for depth depression (1.0 at center, 0.0 at radius, zero derivatives at boundaries)
  float bell = t * t * t * (t * (t * 6.0 - 15.0) + 10.0) * uRepel;

  // Smooth lateral deflection profile that strictly goes to 0 at center (eliminating singularity/creasing)
  // Reaches peak deflection around normDist ~ 0.35, then smoothly returns to 0
  float lateralProfile = normDist * t * t * 4.0;

  // Enhanced deflection amplitudes: bends straight lines into pronounced, flowing curves
  float depthAmp = 2.2;    // Deep 3D elastic crater depression into tunnel surfaces
  float lateralAmp = 3.2;  // Strong sweeping lateral curvature bowing straight grid lines

  // 1. Outward tunnel cratering: push radially outward from corridor cross-section (floor down, walls out, ceiling up)
  // 100% continuous everywhere, no if-else branching or seam artifacts!
  vec2 outwardNorm = normalize(vec2(pos.x / 8.2, pos.y / 4.9));
  pos.xy += outwardNorm * (bell * depthAmp);

  // 2. Smooth lateral space curvature: bows straight lines outward around the cursor
  vec3 pushDir = delta / (dist3D + 1e-3);
  vec3 lateralDisp = pushDir * (lateralProfile * lateralAmp * uRepel);
  pos += lateralDisp;

  // Camera projection
  vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewPos;

  vRepelForce = bell;
  vZ = z;
  vSeed = aInfo.y;
  vKind = aInfo.x;

  #ifdef IS_POINTS
    float size = uPointSize * (0.85 + aInfo.y * 0.5);
    gl_PointSize = clamp(size * uPixelRatio * (40.0 / max(-viewPos.z, 1.0)), 1.0, 10.0 * uPixelRatio);
  #endif
}
`;

export const tunnelFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uStreakColor;
uniform float uOpacity;
uniform float uTime;

varying float vRepelForce;
varying float vZ;
varying float vSeed;
varying float vKind;

void main() {
  #ifdef IS_POINTS
    vec2 pt = gl_PointCoord - 0.5;
    float disc = 1.0 - smoothstep(0.2, 0.5, length(pt));
    if (disc <= 0.0) discard;
  #endif

  // Depth fog: fades smoothly into dark infinity at far end (-165 to -30)
  float depthFog = smoothstep(-165.0, -32.0, vZ);
  // Near fade: prevents lines from clipping abruptly on the camera lens (-1.5 to -3.8)
  float nearFade = smoothstep(-1.6, -3.8, vZ);

  vec3 col = uColor;
  float alpha = uOpacity * depthFog * nearFade;

  // 1. Mouse Repulsion Wireframe Deflection:
  // Gently brighten the wireframe lines around the cursor with energetic cyan, NO WHITE BLOWOUT!
  if (vRepelForce > 0.03) {
    vec3 energizedColor = mix(col, vec3(0.0, 0.95, 1.0), 0.65);
    col = mix(col, energizedColor, clamp(vRepelForce * 0.9, 0.0, 1.0));
    alpha = min(0.92, alpha + vRepelForce * 0.22);
  }

  // 2. Racing Photon Data Streaks (Neon pink/magenta on designated rails)
  if (vKind > 1.5 && vKind < 2.5) {
    float streakCycle = fract(vZ * 0.024 + uTime * 1.5 + vSeed * 3.8);
    float pulse = pow(smoothstep(0.68, 1.0, streakCycle), 6.0);
    if (pulse > 0.02) {
      vec3 photonColor = mix(uStreakColor, vec3(1.0, 0.25, 0.75), 0.5);
      col = mix(col, photonColor * 1.5, clamp(pulse * 1.8, 0.0, 1.0));
      alpha = min(1.0, alpha + pulse * 0.65);
    }
  }

  // 3. Vanishing Portal Box (Horizon frame at far end)
  if (vKind > 3.5) {
    col = vec3(0.0, 0.55, 0.95);
    alpha = 0.45 * depthFog;
  }

  #ifdef IS_POINTS
    alpha *= disc;
    if (vKind > 2.5 && vKind < 3.5) {
      // Floating data particles pulse gently
      alpha *= 0.6 + 0.4 * sin(uTime * 3.0 + vSeed * 22.0);
    }
  #endif

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

// Post-Processing Pass:
// - Clean space-black (ZERO noise on black pixels)
// - Realistic CRT scanlines
// - Subtle Chromatic Aberration (RGB split) across screen borders & cursor deflection
export const FinalFXShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uMouse: { value: [0.5, 0.5] },
    uMouseForce: { value: 0 },
    uAspect: { value: 1.0 },
    uRes: { value: [1920, 1080] },
    uAberration: { value: 0.005 },
    uGlitch: { value: 0.0 },
    uGrain: { value: 0.005 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMouseForce;
    uniform float uAspect;
    uniform vec2 uRes;
    uniform float uAberration;
    uniform float uGlitch;
    uniform float uGrain;
    varying vec2 vUv;

    float rand(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Glitch slice displacement on click / transition
      if (uGlitch > 0.01) {
        float slice = floor(uv.y * 36.0);
        float tick = floor(uTime * 24.0);
        float sliceTrigger = step(1.0 - uGlitch * 0.35, rand(vec2(slice, tick)));
        uv.x += (rand(vec2(slice * 2.1, tick)) - 0.5) * 0.035 * sliceTrigger * uGlitch;
      }

      // 1. Radial Chromatic Aberration from screen center
      vec2 dirFromCenter = uv - 0.5;
      float edgeDist = dot(dirFromCenter, dirFromCenter) * 1.6;

      // 2. Localized cursor chromatic dispersion
      vec2 mDiff = uv - uMouse;
      mDiff.x *= uAspect;
      float mDist = length(mDiff);
      float mSplit = exp(-(mDist * mDist) / 0.03) * uMouseForce * 0.006;

      vec2 caOffset = dirFromCenter * edgeDist * uAberration
                    + normalize(uv - uMouse + 1e-4) * mSplit
                    + vec2(uGlitch * 0.005, 0.0);

      // Sample RGB channels with chromatic displacement
      float r = texture2D(tDiffuse, uv + caOffset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - caOffset).b;
      vec3 col = vec3(r, g, b);

      // Subtle CRT scanline overlay (preserves black pixels completely)
      float scanline = 0.975 + 0.025 * sin(uv.y * uRes.y * 1.4);
      col *= scanline;

      // Clean film grain: ONLY applies to illuminated pixels, ZERO noise on black background!
      float lum = length(col);
      if (lum > 0.02) {
        float grain = (rand(uv * uRes + fract(uTime * 7.13) * 91.0) - 0.5) * uGrain;
        col += grain * smoothstep(0.02, 0.35, lum);
      }

      // Vignette: gentle edge falloff framing the cockpit view
      float vignette = smoothstep(1.4, 0.42, length(dirFromCenter * vec2(1.0, 1.15)));
      col *= vignette;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};
