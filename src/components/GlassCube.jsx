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
  uniform vec3 uMouseWorldPos;
  uniform float uIorR, uIorY, uIorG, uIorC, uIorB, uIorP;
  uniform float uRefractPower, uChromatic, uSaturation;
  uniform float uShininess, uDiffuseness, uFresnelPower;
  uniform float uFlashIntensity, uSparkleThreshold, uFire;
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec3 vEye;
  varying vec3 vWorldPos;

  float specular(vec3 lightDir, float shininess, float diff, vec3 n, vec3 eye) {
    vec3 l = normalize(-lightDir);
    vec3 v = -normalize(eye);
    vec3 h = normalize(l + v);
    return pow(max(dot(n, h), 0.0), shininess) + max(0.0, dot(n, l)) * diff;
  }

  // Optical spectral dispersion palette for Prismatic Diamond Fire
  // Bảng màu quang phổ kim cương đa sắc rực rỡ (Lam ngọc, Lục ngọc, Hoàng kim, Hồng ngọc)
  vec3 gemFirePalette(float t) {
    vec3 a = vec3(0.50, 0.55, 0.65);
    vec3 b = vec3(0.50, 0.48, 0.52);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    vec3 col = clamp(a + b * cos(6.2831853 * (c * t + d)), 0.0, 1.0);
    return pow(col, vec3(1.2)) * 1.35;
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

    // 1. Pháp tuyến phẳng toán học tuyệt đối cho từng mặt cắt (Flat Facet Normal)
    vec3 dX = dFdx(vWorldPos);
    vec3 dY = dFdy(vWorldPos);
    vec3 flatN = normalize(cross(dX, dY));
    vec3 eye = normalize(vEye);
    vec3 toCam = -eye;
    if (dot(flatN, toCam) < 0.0) flatN = -flatN;

    // 2. Tán sắc khúc xạ ánh sáng theo bước sóng (Red, Green, Blue)
    // Khúc xạ đơn lượt chuẩn Snell để chữ sau kính đặc khối liền mạch 100%, không bị vệt lặp
    vec3 rR = refract(eye, flatN, 1.0 / uIorR);
    vec3 rG = refract(eye, flatN, 1.0 / uIorG);
    vec3 rB = refract(eye, flatN, 1.0 / uIorB);

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

    // 3. NGUỒN SÁNG ĐỘNG DI CHUYỂN THEO CHUỘT (Dynamic Cursor Light)
    // Con trỏ chuột đóng vai trò nguồn sáng quét qua các mặt cắt
    vec3 toMouse = uMouseWorldPos - vWorldPos;
    float mouseDist = length(toMouse);
    vec3 L_mouse = normalize(toMouse);
    vec3 H_mouse = normalize(L_mouse + toCam);
    float ndh_mouse = max(dot(flatN, H_mouse), 0.0);

    // Cường độ ánh sáng rõ nét, khoảng cách bao phủ êm dịu
    float mouseAtten = clamp(1.20 - mouseDist * 0.16, 0.35, 1.0);

    // A. MẶT CẮT TRỰC DIỆN NGUỒN SÁNG: LÓA SÁNG TRẮNG TINH (Pure White Specular Flash)
    float flashMouse = smoothstep(0.95, 0.996, ndh_mouse) * mouseAtten * uFlashIntensity;

    // B. CÁC MẶT CẮT KỀ BÊN: BỪNG ÁNH LỬA CẦU VỒNG (Vibrant Prismatic Fire on Adjacent Facets)
    // Dải góc đón sáng tán sắc thiết lập từ 0.70 -> 0.95 gọn gàng, tinh tế
    float fireSpan = smoothstep(0.70, 0.95, ndh_mouse) * (1.0 - flashMouse * 0.85) * mouseAtten;

    // Mỗi mặt cắt kề bên nghiêng về một hướng khác nhau => ánh một sắc màu quang phổ riêng biệt!
    float facetPhase = dot(flatN.xy, vec2(1.9, 1.4)) * 2.8 + dot(flatN, L_mouse) * 1.6;
    vec3 fireColor = gemFirePalette(facetPhase);

    // C. ĐÈN MÔI TRƯỜNG STUDIO LÀM NỀN (Studio Ambient Light)
    vec3 L_env = normalize(vec3(-0.75, 1.1, 0.9));
    vec3 H_env = normalize(L_env + toCam);
    float ndh_env = max(dot(flatN, H_env), 0.0);
    float envFireSpan = smoothstep(0.70, 0.94, ndh_env) * 0.25;
    vec3 envFireColor = gemFirePalette(dot(flatN.xy, vec2(1.5, 2.1)) * 2.2);

    // Tổng hợp ánh lửa: tiết chế tỷ lệ để màu dịu nhẹ, thanh thoát, không chói đục
    vec3 totalFire = fireColor * (fireSpan * uFire * 0.55) + envFireColor * (envFireSpan * uFire * 0.25);
    float totalFireWeight = clamp(fireSpan * 0.35 + envFireSpan * 0.15, 0.0, 0.38);

    // Đổ bóng nhẹ theo từng mặt phẳng facet để hiện rõ góc cạnh khối kim cương
    float facetLight = dot(flatN, normalize(vec3(-0.4, 0.7, 1.0))) * 0.5 + 0.5;
    color *= mix(0.92, 1.08, facetLight);

    // D. HÒA TRỘN QUANG HỌC VÀO MẶT CẮT:
    // Nhuộm sắc màu lấp lánh nhẹ nhàng lên mặt phẳng facet, giữ độ trong suốt pha lê
    color = mix(color, fireColor, totalFireWeight);
    color += totalFire * 0.22;

    // Lóa sáng trắng đè lên mặt cắt đối diện
    color = mix(color, vec3(1.0), flashMouse * 1.2);

    // Điểm phản quang siêu nhỏ sắc sảo (Pinpoint Glint)
    float pinpointMouse = pow(max(dot(normalize(vNormal), H_mouse), 0.0), uShininess) * mouseAtten;
    float pinpointEnv = pow(max(dot(normalize(vNormal), H_env), 0.0), uShininess) * 0.5;
    color += vec3(pinpointMouse + pinpointEnv) * 0.9;

    // Đường gờ ranh giới giữa các mặt cắt facet: nét mảnh sắc gọn
    float edgeDetect = clamp(length(fwidth(flatN)) * 6.0, 0.0, 1.0);
    color += (vec3(0.12) + totalFire * 0.3) * edgeDetect * 0.35;

    // Góc nhìn nghiêng sát mép viền (Fresnel)
    float fres = clamp(1.0 + dot(eye, flatN), 0.0, 1.0);
    float rimGlow = pow(fres, uFresnelPower);
    vec3 rimRainbow = rainbowPalette(fract(dot(flatN.xy, vec2(1.0, 1.0)) * 2.0 + fres * 2.0));
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

    // Tạo hình vòm khối đá quý (Faceted Gem Profile) với góc dốc tự nhiên
    if (v.z >= 0) {
      const normalizedHeight = v.z / radius;
      v.z = normalizedHeight * height;
    } else {
      // Đáy áp sát mặt kính: làm phẳng với độ dày cực mỏng
      v.z = 0.001;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

const dropsConfig = [
  // 1. Giọt lớn dáng hạt đậu hữu cơ ở góc trên-trái
  { x: -1.8, y: 0.85, r: 0.88, h: 0.36, phase: 0.3, c1: 0.20, s2: 0.14, c3: 0.06, rot: 0.35, speed: 0.7, phaseOffset: 0.0 },
  // 2. Giọt chính hữu cơ dạng quả trứng bầu tròn ở giữa-phải
  { x: 1.7, y: -0.35, r: 0.82, h: 0.34, phase: 1.2, c1: 0.18, s2: 0.12, c3: 0.05, rot: -0.5, speed: 0.55, phaseOffset: 1.8 },
  // 3. Giọt nước tròn bầu ở phía trên
  { x: 0.1, y: 1.45, r: 0.62, h: 0.32, phase: 2.1, c1: 0.12, s2: 0.10, c3: 0.04, rot: 0.9, speed: 0.8, phaseOffset: 3.1 },
  // 4. Giọt nước căng mọng ở góc dưới-trái
  { x: -1.3, y: -1.25, r: 0.72, h: 0.33, phase: 3.4, c1: 0.18, s2: 0.12, c3: 0.05, rot: -0.25, speed: 0.65, phaseOffset: 4.4 },
  // 5. Giọt nước nhỏ thanh mảnh ở góc trên-phải
  { x: 1.9, y: 1.15, r: 0.58, h: 0.30, phase: 4.5, c1: 0.14, s2: 0.10, c3: 0.05, rot: 0.7, speed: 0.9, phaseOffset: 2.3 },
];

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
        uMouseWorldPos: { value: new Vector3(0, 0, 2.5) },
        uIorR: { value: 1.52 },
        uIorY: { value: 1.60 },
        uIorG: { value: 1.54 },
        uIorC: { value: 1.65 },
        uIorB: { value: 1.57 },
        uIorP: { value: 1.72 },
        uRefractPower: { value: 0.12 },
        uChromatic: { value: 1.25 },
        uSaturation: { value: 1.05 },
        uShininess: { value: 320.0 },
        uDiffuseness: { value: 0.0 },
        uFresnelPower: { value: 2.5 },
        uFlashIntensity: { value: 0.5 },
        uSparkleThreshold: { value: 0.98 },
        uFire: { value: 0.9 },
        uLight: { value: new Vector3(-0.8, 1.2, 1.4) },
      },
    });

    const scene = new Scene();
    const rootGroup = new Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // Tạo từng giọt nước độc lập để xoay và tương tác chuyển động theo hướng chuột
    const dropInstances = dropsConfig.map((cfg) => {
      const geo = createNaturalWaterDropGeometry(
        cfg.r,
        cfg.h,
        cfg.phase,
        cfg.c1,
        cfg.s2,
        cfg.c3
      );
      ["uv", "color", "tangent"].forEach((a) => geo.deleteAttribute(a));

      const mesh = new Mesh(geo, frontMat);
      mesh.position.set(cfg.x, cfg.y, 0);
      mesh.rotation.z = cfg.rot;
      rootGroup.add(mesh);

      return {
        mesh,
        geo,
        cfg,
        baseX: cfg.x,
        baseY: cfg.y,
        baseRotZ: cfg.rot,
        currentRotX: 0,
        currentRotY: 0,
        currentRotZ: cfg.rot,
        velocityTiltX: 0,
        velocityTiltY: 0,
        velocityTiltZ: 0,
      };
    });

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

    const targetMouse = { x: 0, y: 0 };
    const currentMouse = { x: 0, y: 0 };
    const mouseVelocity = { x: 0, y: 0 };

    const onPointerMove = (e) => {
      const newX = (e.clientX / window.innerWidth) * 2 - 1;
      const newY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseVelocity.x = (newX - targetMouse.x) * 2.8;
      mouseVelocity.y = (newY - targetMouse.y) * 2.8;
      targetMouse.x = newX;
      targetMouse.y = newY;
    };
    window.addEventListener("pointermove", onPointerMove);

    let startTime = performance.now();

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);

      const now = performance.now();
      const elapsed = (now - startTime) * 0.001;

      // Giảm dần vận tốc chuột theo thời gian (damping mượt mà)
      mouseVelocity.x *= 0.94;
      mouseVelocity.y *= 0.94;

      // Nội suy mượt mà vị trí chuột và cập nhật tọa độ nguồn sáng 3D
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.08;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.08;

      const vFovRad = (camera.fov * Math.PI) / 360;
      const viewH = Math.tan(vFovRad) * camera.position.z;
      const viewW = viewH * camera.aspect;
      const mouseWorldX = currentMouse.x * viewW;
      const mouseWorldY = currentMouse.y * viewH;

      frontMat.uniforms.uMouseWorldPos.value.set(
        mouseWorldX,
        mouseWorldY,
        2.5 // Nguồn sáng di chuyển cách mặt kính 2.5 đơn vị
      );

      // Cập nhật hoạt ảnh tự xoay nhẹ & xoay theo hướng di chuột cho từng viên GlassCube
      for (const item of dropInstances) {
        const { mesh, cfg, baseX, baseY, baseRotZ } = item;

        // 1. Chuyển động lơ lửng & tự xoay nhịp nhàng (Idle gentle floating & rotation)
        const idleFloatX = Math.sin(elapsed * cfg.speed + cfg.phaseOffset) * 0.045;
        const idleFloatY = Math.cos(elapsed * cfg.speed * 0.85 + cfg.phaseOffset) * 0.045;
        const idleRotZ = Math.sin(elapsed * cfg.speed * 0.65 + cfg.phaseOffset) * 0.1;
        const idleRotX = Math.sin(elapsed * cfg.speed * 0.8 + cfg.phaseOffset) * 0.08;
        const idleRotY = Math.cos(elapsed * cfg.speed * 0.8 + cfg.phaseOffset) * 0.08;

        // 2. Tương tác khi chuột lướt qua (Proximity & Directional drag)
        const dx = mouseWorldX - baseX;
        const dy = mouseWorldY - baseY;
        const dist = Math.hypot(dx, dy);
        // Bán kính ảnh hưởng quanh viên đá rộng hơn
        const influence = Math.max(0, 1 - dist / 3.8);

        // Xoay mạnh mẽ và rõ rệt hơn theo hướng di chuyển của chuột (velocity tilt & roll)
        const velMultiplier = 0.5 + influence * 0.85;
        const targetVelX = -mouseVelocity.y * 1.15 * velMultiplier;
        const targetVelY = mouseVelocity.x * 1.15 * velMultiplier;
        const targetVelZ = -mouseVelocity.x * 0.95 * velMultiplier;

        item.velocityTiltX += (targetVelX - item.velocityTiltX) * 0.14;
        item.velocityTiltY += (targetVelY - item.velocityTiltY) * 0.14;
        item.velocityTiltZ += (targetVelZ - item.velocityTiltZ) * 0.14;

        // Nghiêng rõ nét đón hướng con trỏ chuột khi ở gần
        const cursorPullTiltX = -dy * 0.12 * influence;
        const cursorPullTiltY = dx * 0.12 * influence;

        // Giới hạn góc nghiêng tối đa để giữ độ thẩm mỹ mặt phẳng kính
        const targetRotX = Math.max(-0.35, Math.min(0.35, idleRotX + item.velocityTiltX + cursorPullTiltX));
        const targetRotY = Math.max(-0.35, Math.min(0.35, idleRotY + item.velocityTiltY + cursorPullTiltY));
        const targetRotZ = baseRotZ + idleRotZ + item.velocityTiltZ;

        item.currentRotX += (targetRotX - item.currentRotX) * 0.12;
        item.currentRotY += (targetRotY - item.currentRotY) * 0.12;
        item.currentRotZ += (targetRotZ - item.currentRotZ) * 0.12;

        mesh.position.x = baseX + idleFloatX;
        mesh.position.y = baseY + idleFloatY;
        mesh.rotation.x = item.currentRotX;
        mesh.rotation.y = item.currentRotY;
        mesh.rotation.z = item.currentRotZ;
      }

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
      window.removeEventListener("pointermove", onPointerMove);
      ro.disconnect();
      dropInstances.forEach((item) => item.geo.dispose());
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
