import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  tunnelVertexShader,
  tunnelFragmentShader,
  FinalFXShader,
} from "./tunnelShaders";

// Tunnel Dimensions (World units matching reference perspective corridor)
const HALF_W = 8.2;
const HALF_H = 4.9;
const TUNNEL_LEN = 165.0; // Restored to initial full depth length
const NEAR_Z = -2.2;
const FAR_Z = NEAR_Z - TUNNEL_LEN;
const RINGS = 22; // Well-spaced transverse rings for full length
const DIV_FLOOR = 10; // Reduced lines (was 16) for clean, spacious grid
const DIV_CEIL = 10;  // Reduced lines (was 16)
const DIV_WALL = 6;   // Reduced lines (was 10)
const SEGMENTS_Z = 160; // Reduced tessellation (was 440) - curvature along Z is low-frequency so it stays smooth
const PARTICLES = 13; // Reduced to 1/10 (from 130)

// Build longitudinal rails (Floor, Ceiling, Left wall, Right wall)
const buildTunnelRails = () => {
  const positions = [];
  const info = [];

  const addRail = (x, y, kind = 0.0) => {
    const seed = Math.random();
    for (let s = 0; s < SEGMENTS_Z; s++) {
      const z0 = NEAR_Z - (s / SEGMENTS_Z) * TUNNEL_LEN;
      const z1 = NEAR_Z - ((s + 1) / SEGMENTS_Z) * TUNNEL_LEN;
      positions.push(x, y, z0, x, y, z1);
      info.push(kind, seed, 0.0, kind, seed, 0.0);
    }
  };

  // 1. Floor tracks
  for (let i = 0; i <= DIV_FLOOR; i++) {
    const x = -HALF_W + (2 * HALF_W * i) / DIV_FLOOR;
    const isPhotonTrack = i === 1 || i === 3;
    addRail(x, -HALF_H, isPhotonTrack ? 2.0 : 0.0);
  }

  // 2. Ceiling tracks
  for (let i = 0; i <= DIV_CEIL; i++) {
    const x = -HALF_W + (2 * HALF_W * i) / DIV_CEIL;
    const isPhotonTrack = i === DIV_CEIL - 1;
    addRail(x, HALF_H, isPhotonTrack ? 2.0 : 0.0);
  }

  // 3. Left Wall tracks
  for (let j = 1; j < DIV_WALL; j++) {
    const y = -HALF_H + (2 * HALF_H * j) / DIV_WALL;
    addRail(-HALF_W, y, j === 2 ? 2.0 : 0.0);
  }

  // 4. Right Wall tracks
  for (let j = 1; j < DIV_WALL; j++) {
    const y = -HALF_H + (2 * HALF_H * j) / DIV_WALL;
    addRail(HALF_W, y, 0.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
};

// Build transverse rings that travel along Z toward the camera (forming rectangular cells)
const buildTunnelRings = () => {
  const positions = [];
  const info = [];

  const perim = [];
  const subH = 64; // Subdivision along floor/ceiling (was 160)
  const subV = 40; // Subdivision along walls (was 96)

  for (let i = 0; i < subH; i++) {
    perim.push([-HALF_W + (2 * HALF_W * i) / subH, -HALF_H]);
  }
  for (let j = 0; j < subV; j++) {
    perim.push([HALF_W, -HALF_H + (2 * HALF_H * j) / subV]);
  }
  for (let i = 0; i < subH; i++) {
    perim.push([HALF_W - (2 * HALF_W * i) / subH, HALF_H]);
  }
  for (let j = 0; j < subV; j++) {
    perim.push([-HALF_W, HALF_H - (2 * HALF_H * j) / subV]);
  }

  for (let r = 0; r < RINGS; r++) {
    const z = NEAR_Z - (r / RINGS) * TUNNEL_LEN;
    const seed = Math.random();
    for (let k = 0; k < perim.length; k++) {
      const a = perim[k];
      const b = perim[(k + 1) % perim.length];
      positions.push(a[0], a[1], z, b[0], b[1], z);
      info.push(1.0, seed, 1.0, 1.0, seed, 1.0);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
};

// Intersection node dots at structural corner junctions (thưa và tinh tế)
const buildNodeGeometry = () => {
  const positions = [];
  const info = [];

  for (let r = 0; r < RINGS; r += 6) {
    const z = NEAR_Z - (r / RINGS) * TUNNEL_LEN;
    [
      [-HALF_W, -HALF_H],
      [HALF_W, -HALF_H],
      [-HALF_W, HALF_H],
      [HALF_W, HALF_H],
    ].forEach(([x, y]) => {
      positions.push(x, y, z);
      info.push(3.0, Math.random(), 1.0);
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
};

// Ambient cyber data particles floating along tunnel
const buildParticleGeometry = () => {
  const positions = [];
  const info = [];

  for (let i = 0; i < PARTICLES; i++) {
    const x = (Math.random() * 2 - 1) * HALF_W * 0.88;
    const y = (Math.random() * 2 - 1) * HALF_H * 0.88;
    const z = NEAR_Z - Math.random() * TUNNEL_LEN;
    positions.push(x, y, z);
    info.push(3.0, Math.random(), 0.9 + Math.random() * 1.5);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
};

export default class TunnelEngine {
  constructor(container) {
    this.container = container;
    this.lastTime = performance.now() * 0.001;
    this.speed = 5.0; // Speed reduced by half (from 10.0 to 5.0)
    this.targetMouse = new THREE.Vector2(0, -0.35);
    this.currentMouse = new THREE.Vector2(0, -0.35);
    this.cameraTilt = new THREE.Vector2(0, 0);
    this.disposed = false;
    this.paused = false;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    // Cap pixel ratio: native Retina (2x-3x) multiplies fill-rate cost 4-9x.
    // Bloom softens lines so 1.5x is visually near-identical.
    this.maxPixelRatio = 1.5;
    this.minPixelRatio = 1.0;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    this.pixelRatio = pixelRatio;
    this.frameEma = 1 / 60;
    this.perfCheckAt = performance.now() + 2000;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // MSAA is handled by the composer render target
      alpha: false,
      preserveDrawingBuffer: true, // Needed by Dock glass mirror (drawImage of this canvas)
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x01040a, 1.0);
    this.renderer.domElement.id = "cyber-2077-canvas";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, width / height, 0.1, 350);
    this.camera.position.set(0, 0, 0);

    this.shared = {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uBendAmp: { value: 1.0 },
      uRepel: { value: 1.0 },
      uAspect: { value: width / height },
      uMouse: { value: new THREE.Vector2(0, -0.35) },
      uMouseHit: { value: new THREE.Vector3(0, -2, -6) }, // 3D cursor ray hit, computed on CPU
      uPixelRatio: { value: pixelRatio },
    };

    const railsGeo = buildTunnelRails();
    const ringsGeo = buildTunnelRings();
    const nodeGeo = buildNodeGeometry();
    const particleGeo = buildParticleGeometry();
    this.geometries = [railsGeo, ringsGeo, nodeGeo, particleGeo];

    this.blueMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 1.0 },
        uRepelMult: { value: 1.0 }, // Lớp 1: uốn theo hướng chuột
        uColor: { value: new THREE.Color("#00f0ff") }, // Laser-sharp Electric Cyan
        uStreakColor: { value: new THREE.Color("#ff007f") },
        uOpacity: { value: 0.92 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendEquationAlpha: THREE.MaxEquation,
    });

    this.ringMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 1.0 },
        uRepelMult: { value: 0.0 }, // Khung chữ nhật uốn thẳng ra xa cursor mà không vặn lệch bên
        uColor: { value: new THREE.Color("#00e5ff") }, // Sắc nét, sáng rõ cho khung hình chữ nhật
        uStreakColor: { value: new THREE.Color("#ff007f") },
        uOpacity: { value: 0.90 }, // Tăng độ dày & độ nét cho các line tạo ô chữ nhật
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendEquationAlpha: THREE.MaxEquation,
    });

    this.greenMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 1.0 }, // Trùng khít 100% với blueMat khi ở trạng thái nghỉ
        uRepelMult: { value: -1.0 }, // Lớp 2 (Pink): lệch 45 độ bên PHẢI so với hướng từ tâm cursor chiếu tới
        uColor: { value: new THREE.Color("#ff3366") }, // Neon Pink/Coral (Cyan + Pink = Pure White ở trạng thái tĩnh)
        uStreakColor: { value: new THREE.Color("#ff0055") },
        uOpacity: { value: 0.92 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendEquationAlpha: THREE.MaxEquation,
    });

    this.nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 1.0 },
        uRepelMult: { value: 0.0 },
        uColor: { value: new THREE.Color("#7df9ff") },
        uStreakColor: { value: new THREE.Color("#ffffff") },
        uOpacity: { value: 0.5 },
        uPointSize: { value: 0.85 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      defines: { IS_POINTS: "" },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 0.96 },
        uRepelMult: { value: 0.0 },
        uColor: { value: new THREE.Color("#00f0ff") },
        uStreakColor: { value: new THREE.Color("#ffffff") },
        uOpacity: { value: 0.8 },
        uPointSize: { value: 1.4 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      defines: { IS_POINTS: "" },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.materials = [this.blueMat, this.ringMat, this.greenMat, this.nodeMat, this.particleMat];

    const blueRailsMesh = new THREE.LineSegments(railsGeo, this.blueMat);
    const blueRingsMesh = new THREE.LineSegments(ringsGeo, this.ringMat);
    const greenRailsMesh = new THREE.LineSegments(railsGeo, this.greenMat);
    const nodesMesh = new THREE.Points(nodeGeo, this.nodeMat);
    const particlesMesh = new THREE.Points(particleGeo, this.particleMat);

    // Thêm các lưới chính (bao gồm greenRailsMesh để tái hiện Hiệu ứng chồng màu kép Cyan + Emerald Green)
    [blueRailsMesh, greenRailsMesh, blueRingsMesh].forEach(
      (mesh) => {
        mesh.frustumCulled = false;
        this.scene.add(mesh);
      }
    );

    // RenderTarget with 2x MSAA (was 4x on HalfFloat - very costly)
    this.renderTarget = new THREE.WebGLRenderTarget(
      width * pixelRatio,
      height * pixelRatio,
      {
        type: THREE.HalfFloatType,
        samples: 2,
      }
    );

    this.composer = new EffectComposer(this.renderer, this.renderTarget);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);

    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(width * pixelRatio, height * pixelRatio),
      0.35, // Balanced bloom for dual-tone lines
      0.28, // Smooth continuous blur radius
      0.01  // Low threshold above background (0x01040a) so 1px lines never clip into discrete dots
    );
    this.bloom.highPassUniforms.smoothWidth.value = 0.02;
    this.bloom.highPassUniforms.uTexelSize = {
      value: new THREE.Vector2(1 / (width * pixelRatio), 1 / (height * pixelRatio)),
    };
    this.bloom.materialHighPassFilter.fragmentShader = /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec3 defaultColor;
      uniform float defaultOpacity;
      uniform float luminosityThreshold;
      uniform float smoothWidth;
      uniform vec2 uTexelSize;
      varying vec2 vUv;

      void main() {
        // 4-bilinear-tap tent filter spaced by +-0.5 physical texels of readBuffer.
        // Guarantees an exact partition of unity across 2x downsampling even on odd viewport dimensions,
        // preventing 1px lines from skipping odd rows/columns and breaking into blurry dots.
        vec2 d = uTexelSize * 0.5;
        vec4 texel = 0.25 * (
          texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)) +
          texture2D(tDiffuse, vUv + vec2( d.x, -d.y)) +
          texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)) +
          texture2D(tDiffuse, vUv + vec2( d.x,  d.y))
        );
        float v = luminance(texel.xyz);
        vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity);
        float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
        gl_FragColor = mix(outputColor, texel, alpha);
      }
    `;
    this.bloom.materialHighPassFilter.needsUpdate = true;
    this.composer.addPass(this.bloom);

    this.fx = new ShaderPass(FinalFXShader);
    this.fx.uniforms.uAspect.value = width / height;
    this.fx.uniforms.uRes.value = [width * pixelRatio, height * pixelRatio];
    this.fx.uniforms.uAberration.value = 0.0;
    this.fx.uniforms.uGrain.value = 0.0;
    this.composer.addPass(this.fx);

    this.composer.addPass(new OutputPass());

    this.handleResize = this.handleResize.bind(this);
    this.tick = this.tick.bind(this);
    this.updateMouseHit();
    window.addEventListener("resize", this.handleResize);
    this.renderer.setAnimationLoop(this.tick);
  }

  get uniforms() {
    return this.shared;
  }

  get fxUniforms() {
    return this.fx.uniforms;
  }

  setMouse(ndcX, ndcY) {
    this.targetMouse.set(ndcX, ndcY);
    this.currentMouse.set(ndcX, ndcY);
    this.shared.uMouse.value.set(ndcX, ndcY);
    this.updateMouseHit();
  }

  // Ray from camera through cursor intersected with tunnel walls (was done per-vertex in GLSL)
  updateMouseHit() {
    const aspect = this.shared.uAspect.value;
    const rx = this.targetMouse.x * aspect * 0.75;
    const ry = this.targetMouse.y * 0.75;
    const len = Math.sqrt(rx * rx + ry * ry + 1);
    const dx = rx / len;
    const dy = ry / len;
    const dz = -1 / len;
    const tx = Math.abs(dx) > 1e-4 ? HALF_W / Math.abs(dx) : 999;
    const ty = Math.abs(dy) > 1e-4 ? HALF_H / Math.abs(dy) : 999;
    const tHit = Math.min(Math.max(Math.min(tx, ty), 3.5), 50);
    this.shared.uMouseHit.value.set(dx * tHit, dy * tHit, dz * tHit);
  }

  // Apply a new pixel ratio (used by adaptive quality)
  setPixelRatio(pr) {
    this.pixelRatio = pr;
    this.handleResize();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.renderer.setAnimationLoop(null);
  }

  resume() {
    if (this.disposed || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now() * 0.001; // Avoid time-skip jump
    this.renderer.setAnimationLoop(this.tick);
  }

  handleResize() {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    if (this.bloom.highPassUniforms.uTexelSize) {
      this.bloom.highPassUniforms.uTexelSize.value.set(
        1 / (width * pr),
        1 / (height * pr)
      );
    }

    this.shared.uAspect.value = width / height;
    this.updateMouseHit();
    this.shared.uPixelRatio.value = pr;
    this.fx.uniforms.uAspect.value = width / height;
    this.fx.uniforms.uRes.value = [width * pr, height * pr];
  }

  tick() {
    if (this.disposed || this.paused) return;
    const now = performance.now() * 0.001;
    const rawDt = now - this.lastTime;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    // Adaptive quality: if frames stay slow, step the pixel ratio down (never back up)
    this.frameEma += (Math.min(rawDt, 0.1) - this.frameEma) * 0.05;
    const nowMs = now * 1000;
    if (nowMs > this.perfCheckAt) {
      this.perfCheckAt = nowMs + 1500;
      if (this.frameEma > 0.022 && this.pixelRatio > this.minPixelRatio) {
        this.setPixelRatio(Math.max(this.minPixelRatio, this.pixelRatio - 0.25));
        this.frameEma = 1 / 60;
      }
    }

    // Skip the full-screen FX pass when no glitch is active (it is otherwise a plain copy)
    this.fx.enabled = this.fx.uniforms.uGlitch.value > 0.01;

    this.shared.uTime.value = now;
    this.shared.uTravel.value += dt * this.speed;
    this.fx.uniforms.uTime.value = now;

    // Instant 1:1 mouse tracking for zero-latency space bending
    this.shared.uMouse.value.copy(this.targetMouse);

    this.fx.uniforms.uMouse.value = [
      this.targetMouse.x * 0.5 + 0.5,
      this.targetMouse.y * 0.5 + 0.5,
    ];
    this.fx.uniforms.uMouseForce.value = this.shared.uRepel.value;

    this.cameraTilt.x += (this.targetMouse.x * 0.35 - this.cameraTilt.x) * 0.08;
    this.cameraTilt.y += (this.targetMouse.y * 0.25 - this.cameraTilt.y) * 0.08;
    this.camera.position.x = this.cameraTilt.x;
    this.camera.position.y = this.cameraTilt.y;
    this.camera.rotation.z = -this.cameraTilt.x * 0.015;

    this.composer.render();
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.handleResize);

    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.composer.passes.forEach((p) => p.dispose?.());
    this.composer.dispose?.();
    this.renderTarget?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
