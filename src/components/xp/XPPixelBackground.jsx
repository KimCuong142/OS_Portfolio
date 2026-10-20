import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

/**
 * XPPixelBackground — Interactive Holographic "Tấm Kim Sa Gió" (8 - 12 Tấm Trên Toàn Màn Hình)
 *
 * Thiết kế & Khắc phục triệt để:
 * 1. Đúng 8 – 12 tấm kim sa trên TOÀN MÀN HÌNH:
 *    - Desktop / Landscape: Lưới 4 cột x 3 hàng = 12 tấm lớn phủ vừa khít 100% khung hình (không bị cắt mép).
 *    - Tablet: Lưới 3 cột x 3 hàng = 9 tấm.
 *    - Mobile Portrait: Lưới 2 cột x 4 hàng = 8 tấm.
 * 2. Phản chiếu rõ nét màn hình Windows XP + Ánh Holographic Dichroic tự nhiên (Không bị trắng đục):
 *    - Khắc phục hoàn toàn hiện tượng cháy sáng trắng đục (over-exposure do cộng dồn nhiều nguồn sáng + ACES ToneMapping)
 *      bằng cách tính toán quang học trực tiếp ở bước xuất màu cuối (`toneMapped: false`).
 *    - Mỗi tấm kim sa phản chiếu sắc nét hình nền đồi cỏ & bầu trời Windows XP (có độ trượt gương Parallax
 *      theo góc nghiêng 3D của tấm), kết hợp lớp màng giao thoa Holographic Dichroic (Xanh Cyan, Lam Cobalt,
 *      Tím Lavender, Hồng Phấn, Vàng Champagne) rực rỡ và trong trẻo như ảnh mẫu.
 * 3. Phản chiếu trực tiếp Con Trỏ Chuột (Cursor Mirror Reflection) rõ nét trên mặt từng tấm kim sa.
 */

const BLISS_IMAGE_URL = "/images/windowsXPwallpaper.jpg";
const BLISS_ASPECT = 4500 / 3000; // 1.5

function createGradientEnvironment(renderer) {
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 512;
  envCanvas.height = 256;
  const ctx = envCanvas.getContext("2d");

  if (ctx) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
    bgGrad.addColorStop(0.0, "#7ec8ff");
    bgGrad.addColorStop(0.3, "#d4eeff");
    bgGrad.addColorStop(0.5, "#fff8eb");
    bgGrad.addColorStop(0.75, "#b8e698");
    bgGrad.addColorStop(1.0, "#5da844");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 36, 512, 18);
    ctx.fillRect(0, 112, 512, 20);
  }

  const envTexture = new THREE.CanvasTexture(envCanvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envRT = pmremGenerator.fromEquirectangular(envTexture);

  envTexture.dispose();
  pmremGenerator.dispose();

  return envRT;
}

/**
 * Tạo Texture Atlas 4 trạng thái con trỏ chuột chuẩn macOS (512x128 = 4 ô 128x128):
 * - Ô 0 (type = 0): Mũi tên macOS mặc định (thân đen, viền trắng sắc nét, tâm hotspot tại đầu mũi tên).
 * - Ô 1 (type = 1): Bàn tay mở macOS (cursor: grab khi trỏ vào Desktop Icon / Folder).
 * - Ô 2 (type = 2): Bàn tay nắm macOS (cursor: grabbing khi nhấn giữ / kéo Icon).
 * - Ô 3 (type = 3): Bàn tay chỉ ngón trỏ (cursor: pointer khi trỏ vào nút bấm / link).
 * Tất cả các ô đều đặt điểm Hotspot chuẩn tại chính giữa ô (64, 64) để khớp vị trí 1:1 với con trỏ thật.
 */
function createCursorAtlasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 512, 128);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // --- Ô 0: MŨI TÊN MACOS (DEFAULT ARROW) - Hotspot tại (64, 64) ---
    {
      const cx = 64;
      const cy = 64;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 38);
      ctx.lineTo(cx + 9.5, cy + 29);
      ctx.lineTo(cx + 16.5, cy + 44);
      ctx.lineTo(cx + 22.5, cy + 41);
      ctx.lineTo(cx + 15.5, cy + 26);
      ctx.lineTo(cx + 28, cy + 26);
      ctx.closePath();

      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4.8;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#101216";
      ctx.fill();
      ctx.restore();
    }

    // --- Ô 1: BÀN TAY MỞ MACOS (OPEN GRAB HAND) - Hotspot tại (192, 64) ---
    {
      const cx = 192;
      const cy = 64;
      ctx.save();

      const drawOpenHandSegments = () => {
        // Ngón cái bên trái
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 8);
        ctx.lineTo(cx - 20, cy - 2);
        ctx.stroke();

        // Ngón trỏ
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy + 2);
        ctx.lineTo(cx - 10, cy - 19);
        ctx.stroke();

        // Ngón giữa
        ctx.beginPath();
        ctx.moveTo(cx - 1, cy + 1);
        ctx.lineTo(cx - 1, cy - 22);
        ctx.stroke();

        // Ngón áp út
        ctx.beginPath();
        ctx.moveTo(cx + 7, cy + 2);
        ctx.lineTo(cx + 8, cy - 18);
        ctx.stroke();

        // Ngón út
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy + 5);
        ctx.lineTo(cx + 16, cy - 11);
        ctx.stroke();
      };

      // Lớp viền đen ngoài
      ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 10.5;
      drawOpenHandSegments();

      ctx.beginPath();
      ctx.arc(cx + 2, cy + 8, 14.5, 0, Math.PI * 2);
      ctx.fillStyle = "#101216";
      ctx.fill();

      // Lớp ruột trắng bên trong
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6.2;
      drawOpenHandSegments();

      ctx.beginPath();
      ctx.arc(cx + 2, cy + 8, 11.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Đường khe ngón tay mảnh chuẩn macOS
      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 1.6;
      [-5.5, 3.0, 11.2].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - 13);
        ctx.lineTo(cx + dx, cy + 1);
        ctx.stroke();
      });
      ctx.restore();
    }

    // --- Ô 2: BÀN TAY NẮM MACOS (CLOSED GRABBING HAND KHI CLICK/DRAG) - Hotspot tại (320, 64) ---
    {
      const cx = 320;
      const cy = 64;
      ctx.save();

      const drawGrabbingSegments = () => {
        // Ngón cái khép
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 7);
        ctx.lineTo(cx - 15, cy - 1);
        ctx.stroke();

        // 4 ngón gập xuống
        [-8, -1, 6, 13].forEach((dx, i) => {
          const topY = i === 1 ? cy - 10 : i === 3 ? cy - 5 : cy - 8;
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy + 4);
          ctx.lineTo(cx + dx, topY);
          ctx.stroke();
        });
      };

      ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 10.5;
      drawGrabbingSegments();

      ctx.beginPath();
      ctx.arc(cx + 2, cy + 7, 13.5, 0, Math.PI * 2);
      ctx.fillStyle = "#101216";
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6.2;
      drawGrabbingSegments();

      ctx.beginPath();
      ctx.arc(cx + 2, cy + 7, 10.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 1.6;
      [-4.5, 2.5, 9.5].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - 7);
        ctx.lineTo(cx + dx, cy + 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // --- Ô 3: BÀN TAY CHỈ NGÓN TRỎ (POINTING HAND KHI HOVER BUTTON/LINK) - Hotspot tại (448, 64) ---
    {
      const cx = 448;
      const cy = 64;
      ctx.save();

      const drawPointerSegments = () => {
        // Ngón trỏ duỗi thẳng có đầu ngón tại đúng Hotspot (cx, cy)
        ctx.beginPath();
        ctx.moveTo(cx, cy + 22);
        ctx.lineTo(cx, cy + 2);
        ctx.stroke();

        // Ngón cái bên trái
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 25);
        ctx.lineTo(cx - 11, cy + 16);
        ctx.stroke();

        // 3 ngón còn lại gập nhẹ bên phải
        [7, 14, 20].forEach((dx, i) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy + 24);
          ctx.lineTo(cx + dx, cy + 11 + i * 2.5);
          ctx.stroke();
        });
      };

      ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 9.8;
      drawPointerSegments();

      ctx.beginPath();
      ctx.arc(cx + 7, cy + 25, 13.0, 0, Math.PI * 2);
      ctx.fillStyle = "#101216";
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5.8;
      drawPointerSegments();

      ctx.beginPath();
      ctx.arc(cx + 7, cy + 25, 10.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.strokeStyle = "#101216";
      ctx.lineWidth = 1.5;
      [3.5, 10.5, 17.0].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy + 12);
        ctx.lineTo(cx + dx, cy + 21);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const XPPixelBackground = ({ active = true }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isRunningRef = useRef(false);
  const activePropRef = useRef(active);
  const toggleModeRef = useRef(null);
  const [isSequinWall, setIsSequinWall] = useState(false);

  useEffect(() => {
    activePropRef.current = active;
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // ============================================================================
    // 1. KHỞI TẠO SCENE, CAMERA, RENDERER & ENVIRONMENT
    // ============================================================================
    const scene = new THREE.Scene();
    // Màu nền xanh bầu trời Windows XP dự phòng trong lúc chờ texture tải xong
    scene.background = new THREE.Color(0x245edb);

    const fov = 40;
    const camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      500
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
    renderer.toneMapping = THREE.NoToneMapping;

    const envRT = createGradientEnvironment(renderer);
    scene.environment = envRT.texture;

    // ============================================================================
    // 2. HỆ THỐNG ÁNH SÁNG (AMBIENT + DIRECTIONAL + DYNAMIC CURSOR POINTLIGHT)
    // ============================================================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xfff9e8, 1.35);
    mainDirLight.position.set(22, 42, 75);
    scene.add(mainDirLight);

    const rimDirLight = new THREE.DirectionalLight(0x88d4ff, 1.0);
    rimDirLight.position.set(-32, -30, 60);
    scene.add(rimDirLight);

    const cursorLight = new THREE.PointLight(0xffffff, 0, 80, 1.2);
    cursorLight.position.set(0, 0, 26);
    scene.add(cursorLight);

    // ============================================================================
    // 3. TÍNH TOÁN KÍCH THƯỚC KHUNG NHÌN 3D (KHÔNG DÙNG RAYCASTER)
    // ============================================================================
    let planeW = 1;
    let planeH = 1;

    const calcFrustumPlane = () => {
      const dist = camera.position.z;
      const vFov = (camera.fov * Math.PI) / 180;
      planeH = 2 * Math.tan(vFov / 2) * dist;
      planeW = planeH * camera.aspect;
    };
    calcFrustumPlane();

    // ============================================================================
    // 4. HÌNH NỀN WINDOWS XP & UNIFORMS CHO SHADER HOLOGRAPHIC + PHẢN CHIẾU CURSOR
    // ============================================================================
    const uUvScale = { value: new THREE.Vector2(1, 1) };
    const uUvOffset = { value: new THREE.Vector2(0, 0) };
    const uCursorWorld = { value: new THREE.Vector2(0, 0) };
    const uCursorActive = { value: 0.0 };
    const uCursorScale = { value: 5.5 };
    const uCursorType = { value: 0.0 };
    const uCursorPressed = { value: 0.0 };
    const uSplitAmount = { value: 0.0 };
    const uTime = { value: 0.0 };
    const uLightColor = { value: new THREE.Color(1.0, 0.96, 0.88) };
    const uLightStrength = { value: 0.0 };

    const cursorAtlasTex = createCursorAtlasTexture();

    // Lớp ảnh nền Windows XP hiển thị nguyên bản trước khi click tách thành tường kim sa
    const baseGeo = new THREE.PlaneGeometry(1, 1);
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      toneMapped: false,
    });
    const baseWallpaperMesh = new THREE.Mesh(baseGeo, baseMat);
    baseWallpaperMesh.position.set(0, 0, 0.15);
    baseWallpaperMesh.scale.set(planeW, planeH, 1);
    baseWallpaperMesh.renderOrder = 10;
    scene.add(baseWallpaperMesh);

    // Lớp hình nền Windows XP phía sau khe hở của các tấm kim sa (thay cho nền đen)
    const backplateGeo = new THREE.PlaneGeometry(1, 1);
    const backplateMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const backplateMesh = new THREE.Mesh(backplateGeo, backplateMat);
    backplateMesh.position.set(0, 0, 0);
    backplateMesh.scale.set(planeW, planeH, 1);
    backplateMesh.renderOrder = -10;
    scene.add(backplateMesh);

    const textureLoader = new THREE.TextureLoader();
    const blissTexture = textureLoader.load(BLISS_IMAGE_URL, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      baseMat.map = tex;
      baseMat.needsUpdate = true;
      backplateMat.map = tex;
      backplateMat.needsUpdate = true;
      updateBaseTextureCover();
    });

    const updateBaseTextureCover = () => {
      const screenAspect = window.innerWidth / window.innerHeight;
      if (screenAspect > BLISS_ASPECT) {
        const sy = BLISS_ASPECT / screenAspect;
        uUvScale.value.set(1.0, sy);
        uUvOffset.value.set(0.0, (1.0 - sy) * 0.5);
      } else {
        const sx = screenAspect / BLISS_ASPECT;
        uUvScale.value.set(sx, 1.0);
        uUvOffset.value.set((1.0 - sx) * 0.5, 0.0);
      }

      if (blissTexture) {
        blissTexture.matrixAutoUpdate = false;
        blissTexture.matrix.setUvTransform(
          uUvOffset.value.x,
          uUvOffset.value.y,
          uUvScale.value.x,
          uUvScale.value.y,
          0,
          0,
          0
        );
      }

      // Quy đổi kích thước ô 128x128 chứa con trỏ sao cho hình ảnh con trỏ phản chiếu (~27px) khớp 1:1 với con trỏ macOS thật
      uCursorScale.value = (76.0 / Math.max(450.0, window.innerHeight)) * planeH;
    };

    // ============================================================================
    // 5. GEOMETRY & CHẤT LIỆU KIM SA PHẢN CHIẾU MÀN HÌNH XP + HOLOGRAPHIC + CURSOR
    // ============================================================================
    // Hình vuông 1x1 mỏng với tâm xoay (pivot) đặt đúng tại vị trí đinh ghim (y = 0.90 tính từ đáy, tức dịch -0.40)
    const sequinGeo = new THREE.PlaneGeometry(1, 1);
    sequinGeo.translate(0, -0.4, 0);

    const sequinMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.14,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      transparent: true,
      toneMapped: false, // Tắt ToneMapping tự động để không bao giờ bị cháy trắng đục
      side: THREE.DoubleSide,
    });

    sequinMat.onBeforeCompile = (shader) => {
      shader.uniforms.uBlissMap = { value: blissTexture };
      shader.uniforms.uCursorTex = { value: cursorAtlasTex };
      shader.uniforms.uUvScale = uUvScale;
      shader.uniforms.uUvOffset = uUvOffset;
      shader.uniforms.uCursorWorld = uCursorWorld;
      shader.uniforms.uCursorActive = uCursorActive;
      shader.uniforms.uCursorScale = uCursorScale;
      shader.uniforms.uCursorType = uCursorType;
      shader.uniforms.uCursorPressed = uCursorPressed;
      shader.uniforms.uSplitAmount = uSplitAmount;
      shader.uniforms.uTime = uTime;
      shader.uniforms.uLightColor = uLightColor;
      shader.uniforms.uLightStrength = uLightStrength;

      shader.vertexShader = `
        attribute vec4 aCellRect;
        attribute vec3 aTileSeed;
        varying vec2 vLocalUv;
        varying vec4 vCellRect;
        varying vec3 vTileSeed;
        varying vec3 vWorldPos;
        varying vec3 vInstanceNormal;
        varying vec2 vPinWorld;
        varying vec2 vTileDims;
        ${shader.vertexShader}
      `.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vLocalUv = uv;
        vCellRect = aCellRect;
        vTileSeed = aTileSeed;
        vec4 sqWorldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPos = sqWorldPos.xyz;
        // Cột 2 của instanceMatrix chính là vector pháp tuyến đơn vị (d, -b*c, a*c) của tấm kim sa
        vInstanceNormal = normalize(instanceMatrix[2].xyz);
        // Cột 3 của instanceMatrix là tọa độ thế giới cố định của đinh ghim (z = 0)
        vPinWorld = instanceMatrix[3].xy;
        vTileDims = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uBlissMap;
        uniform sampler2D uCursorTex;
        uniform vec2 uUvScale;
        uniform vec2 uUvOffset;
        uniform vec2 uCursorWorld;
        uniform float uCursorActive;
        uniform float uCursorScale;
        uniform float uCursorType;
        uniform float uCursorPressed;
        uniform float uSplitAmount;
        uniform float uTime;
        uniform vec3 uLightColor;
        uniform float uLightStrength;

        varying vec2 vLocalUv;
        varying vec4 vCellRect;
        varying vec3 vTileSeed;
        varying vec3 vWorldPos;
        varying vec3 vInstanceNormal;
        varying vec2 vPinWorld;
        varying vec2 vTileDims;

        float sdRoundedBox(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        // Bảng màu Dichroic Pastel Holographic chuẩn theo ảnh mẫu (chuyển sang không gian Linear để giữ đúng độ no màu sau bước xuất sRGB)
        vec3 sampleDichroicHoloLinear(float phase) {
          float p = fract(phase) * 6.0;
          int idx = int(floor(p));
          float f = smoothstep(0.0, 1.0, fract(p));

          vec3 c0 = vec3(0.98, 0.82, 0.64); // Champagne Warm Peach
          vec3 c1 = vec3(0.80, 0.96, 0.78); // Mint Lemon Pearl
          vec3 c2 = vec3(0.55, 0.92, 0.99); // Icy Aqua Cyan
          vec3 c3 = vec3(0.36, 0.68, 0.99); // Sky Cobalt Blue
          vec3 c4 = vec3(0.72, 0.54, 0.97); // Lavender Violet
          vec3 c5 = vec3(0.96, 0.58, 0.82); // Rose Pink Blush

          vec3 srgbCol = mix(c5, c0, f);
          if (idx == 0) srgbCol = mix(c0, c1, f);
          else if (idx == 1) srgbCol = mix(c1, c2, f);
          else if (idx == 2) srgbCol = mix(c2, c3, f);
          else if (idx == 3) srgbCol = mix(c3, c4, f);
          else if (idx == 4) srgbCol = mix(c4, c5, f);

          return pow(srgbCol, vec3(2.2));
        }

        float sdSegment(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a, ba = b - a;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          return length(pa - ba * h);
        }

        float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
          vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
          vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
          vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
          vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
          vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
          float s = sign(e0.x * e2.y - e0.y * e2.x);
          vec2 d = min(
            min(
              vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
              vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))
            ),
            vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x))
          );
          return -sqrt(d.x) * sign(d.y);
        }

        float sdArrowCursor(vec2 p) {
          float dHead = sdTriangle(p, vec2(0.0, 0.0), vec2(0.0, -0.92), vec2(0.66, -0.66));
          float dStem = sdSegment(p, vec2(0.24, -0.58), vec2(0.46, -1.06)) - 0.085;
          return min(dHead, dStem);
        }

        ${shader.fragmentShader}
      `.replace(
        "#include <opaque_fragment>",
        `
        vec2 sqCenteredUv = vLocalUv - 0.5;

        // 1. Bo góc tròn nhẹ cho từng tấm kim sa lớn khi đã tách nền
        float sqDBox = -0.5;
        if (uSplitAmount > 0.04) {
          float sqCornerRadius = 0.022 * uSplitAmount;
          sqDBox = sdRoundedBox(sqCenteredUv, vec2(0.5, 0.5), sqCornerRadius);
          if (sqDBox > 0.0) discard;
        }

        vec3 sqRawN = normalize(vInstanceNormal);
        if (!gl_FrontFacing) sqRawN = -sqRawN;

        // Pháp tuyến mặt gương của tấm kim sa (kèm độ cong vi mô nhẹ ở rìa)
        vec3 sqNormal = normalize(sqRawN + vec3(sqCenteredUv * 0.14 * uSplitAmount, 0.0));
        vec3 sqViewDir = normalize(cameraPosition - vWorldPos);
        vec3 sqReflDir = reflect(-sqViewDir, sqNormal);

        // =========================================================================
        // 2. PHẢN CHIẾU MÀN HÌNH WINDOWS XP SẮC NÉT LÊN TỪNG TẤM KIM SA
        // =========================================================================
        vec2 sqScreenUv = vCellRect.xy + vLocalUv * vCellRect.zw;
        vec2 sqMirrorParallax = sqNormal.xy * 0.095 * uSplitAmount + sqCenteredUv * 0.018 * uSplitAmount;
        vec2 sqBlissUv = clamp((sqScreenUv + sqMirrorParallax) * uUvScale + uUvOffset, 0.002, 0.998);
        vec3 sqXpReflection = texture2D(uBlissMap, sqBlissUv).rgb;

        // =========================================================================
        // 3. HIỆU ỨNG ÁNH CẦU VỒNG HOLOGRAPHIC DỊU NHẸ NHƯNG BIẾN ĐỔI MẠNH THEO HƯỚNG NGHIÊNG
        // =========================================================================
        float sqTiltAmt = length(sqNormal.xy);
        float sqFresnel = pow(1.0 - max(0.0, dot(sqNormal, sqViewDir)), 1.6);

        // Tăng mạnh độ nhạy biến đổi pha màu và trục dải cầu vồng theo hướng nghiêng (sqNormal.xy) của tấm kim sa
        float sqDirShift = sqNormal.x * 5.6 - sqNormal.y * 6.0 + (sqNormal.x * sqNormal.y) * 8.5;
        vec2 sqHoloAxis = normalize(vec2(0.55 + sqNormal.y * 4.5, 0.45 - sqNormal.x * 4.5));
        float sqTileDiag = dot(sqCenteredUv, sqHoloAxis);

        float sqHoloPhase =
          sqScreenUv.y * 0.24 +
          sqDirShift +
          sqTileDiag * (0.55 + sqTiltAmt * 2.5) +
          (vTileSeed.x - 0.5) * 0.36;

        vec3 sqHoloColor1 = sampleDichroicHoloLinear(sqHoloPhase);
        vec3 sqHoloColor2 = sampleDichroicHoloLinear(sqHoloPhase + 0.28 + sqCenteredUv.y * 0.32 + sqNormal.x * 1.4);
        vec3 sqHoloSpectrum = mix(sqHoloColor1, sqHoloColor2, 0.45);

        // Dải phản quang lấp lánh (Holographic Specular Band) quét nhạy theo hướng nghiêng của tấm kim sa
        float sqSweepCoord = sqCenteredUv.x * 0.80 + sqCenteredUv.y * 0.65 + (sqNormal.x * 4.8 + sqNormal.y * 4.5);
        float sqSheenBand = exp(-pow(sqSweepCoord * 2.2, 2.0));
        float sqSecondaryBand = exp(-pow((sqSweepCoord - 0.38) * 3.2, 2.0)) * 0.55;

        // Làm nhạt bớt lớp phủ Holographic nền để hình phản chiếu Windows XP trong trẻo hơn,
        // đồng thời chỉ đẩy ánh cầu vồng rực lên rõ theo góc nghiêng của tấm kim sa
        float sqIridStrength = clamp((0.20 + sqTiltAmt * 1.85 + sqFresnel * 0.25) * uSplitAmount, 0.0, 0.64);
        vec3 sqTintedXp = mix(sqXpReflection, sqXpReflection * (0.48 + 1.15 * sqHoloSpectrum), sqIridStrength);
        vec3 sqCol = mix(sqTintedXp, sqHoloSpectrum, clamp((0.07 + sqTiltAmt * 0.72 + sqSheenBand * 0.18) * uSplitAmount, 0.0, 0.30));

        // Cộng thêm ánh lóe cầu vồng tại dải bắt sáng chéo khi nghiêng
        float sqGlintFactor = (sqSheenBand * 0.38 + sqSecondaryBand * 0.24) * (0.18 + sqTiltAmt * 2.2) * uSplitAmount;
        sqCol += sqHoloSpectrum * sqGlintFactor * 0.36 + totalSpecular * sqHoloSpectrum * 0.10 * uSplitAmount;

        // Ánh sáng phản quang động từ PointLight bám theo con trỏ chuột
        float sqDistToMouse = length(vWorldPos.xy - uCursorWorld);
        float sqMouseSpot = exp(-sqDistToMouse * sqDistToMouse / (uCursorScale * uCursorScale * 16.0)) * uLightStrength;
        sqCol += mix(pow(uLightColor, vec3(2.2)), sqHoloSpectrum, 0.6) * sqMouseSpot * 0.25 * uSplitAmount;

        // =========================================================================
        // 4. VIỀN PHẢN CHIẾU ĐẬM Ở MÉP KHI TẤM KIM SA LẬT NGHIÊNG (Giống ảnh mẫu)
        // =========================================================================
        float sqBottomEdgeBand = (1.0 - smoothstep(0.0, 0.055 + sqTiltAmt * 0.18, vLocalUv.y)) * clamp(sqTiltAmt * 2.6, 0.0, 0.85);
        float sqSideEdgeBand = (1.0 - smoothstep(0.0, 0.045 + abs(sqNormal.x) * 0.16, min(vLocalUv.x, 1.0 - vLocalUv.x))) * clamp(abs(sqNormal.x) * 2.5, 0.0, 0.75);
        float sqDarkEdge = max(sqBottomEdgeBand, sqSideEdgeBand) * uSplitAmount;
        vec3 sqDeepEdgeTone = sampleDichroicHoloLinear(sqHoloPhase + 0.35) * 0.22 + sqXpReflection * 0.15;
        sqCol = mix(sqCol, sqDeepEdgeTone, sqDarkEdge * 0.72);

        // Viền vát cạnh kim loại & đường gờ bóng đổ mỏng quanh 4 cạnh để tách biệt rõ từng tấm trên nền XP
        float sqInnerBevel = (smoothstep(-0.020, -0.006, sqDBox) - smoothstep(-0.006, 0.0, sqDBox)) * uSplitAmount;
        float sqOuterRimShadow = smoothstep(-0.007, 0.0, sqDBox) * uSplitAmount;
        sqCol = mix(sqCol, mix(sqHoloSpectrum, vec3(1.0), 0.6), sqInnerBevel * 0.6);
        sqCol = mix(sqCol, sqCol * 0.28, sqOuterRimShadow * 0.78);

        // Chiếu tọa độ fragment về mặt phẳng màn hình z = 0 để khớp chính xác với tọa độ con trỏ chuột và đinh ghim
        vec2 sqScreenPlaneXY = cameraPosition.xy + (vWorldPos.xy - cameraPosition.xy) * (cameraPosition.z / max(1.0, cameraPosition.z - vWorldPos.z));

        // =========================================================================
        // 5. PHẢN CHIẾU CON TRỎ CHUỘT MACOS KHỚP VỊ TRÍ, KÍCH THƯỚC & TRẠNG THÁI (MŨI TÊN / BÀN TAY / CLICK)
        // =========================================================================
        if (uCursorActive > 0.005) {
          // Độ lệch gương phản chiếu nhẹ theo độ nghiêng 3D thực tế của tấm kim sa (sqNormal.xy)
          vec2 sqMirrorShift = sqNormal.xy * (uCursorScale * 0.72) + vec2(0.06, -0.07) * uCursorScale;
          float sqPressScale = 1.0 - 0.10 * uCursorPressed;
          vec2 sqCursorLocal = (sqScreenPlaneXY - (uCursorWorld + sqMirrorShift)) / max(0.25, uCursorScale * sqPressScale);
          vec2 sqCellUv = sqCursorLocal + 0.5;

          float sqCursorProximity = 1.0 - smoothstep(uCursorScale * 0.9, uCursorScale * 3.2, length(sqScreenPlaneXY - uCursorWorld));
          float sqReflVis = uCursorActive * sqCursorProximity * uSplitAmount;

          // Hiệu ứng vòng gợn sóng cầu vồng nhỏ tại đầu trỏ chuột khi người dùng nhấn Click
          if (uCursorPressed > 0.01) {
            float sqClickDist = length(sqCursorLocal);
            float sqClickRing = exp(-pow((sqClickDist - 0.24) * 10.0, 2.0)) * uCursorPressed * sqReflVis;
            sqCol = mix(sqCol, mix(sqHoloSpectrum, vec3(1.0), 0.55), clamp(sqClickRing * 0.65, 0.0, 0.65));
          }

          if (sqCellUv.x > 0.02 && sqCellUv.x < 0.98 && sqCellUv.y > 0.02 && sqCellUv.y < 0.98) {
            float sqTypeIdx = floor(clamp(uCursorType + 0.5, 0.0, 3.0));
            float sqAtlasU = (sqTypeIdx + sqCellUv.x) * 0.25;

            // Tán sắc cầu vồng nhẹ ở viền ảnh phản chiếu của con trỏ trong mặt gương kim sa
            vec4 sqCurCenter = texture2D(uCursorTex, vec2(sqAtlasU, sqCellUv.y));
            float sqCurR = texture2D(uCursorTex, vec2(sqAtlasU + 0.0025, sqCellUv.y - 0.008)).a;
            float sqCurB = texture2D(uCursorTex, vec2(sqAtlasU - 0.0025, sqCellUv.y + 0.008)).a;

            float sqChromaHalo = clamp((sqCurR + sqCurB) * 0.5 - sqCurCenter.a * 0.6, 0.0, 1.0);
            sqCol = mix(sqCol, mix(sqHoloSpectrum, vec3(1.0), 0.4), sqChromaHalo * 0.55 * sqReflVis);

            // Phủ hình ảnh phản chiếu của con trỏ (mũi tên đen viền trắng macOS hoặc bàn tay trắng viền đen) kèm ánh gương Holographic nhẹ
            vec3 sqReflectedCursorRGB = mix(sqCurCenter.rgb, sqCurCenter.rgb * (0.65 + 0.75 * sqHoloSpectrum), 0.28);
            sqCol = mix(sqCol, sqReflectedCursorRGB, clamp(sqCurCenter.a * 0.86 * sqReflVis, 0.0, 0.92));
          }
        }

        // =========================================================================
        // 6. CHỐT ĐINH TREO KIM LOẠI 3D CỐ ĐỊNH TRÊN TƯỜNG (KHÔNG LẮC THEO KIM SA)
        // =========================================================================
        if (uSplitAmount > 0.04) {
          float sqMinDim = max(0.001, min(vTileDims.x, vTileDims.y));
          vec2 sqFixedPinDelta = (sqScreenPlaneXY - vPinWorld) / sqMinDim;

          // Lỗ khuy tròn đục trên tấm kim sa (lắc nhẹ quanh thân đinh cố định khi tấm kim sa nghiêng)
          vec2 sqHoleDelta = (vLocalUv - vec2(0.5, 0.90)) * (vTileDims / sqMinDim);
          float sqHoleDist = length(sqHoleDelta);
          float sqHoleMask = (1.0 - smoothstep(0.025, 0.032, sqHoleDist)) * uSplitAmount;
          sqCol = mix(sqCol, vec3(0.015, 0.02, 0.03), sqHoleMask * 0.88);

          // Bóng đổ của đầu đinh ghim cố định hắt xuống mặt tấm kim sa
          float sqPinShadowDist = length(sqFixedPinDelta - vec2(0.008, -0.016) + sqNormal.xy * 0.010);
          float sqPinShadow = (1.0 - smoothstep(0.012, 0.036, sqPinShadowDist)) * uSplitAmount;
          sqCol = mix(sqCol, sqCol * 0.24, sqPinShadow * 0.68);

          // Đầu đinh kim loại bạc 3D cố định tuyệt đối tại vPinWorld (không bao giờ lắc theo tấm kim sa)
          vec2 sqPegDelta = sqFixedPinDelta / 0.021;
          float sqPegDist = length(sqPegDelta);
          if (sqPegDist < 1.0) {
            float sqPegZ = sqrt(max(0.0, 1.0 - dot(sqPegDelta, sqPegDelta)));
            vec3 sqPegNormal = normalize(vec3(sqPegDelta, sqPegZ));
            float sqPegSpec = pow(max(0.0, dot(sqPegNormal, normalize(vec3(-0.35, 0.55, 0.75)))), 6.0);
            vec3 sqPegColor = mix(vec3(0.32, 0.36, 0.42), vec3(1.0, 1.0, 1.0), sqPegSpec * 0.85 + sqPegZ * 0.25);
            float sqPegEdgeAA = (1.0 - smoothstep(0.82, 1.0, sqPegDist)) * uSplitAmount;
            sqCol = mix(sqCol, sqPegColor, sqPegEdgeAA);
          }
        }

        // Gán vào outgoingLight ngay trước bước #include <opaque_fragment> để Three.js xuất màu chuẩn sRGB
        outgoingLight = mix(sqXpReflection, clamp(sqCol, 0.0, 1.0), smoothstep(0.0, 0.25, uSplitAmount));
        #include <opaque_fragment>
        `
      );
    };

    let instancedMesh = null;
    let cols = 6;
    let rows = 4;
    let totalInstances = 24;
    let cellW = 1;
    let cellH = 1;

    let originX = null;
    let originY = null;
    let normX = null;
    let normY = null;
    let phaseArr = null;
    let speedArr = null;
    let restRotX = null;
    let restRotY = null;
    let restRotZ = null;
    let rotX = null;
    let rotY = null;
    let rotZ = null;
    let velX = null;
    let velY = null;
    let velZ = null;
    let cellSplitDist = null;

    /**
     * Khởi tạo lưới InstancedMesh với số lượng tăng gấp đôi (16 – 24 tấm kim sa trên toàn màn hình):
     * - Desktop / Landscape: 6 cột x 4 hàng = 24 tấm (hoặc 6 x 3 = 18 tấm trên màn hình siêu rộng)
     * - Tablet: 4 cột x 4 hàng = 16 tấm
     * - Mobile Portrait: 3 cột x 5 hàng = 15 tấm
     * Tất cả các tấm nằm trọn vẹn 100% trong khung nhìn, không bị cắt mép.
     */
    const buildSequinWall = () => {
      if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.dispose();
        instancedMesh = null;
      }

      const aspect = planeW / planeH;

      if (aspect < 0.85) {
        // Mobile dọc: 3 cột x 5 hàng = 15 tấm trên toàn màn hình
        cols = 3;
        rows = 5;
      } else if (aspect < 1.25) {
        // Tablet / Vuông: 4 cột x 4 hàng = 16 tấm trên toàn màn hình
        cols = 4;
        rows = 4;
      } else if (aspect > 2.1) {
        // Màn hình Ultrawide: 6 cột x 3 hàng = 18 tấm trên toàn màn hình
        cols = 6;
        rows = 3;
      } else {
        // Desktop tiêu chuẩn (16:9 / 16:10): 6 cột x 4 hàng = 24 tấm (gấp đôi 12 tấm trước đây)
        cols = 6;
        rows = 4;
      }

      cellW = planeW / cols;
      cellH = planeH / rows;
      totalInstances = cols * rows;

      const instGeo = sequinGeo.clone();
      const cellRectArray = new Float32Array(totalInstances * 4);
      const tileSeedArray = new Float32Array(totalInstances * 3);

      originX = new Float32Array(totalInstances);
      originY = new Float32Array(totalInstances);
      normX = new Float32Array(totalInstances);
      normY = new Float32Array(totalInstances);
      phaseArr = new Float32Array(totalInstances);
      speedArr = new Float32Array(totalInstances);
      restRotX = new Float32Array(totalInstances);
      restRotY = new Float32Array(totalInstances);
      restRotZ = new Float32Array(totalInstances);
      rotX = new Float32Array(totalInstances);
      rotY = new Float32Array(totalInstances);
      rotZ = new Float32Array(totalInstances);
      velX = new Float32Array(totalInstances);
      velY = new Float32Array(totalInstances);
      velZ = new Float32Array(totalInstances);
      cellSplitDist = new Float32Array(totalInstances);

      instancedMesh = new THREE.InstancedMesh(instGeo, sequinMat, totalInstances);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instancedMesh.frustumCulled = false;
      instancedMesh.renderOrder = 1;

      const matArray = instancedMesh.instanceMatrix.array;
      const uStep = 1.0 / cols;
      const vStep = 1.0 / rows;
      let idx = 0;

      for (let r = 0; r < rows; r++) {
        const py = -planeH * 0.5 + (r + 0.5) * cellH;
        const ny = (r + 0.5) / rows;
        const vMin = r * vStep;

        for (let c = 0; c < cols; c++) {
          const px = -planeW * 0.5 + (c + 0.5) * cellW;
          const nx = (c + 0.5) / cols;
          const uMin = c * uStep;

          originX[idx] = px;
          originY[idx] = py;
          normX[idx] = nx;
          normY[idx] = ny;

          phaseArr[idx] = (c * 0.9 + r * 1.3) + Math.random() * 1.5;
          speedArr[idx] = 0.85 + Math.random() * 0.3;
          cellSplitDist[idx] = Math.hypot(nx - 0.5, ny - 0.5);

          // Mỗi tấm trong 8-12 tấm có góc nghiêng nghỉ tự nhiên hơi khác nhau để tạo các mảng sắc thái
          // Holographic (Cyan, Hồng Phấn, Tím Lavender, Vàng Champagne) đa dạng như ảnh mẫu
          const seed1 = ((c * 3 + r * 5) % 7) / 6.0;
          const seed2 = ((c * 5 + r * 2) % 7) / 6.0;
          const seed3 = Math.random();

          restRotX[idx] = (seed1 - 0.5) * 0.08;
          restRotY[idx] = (seed2 - 0.5) * 0.09;
          restRotZ[idx] = (seed3 - 0.5) * 0.012;

          const rOffset = idx * 4;
          cellRectArray[rOffset + 0] = uMin;
          cellRectArray[rOffset + 1] = vMin;
          cellRectArray[rOffset + 2] = uStep;
          cellRectArray[rOffset + 3] = vStep;

          const sOffset = idx * 3;
          tileSeedArray[sOffset + 0] = seed1;
          tileSeedArray[sOffset + 1] = seed2;
          tileSeedArray[sOffset + 2] = seed3;

          const mOffset = idx * 16;
          matArray[mOffset + 0] = cellW;
          matArray[mOffset + 5] = cellH;
          matArray[mOffset + 10] = 1;
          matArray[mOffset + 12] = px;
          matArray[mOffset + 13] = py + cellH * 0.4;
          matArray[mOffset + 15] = 1;

          idx++;
        }
      }

      instGeo.setAttribute(
        "aCellRect",
        new THREE.InstancedBufferAttribute(cellRectArray, 4)
      );
      instGeo.setAttribute(
        "aTileSeed",
        new THREE.InstancedBufferAttribute(tileSeedArray, 3)
      );
      instancedMesh.instanceMatrix.needsUpdate = true;
      scene.add(instancedMesh);
    };

    updateBaseTextureCover();
    buildSequinWall();

    // ============================================================================
    // 6. TÍCH HỢP GSAP ĐIỀU KHIỂN CHUYỂN CẢNH, CƯỜNG ĐỘ GIÓ, ĐỘ NHẠY CHUỘT & ÁNH SÁNG
    // ============================================================================
    const gsapState = {
      isSplit: false,
      splitProgress: 0.0,
      windStrength: 0.0,
      mouseSensitivity: 0.0,
      shockwaveRadius: 0.0,
      shockwaveStrength: 0.0,
      shockwaveX: 0.0,
      shockwaveY: 0.0,
      lightIntensity: 0.0,
      lightR: 1.0,
      lightG: 0.96,
      lightB: 0.9,
    };

    const gsapCtx = gsap.context(() => {});

    const computeSplitDistancesFromWorld = (wx, wy) => {
      const maxCornerDist = Math.hypot(planeW, planeH) * 0.75;
      for (let i = 0; i < totalInstances; i++) {
        const d = Math.hypot(originX[i] - wx, originY[i] - wy);
        cellSplitDist[i] = Math.min(1.0, d / maxCornerDist);
      }
    };

    const triggerShockwaveAndGust = (worldX, worldY, isInitialSplit = false) => {
      gsapState.shockwaveX = worldX;
      gsapState.shockwaveY = worldY;

      const maxWaveRad = Math.hypot(planeW, planeH) * (isInitialSplit ? 1.05 : 0.75);

      gsapCtx.add(() => {
        gsap.fromTo(
          gsapState,
          {
            shockwaveRadius: 0.01,
            shockwaveStrength: isInitialSplit ? 0.24 : 0.18,
          },
          {
            shockwaveRadius: maxWaveRad,
            shockwaveStrength: 0.0,
            duration: isInitialSplit ? 1.35 : 0.95,
            ease: "power2.out",
            overwrite: "auto",
          }
        );

        gsap.to(gsapState, {
          windStrength: isInitialSplit ? 1.08 : 1.04,
          duration: 0.35,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(gsapState, {
              windStrength: 1.0,
              duration: 1.4,
              ease: "sine.inOut",
            });
          },
        });

        gsap.timeline({ overwrite: "auto" })
          .to(gsapState, {
            lightIntensity: 1.0,
            lightR: 0.55,
            lightG: 0.92,
            lightB: 1.0,
            duration: 0.18,
            ease: "power2.out",
          })
          .to(gsapState, {
            lightIntensity: 0.85,
            lightR: 1.0,
            lightG: 0.68,
            lightB: 0.9,
            duration: 0.35,
            ease: "sine.inOut",
          })
          .to(gsapState, {
            lightIntensity: 0.65,
            lightR: 1.0,
            lightG: 0.96,
            lightB: 0.9,
            duration: 0.6,
            ease: "power2.out",
          });
      });
    };

    // Định vị từng Desktop Icon nằm gọn vào chính giữa từng tấm Kim Sa khi bật chế độ Kim Sa Gió
    const getIconTargetCells = () => {
      if (cols >= 6) {
        // Khớp bố cục 8 icon nằm gọn trong 8 tấm kim sa trung tâm (cột 1..4, hàng 1..2 tính từ trên xuống)
        return [
          { col: 1, rowFromTop: 1 }, // 0: My Computer
          { col: 4, rowFromTop: 1 }, // 1: My Documents
          { col: 1, rowFromTop: 2 }, // 2: Recycle Bin
          { col: 4, rowFromTop: 2 }, // 3: My Pictures
          { col: 2, rowFromTop: 2 }, // 4: BidKoi
          { col: 3, rowFromTop: 1 }, // 5: Happy Paw Website
          { col: 3, rowFromTop: 2 }, // 6: Hi-Vision Website
          { col: 2, rowFromTop: 1 }, // 7: ResQ Mien Trung
        ];
      }
      if (cols === 4) {
        return [
          { col: 0, rowFromTop: 1 },
          { col: 3, rowFromTop: 1 },
          { col: 0, rowFromTop: 2 },
          { col: 3, rowFromTop: 2 },
          { col: 1, rowFromTop: 2 },
          { col: 2, rowFromTop: 1 },
          { col: 2, rowFromTop: 2 },
          { col: 1, rowFromTop: 1 },
        ];
      }
      return [
        { col: 0, rowFromTop: 1 },
        { col: 1, rowFromTop: 1 },
        { col: 2, rowFromTop: 1 },
        { col: 0, rowFromTop: 2 },
        { col: 1, rowFromTop: 2 },
        { col: 2, rowFromTop: 2 },
        { col: 0, rowFromTop: 3 },
        { col: 2, rowFromTop: 3 },
      ];
    };

    const alignDesktopIconsToSequins = (animateTransition = true) => {
      const iconEls = document.querySelectorAll("#xp-home .xp-desktop-item");
      if (!iconEls || iconEls.length === 0) return;

      const targets = getIconTargetCells();
      const tileScreenW = window.innerWidth / cols;
      const tileScreenH = window.innerHeight / rows;

      iconEls.forEach((el, idx) => {
        const cell = targets[idx % targets.length];
        const clampedRow = Math.min(rows - 1, Math.max(0, cell.rowFromTop));
        const clampedCol = Math.min(cols - 1, Math.max(0, cell.col));

        const targetScreenX = (clampedCol + 0.5) * tileScreenW;
        const targetScreenY = (clampedRow + 0.53) * tileScreenH;

        const curX = parseFloat(gsap.getProperty(el, "x")) || 0;
        const curY = parseFloat(gsap.getProperty(el, "y")) || 0;
        const rect = el.getBoundingClientRect();

        const baseCenterX = rect.left - curX + rect.width * 0.5;
        const baseCenterY = rect.top - curY + rect.height * 0.5;

        const nextX = targetScreenX - baseCenterX;
        const nextY = targetScreenY - baseCenterY;

        gsapCtx.add(() => {
          gsap.to(el, {
            x: nextX,
            y: nextY,
            duration: animateTransition ? 0.85 : 0.0,
            ease: "power3.inOut",
            overwrite: "auto",
            onUpdate: () => {
              const dragInst = Draggable.get(el);
              if (dragInst) dragInst.update();
            },
            onComplete: () => {
              const dragInst = Draggable.get(el);
              if (dragInst) dragInst.update();
            },
          });
        });
      });
    };

    const resetDesktopIconsToDefault = (animateTransition = true) => {
      const iconEls = document.querySelectorAll("#xp-home .xp-desktop-item");
      if (!iconEls || iconEls.length === 0) return;

      iconEls.forEach((el) => {
        gsapCtx.add(() => {
          gsap.to(el, {
            x: 0,
            y: 0,
            duration: animateTransition ? 0.75 : 0.0,
            ease: "power3.inOut",
            overwrite: "auto",
            onUpdate: () => {
              const dragInst = Draggable.get(el);
              if (dragInst) dragInst.update();
            },
            onComplete: () => {
              const dragInst = Draggable.get(el);
              if (dragInst) dragInst.update();
            },
          });
        });
      });
    };

    const splitIntoSequinWall = (worldX = 0, worldY = 0) => {
      gsapState.isSplit = true;
      setIsSequinWall(true);
      computeSplitDistancesFromWorld(worldX, worldY);
      alignDesktopIconsToSequins(true);

      gsapCtx.add(() => {
        gsap.to(gsapState, {
          splitProgress: 1.0,
          mouseSensitivity: 1.0,
          duration: 1.05,
          ease: "power3.inOut",
          overwrite: "auto",
        });
        gsap.to(uCursorActive, {
          value: 1.0,
          duration: 0.4,
          ease: "power2.out",
        });
      });

      triggerShockwaveAndGust(worldX, worldY, true);
    };

    const mergeBackToWallpaper = () => {
      gsapState.isSplit = false;
      setIsSequinWall(false);
      computeSplitDistancesFromWorld(0, 0);
      resetDesktopIconsToDefault(true);

      gsapCtx.add(() => {
        gsap.to(gsapState, {
          splitProgress: 0.0,
          windStrength: 0.0,
          mouseSensitivity: 0.0,
          shockwaveStrength: 0.0,
          lightIntensity: 0.0,
          duration: 0.8,
          ease: "power3.inOut",
          overwrite: "auto",
        });
        gsap.to(uCursorActive, {
          value: 0.0,
          duration: 0.3,
          ease: "power2.out",
        });
      });
    };

    toggleModeRef.current = () => {
      if (gsapState.isSplit) {
        mergeBackToWallpaper();
      } else {
        splitIntoSequinWall(0, 0);
      }
    };

    // ============================================================================
    // 7. XỬ LÝ SỰ KIỆN CON TRỎ CHUỘT (POINTER MOVE / CLICK / LEAVE)
    // ============================================================================
    const pointer = {
      worldX: 0,
      worldY: 0,
      targetWorldX: 0,
      targetWorldY: 0,
      prevWorldX: 0,
      prevWorldY: 0,
      velX: 0,
      velY: 0,
      isInside: false,
      isDown: false,
      lastTarget: null,
      hasPrev: false,
    };

    const screenToWorld = (clientX, clientY) => {
      const nx = clientX / Math.max(1, window.innerWidth) - 0.5;
      const ny = 0.5 - clientY / Math.max(1, window.innerHeight);
      return {
        wx: nx * planeW,
        wy: ny * planeH,
      };
    };

    /**
     * Nhận diện chính xác hình dạng con trỏ chuột hiện tại (Mũi tên / Bàn tay mở / Bàn tay nắm / Bàn tay chỉ):
     * - 0.0: Mũi tên macOS mặc định
     * - 1.0: Bàn tay mở macOS (cursor: grab khi trỏ vào Desktop Icon / Folder)
     * - 2.0: Bàn tay nắm macOS (cursor: grabbing khi nhấn giữ / kéo Icon)
     * - 3.0: Bàn tay chỉ ngón trỏ (cursor: pointer khi trỏ vào nút bấm, link, taskbar)
     */
    const detectCursorType = (target, isPressed) => {
      if (!target || typeof target.closest !== "function") {
        return 0.0;
      }
      if (target.closest(".xp-desktop-item, .folder")) {
        return isPressed ? 2.0 : 1.0;
      }
      if (
        target.closest(
          "button, a, [role='button'], #xp-sequin-toggle, #xp-taskbar, #xp-start-menu, label, select"
        )
      ) {
        return isPressed ? 2.0 : 3.0;
      }
      const computedCursor = window.getComputedStyle(target).cursor || "";
      if (computedCursor.includes("grabbing")) return 2.0;
      if (computedCursor.includes("grab")) return isPressed ? 2.0 : 1.0;
      if (computedCursor.includes("pointer")) return isPressed ? 2.0 : 3.0;
      return 0.0;
    };

    const isClickOnDesktopBackground = (target) => {
      if (!target || typeof target.closest !== "function") return true;
      const hitUI = target.closest(
        "button, a, input, textarea, select, .xp-desktop-item, #xp-taskbar, #xp-start-menu, #xp-sequin-toggle, [aria-label='Temporal Timeline Selector'], nav, section[id]:not(#xp-home)"
      );
      return !hitUI;
    };

    const onPointerMove = (e) => {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      pointer.targetWorldX = wx;
      pointer.targetWorldY = wy;
      pointer.lastTarget = e.target;
      uCursorType.value = detectCursorType(e.target, pointer.isDown);

      if (!pointer.isInside) {
        pointer.isInside = true;
        pointer.worldX = wx;
        pointer.worldY = wy;
        pointer.prevWorldX = wx;
        pointer.prevWorldY = wy;
        pointer.hasPrev = true;

        if (gsapState.isSplit) {
          gsapCtx.add(() => {
            gsap.to(gsapState, {
              mouseSensitivity: 1.0,
              lightIntensity: 0.65,
              lightR: 1.0,
              lightG: 0.96,
              lightB: 0.9,
              duration: 0.35,
              ease: "power2.out",
            });
            gsap.to(uCursorActive, {
              value: 1.0,
              duration: 0.3,
              ease: "power2.out",
            });
          });
        }
      }
    };

    const onPointerDown = (e) => {
      if (!isRunningRef.current) return;
      pointer.isDown = true;
      pointer.lastTarget = e.target;
      uCursorType.value = detectCursorType(e.target, true);

      gsapCtx.add(() => {
        gsap.to(uCursorPressed, {
          value: 1.0,
          duration: 0.12,
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      if (!isClickOnDesktopBackground(e.target)) return;

      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      pointer.targetWorldX = wx;
      pointer.targetWorldY = wy;
      pointer.worldX = wx;
      pointer.worldY = wy;
      pointer.isInside = true;

      if (!gsapState.isSplit) {
        splitIntoSequinWall(wx, wy);
      } else {
        triggerShockwaveAndGust(wx, wy, false);
      }
    };

    const onPointerUp = (e) => {
      pointer.isDown = false;
      uCursorType.value = detectCursorType(e.target || pointer.lastTarget, false);
      gsapCtx.add(() => {
        gsap.to(uCursorPressed, {
          value: 0.0,
          duration: 0.22,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    };

    const onPointerLeave = (e) => {
      if (!e.relatedTarget) {
        pointer.isInside = false;
        pointer.hasPrev = false;
        if (gsapState.isSplit) {
          gsapCtx.add(() => {
            gsap.to(gsapState, {
              lightIntensity: 0.0,
              duration: 0.5,
              ease: "power2.out",
            });
            gsap.to(uCursorActive, {
              value: 0.0,
              duration: 0.4,
              ease: "power2.out",
            });
          });
        }
      }
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        onPointerMove(e.touches[0]);
      }
    };

    const onTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        if (!isRunningRef.current) return;
        if (!isClickOnDesktopBackground(e.target)) return;
        const { wx, wy } = screenToWorld(touch.clientX, touch.clientY);
        pointer.targetWorldX = wx;
        pointer.targetWorldY = wy;
        pointer.worldX = wx;
        pointer.worldY = wy;
        pointer.isInside = true;

        if (!gsapState.isSplit) {
          splitIntoSequinWall(wx, wy);
        } else {
          triggerShockwaveAndGust(wx, wy, false);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mouseout", onPointerLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onPointerUp, { passive: true });

    // ============================================================================
    // 8. RESPONSIVE RESIZE LISTENER
    // ============================================================================
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      calcFrustumPlane();

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      baseWallpaperMesh.scale.set(planeW, planeH, 1);
      backplateMesh.scale.set(planeW, planeH, 1);

      updateBaseTextureCover();
      buildSequinWall();
      if (gsapState.isSplit) {
        alignDesktopIconsToSequins(false);
      }
    };

    window.addEventListener("resize", onResize);

    // ============================================================================
    // 9. VÒNG LẶP RENDER 60 FPS
    // ============================================================================
    let animId = null;
    let prevTime = performance.now();

    const animate = (now) => {
      if (!isRunningRef.current) return;

      const dt = Math.min((now - prevTime) * 0.001, 0.05);
      prevTime = now;
      const elapsed = now * 0.001;
      uTime.value = elapsed;

      const prevWX = pointer.worldX;
      const prevWY = pointer.worldY;
      pointer.worldX += (pointer.targetWorldX - pointer.worldX) * 0.28;
      pointer.worldY += (pointer.targetWorldY - pointer.worldY) * 0.28;

      const moveDX = pointer.worldX - prevWX;
      const moveDY = pointer.worldY - prevWY;
      const moveSpeed = Math.hypot(moveDX, moveDY) / Math.max(0.004, dt);

      pointer.velX = THREE.MathUtils.lerp(pointer.velX, moveDX, 0.32);
      pointer.velY = THREE.MathUtils.lerp(pointer.velY, moveDY, 0.32);

      // Phản chiếu con trỏ bám tức thì 1:1 theo tọa độ chuột thật trên MacBook (không bị trễ nhịp)
      uCursorWorld.value.set(pointer.targetWorldX, pointer.targetWorldY);
      uLightColor.value.setRGB(gsapState.lightR, gsapState.lightG, gsapState.lightB);
      uLightStrength.value = gsapState.lightIntensity;

      cursorLight.position.set(pointer.worldX, pointer.worldY, 26.0);
      cursorLight.intensity = gsapState.lightIntensity * 45.0;
      cursorLight.color.setRGB(gsapState.lightR, gsapState.lightG, gsapState.lightB);

      const globalSplit = gsapState.splitProgress;
      uSplitAmount.value = globalSplit;

      const flatOpacity = Math.max(0, 1.0 - globalSplit * 2.5);
      baseMat.opacity = flatOpacity;
      baseWallpaperMesh.visible = flatOpacity > 0.005;

      if (instancedMesh && totalInstances > 0) {
        const matArray = instancedMesh.instanceMatrix.array;
        const windAmp = gsapState.windStrength;
        const mouseSens = gsapState.mouseSensitivity;

        // Bán kính tương tác chuột gọn gàng để không làm rung lắc các tấm xung quanh
        const avgCell = (cellW + cellH) * 0.5;
        const interactRadius = avgCell * 0.68;
        const interactRadiusSq = interactRadius * interactRadius;

        const swActive = gsapState.shockwaveStrength > 0.005;
        const swX = gsapState.shockwaveX;
        const swY = gsapState.shockwaveY;
        const swRad = gsapState.shockwaveRadius;
        const swBand = avgCell * 0.85;
        const swStr = gsapState.shockwaveStrength;

        // Hệ số nội suy mượt (overdamped) giúp tấm kim sa nghiêng êm ái, không bị bật nảy rung lắc qua lại
        const smoothFollow = 1.0 - Math.exp(-8.5 * dt);
        const damping = Math.pow(0.0025, dt);

        const segVX = pointer.worldX - prevWX;
        const segVY = pointer.worldY - prevWY;
        const segLenSq = segVX * segVX + segVY * segVY;
        const hasMouseMotion = pointer.isInside && mouseSens > 0.01 && moveSpeed > 0.35;

        for (let i = 0; i < totalInstances; i++) {
          const cellDelay = cellSplitDist[i] * 0.38;
          const localSplit = THREE.MathUtils.clamp(
            (globalSplit * 1.38 - cellDelay) / 1.0,
            0.0,
            1.0
          );

          const ox = originX[i];
          const oy = originY[i];

          if (localSplit <= 0.001 && !swActive) {
            const mOffset = i * 16;
            matArray[mOffset + 0] = cellW;
            matArray[mOffset + 1] = 0;
            matArray[mOffset + 2] = 0;
            matArray[mOffset + 4] = 0;
            matArray[mOffset + 5] = cellH;
            matArray[mOffset + 6] = 0;
            matArray[mOffset + 8] = 0;
            matArray[mOffset + 9] = 0;
            matArray[mOffset + 10] = 1;
            matArray[mOffset + 12] = ox;
            matArray[mOffset + 13] = oy + cellH * 0.4;
            matArray[mOffset + 14] = 0;
            continue;
          }

          const nx = normX[i];
          const ny = normY[i];
          const phase = phaseArr[i];
          const spd = speedArr[i];

          // --- A. GIÓ NỀN NHẸ NHÀNG + ĐỘ NGHIÊNG TĨNH ĐẶC TRƯNG CỦA TỪNG TẤM ---
          const wave1 = Math.sin(nx * 3.6 - elapsed * 1.05 * spd + ny * 2.6 + phase);
          const wave2 = Math.cos(nx * 2.8 + ny * 3.4 - elapsed * 0.85 * spd + phase * 0.7);
          const gust = Math.sin((nx + ny) * 3.0 - elapsed * 1.2 + Math.sin(elapsed * 0.4 + nx * 2.2));

          const effectiveWind = windAmp * localSplit;
          let targetX = restRotX[i] * localSplit + (wave1 * 0.032 + gust * 0.016) * effectiveWind;
          let targetY = restRotY[i] * localSplit + (wave2 * 0.036 + gust * 0.018) * effectiveWind;
          let targetZ = restRotZ[i] * localSplit + Math.sin(elapsed * 0.95 * spd + phase) * 0.006 * effectiveWind;

          // --- B. TƯƠNG TÁC TRỎ CHUỘT: ĐÈ NGHIÊNG VỀ GÓC CHUỘT + LƯỚT ÊM DỊU (ÍT RUNG LẮC) ---
          if (pointer.isInside && mouseSens > 0.01) {
            // 1. Hiệu ứng chuột đang đè lên tấm kim sa nào thì tấm đó nghiêng mượt về hướng/góc đang trỏ:
            // Chuột càng ở sát mép hoặc góc của tấm kim sa thì độ nghiêng về góc đó càng rõ.
            const relX = (pointer.worldX - ox) / (cellW * 0.5);
            const relY = (pointer.worldY - oy) / (cellH * 0.5);

            if (Math.abs(relX) < 1.15 && Math.abs(relY) < 1.15) {
              const inTileX = 1.0 - THREE.MathUtils.smoothstep(Math.abs(relX), 0.90, 1.15);
              const inTileY = 1.0 - THREE.MathUtils.smoothstep(Math.abs(relY), 0.90, 1.15);
              const hoverWeight = inTileX * inTileY * mouseSens * localSplit;

              const cx = THREE.MathUtils.clamp(relX, -1.0, 1.0);
              const cy = THREE.MathUtils.clamp(relY, -1.0, 1.0);

              // Hệ số khuếch đại khi chuột nằm ở mép hoặc góc của tấm kim sa
              const edgeDist = Math.hypot(cx, cy);
              const cornerBoost = 1.0 + 0.55 * edgeDist + 0.75 * Math.abs(cx * cy);

              const hoverTiltX = (-cy * 0.17 * cornerBoost - 0.02) * hoverWeight;
              const hoverTiltY = (cx * 0.19 * cornerBoost) * hoverWeight;
              const hoverTiltZ = (-cx * cy * 0.026) * hoverWeight;

              targetX += hoverTiltX;
              targetY += hoverTiltY;
              targetZ += hoverTiltZ;
            }

            // 2. Hiệu ứng lướt chuột qua rất nhẹ (hạn chế tối đa rung lắc dư thừa)
            let closestX = pointer.worldX;
            let closestY = pointer.worldY;
            if (segLenSq > 0.0001) {
              const t = THREE.MathUtils.clamp(
                ((ox - prevWX) * segVX + (oy - prevWY) * segVY) / segLenSq,
                0.0,
                1.0
              );
              closestX = prevWX + t * segVX;
              closestY = prevWY + t * segVY;
            }

            const dx = ox - closestX;
            const dy = oy - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < interactRadiusSq && hasMouseMotion) {
              const dist = Math.sqrt(distSq);
              const proximity = 1.0 - dist / interactRadius;
              const falloff = proximity * proximity * mouseSens * localSplit;

              const pushX = THREE.MathUtils.clamp(-pointer.velY * 0.12, -0.07, 0.07);
              const pushY = THREE.MathUtils.clamp(pointer.velX * 0.14, -0.08, 0.08);
              const pushZ = THREE.MathUtils.clamp(-pointer.velX * 0.015, -0.015, 0.015);

              velX[i] += pushX * falloff * 1.4 * dt;
              velY[i] += pushY * falloff * 1.4 * dt;
              velZ[i] += pushZ * falloff * 1.0 * dt;
            }
          }

          // --- C. SÓNG XUNG KÍCH NHẸ KHI CLICK CHUỘT ---
          if (swActive) {
            const sdx = ox - swX;
            const sdy = oy - swY;
            const sDist = Math.hypot(sdx, sdy);
            const ringDelta = Math.abs(sDist - swRad);

            if (ringDelta < swBand) {
              const ringFactor = (1.0 - ringDelta / swBand) * swStr;
              const invSDist = sDist > 0.001 ? 1.0 / sDist : 0.0;
              velX[i] += (-0.08 + (sdy * invSDist) * 0.07) * ringFactor * 3.5 * dt;
              velY[i] += (sdx * invSDist) * 0.10 * ringFactor * 3.5 * dt;
            }
          }

          // --- D. NỘI SUY ÊM MƯỢT VỀ GÓC MỤC TIÊU (KHÔNG RUNG LẮC QUA LẠI) ---
          velX[i] *= damping;
          velY[i] *= damping;
          velZ[i] *= damping;

          const rx = THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(rotX[i], targetX, smoothFollow) + velX[i],
            -0.34,
            0.34
          );
          const ry = THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(rotY[i], targetY, smoothFollow) + velY[i],
            -0.34,
            0.34
          );
          const rz = THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(rotZ[i], targetZ, smoothFollow) + velZ[i],
            -0.06,
            0.06
          );

          rotX[i] = rx;
          rotY[i] = ry;
          rotZ[i] = rz;

          // Thu nhỏ 1.6% mỗi tấm để các tấm kim sa nằm sát nhau hơn, chỉ chừa khe mảnh tinh tế
          const scaleFactor = 1.0 - 0.016 * localSplit;
          const tileW = cellW * scaleFactor;
          const tileH = cellH * scaleFactor;

          const a = Math.cos(rx), b = Math.sin(rx);
          const c = Math.cos(ry), d = Math.sin(ry);
          const e = Math.cos(rz), f = Math.sin(rz);

          const ae = a * e, af = a * f, be = b * e, bf = b * f;

          const mOffset = i * 16;
          // Column 0 (X-axis * tileW)
          matArray[mOffset + 0] = c * e * tileW;
          matArray[mOffset + 1] = (b * d * e + af) * tileW;
          matArray[mOffset + 2] = (-a * d * e + bf) * tileW;
          matArray[mOffset + 3] = 0;

          // Column 1 (Y-axis * tileH)
          matArray[mOffset + 4] = -c * f * tileH;
          matArray[mOffset + 5] = (-b * d * f + ae) * tileH;
          matArray[mOffset + 6] = (a * d * f + be) * tileH;
          matArray[mOffset + 7] = 0;

          // Column 2 (Z-axis / Surface Normal * 1.0)
          matArray[mOffset + 8] = d;
          matArray[mOffset + 9] = -b * c;
          matArray[mOffset + 10] = a * c;
          matArray[mOffset + 11] = 0;

          // Column 3 (Translation: Tâm xoay đặt cố định tại đúng vị trí đinh ghim y = oy + tileH * 0.40)
          matArray[mOffset + 12] = ox;
          matArray[mOffset + 13] = oy + tileH * 0.4;
          matArray[mOffset + 14] = 0;
          matArray[mOffset + 15] = 1;
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    if (activePropRef.current) {
      isRunningRef.current = true;
      prevTime = performance.now();
      animId = requestAnimationFrame(animate);
    }

    container._startAnim = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        prevTime = performance.now();
        onResize();
        requestAnimationFrame(() => {
          if (gsapState.isSplit) {
            alignDesktopIconsToSequins(false);
          }
        });
        animId = requestAnimationFrame(animate);
      }
    };

    container._stopAnim = () => {
      isRunningRef.current = false;
      if (animId) cancelAnimationFrame(animId);
    };

    // ============================================================================
    // 10. CLEANUP KHI UNMOUNT
    // ============================================================================
    return () => {
      isRunningRef.current = false;
      if (animId) cancelAnimationFrame(animId);

      gsapCtx.revert();

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mouseout", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("resize", onResize);

      if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.dispose();
      }
      sequinGeo.dispose();
      sequinMat.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      backplateGeo.dispose();
      backplateMat.dispose();
      if (blissTexture) blissTexture.dispose();
      if (cursorAtlasTex) cursorAtlasTex.dispose();
      if (envRT) envRT.dispose();

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

      {/* Nút điều khiển nhỏ gọn chuẩn phong cách Windows XP ở góc dưới bên phải (trên Taskbar) */}
      {active && (
        <div
          id="xp-sequin-toggle"
          className="fixed bottom-[38px] right-3 z-30 pointer-events-auto flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => toggleModeRef.current && toggleModeRef.current()}
            className="px-2.5 py-1 rounded-[3px] text-[11px] font-['Tahoma',sans-serif] text-white flex items-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] border border-[#003c74] transition-all hover:brightness-110 active:translate-y-[1px]"
            style={{
              background: isSequinWall
                ? "linear-gradient(180deg, #3c80f4 0%, #2056cd 50%, #1841a0 100%)"
                : "linear-gradient(180deg, rgba(35,88,200,0.82) 0%, rgba(20,55,140,0.88) 100%)",
            }}
            title={
              isSequinWall
                ? "Ghép lại hình nền Windows XP phẳng"
                : "Click vào nền Windows XP hoặc bấm vào đây để tách thành Tấm Kim Sa Gió"
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSequinWall
                  ? "bg-[#52ff68] shadow-[0_0_6px_#52ff68]"
                  : "bg-[#ffda58] animate-pulse"
              }`}
            />
            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)]">
              {isSequinWall ? "Kim Sa Gió: Đang bật (Thu gọn)" : "Click nền XP: Hiệu ứng Kim Sa Gió"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default XPPixelBackground;
