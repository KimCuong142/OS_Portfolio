import { useEffect, useRef } from "react";
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  ShaderMaterial,
  Mesh,
  Group,
  Vector2,
  Vector3,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  FrontSide,
  IcosahedronGeometry,
} from "three";
import {
  mergeGeometries,
} from "three/addons/utils/BufferGeometryUtils.js";
import useThemeStore from "#store/theme";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 mvPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPos;
    vNormal = normalize(normalMatrix * normal);
    vEye = normalize(mvPos.xyz);
    vWorldPos = worldPos.xyz;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uIorR, uIorY, uIorG, uIorC, uIorB, uIorP;
  uniform float uRefractPower, uChromatic, uSaturation;
  uniform float uShininess, uDiffuseness, uFresnelPower;
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec3 vEye;

  float specular(vec3 lightDir, float shininess, float diff) {
    vec3 n = normalize(vNormal);
    vec3 l = normalize(-lightDir);
    vec3 v = -normalize(vEye);
    vec3 h = normalize(l + v);
    return pow(max(dot(n, h), 0.0), shininess) + max(0.0, dot(n, l)) * diff;
  }

  // Spectral rainbow palette for edge highlights
  vec3 rainbowPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return clamp(a + b * cos(6.2831853 * (c * t + d)), 0.0, 1.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 n = normalize(vNormal);
    vec3 eye = normalize(vEye);

    // Tính toán góc khúc xạ vật lý chuẩn cho từng bước sóng (Red, Green, Blue)
    // KHÔNG dùng vòng lặp slide để triệt tiêu hoàn toàn bóng mờ lặp lại (ghosting / banding)
    // Các nét chữ phía sau sẽ liền mạch, đặc khối 100%, chỉ tách cầu vồng ở đúng viền nét chữ!
    vec3 rR = refract(eye, n, 1.0 / uIorR);
    vec3 rG = refract(eye, n, 1.0 / uIorG);
    vec3 rB = refract(eye, n, 1.0 / uIorB);

    // Tọa độ UV khúc xạ cho 3 kênh màu (Chromatic Dispersion)
    vec2 uvR = clamp(uv + rR.xy * uRefractPower * (1.0 + uChromatic * 0.35), 0.005, 0.995);
    vec2 uvG = clamp(uv + rG.xy * uRefractPower, 0.005, 0.995);
    vec2 uvB = clamp(uv + rB.xy * uRefractPower * (1.0 - uChromatic * 0.35), 0.005, 0.995);

    // Lấy mẫu trực tiếp: nét chữ giữ nguyên độ liền khối, nét căng không vệt lặp
    float colR = texture2D(uTexture, uvR).r;
    float colG = texture2D(uTexture, uvG).g;
    float colB = texture2D(uTexture, uvB).b;
    vec3 color = vec3(colR, colG, colB);

    // Giữ nguyên độ tương phản trong vắt tự nhiên của chữ nền
    float luma = dot(color, vec3(0.2125, 0.7154, 0.0721));
    color = mix(vec3(luma), color, uSaturation);

    // Đổ bóng nhẹ theo từng mặt cắt facet để hiện rõ góc cạnh khối đá quý (không làm mờ chữ)
    float facetLight = dot(n, normalize(vec3(-0.4, 0.7, 1.0))) * 0.5 + 0.5;
    color *= mix(0.90, 1.06, facetLight);

    // Góc nhìn nghiêng sát mép viền (Fresnel)
    float fres = clamp(1.0 + dot(eye, n), 0.0, 1.0);

    // Đường gờ ranh giới giữa các mặt cắt facet: nét mảnh, sắc gọn như kim cương
    float edgeDetect = clamp(length(fwidth(n)) * 6.0, 0.0, 1.0);
    float facetPhase = fract(dot(n.xy, vec2(1.8, 1.2)) * 1.5 + n.z);
    vec3 facetRainbow = rainbowPalette(facetPhase);
    color = mix(color, color + facetRainbow * 0.35 + vec3(0.12), edgeDetect * 0.3);

    // Điểm phản quang lóe sáng kim cương (Pinpoint Specular Glints)
    float specMain = specular(uLight, uShininess, uDiffuseness);
    float specRim = specular(vec3(0.6, 1.2, 0.9), uShininess * 0.8, uDiffuseness);
    float totalSpec = specMain * 1.3 + specRim * 0.7;
    color += vec3(totalSpec) + facetRainbow * (totalSpec * 0.3);

    // Viền ngoài chu vi giọt nước: có vành tán sắc cầu vồng mảnh tinh xảo
    float rimGlow = pow(fres, uFresnelPower);
    vec3 rimRainbow = rainbowPalette(fract(dot(n.xy, vec2(1.0, 1.0)) * 2.0 + fres * 2.0));
    color += (vec3(0.25) + rimRainbow * 0.55) * rimGlow * 0.6;

    // Đường viền tối bao quanh tách khối đá quý nổi lên khỏi nền trắng
    float edgeContour = smoothstep(0.80, 0.98, fres);
    color *= 1.0 - edgeContour * 0.18;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`;

function createNaturalWaterDropGeometry(
  radius = 1.0,
  height = 0.38,
  phaseShift = 0.0,
  seedCos1 = 0.20,
  seedSin2 = 0.14,
  seedCos3 = 0.06
) {
  // Khối đa diện ít mặt (detail 1, non-indexed) => pháp tuyến phẳng từng mặt như viên đá quý cắt facet
  const geo = new IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  const v = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Tính góc xoay quanh tâm mặt phẳng (X, Y)
    const theta = Math.atan2(v.y, v.x) + phaseShift;

    // Biến dạng bất đối xứng bằng tổ hợp hàm sin/cos tần số thấp
    const deform =
      1.0 +
      seedCos1 * Math.cos(theta - 0.6) + // Kéo lệch tâm tạo hình trứng
      seedSin2 * Math.sin(2.0 * theta) - // Bóp nhẹ 2 cạnh tạo dáng hạt đậu
      seedCos3 * Math.cos(3.0 * theta + 0.4); // Độ lượn sóng tự nhiên

    v.x *= deform;
    v.y *= deform;

    // Tạo hình vòm dốc của nước (Dome Profile)
    if (v.z >= 0) {
      const normalizedHeight = v.z / radius;
      v.z = Math.pow(normalizedHeight, 0.8) * height;
    } else {
      // Đáy áp sát mặt kính: làm phẳng với độ dày cực mỏng
      v.z = 0.001;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/** Tạo 5 giọt nước nằm rải rác trên màn hình 2077 */
function createScatteredWaterDropsGeometry() {
  const dropsConfig = [
    // 1. Giọt lớn dáng hạt đậu hữu cơ ở góc trên-trái
    { x: -1.8, y: 0.85, r: 0.88, h: 0.36, phase: 0.3, c1: 0.20, s2: 0.14, c3: 0.06, rot: 0.35 },
    // 2. Giọt chính hữu cơ dạng quả trứng bầu tròn ở giữa-phải
    { x: 1.7, y: -0.35, r: 0.82, h: 0.34, phase: 1.2, c1: 0.18, s2: 0.12, c3: 0.05, rot: -0.5 },
    // 3. Giọt nước tròn bầu ở phía trên (nằm trong vùng nhìn thấy đường hầm chuyển động)
    { x: 0.1, y: 1.45, r: 0.62, h: 0.32, phase: 2.1, c1: 0.12, s2: 0.10, c3: 0.04, rot: 0.9 },
    // 4. Giọt nước căng mọng ở góc dưới-trái (phía trên dock)
    { x: -1.3, y: -1.25, r: 0.72, h: 0.33, phase: 3.4, c1: 0.18, s2: 0.12, c3: 0.05, rot: -0.25 },
    // 5. Giọt nước nhỏ thanh mảnh ở góc trên-phải
    { x: 1.9, y: 1.15, r: 0.58, h: 0.30, phase: 4.5, c1: 0.14, s2: 0.10, c3: 0.05, rot: 0.7 },
  ];

  const geos = [];
  for (const cfg of dropsConfig) {
    const dGeo = createNaturalWaterDropGeometry(
      cfg.r,
      cfg.h,
      cfg.phase,
      cfg.c1,
      cfg.s2,
      cfg.c3
    );
    if (cfg.rot !== 0) {
      dGeo.rotateZ(cfg.rot);
    }
    dGeo.translate(cfg.x, cfg.y, 0);
    ["uv", "color", "tangent"].forEach((a) => dGeo.deleteAttribute(a));
    geos.push(dGeo);
  }

  const merged = mergeGeometries(geos, false);
  merged.computeVertexNormals();
  return merged;
}

/** Fallback offscreen background texture */
function makeBackgroundTexture() {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#050b1a");
  grad.addColorStop(0.5, "#0d2b45");
  grad.addColorStop(1, "#00f0ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const GlassCube = () => {
  const { currentYear } = useThemeStore();
  const is2026 = currentYear === "2026";
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!is2026) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let raf = 0;

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);

    // Camera facing straight at the glass plane with water droplets
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 8.5);
    camera.lookAt(0, 0, 0);

    // Direct page background texture
    const bgTexture = makeBackgroundTexture();
    let pageTexture = null;
    let mirror = null;
    let mirrorCtx = null;

    // Water droplet front material
    const frontMat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: FrontSide,
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uIorR: { value: 1.52 },
        uIorY: { value: 1.60 },
        uIorG: { value: 1.54 },
        uIorC: { value: 1.65 },
        uIorB: { value: 1.57 },
        uIorP: { value: 1.72 },
        uRefractPower: { value: 0.09 },
        uChromatic: { value: 0.55 },
        uSaturation: { value: 1.02 },
        uShininess: { value: 360.0 },
        uDiffuseness: { value: 0.0 },
        uFresnelPower: { value: 3.2 },
        uLight: { value: new Vector3(-0.8, 1.2, 1.4) },
      },
    });

    const scene = new Scene();
    const rootGroup = new Group();
    // Static placement - no rotation, perfectly facing screen like water on a window pane
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    const dropsGeo = createScatteredWaterDropsGeometry();
    const dropsMesh = new Mesh(dropsGeo, frontMat);
    rootGroup.add(dropsMesh);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frontMat.uniforms.uResolution.value.set(w * dpr, h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    frontMat.uniforms.uTexture.value = bgTexture;

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);

      // Mirror the live tunnel canvas into a fixed-size 2D canvas (stretched to full area),
      // so UV mapping stays 1:1 with the screen no matter how the tunnel canvas is resized.
      const pc = document.getElementById("cyber-2026-canvas");
      if (pc && pc.width > 100 && pc.height > 100) {
        const aspect = window.innerWidth / window.innerHeight;
        const mw = 1280;
        const mh = Math.max(2, Math.round(mw / aspect));
        if (!mirror || mirror.width !== mw || mirror.height !== mh) {
          pageTexture?.dispose();
          mirror = document.createElement("canvas");
          mirror.width = mw;
          mirror.height = mh;
          mirrorCtx = mirror.getContext("2d");
          pageTexture = new CanvasTexture(mirror);
          pageTexture.colorSpace = SRGBColorSpace;
          pageTexture.minFilter = LinearFilter;
          pageTexture.magFilter = LinearFilter;
          pageTexture.generateMipmaps = false;
          frontMat.uniforms.uTexture.value = pageTexture;
        }
        try {
          mirrorCtx.drawImage(pc, 0, 0, pc.width, pc.height, 0, 0, mw, mh);
          pageTexture.needsUpdate = true;
        } catch {
          /* canvas not ready this frame */
        }
      }

      // Render droplets directly onto screen (transparent canvas outside droplets)
      renderer.setRenderTarget(null);
      renderer.autoClear = true;
      renderer.clear();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      dropsGeo.dispose();
      frontMat.dispose();
      bgTexture.dispose();
      pageTexture?.dispose();
      renderer.dispose();
    };
  }, [is2026]);

  if (!is2026) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex items-center justify-center">
      <canvas
        ref={canvasRef}
        id="scene"
        aria-label="Water drops on glass"
        className="block w-full h-full pointer-events-none"
      />
    </div>
  );
};

export default GlassCube;
