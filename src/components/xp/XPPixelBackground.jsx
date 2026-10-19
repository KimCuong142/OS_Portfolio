import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * XPPixelBackground
 *
 * Implements an interactive 3D pixel-dissolve effect on the Windows XP Bliss wallpaper.
 *
 * Specific refinements:
 * 1. Strict lateral parting only ("chỉ trượt qua 2 bên của hình tròn chứ không trượt từ đầu này qua bên kia của hình tròn"):
 *    Pixels NEVER travel along the velocity/movement axis (never push forward or cross backward through the cursor).
 *    They part strictly perpendicularly to the left/right flanks (+- normal) of the cursor trajectory.
 * 2. Comet tail wake ("khi di chuột nhanh nó phải có cái đuôi giống như sao băng vậy"):
 *    Fast cursor sweeps stamp an elongated, aerodynamic wake corridor in a 1:1 cell DataTexture.
 *    Airborne pixels hold their lateral parting along the trail, forming a streaming, tapering comet tail,
 *    and smoothly slide back inward to their exact original slots over ~1.8-2.0 seconds.
 * 3. White sockets on base wallpaper: Under airborne pixels, clean retro hairline white sockets are visible,
 *    fading back into the pristine wallpaper as pixels return and settle.
 * 4. Single flat color per pixel: Sampled once at the center of each cell with zero internal gradient noise.
 * 5. Low subtle lift (Z ~ 2.8..3.3) and smooth tilt along displacement with zero jitter.
 */

const BLISS_IMAGE_URL = "/images/windowsXPwallpaper.jpg";
const BLISS_ASPECT = 4500 / 3000; // 1.5 aspect ratio

const XPPixelBackground = ({ active = true }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // --- 1. THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();

    const fov = 45;
    const camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- 2. VIEWPORT & PLANE DIMENSIONS ---
    let planeW = 1;
    let planeH = 1;

    const calcPlaneSize = () => {
      const dist = camera.position.z;
      const vFov = (camera.fov * Math.PI) / 180;
      planeH = 2 * Math.tan(vFov / 2) * dist;
      planeW = planeH * camera.aspect;
    };
    calcPlaneSize();

    // --- 3. BLISS WALLPAPER TEXTURE ---
    const textureLoader = new THREE.TextureLoader();
    const wallpaperTexture = textureLoader.load(BLISS_IMAGE_URL, () => {
      wallpaperTexture.minFilter = THREE.LinearFilter;
      wallpaperTexture.magFilter = THREE.LinearFilter;
      wallpaperTexture.generateMipmaps = true;
    });

    const uUvScale = { value: new THREE.Vector2(1, 1) };
    const uUvOffset = { value: new THREE.Vector2(0, 0) };

    const updateUvCover = (w, h) => {
      const screenAspect = w / h;
      if (screenAspect > BLISS_ASPECT) {
        const sy = BLISS_ASPECT / screenAspect;
        uUvScale.value.set(1.0, sy);
        uUvOffset.value.set(0.0, (1.0 - sy) * 0.5);
      } else {
        const sx = screenAspect / BLISS_ASPECT;
        uUvScale.value.set(sx, 1.0);
        uUvOffset.value.set((1.0 - sx) * 0.5, 0.0);
      }
    };

    // Shared uniforms
    const uCols = { value: 1 };
    const uRows = { value: 1 };
    const uRadius = { value: planeW * 0.038 };
    const uMaxDisp = { value: planeW * 0.038 * 2.8 };

    // Initial dummy 1x1 DataTexture for baseMat initialization
    let trailData = null;
    let cellState = null;
    let cellReturnSpeed = null;
    let trailTexture = new THREE.DataTexture(
      new Uint8Array([0, 128, 128, 0]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );

    // --- 4. BASE WALLPAPER MESH (Z = 0, PURE AND PRISTINE, WHITE SOCKETS UNDER AIRBORNE PIXELS) ---
    const baseGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const baseMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: wallpaperTexture },
        uTrailMap: { value: trailTexture },
        uUvScale: uUvScale,
        uUvOffset: uUvOffset,
        uCols: uCols,
        uRows: uRows,
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uTrailMap;
        uniform vec2 uUvScale;
        uniform vec2 uUvOffset;
        uniform float uCols;
        uniform float uRows;
        varying vec2 vUv;

        void main() {
          vec2 imageUv = vUv * uUvScale + uUvOffset;
          vec4 baseColor = texture2D(uTexture, imageUv);

          // Snap to cell center to get pixelated cell activation
          vec2 grid = vec2(uCols, uRows);
          vec2 cellCoord = floor(vUv * grid);
          vec2 cellCenterUv = (cellCoord + 0.5) / grid;

          vec4 trail = texture2D(uTrailMap, cellCenterUv);
          float trailAct = trail.r;
          float trailProg = trail.a;

          if (trailAct > 0.008 || trailProg > 0.008) {
            // Local UV within the cell: [0, 1]
            vec2 localUv = fract(vUv * grid);

            // Shape of the white tile slot with clean retro hairline spacing
            bool insideTile = localUv.x >= 0.04 && localUv.x <= 0.96 &&
                              localUv.y >= 0.06 && localUv.y <= 0.94;

            // Pure white tile (100% pure white inside, crisp subtle hairline border)
            vec3 whiteTile = insideTile ? vec3(1.0, 1.0, 1.0) : vec3(0.93, 0.95, 0.98);

            // While pixel is in flight, socket opacity scales with displacement intensity:
            // High speed / full fling (dispIntensity > 0.38): socket is 100% SOLID PURE WHITE.
            // Gentle ripple (dispIntensity ~ 0.08): socket is subtle ripple highlight.
            // Once pixel touches down (trailProg <= 0.02), the socket outline smoothly dissolves into the wallpaper!
            float dispIntensity = length((trail.gb - vec2(0.50196078, 0.50196078)) * 2.0);
            float flightWhite = smoothstep(0.04, 0.38, dispIntensity);

            float socketWhite = trailProg > 0.02
              ? flightWhite
              : (!insideTile ? smoothstep(0.008, 0.35, trailAct) : 0.0);

            vec3 finalColor = mix(baseColor.rgb, whiteTile, socketWhite);
            gl_FragColor = vec4(finalColor, 1.0);
          } else {
            gl_FragColor = baseColor;
          }
        }
      `,
      depthWrite: false,
      depthTest: false,
    });

    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.frustumCulled = false;
    baseMesh.scale.set(planeW, planeH, 1);
    scene.add(baseMesh);

    // --- 5. FLOATING INSTANCED PIXELS WITH LATERAL PARTING & COMET WAKE ---
    let instancedMesh = null;
    let currentCols = 1;
    let currentRows = 1;
    let currentCellW = 1;
    let currentCellH = 1;

    const buildInstancedPixels = () => {
      if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.material.dispose();
        instancedMesh = null;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Density: ~12px per cell
      const targetCellPx = w < 768 ? 11 : 12;
      const cols = Math.floor(w / targetCellPx);
      const rows = Math.floor(h / targetCellPx);
      const totalInstances = cols * rows;

      currentCols = cols;
      currentRows = rows;
      uCols.value = cols;
      uRows.value = rows;

      const cellW = planeW / cols;
      const cellH = planeH / rows;
      currentCellW = cellW;
      currentCellH = cellH;

      // Reallocate 1:1 DataTexture matching exact grid cells
      if (trailTexture) trailTexture.dispose();
      trailData = new Uint8Array(cols * rows * 4);
      cellState = new Uint8Array(cols * rows);
      cellReturnSpeed = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        trailData[i * 4 + 0] = 0;   // Trail activation (0..255)
        trailData[i * 4 + 1] = 128; // Displacement X: 128 = neutral 0.0
        trailData[i * 4 + 2] = 128; // Displacement Y: 128 = neutral 0.0
        trailData[i * 4 + 3] = 0;   // Displacement progress (0..255)
        cellState[i] = 0;           // State: 0=rest, 1=launch, 2=return, 3=landed
        cellReturnSpeed[i] = 75;    // Base return speed
      }

      trailTexture = new THREE.DataTexture(
        trailData,
        cols,
        rows,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      trailTexture.minFilter = THREE.NearestFilter;
      trailTexture.magFilter = THREE.NearestFilter;
      trailTexture.generateMipmaps = false;
      trailTexture.flipY = false;
      trailTexture.needsUpdate = true;

      baseMat.uniforms.uTrailMap.value = trailTexture;

      // Clean rectangular tile with small retro gap
      const dashW = cellW * 0.92;
      const dashH = cellH * 0.88;

      const quadGeo = new THREE.PlaneGeometry(dashW, dashH);

      const instGeo = new THREE.InstancedBufferGeometry();
      instGeo.index = quadGeo.index;
      instGeo.attributes.position = quadGeo.attributes.position;
      instGeo.attributes.uv = quadGeo.attributes.uv;

      const aOrigin = new Float32Array(totalInstances * 2);
      const aCellUv = new Float32Array(totalInstances * 2);
      const aRandom = new Float32Array(totalInstances * 3);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) / cols;
          const v = (r + 0.5) / rows;

          const px = -planeW / 2 + (c + 0.5) * cellW;
          const py = -planeH / 2 + (r + 0.5) * cellH;

          aOrigin[idx * 2] = px;
          aOrigin[idx * 2 + 1] = py;

          aCellUv[idx * 2] = u;
          aCellUv[idx * 2 + 1] = v;

          aRandom[idx * 3] = Math.random();
          aRandom[idx * 3 + 1] = Math.random();
          aRandom[idx * 3 + 2] = Math.random() * 2.0 - 1.0;

          idx++;
        }
      }

      instGeo.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(aOrigin, 2));
      instGeo.setAttribute("aCellUv", new THREE.InstancedBufferAttribute(aCellUv, 2));
      instGeo.setAttribute("aRandom", new THREE.InstancedBufferAttribute(aRandom, 3));

      const pixelMat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: wallpaperTexture },
          uTrailMap: { value: trailTexture },
          uUvScale: uUvScale,
          uUvOffset: uUvOffset,
          uMaxDisp: uMaxDisp,
        },
        vertexShader: `
          uniform sampler2D uTrailMap;
          uniform float uMaxDisp;
          attribute vec2 aOrigin;
          attribute vec2 aCellUv;
          attribute vec3 aRandom;
          varying vec2 vCellUv;
          varying float vAct;
          varying float vProg;

          void main() {
            vCellUv = aCellUv;

            // 1. Trail decay activation
            vec4 trail = texture2D(uTrailMap, aCellUv);
            float trailAct = trail.r;
            vAct = trailAct;

            // 2. Physical displacement progress: 0.0 at rest, 1.0 at peak launch distance
            float prog = trail.a;
            vProg = prog;

            // 3. Unpack displacement vector [-1, 1]
            vec2 dispNorm = (trail.gb - vec2(0.50196078, 0.50196078)) * 2.0;

            // Physical displacement: animates outward from home slot to peak, and back!
            vec2 displacement = dispNorm * uMaxDisp * prog;

            // Speed intensity derived from displacement magnitude
            float dispIntensity = clamp(length(dispNorm), 0.0, 1.0);

            // 3D Parabolic Ballistic Lift:
            // Slow glide (dispIntensity ~ 0.08): subtle surface ripple (Z ~ 0.5 .. 0.9)
            // Fast swipe (dispIntensity ~ 0.8+): high ballistic leap (Z ~ 5.5 .. 8.0)
            float liftScale = mix(0.12, 1.0, smoothstep(0.06, 0.75, dispIntensity));
            float liftArc = prog * (2.0 - prog); // 0 at rest, 1 at peak
            float lift = liftArc * (5.0 + aRandom.x * 3.0) * liftScale;

            // Dynamic 3D Tumble:
            // Fast: chaotic aerodynamic tumbling up to 100 degrees
            // Slow: gentle, graceful surface tilt (under 8 degrees)
            float tumbleScale = mix(0.08, 1.0, smoothstep(0.06, 0.75, dispIntensity));
            float roll = aRandom.z * 1.8 * prog * tumbleScale;
            float cz = cos(roll); float sz = sin(roll);

            float pitch = (-dispNorm.y * 0.75 + (aRandom.x - 0.5) * 0.70 * tumbleScale) * prog;
            float yaw = (dispNorm.x * 0.75 + (aRandom.y - 0.5) * 0.70 * tumbleScale) * prog;
            float cx = cos(pitch); float sx = sin(pitch);
            float cy = cos(yaw); float sy = sin(yaw);

            vec3 p = position;

            // Apply Roll (around Z-axis)
            p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);

            // Apply Pitch (around X-axis)
            p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);

            // Apply Yaw (around Y-axis)
            p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

            vec3 worldPos = vec3(aOrigin + displacement, lift) + p;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform vec2 uUvScale;
          uniform vec2 uUvOffset;
          varying vec2 vCellUv;
          varying float vAct;
          varying float vProg;

          void main() {
            if (vAct < 0.008 && vProg < 0.008) discard;

            // Exactly ONE flat color per pixel: sampled ONCE at cell center
            vec2 imageUv = vCellUv * uUvScale + uUvOffset;
            vec3 cellColor = texture2D(uTexture, imageUv).rgb;

            // Subtle luminous warmth for airborne pixels in the comet wake
            vec3 cometGlow = mix(cellColor, cellColor + vec3(0.06, 0.07, 0.09), vProg);

            // While airborne (vProg > 0.02), pixel is 100% opaque.
            // Once landed (vProg <= 0.02):
            // Pixel smoothly dissolves into the seamless wallpaper underneath!
            float alpha = vProg > 0.02 ? 1.0 : smoothstep(0.008, 0.35, vAct);

            gl_FragColor = vec4(cometGlow, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });

      instancedMesh = new THREE.Mesh(instGeo, pixelMat);
      instancedMesh.frustumCulled = false;
      scene.add(instancedMesh);
    };

    updateUvCover(window.innerWidth, window.innerHeight);
    buildInstancedPixels();

    // --- 6. COMET WAKE & STRICT LATERAL PARTING SIMULATOR ---
    const mouse = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      prevWorldX: 0,
      prevWorldY: 0,
      hasPrev: false,
      isInside: false,
      lastMoveTime: 0,
    };

    let lastDirX = 1.0;
    let lastDirY = 0.0;
    let lastNormX = 0.0;
    let lastNormY = 1.0;

    /**
     * Stamping a capsule segment from (x0, y0) to (x1, y1) in world space:
     * - Vector V = (x1 - x0, y1 - y0) is the forward motion direction.
     * - Normal N = (-Vy, Vx) is the lateral axis perpendicular to motion.
     * - Every cell inside the corridor is pushed STRICTLY along +-N (lateral flanks).
     * - Forward/backward displacement is mathematically ZERO, preventing traversal across the circle!
     */
    const stampSegment = (x0, y0, x1, y1, speedRatio = 0.5) => {
      if (!trailData) return;

      const vx = x1 - x0;
      const vy = y1 - y0;
      const segLen = Math.hypot(vx, vy);

      // Never stamp if stationary or movement distance is negligible
      if (segLen < planeW * 0.0002) return;

      let dirX = lastDirX;
      let dirY = lastDirY;
      let normX = lastNormX;
      let normY = lastNormY;

      dirX = vx / segLen;
      dirY = vy / segLen;
      normX = -dirY;
      normY = dirX;
      lastDirX = dirX;
      lastDirY = dirY;
      lastNormX = normX;
      lastNormY = normY;

      const baseRadius = uRadius.value;
      // Dynamic aerodynamic wake width:
      // When gliding slowly/moderately, the wake stays sleeker (0.72x baseRadius),
      // keeping the corridor compact so small ripples look sharp and refined.
      // When swiping fast, it flares dynamically up to 1.15x baseRadius like a blazing comet plume.
      const wakeRadius = baseRadius * (0.72 + 0.43 * speedRatio);
      const maxDisp = uMaxDisp.value;

      // World bounding box of the capsule segment
      const minX = Math.min(x0, x1) - wakeRadius;
      const maxX = Math.max(x0, x1) + wakeRadius;
      const minY = Math.min(y0, y1) - wakeRadius;
      const maxY = Math.max(y0, y1) + wakeRadius;

      // Grid index bounds
      const minC = Math.max(0, Math.floor(((minX + planeW / 2) / planeW) * currentCols));
      const maxC = Math.min(currentCols - 1, Math.ceil(((maxX + planeW / 2) / planeW) * currentCols));
      const minR = Math.max(0, Math.floor(((minY + planeH / 2) / planeH) * currentRows));
      const maxR = Math.min(currentRows - 1, Math.ceil(((maxY + planeH / 2) / planeH) * currentRows));

      const segLenSq = segLen * segLen;

      for (let r = minR; r <= maxR; r++) {
        const cy = -planeH / 2 + (r + 0.5) * currentCellH;
        for (let c = minC; c <= maxC; c++) {
          const cx = -planeW / 2 + (c + 0.5) * currentCellW;

          // Vector from segment start to cell center
          const wx = cx - x0;
          const wy = cy - y0;

          // Projection along the motion segment
          let t = 0;
          if (segLenSq > 0.000001) {
            const proj = (wx * vx + wy * vy) / segLenSq;
            t = THREE.MathUtils.clamp(proj, 0.0, 1.0);
          }

          // Closest point on segment
          const qx = x0 + t * vx;
          const qy = y0 + t * vy;

          // Vector from trajectory to cell center
          const rx = cx - qx;
          const ry = cy - qy;
          const d = Math.hypot(rx, ry);

          // Aerodynamic forward taper along segment: trailing end tapers to 75%, leading head is 100%
          const segWakeRadius = wakeRadius * (0.75 + 0.25 * t);

          if (d <= segWakeRadius) {
            // Relative distance from centerline: 0.0 at center, 1.0 at outer boundary
            const rRel = d / segWakeRadius;

            // Base radial direction away from closest point on trajectory
            let uDirX = 0;
            let uDirY = 0;
            if (d > 0.0001) {
              uDirX = rx / d;
              uDirY = ry / d;
            } else {
              const s = wx * normX + wy * normY;
              const side = s >= 0 ? 1.0 : -1.0;
              uDirX = side * normX;
              uDirY = side * normY;
            }

            // Dynamic scatter angle ("góc bay văng ra"):
            // Deterministic pseudo-random fan spread of +-28 degrees:
            const randAngle = Math.sin(c * 12.9898 + r * 78.233) * 0.48;
            const cosA = Math.cos(randAngle);
            const sinA = Math.sin(randAngle);
            let flingX = uDirX * cosA - uDirY * sinA;
            let flingY = uDirX * sinA + uDirY * cosA;

            // Inherit 22% forward momentum from cursor stroke direction for visceral flung feeling:
            flingX = flingX * 0.78 + dirX * 0.22;
            flingY = flingY * 0.78 + dirY * 0.22;
            const flingLen = Math.hypot(flingX, flingY);
            if (flingLen > 0.0001) {
              flingX /= flingLen;
              flingY /= flingLen;
            }

            // Speed-responsive displacement profile:
            // - Low speed / slow glide: pixels ripple gently by 0.35..1.0 cell widths (gợn nhẹ tại chỗ).
            // - High speed / fast swipe: pixels fling outward to maximum distance (bay xa tối đa, up to maxDisp).
            const energy = Math.pow(1.0 - rRel, 0.70); // 1.0 at center, 0.0 at edge
            const depthMult = 0.85 + Math.abs(Math.cos(c * 34.56 + r * 56.78)) * 0.30;
            const speedCurve = THREE.MathUtils.clamp(Math.pow(speedRatio, 0.75), 0.0, 1.0);

            const ripplePush = currentCellW * (0.35 + 0.65 * energy) * depthMult;
            const maxPush = segWakeRadius * (1.45 + 1.65 * energy) * depthMult;
            const pushMag = THREE.MathUtils.lerp(ripplePush, maxPush, speedCurve);
            const dispX = flingX * pushMag;
            const dispY = flingY * pushMag;

            // Generous activation across entire wake
            const edgeRel = THREE.MathUtils.clamp((1.0 - rRel) / 0.15, 0.0, 1.0);
            const val = Math.round(255 * (0.88 + 0.12 * edgeRel));

            const i = r * currentCols + c;
            const idx = i * 4;

            trailData[idx] = Math.max(val, trailData[idx]);
            trailData[idx + 1] = Math.round(128 + THREE.MathUtils.clamp(dispX / maxDisp, -1, 1) * 127);
            trailData[idx + 2] = Math.round(128 + THREE.MathUtils.clamp(dispY / maxDisp, -1, 1) * 127);

            // Dynamic outside-in zipper return speed:
            // Outer flanks (rRel near 1.0) snap back ultra-fast (~100-140ms).
            // Central spine return speed scales with mouse velocity:
            // - Slow glide: returns promptly in ~300ms (gợn nhẹ rồi đáp xuống liền).
            // - Fast swipe: spine glides for ~950ms to stretch the dramatic shooting star tail.
            const spineFactor = Math.pow(1.0 - rRel, 1.8);
            const centerSpeed = THREE.MathUtils.lerp(820, 260, Math.pow(speedRatio, 0.7));
            const rSpeed = Math.round(centerSpeed + (1.0 - spineFactor) * 1650);
            if (cellReturnSpeed) {
              cellReturnSpeed[i] = Math.min(255, Math.round(rSpeed / 8));
            }

            // Start outward launch (if not already launching)
            if (cellState && cellState[i] !== 1) {
              cellState[i] = 1;
            }
          }
        }
      }
    };

    const shockwaves = [];

    const triggerShockwave = (normX, normY) => {
      shockwaves.push({
        x: normX,
        y: normY,
        radius: 0.01,
        maxRadius: 0.22,
        strength: 1.0,
      });
    };

    // Pointer events on window
    const onPointerMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const tx = THREE.MathUtils.clamp(e.clientX / w, 0, 1);
      const ty = THREE.MathUtils.clamp(e.clientY / h, 0, 1);

      if (Math.abs(tx - mouse.targetX) > 0.0001 || Math.abs(ty - mouse.targetY) > 0.0001) {
        mouse.targetX = tx;
        mouse.targetY = ty;
        mouse.lastMoveTime = performance.now();
      }

      if (!mouse.isInside) {
        mouse.x = mouse.targetX;
        mouse.y = mouse.targetY;
        mouse.prevWorldX = (mouse.x - 0.5) * planeW;
        mouse.prevWorldY = (0.5 - mouse.y) * planeH;
        mouse.hasPrev = false;
        mouse.isInside = true;
      }
    };

    const onPointerDown = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nx = THREE.MathUtils.clamp(e.clientX / w, 0, 1);
      const ny = THREE.MathUtils.clamp(e.clientY / h, 0, 1);
      triggerShockwave(nx, ny);
    };

    const onPointerLeave = (e) => {
      if (!e.relatedTarget) {
        mouse.isInside = false;
        mouse.hasPrev = false;
        mouse.lastMoveTime = 0;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        onPointerMove(touch);
      }
    };

    const onTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        onPointerDown(touch);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mouseout", onPointerLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    // --- 7. RESIZE HANDLER ---
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      calcPlaneSize();
      baseMesh.scale.set(planeW, planeH, 1);

      uRadius.value = planeW * 0.038;
      uMaxDisp.value = uRadius.value * 2.8;

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      updateUvCover(w, h);

      buildInstancedPixels();
    };

    window.addEventListener("resize", onResize);

    // --- 8. ANIMATION LOOP ---
    let animId = null;
    let prevTime = performance.now();

    const updateTrail = (dt, isStationary = false) => {
      if (!trailData || !cellState) return false;

      // While mouse is moving, decay overall lifetime over ~1.9s.
      // When mouse is stationary, settle cleanly in ~0.95s.
      const decayRate = isStationary ? 260.0 : 135.0;
      const decay = Math.max(1, Math.round(decayRate * dt));
      const total = currentCols * currentRows;
      let hasActive = false;

      // Snappy outward launch: reaches 255 in ~125ms (fast, explosive fling)
      const launchStep = Math.max(16, Math.round(2000.0 * dt));
      // Smooth continuous return: returns to 0 in ~420ms (fluid, zero pause)
      const returnStep = Math.max(6, Math.round(600.0 * dt));

      for (let i = 0; i < total; i++) {
        const idx = i * 4;
        const act = trailData[idx];

        if (act > 0 || (cellState && cellState[i] !== 0)) {
          hasActive = true;
          const nextAct = Math.max(0, act - decay);
          trailData[idx] = nextAct;

          let prog = trailData[idx + 3];
          const st = cellState ? cellState[i] : 0;

          if (st === 1) {
            // PHASE 1: LAUNCHING OUTWARD AT DYNAMIC SCATTER ANGLE!
            prog += launchStep;
            if (prog >= 255) {
              prog = 255;
              cellState[i] = 2; // APEX REACHED! IMMEDIATELY SWITCH TO RETURN! ZERO DELAY!
            }
          } else if (st === 2) {
            // PHASE 2: FLUID RETURN TOWARDS HOME SLOT (TAPERED VELOCITY PER CELL)!
            // Outer pixels return at high speed, center pixels glide longer -> sharp V-shaped needle tail!
            const cellSpeed = cellReturnSpeed ? cellReturnSpeed[i] * 8 : 600;
            const dynamicReturnStep = Math.max(6, Math.round(cellSpeed * dt));
            prog -= dynamicReturnStep;
            if (prog <= 0) {
              prog = 0;
              cellState[i] = 3; // Landed!
            }
          } else if (st === 3) {
            // PHASE 3: LANDED, WHITE SOCKET AND PIXEL DISSOLVING INTO WALLPAPER
            prog = 0;
            if (nextAct === 0) {
              cellState[i] = 0; // Fully reset
              trailData[idx + 1] = 128;
              trailData[idx + 2] = 128;
            }
          }

          trailData[idx + 3] = prog;
        }
      }

      // 2. Shockwaves from click
      if (shockwaves.length > 0) {
        hasActive = true;
        for (let i = shockwaves.length - 1; i >= 0; i--) {
          const sw = shockwaves[i];
          sw.radius += dt * 0.30;
          sw.strength -= dt * 0.85;

          if (sw.radius >= sw.maxRadius || sw.strength <= 0) {
            shockwaves.splice(i, 1);
            continue;
          }

          const swWorldX = (sw.x - 0.5) * planeW;
          const swWorldY = (0.5 - sw.y) * planeH;
          const rWorld = sw.radius * planeW;
          const ringWidth = planeW * 0.025;
          const maxDisp = uMaxDisp.value;

          const minC = Math.max(0, Math.floor(((swWorldX - rWorld - ringWidth + planeW / 2) / planeW) * currentCols));
          const maxC = Math.min(currentCols - 1, Math.ceil(((swWorldX + rWorld + ringWidth + planeW / 2) / planeW) * currentCols));
          const minR = Math.max(0, Math.floor(((swWorldY - rWorld - ringWidth + planeH / 2) / planeH) * currentRows));
          const maxR = Math.min(currentRows - 1, Math.ceil(((swWorldY + rWorld + ringWidth + planeH / 2) / planeH) * currentRows));

          for (let r = minR; r <= maxR; r++) {
            const cy = -planeH / 2 + (r + 0.5) * currentCellH;
            for (let c = minC; c <= maxC; c++) {
              const cx = -planeW / 2 + (c + 0.5) * currentCellW;
              const dx = cx - swWorldX;
              const dy = cy - swWorldY;
              const dist = Math.hypot(dx, dy);
              const ringDist = Math.abs(dist - rWorld);
              if (ringDist <= ringWidth) {
                const falloff = (1.0 - ringDist / ringWidth) * sw.strength;
                const val = Math.round(falloff * 255);
                const i = r * currentCols + c;
                const idx = i * 4;

                if (val > trailData[idx]) {
                  const dirX = dist > 0.0001 ? dx / dist : 0;
                  const dirY = dist > 0.0001 ? dy / dist : 1;
                  const push = ringWidth * 1.8 * falloff;
                  trailData[idx] = val;
                  trailData[idx + 1] = Math.round(128 + THREE.MathUtils.clamp((dirX * push) / maxDisp, -1, 1) * 127);
                  trailData[idx + 2] = Math.round(128 + THREE.MathUtils.clamp((dirY * push) / maxDisp, -1, 1) * 127);
                  if (cellReturnSpeed) {
                    cellReturnSpeed[i] = 75;
                  }
                  if (cellState && cellState[i] !== 1) {
                    cellState[i] = 1;
                  }
                }
              }
            }
          }
        }
      }

      if (trailTexture) {
        trailTexture.needsUpdate = true;
      }

      return hasActive;
    };

    const animate = (time) => {
      if (!isRunningRef.current) return;

      const dt = Math.min((time - prevTime) * 0.001, 0.06);
      prevTime = time;

      // Mouse is considered stationary if idle for > 120ms or outside window
      const idleTime = time - mouse.lastMoveTime;
      const isStationary = !mouse.isInside || idleTime > 120;

      if (!isStationary) {
        // Direct, smooth interpolation
        mouse.x += (mouse.targetX - mouse.x) * 0.75;
        mouse.y += (mouse.targetY - mouse.y) * 0.75;

        const currWorldX = (mouse.x - 0.5) * planeW;
        const currWorldY = (0.5 - mouse.y) * planeH;

        if (mouse.hasPrev) {
          const moveDist = Math.hypot(currWorldX - mouse.prevWorldX, currWorldY - mouse.prevWorldY);
          if (moveDist > planeW * 0.0002) {
            // Speed metric in screen-widths per second:
            const speedScreensPerSec = (moveDist / planeW) / Math.max(0.005, dt);
            // 0.0 for slow glide (<= 0.12 screen/s), 1.0 for fast swipe (>= 1.8 screen/s)
            const instantSpeedRatio = THREE.MathUtils.clamp((speedScreensPerSec - 0.12) / 1.68, 0.0, 1.0);
            mouse.speedRatio = THREE.MathUtils.lerp(mouse.speedRatio !== undefined ? mouse.speedRatio : instantSpeedRatio, instantSpeedRatio, 0.45);

            stampSegment(mouse.prevWorldX, mouse.prevWorldY, currWorldX, currWorldY, mouse.speedRatio);
            mouse.prevWorldX = currWorldX;
            mouse.prevWorldY = currWorldY;
          }
        } else {
          mouse.prevWorldX = currWorldX;
          mouse.prevWorldY = currWorldY;
          mouse.hasPrev = true;
          mouse.speedRatio = 0;
        }
      } else {
        mouse.hasPrev = false;
        mouse.speedRatio = 0;
      }

      updateTrail(dt, isStationary);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    if (active) {
      isRunningRef.current = true;
      animId = requestAnimationFrame(animate);
    }

    container._startAnim = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        prevTime = performance.now();
        onResize();
        animId = requestAnimationFrame(animate);
      }
    };
    container._stopAnim = () => {
      isRunningRef.current = false;
      if (animId) cancelAnimationFrame(animId);
    };

    return () => {
      isRunningRef.current = false;
      if (animId) cancelAnimationFrame(animId);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mouseout", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("resize", onResize);

      if (instancedMesh) {
        instancedMesh.geometry.dispose();
        instancedMesh.material.dispose();
      }
      if (trailTexture) trailTexture.dispose();
      cellState = null;
      cellReturnSpeed = null;
      baseGeo.dispose();
      baseMat.dispose();
      wallpaperTexture.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (active) {
      if (container._startAnim) container._startAnim();
    } else {
      if (container._stopAnim) container._stopAnim();
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden transition-opacity duration-300 ${
        active ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};

export default XPPixelBackground;
