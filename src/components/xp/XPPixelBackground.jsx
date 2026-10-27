import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { perlin3 } from "./sequin/noise";
import { createEnvTexture, createBrushedNormalTexture } from "./sequin/textures";
import {
  SEQUIN_VERT,
  SEQUIN_FRAG,
  GLINT_VERT,
  GLINT_FRAG,
  TRAIL_ORB_VERT,
  TRAIL_ORB_FRAG,
} from "./sequin/shaders";

/**
 * XPPixelBackground — Micro-Sequin "Liquid Chrome" Wall (Windows XP / 2004 tab)
 *
 * - Hàng trăm hạt kim sa lục giác / tròn nhỏ xếp so le (hex-packed), treo trên đinh ghim.
 * - Vật lý lò xo (spring) cho từng hạt: gió Perlin noise nền + vệt chuột (cursor trail) làm hạt
 *   lật 3D quanh trục đinh rồi dao động tắt dần.
 * - Hiệu ứng lật 2 mặt: mặt trước gương holographic, mặt sau đen mờ / vàng champagne.
 * - Shader: normal map xước mờ + môi trường (studio HDRI) xoay chậm + tán sắc quang sai (chromatic
 *   aberration) ở rìa, phản chiếu hình nền Windows XP và con trỏ chuột.
 * - Hậu kỳ: bloom nhẹ + tia sao 4 cánh (star glint) nhấp nháy khi hạt bắt đúng góc phản xạ.
 * - Quality tier (high / medium / low) tự hạ khi FPS thấp hoặc prefers-reduced-motion.
 */

const BLISS_IMAGE_URL = "/images/windowsXPwallpaper.jpg";
const BLISS_ASPECT = 4500 / 3000; // 1.5

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

    // ============================================================================
    // 1b. QUALITY TIER, TEXTURES & POST-PROCESSING (BLOOM)
    // ============================================================================
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tiers = {
      high: { px: 26, bloom: true, glints: true, ratio: 1.5 },
      medium: { px: 34, bloom: true, glints: true, ratio: 1.25 },
      low: { px: 44, bloom: false, glints: false, ratio: 1 },
    };
    let tierName = reducedMotion ? "low" : window.innerWidth < 900 ? "medium" : "high";
    let tier = tiers[tierName];

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.ratio));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const envTex = createEnvTexture();
    const normalTex = createBrushedNormalTexture();

    const composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        type: THREE.HalfFloatType,
        samples: 4,
      })
    );
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.18,
        0.30,
        1.25
      )
    );
    composer.addPass(new OutputPass());

    let frameEma = 16;
    let slowFrames = 0;


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
    // 5. MICRO-SEQUIN MATERIAL, GEOMETRY & GLINT LAYER
    // ============================================================================
    const uEnvRot = { value: 0.0 };
    const uAberr = { value: 0.55 };
    const uTileUv = { value: new THREE.Vector2(0.03, 0.03) };
    const uLightDir = { value: new THREE.Vector3(0.3, 0.5, 0.8).normalize() };
    const uLightPos = { value: new THREE.Vector3(0, 10, 45) };

    // 4 nguồn sáng chạy sau đuôi cursor
    const uTrailLights = {
      value: [
        new THREE.Vector4(0, 0, 5.0, 0),
        new THREE.Vector4(0, 0, 6.5, 0),
        new THREE.Vector4(0, 0, 8.0, 0),
        new THREE.Vector4(0, 0, 9.5, 0),
      ],
    };
    const uTrailColors = {
      value: [
        new THREE.Color(0.40, 0.88, 1.00), // Cyan Ice Blue
        new THREE.Color(1.00, 0.85, 0.50), // Warm Champagne Gold
        new THREE.Color(0.92, 0.55, 0.98), // Lavender Violet
        new THREE.Color(0.55, 0.98, 0.72), // Mint Emerald
      ],
    };

    // Lục giác pointy-top, tâm xoay (pivot) tại đinh ghim gần mép trên (y = +0.40)
    const sequinGeo = new THREE.CircleGeometry(0.5, 6, Math.PI / 6);
    sequinGeo.translate(0, -0.4, 0);

    const sequinMat = new THREE.ShaderMaterial({
      uniforms: {
        uBliss: { value: blissTexture },
        uEnv: { value: envTex },
        uNormalTex: { value: normalTex },
        uCursorTex: { value: cursorAtlasTex },
        uUvScale,
        uUvOffset,
        uCursorWorld,
        uCursorActive,
        uCursorScale,
        uCursorType,
        uCursorPressed,
        uSplitAmount,
        uTime,
        uLightColor,
        uLightStrength,
        uEnvRot,
        uAberr,
        uTileUv,
        uLightDir,
        uLightPos,
        uTrailLights,
        uTrailColors,
      },
      vertexShader: SEQUIN_VERT,
      fragmentShader: SEQUIN_FRAG,
      side: THREE.DoubleSide,
    });

    const glintGeo = new THREE.PlaneGeometry(1, 1);
    const glintMat = new THREE.ShaderMaterial({
      vertexShader: GLINT_VERT,
      fragmentShader: GLINT_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // 4 đốm sáng phát quang bay sau đuôi chuột (pastel: cyan, champagne gold, lavender, mint)
    const orbGeo = new THREE.PlaneGeometry(1, 1);
    const trailOrbs = [];
    const trailOrbsGroup = new THREE.Group();
    trailOrbsGroup.renderOrder = 30;
    scene.add(trailOrbsGroup);

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: uTrailColors.value[i] },
          uAlpha: { value: 0.0 },
        },
        vertexShader: TRAIL_ORB_VERT,
        fragmentShader: TRAIL_ORB_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(orbGeo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 30;
      mesh.visible = false;
      trailOrbsGroup.add(mesh);
      trailOrbs.push({ mesh, mat });
    }

    let instancedMesh = null;
    let glintMesh = null;
    let glintAttr = null;
    let iconCols = 6;
    let iconRows = 4;
    let totalInstances = 0;
    let tileSize = 1;
    let tileScale = 1;

    let originX = null;
    let originY = null;
    let normX = null;
    let normY = null;
    let speedArr = null;
    let seedArr = null;
    let restRotX = null;
    let restRotY = null;
    let rotX = null;
    let rotY = null;
    let velX = null;
    let velY = null;
    let cooldown = null;
    let cellSplitDist = null;

    // Vệt chuột (cursor trail): các đoạn gần nhất kèm tuổi thọ giảm dần
    const trail = [];
    const TRAIL_MAX = 14;

    // Lưới ảo cho Desktop Icons (tách khỏi mật độ kim sa)
    const computeIconGrid = () => {
      const aspect = planeW / planeH;
      if (aspect < 0.85) {
        iconCols = 3;
        iconRows = 5;
      } else if (aspect < 1.25) {
        iconCols = 4;
        iconRows = 4;
      } else if (aspect > 2.1) {
        iconCols = 6;
        iconRows = 3;
      } else {
        iconCols = 6;
        iconRows = 4;
      }
    };

    const disposeWall = () => {
      if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.dispose();
        instancedMesh = null;
      }
      if (glintMesh) {
        scene.remove(glintMesh);
        glintMesh.geometry.dispose();
        glintMesh.dispose();
        glintMesh = null;
        glintAttr = null;
      }
    };

    /**
     * Hex-packed lattice: hàng lẻ lệch nửa bước. Kích thước hạt theo tier (px màn hình).
     */
    const buildSequinWall = () => {
      disposeWall();
      computeIconGrid();

      const pxToWorld = planeH / Math.max(1, window.innerHeight);
      tileSize = tier.px * pxToWorld;
      const pitchX = tileSize * 0.8660254;
      const pitchY = tileSize * 0.75;
      tileScale = tileSize * 0.95;

      const nCols = Math.ceil(planeW / pitchX) + 3;
      const nRows = Math.ceil(planeH / pitchY) + 3;
      totalInstances = nCols * nRows;
      uTileUv.value.set(tileScale / planeW, tileScale / planeH);

      originX = new Float32Array(totalInstances);
      originY = new Float32Array(totalInstances);
      normX = new Float32Array(totalInstances);
      normY = new Float32Array(totalInstances);
      speedArr = new Float32Array(totalInstances);
      seedArr = new Float32Array(totalInstances);
      restRotX = new Float32Array(totalInstances);
      restRotY = new Float32Array(totalInstances);
      rotX = new Float32Array(totalInstances);
      rotY = new Float32Array(totalInstances);
      velX = new Float32Array(totalInstances);
      velY = new Float32Array(totalInstances);
      cooldown = new Float32Array(totalInstances);
      cellSplitDist = new Float32Array(totalInstances);

      const instGeo = sequinGeo.clone();
      const seedAttrArr = new Float32Array(totalInstances * 3);
      const screenUvArr = new Float32Array(totalInstances * 2);

      instancedMesh = new THREE.InstancedMesh(instGeo, sequinMat, totalInstances);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instancedMesh.frustumCulled = false;
      instancedMesh.renderOrder = 1;
      const matArray = instancedMesh.instanceMatrix.array;

      const glintGeoInst = glintGeo.clone();
      glintAttr = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances), 1);
      glintAttr.setUsage(THREE.DynamicDrawUsage);
      glintGeoInst.setAttribute("aGlint", glintAttr);
      glintMesh = new THREE.InstancedMesh(glintGeoInst, glintMat, totalInstances);
      glintMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      glintMesh.frustumCulled = false;
      glintMesh.renderOrder = 20;
      glintMesh.visible = tier.glints;
      const glintMat16 = glintMesh.instanceMatrix.array;

      let idx = 0;
      for (let r = 0; r < nRows; r++) {
        const py = -planeH * 0.5 + (r - 1) * pitchY;
        for (let c = 0; c < nCols; c++) {
          const px = -planeW * 0.5 + (c - 1) * pitchX + (r % 2 ? pitchX * 0.5 : 0);

          originX[idx] = px;
          originY[idx] = py;
          normX[idx] = px / planeW + 0.5;
          normY[idx] = py / planeH + 0.5;
          speedArr[idx] = 0.85 + Math.random() * 0.3;

          const s1 = Math.random();
          const s2 = Math.random();
          const s3 = Math.random();
          seedArr[idx] = s1;

          // Nghiêng nghỉ liền mạch theo noise → các mảng sắc thái holographic như chất lỏng
          restRotX[idx] = perlin3(px * 0.07, py * 0.07, 3.1) * 0.07 + (s2 - 0.5) * 0.03;
          restRotY[idx] = perlin3(px * 0.07 + 40, py * 0.07, 7.7) * 0.08 + (s3 - 0.5) * 0.03;

          const sOff = idx * 3;
          seedAttrArr[sOff] = s1;
          seedAttrArr[sOff + 1] = s2;
          seedAttrArr[sOff + 2] = s3;
          screenUvArr[idx * 2] = normX[idx];
          screenUvArr[idx * 2 + 1] = normY[idx];

          const m = idx * 16;
          matArray[m + 0] = tileScale;
          matArray[m + 5] = tileScale;
          matArray[m + 10] = 1;
          matArray[m + 12] = px;
          matArray[m + 13] = py + tileScale * 0.4;
          matArray[m + 15] = 1;

          glintMat16[m + 0] = 0;
          glintMat16[m + 5] = 0;
          glintMat16[m + 10] = 1;
          glintMat16[m + 12] = px;
          glintMat16[m + 13] = py;
          glintMat16[m + 14] = 1.0;
          glintMat16[m + 15] = 1;

          idx++;
        }
      }

      instGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seedAttrArr, 3));
      instGeo.setAttribute("aScreenUv", new THREE.InstancedBufferAttribute(screenUvArr, 2));
      instancedMesh.instanceMatrix.needsUpdate = true;
      glintMesh.instanceMatrix.needsUpdate = true;
      scene.add(instancedMesh);
      scene.add(glintMesh);
    };

    const applyTier = (name) => {
      tierName = name;
      tier = tiers[name];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.ratio));
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(window.innerWidth, window.innerHeight);
      buildSequinWall();
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
      if (iconCols >= 6) {
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
      if (iconCols === 4) {
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
      const tileScreenW = window.innerWidth / iconCols;
      const tileScreenH = window.innerHeight / iconRows;

      iconEls.forEach((el, idx) => {
        const cell = targets[idx % targets.length];
        const clampedRow = Math.min(iconRows - 1, Math.max(0, cell.rowFromTop));
        const clampedCol = Math.min(iconCols - 1, Math.max(0, cell.col));

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
      pointer.isInside = true;
      pointer.worldX = worldX;
      pointer.worldY = worldY;
      pointer.targetWorldX = worldX;
      pointer.targetWorldY = worldY;
      for (let k = 0; k < 4; k++) {
        trailFollowers[k].x = worldX;
        trailFollowers[k].y = worldY;
      }
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
        for (let k = 0; k < 4; k++) {
          trailFollowers[k].x = wx;
          trailFollowers[k].y = wy;
        }

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
    window.addEventListener("mousemove", onPointerMove, { passive: true });
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

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.ratio));
      renderer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);

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

    // 4 nguồn sáng chạy sau đuôi cursor với tốc độ bám (lerp) và bán kính khác nhau
    const trailFollowers = [
      { x: 0, y: 0, lerpSpd: 0.32, rad: 6.5, scale: 2.2 },
      { x: 0, y: 0, lerpSpd: 0.22, rad: 8.0, scale: 2.5 },
      { x: 0, y: 0, lerpSpd: 0.14, rad: 9.5, scale: 2.8 },
      { x: 0, y: 0, lerpSpd: 0.08, rad: 11.0, scale: 3.2 },
    ];

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

      const globalSplit = gsapState.splitProgress;
      uSplitAmount.value = globalSplit;

      const flatOpacity = Math.max(0, 1.0 - globalSplit * 2.5);
      baseMat.opacity = flatOpacity;
      baseWallpaperMesh.visible = flatOpacity > 0.005;

      // Cập nhật 4 nguồn sáng chạy sau đuôi của cursor
      const mouseSpeedRatio = Math.min(moveSpeed / 10.0, 1.0);
      const targetOrbAlpha = pointer.isInside && globalSplit > 0.05 ? (0.70 + 0.30 * mouseSpeedRatio) : 0.0;

      for (let k = 0; k < 4; k++) {
        const tf = trailFollowers[k];

        // Quỹ đạo trôi bay mềm mại quanh cursor + vệt kéo dài theo gia tốc di chuyển của chuột
        const angle = elapsed * (1.8 + k * 0.45) + (k * 1.57);
        const orbitR = 1.0 + k * 0.75;
        const orbitX = Math.cos(angle) * orbitR;
        const orbitY = Math.sin(angle) * orbitR;
        const lagX = -pointer.velX * (k + 1) * 4.5;
        const lagY = -pointer.velY * (k + 1) * 4.5;

        const targetX = pointer.worldX + lagX + orbitX;
        const targetY = pointer.worldY + lagY + orbitY;

        tf.x = THREE.MathUtils.lerp(tf.x, targetX, tf.lerpSpd);
        tf.y = THREE.MathUtils.lerp(tf.y, targetY, tf.lerpSpd);

        // Uniform truyền vào shader để chiếu sáng & tạo vệt specular trên các lá kim sa
        uTrailLights.value[k].set(tf.x, tf.y, tf.rad, targetOrbAlpha * (1.0 - k * 0.12));

        // Cập nhật đốm sáng phát quang visual orbs
        const orb = trailOrbs[k];
        if (orb) {
          orb.mesh.position.set(tf.x, tf.y, 1.2);
          const orbSz = tf.scale * (0.85 + 0.30 * Math.sin(elapsed * 5.0 + k * 2.0));
          orb.mesh.scale.set(orbSz, orbSz, 1.0);
          orb.mat.uniforms.uAlpha.value = targetOrbAlpha * (1.0 - k * 0.12);
          orb.mesh.visible = targetOrbAlpha > 0.005;
        }
      }

      // Ánh sáng ảo trôi chậm + môi trường xoay chậm (quét vệt sáng lóa qua bề mặt)
      {
        const lx = Math.cos(elapsed * 0.17) * (planeW * 0.35);
        const ly = Math.sin(elapsed * 0.13) * (planeH * 0.25) + (planeH * 0.10);
        uLightPos.value.set(lx, ly, 45.0);
        uLightDir.value.copy(uLightPos.value).normalize();
        uEnvRot.value = elapsed * 0.012 + (pointer.worldX / Math.max(1, planeW)) * 0.05;
      }

      if (instancedMesh && totalInstances > 0) {
        const matArray = instancedMesh.instanceMatrix.array;
        const glintArr = glintAttr.array;
        const glintMat16 = glintMesh.instanceMatrix.array;
        const windAmp = gsapState.windStrength;
        const mouseSens = gsapState.mouseSensitivity;
        const glintsOn = tier.glints && globalSplit > 0.5;

        // Tính toán vector lướt chuột của khung hình hiện tại
        const frameDist = Math.hypot(moveDX, moveDY);
        const segLenSq = moveDX * moveDX + moveDY * moveDY;
        const isMoving = pointer.isInside && mouseSens > 0.01 && frameDist > 0.003;
        const invDist = frameDist > 0.0001 ? 1.0 / frameDist : 0.0;
        const swipeDirX = moveDX * invDist;
        const swipeDirY = moveDY * invDist;
        const swipeSpeedRatio = THREE.MathUtils.clamp(moveSpeed / 6.0, 0.6, 2.5);

        const coreR = tileSize * 1.30;
        const rippleR = tileSize * 4.0;
        const hoverR = tileSize * 2.5;

        // Cập nhật vệt chuột: thêm đoạn mới, giảm tuổi thọ, loại đoạn đã tắt
        if (pointer.isInside && mouseSens > 0.01 && moveSpeed > 0.20) {
          const spd = Math.hypot(moveDX, moveDY) / Math.max(0.004, dt);
          const inv = spd > 0.0001 ? 1.0 / (spd * dt) : 0.0;
          trail.push({
            x1: prevWX,
            y1: prevWY,
            x2: pointer.worldX,
            y2: pointer.worldY,
            dx: moveDX * inv * dt,
            dy: moveDY * inv * dt,
            sp: Math.min(spd / planeH, 3.0),
            life: 1.0,
          });
          if (trail.length > TRAIL_MAX) trail.shift();
        }
        for (let t = trail.length - 1; t >= 0; t--) {
          trail[t].life -= dt * 3.2;
          if (trail[t].life <= 0) trail.splice(t, 1);
        }

        const swActive = gsapState.shockwaveStrength > 0.005;
        const swX = gsapState.shockwaveX;
        const swY = gsapState.shockwaveY;
        const swRad = gsapState.shockwaveRadius;
        const swBand = tileSize * 4.0;
        const swStr = gsapState.shockwaveStrength;

        const K_SPRING = 44.0;
        const C_DAMP = 3.6;
        const MAX_W = 65.0;

        // Vector nửa (half vector) giữa ánh sáng ảo và hướng nhìn để tìm điểm bắt sáng trực diện
        const Lx = uLightDir.value.x;
        const Ly = uLightDir.value.y;
        const Lz = uLightDir.value.z;
        const camZ = camera.position.z;

        for (let i = 0; i < totalInstances; i++) {
          const cellDelay = cellSplitDist[i] * 0.38;
          const localSplit = THREE.MathUtils.clamp(globalSplit * 1.38 - cellDelay, 0.0, 1.0);

          const ox = originX[i];
          const oy = originY[i];
          const m = i * 16;

          if (localSplit <= 0.001 && !swActive) {
            rotX[i] = 0;
            rotY[i] = 0;
            velX[i] = 0;
            velY[i] = 0;
            matArray[m + 0] = tileScale;
            matArray[m + 1] = 0;
            matArray[m + 2] = 0;
            matArray[m + 4] = 0;
            matArray[m + 5] = tileScale;
            matArray[m + 6] = 0;
            matArray[m + 8] = 0;
            matArray[m + 9] = 0;
            matArray[m + 10] = 1;
            matArray[m + 12] = ox;
            matArray[m + 13] = oy + tileScale * 0.4;
            matArray[m + 14] = 0;
            glintMat16[m + 0] = 0;
            glintMat16[m + 5] = 0;
            glintArr[i] = 0;
            continue;
          }

          const spd = speedArr[i];

          // --- A. GIÓ NỀN PERLIN + ĐỘ NGHIÊNG TĨNH ---
          const eff = windAmp * localSplit;
          const n1 = perlin3(ox * 0.04, oy * 0.04, elapsed * 0.25 * spd);
          const n2 = perlin3(ox * 0.04 + 17.3, oy * 0.04 + 4.1, elapsed * 0.25 * spd + 9.0);
          const n3 = perlin3(ox * 0.11, oy * 0.11, elapsed * 0.6 + 31.0) * 0.4;
          let targetX = restRotX[i] * localSplit + (n1 + n3) * 0.11 * eff;
          let targetY = restRotY[i] * localSplit + (n2 + n3 * 0.5) * 0.13 * eff;

          // Gió giật mạnh: lật hẳn tấm để lộ mặt sau (có thời gian hồi)
          cooldown[i] -= dt;
          if (eff > 0.5 && cooldown[i] <= 0) {
            const g = perlin3(ox * 0.03 + 100.0, oy * 0.03, elapsed * 0.35 + 50.0);
            if (g > 0.5) {
              velY[i] += (n2 >= 0 ? 1 : -1) * (14.0 + (g - 0.5) * 20.0);
              cooldown[i] = 4.0 + seedArr[i] * 5.0;
            }
          }

          // --- B. TƯƠNG TÁC CHUỘT: XOAY LẬT TẠI VỊ TRÍ CHUỘT & GỢN NHẸ Ở CÁC TẤM CẠNH ĐÓ ---
          if (pointer.isInside && mouseSens > 0.01) {
            // Khoảng cách tới đường quét chuột tức thời của khung hình hiện tại
            let cx = pointer.worldX;
            let cy = pointer.worldY;
            if (segLenSq > 0.0001) {
              const tt = THREE.MathUtils.clamp(
                ((ox - prevWX) * moveDX + (oy - prevWY) * moveDY) / segLenSq,
                0.0,
                1.0
              );
              cx = prevWX + tt * moveDX;
              cy = prevWY + tt * moveDY;
            }
            const dxCur = ox - cx;
            const dyCur = oy - cy;
            const distCur = Math.hypot(dxCur, dyCur);

            if (isMoving) {
              if (distCur < coreR) {
                // VÙNG CHUỘT LƯỚT QUA TRỰC TIẾP: XOAY LẬT VÒNG (FLIP 3D)
                const coreFrac = 1.0 - distCur / coreR;
                const flipImpulse = (48.0 + seedArr[i] * 20.0) * swipeSpeedRatio * (coreFrac * 0.7 + 0.3) * mouseSens * localSplit;
                velY[i] += swipeDirX * flipImpulse * (0.85 + 0.3 * seedArr[i]);
                velX[i] += -swipeDirY * flipImpulse * 0.65;
                velY[i] += (seedArr[i] > 0.5 ? 1 : -1) * flipImpulse * 0.22;
              } else if (distCur < rippleR) {
                // VÙNG CÁC TẤM CẠNH ĐÓ: GỢN NHẸ (GENTLE RIPPLE)
                const rippleFrac = 1.0 - (distCur - coreR) / (rippleR - coreR);
                const rippleW = rippleFrac * rippleFrac;
                const rippleImpulse = (6.5 + 4.5 * Math.min(moveSpeed / 8.0, 1.2)) * rippleW * mouseSens * localSplit;
                velY[i] += swipeDirX * rippleImpulse * 0.75;
                velX[i] += -swipeDirY * rippleImpulse * 0.75;
                targetY += swipeDirX * 0.16 * rippleW * localSplit;
                targetX += -swipeDirY * 0.16 * rippleW * localSplit;
              }
            } else {
              // Khi chuột đứng yên: nghiêng từ tính nhẹ về phía con trỏ
              if (distCur < hoverR) {
                const hFrac = 1.0 - distCur / hoverR;
                const f = hFrac * hFrac * mouseSens * localSplit;
                targetY += ((pointer.worldX - ox) / hoverR) * 0.20 * f;
                targetX += (-(pointer.worldY - oy) / hoverR) * 0.20 * f;
              }
            }

            // Gợn sóng tiếp nối theo đuôi các vệt chuột trước đó
            for (let t = 0; t < trail.length; t++) {
              const s = trail[t];
              const sx = s.x2 - s.x1;
              const sy = s.y2 - s.y1;
              const sLenSq = sx * sx + sy * sy;
              let tcx = s.x2;
              let tcy = s.y2;
              if (sLenSq > 0.0001) {
                const tt = THREE.MathUtils.clamp(
                  ((ox - s.x1) * sx + (oy - s.y1) * sy) / sLenSq,
                  0.0,
                  1.0
                );
                tcx = s.x1 + tt * sx;
                tcy = s.y1 + tt * sy;
              }
              const tDist = Math.hypot(ox - tcx, oy - tcy);
              if (tDist < rippleR) {
                const tw = (1.0 - tDist / rippleR) * s.life;
                velY[i] += s.dx * tw * 14.0 * mouseSens * localSplit * dt;
                velX[i] += -s.dy * tw * 14.0 * mouseSens * localSplit * dt;
              }
            }
          }

          // --- C. SÓNG XUNG KÍCH KHI CLICK ---
          if (swActive) {
            const sdx = ox - swX;
            const sdy = oy - swY;
            const sDist = Math.hypot(sdx, sdy);
            const ringDelta = Math.abs(sDist - swRad);
            if (ringDelta < swBand) {
              const ringFactor = (1.0 - ringDelta / swBand) * swStr;
              const invS = sDist > 0.001 ? 1.0 / sDist : 0.0;
              velX[i] += -sdy * invS * ringFactor * 420.0 * dt;
              velY[i] += sdx * invS * ringFactor * 420.0 * dt;
            }
          }

          // --- D. LÒ XO TẮT DẦN (spring / elastic), KHÔNG GIỚI HẠN GÓC ĐỂ LẬT ĐƯỢC 2 MẶT ---
          velX[i] += (-K_SPRING * (rotX[i] - targetX) - C_DAMP * velX[i]) * dt;
          velY[i] += (-K_SPRING * (rotY[i] - targetY) - C_DAMP * velY[i]) * dt;
          velX[i] = THREE.MathUtils.clamp(velX[i], -MAX_W, MAX_W);
          velY[i] = THREE.MathUtils.clamp(velY[i], -MAX_W, MAX_W);
          rotX[i] += velX[i] * dt;
          rotY[i] += velY[i] * dt;

          const rx = rotX[i];
          const ry = rotY[i];
          const a = Math.cos(rx);
          const b = Math.sin(rx);
          const c = Math.cos(ry);
          const d = Math.sin(ry);

          matArray[m + 0] = c * tileScale;
          matArray[m + 1] = b * d * tileScale;
          matArray[m + 2] = -a * d * tileScale;
          matArray[m + 3] = 0;
          matArray[m + 4] = 0;
          matArray[m + 5] = a * tileScale;
          matArray[m + 6] = b * tileScale;
          matArray[m + 7] = 0;
          matArray[m + 8] = d;
          matArray[m + 9] = -b * c;
          matArray[m + 10] = a * c;
          matArray[m + 11] = 0;
          matArray[m + 12] = ox;
          matArray[m + 13] = oy + tileScale * 0.4;
          matArray[m + 14] = 0;
          matArray[m + 15] = 1;

          // --- E. TIA SAO 4 CÁNH: chỉ tối đa ~7 vị trí rải rác toàn màn hình (không bao giờ trùng lặp/xếp chồng) ---
          let glint = 0.0;
          const isGlintCandidate = ((i * 37) % 180 === 0);
          if (glintsOn && isGlintCandidate && a * c > 0.3) {
            const vx = -ox;
            const vy = -oy;
            const vz = camZ;
            const vl = Math.hypot(vx, vy, vz);
            let hx = Lx + vx / vl;
            let hy = Ly + vy / vl;
            let hz = Lz + vz / vl;
            const hl = Math.hypot(hx, hy, hz);
            hx /= hl;
            hy /= hl;
            hz /= hl;
            const nh = d * hx + -b * c * hy + a * c * hz;
            if (nh > 0.96) {
              const spec = Math.pow((nh - 0.96) / 0.04, 3.0);
              const flick = 0.5 + 0.5 * Math.sin(elapsed * (3.5 + seedArr[i] * 4.0) + seedArr[i] * 50.0);
              glint = spec * flick * localSplit;
            }
          }
          if (glint > 0.08) {
            const size = tileSize * (0.40 + 0.45 * Math.min(glint, 1.0));
            glintMat16[m + 0] = size;
            glintMat16[m + 5] = size;
            glintArr[i] = Math.min(glint * 0.8, 1.0);
          } else {
            glintMat16[m + 0] = 0;
            glintMat16[m + 5] = 0;
            glintArr[i] = 0;
          }
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        glintMesh.instanceMatrix.needsUpdate = true;
        glintAttr.needsUpdate = true;
      }

      // Tự hạ chất lượng khi khung hình chậm kéo dài (sau khi đã tách kim sa)
      if (gsapState.isSplit && tierName !== "low") {
        frameEma += (dt * 1000 - frameEma) * 0.05;
        slowFrames = frameEma > 26 ? slowFrames + 1 : 0;
        if (slowFrames > 120) {
          slowFrames = 0;
          frameEma = 16;
          applyTier(tierName === "high" ? "medium" : "low");
        }
      }

      if (tier.bloom) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }
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
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mouseout", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("resize", onResize);

      disposeWall();
      sequinGeo.dispose();
      sequinMat.dispose();
      glintGeo.dispose();
      glintMat.dispose();
      orbGeo.dispose();
      trailOrbs.forEach(({ mesh, mat }) => {
        trailOrbsGroup.remove(mesh);
        mat.dispose();
      });
      scene.remove(trailOrbsGroup);
      baseGeo.dispose();
      baseMat.dispose();
      backplateGeo.dispose();
      backplateMat.dispose();
      if (blissTexture) blissTexture.dispose();
      if (cursorAtlasTex) cursorAtlasTex.dispose();
      envTex.dispose();
      normalTex.dispose();
      composer.dispose();

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
