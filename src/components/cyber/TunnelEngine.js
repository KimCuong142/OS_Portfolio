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
const TUNNEL_LEN = 165.0;
const NEAR_Z = -2.2;
const FAR_Z = NEAR_Z - TUNNEL_LEN;
const RINGS = 36;
const DIV_FLOOR = 16;
const DIV_CEIL = 16;
const DIV_WALL = 10;
const SEGMENTS_Z = 440; // High tessellation density for ultra-smooth curved deformation without angular kinks
const PARTICLES = 130;

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
    const isPhotonTrack = i === 0 || i === 2;
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

  // 5. Vanishing Box portal frame at the far end
  const subV = 16;
  for (let i = 0; i < subV; i++) {
    const x0 = -HALF_W + (2 * HALF_W * i) / subV;
    const x1 = -HALF_W + (2 * HALF_W * (i + 1)) / subV;
    positions.push(x0, -HALF_H, FAR_Z, x1, -HALF_H, FAR_Z);
    info.push(4.0, 0, 0, 4.0, 0, 0);
  }
  for (let j = 0; j < subV; j++) {
    const y0 = -HALF_H + (2 * HALF_H * j) / subV;
    const y1 = -HALF_H + (2 * HALF_H * (j + 1)) / subV;
    positions.push(HALF_W, y0, FAR_Z, HALF_W, y1, FAR_Z);
    info.push(4.0, 0, 0, 4.0, 0, 0);
  }
  for (let i = 0; i < subV; i++) {
    const x0 = HALF_W - (2 * HALF_W * i) / subV;
    const x1 = HALF_W - (2 * HALF_W * (i + 1)) / subV;
    positions.push(x0, HALF_H, FAR_Z, x1, HALF_H, FAR_Z);
    info.push(4.0, 0, 0, 4.0, 0, 0);
  }
  for (let j = 0; j < subV; j++) {
    const y0 = HALF_H - (2 * HALF_H * j) / subV;
    const y1 = HALF_H - (2 * HALF_H * (j + 1)) / subV;
    positions.push(-HALF_W, y0, FAR_Z, -HALF_W, y1, FAR_Z);
    info.push(4.0, 0, 0, 4.0, 0, 0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
};

// Build transverse rings that travel along Z toward the camera
const buildTunnelRings = () => {
  const positions = [];
  const info = [];

  const perim = [];
  const subH = 160; // Ultra-fine subdivision along floor/ceiling for silky smooth curvature
  const subV = 96;  // Ultra-fine subdivision along walls

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

// Intersection node dots at floor and corner junctions
const buildNodeGeometry = () => {
  const positions = [];
  const info = [];

  for (let r = 0; r < RINGS; r += 2) {
    const z = NEAR_Z - (r / RINGS) * TUNNEL_LEN;
    [
      [-HALF_W, -HALF_H],
      [HALF_W, -HALF_H],
      [-HALF_W, HALF_H],
      [HALF_W, HALF_H],
      [0, -HALF_H],
      [-HALF_W * 0.5, -HALF_H],
      [HALF_W * 0.5, -HALF_H],
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
    this.speed = 10.0;
    this.targetMouse = new THREE.Vector2(0, -0.35);
    this.currentMouse = new THREE.Vector2(0, -0.35);
    this.cameraTilt = new THREE.Vector2(0, 0);
    this.disposed = false;
    this.paused = false;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    // Cap pixelRatio at 1.25 to prevent GPU bottlenecking on high-DPI/Retina screens
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Bloom pass already softens edges; saves fill-rate
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x01040a, 1.0);
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
        uColor: { value: new THREE.Color("#006eff") },
        uStreakColor: { value: new THREE.Color("#ff007f") },
        uOpacity: { value: 0.88 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.greenMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 0.985 },
        uColor: { value: new THREE.Color("#00ff88") },
        uStreakColor: { value: new THREE.Color("#ff0055") },
        uOpacity: { value: 0.32 },
      },
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.shared,
        uScale: { value: 1.0 },
        uColor: { value: new THREE.Color("#7df9ff") },
        uStreakColor: { value: new THREE.Color("#ffffff") },
        uOpacity: { value: 0.85 },
        uPointSize: { value: 1.2 },
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

    this.materials = [this.blueMat, this.greenMat, this.nodeMat, this.particleMat];

    const blueRailsMesh = new THREE.LineSegments(railsGeo, this.blueMat);
    const blueRingsMesh = new THREE.LineSegments(ringsGeo, this.blueMat);
    const greenRailsMesh = new THREE.LineSegments(railsGeo, this.greenMat);
    const nodesMesh = new THREE.Points(nodeGeo, this.nodeMat);
    const particlesMesh = new THREE.Points(particleGeo, this.particleMat);

    [blueRailsMesh, blueRingsMesh, greenRailsMesh, nodesMesh, particlesMesh].forEach(
      (mesh) => {
        mesh.frustumCulled = false;
        this.scene.add(mesh);
      }
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);

    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.62,
      0.26,
      0.26
    );
    this.composer.addPass(this.bloom);

    this.fx = new ShaderPass(FinalFXShader);
    this.fx.uniforms.uAspect.value = width / height;
    this.fx.uniforms.uRes.value = [width * pixelRatio, height * pixelRatio];
    this.fx.uniforms.uAberration.value = 0.007;
    this.fx.uniforms.uGrain.value = 0.006;
    this.composer.addPass(this.fx);

    this.composer.addPass(new OutputPass());

    this.handleResize = this.handleResize.bind(this);
    this.tick = this.tick.bind(this);
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
    const pr = this.renderer.getPixelRatio();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);

    this.shared.uAspect.value = width / height;
    this.fx.uniforms.uAspect.value = width / height;
    this.fx.uniforms.uRes.value = [width * pr, height * pr];
  }

  tick() {
    if (this.disposed || this.paused) return;
    const now = performance.now() * 0.001;
    const dt = Math.min(now - this.lastTime, 0.05);
    this.lastTime = now;

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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
