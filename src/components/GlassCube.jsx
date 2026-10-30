import { useEffect, useRef, useState, useCallback } from "react";
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  LineBasicMaterial,
  LineSegments,
  BoxGeometry,
  EdgesGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Group,
  Vector2,
  Vector3,
  Quaternion,
  Euler,
  Raycaster,
  Plane,
  BufferGeometry,
  Line,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  FrontSide,
  DoubleSide,
} from "three";
import useThemeStore from "#store/theme";
import { GEMSTONE_CUTS } from "./gemstoneGeometries";

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

/** Cấu hình 12 khối đá quý giác cắt kim cương chuẩn: lưới 3x4 hoàn hảo, không bị che khuất */
export const initialGemstonesConfig = [
  // Hàng 1 (Top)
  {
    id: "round",
    name: "Round Brilliant",
    vietName: "Tròn Giác Cúc",
    x: -2.15,
    y: 0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "princess",
    name: "Princess",
    vietName: "Vuông Princess",
    x: -1.1,
    y: 0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "cushion",
    name: "Cushion",
    vietName: "Gối Cushion",
    x: -0.05,
    y: 0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "oval",
    name: "Oval",
    vietName: "Bầu Dục Oval",
    x: 1.0,
    y: 0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  // Hàng 2 (Middle)
  {
    id: "pear",
    name: "Pear",
    vietName: "Giọt Nước Pear",
    x: -2.15,
    y: 0.0,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "marquise",
    name: "Marquise",
    vietName: "Hạt Thóc Marquise",
    x: -1.1,
    y: 0.0,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "emerald",
    name: "Emerald",
    vietName: "Chữ Nhật Emerald",
    x: -0.05,
    y: 0.0,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "asscher",
    name: "Asscher",
    vietName: "Vuông Asscher",
    x: 1.0,
    y: 0.0,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  // Hàng 3 (Bottom)
  {
    id: "radiant",
    name: "Radiant",
    vietName: "Chữ Nhật Radiant",
    x: -2.15,
    y: -0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "heart",
    name: "Heart",
    vietName: "Trái Tim Heart",
    x: -1.1,
    y: -0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "trilliant",
    name: "Trilliant",
    vietName: "Tam Giác Trilliant",
    x: -0.05,
    y: -0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
  {
    id: "old_european",
    name: "Old European",
    vietName: "Tròn Cổ Điển",
    x: 1.0,
    y: -0.85,
    scale: 0.52,
    axis: new Vector3(0.0, 1.0, 0.0),
    speed: 0.007,
  },
];


/** Vẽ trục minh họa (Cột trục màu đỏ + mũi tên định hướng + tâm cyan + vòng cung xoay màu vàng) cho Khối 1 */
function createAxisHelper(pos, axis, speed = 1) {
  const group = new Group();
  group.position.set(pos.x, pos.y, pos.z ?? 0);

  const axisMat = new MeshBasicMaterial({
    color: 0xff2d55, // Đỏ hồng neon nổi bật
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });

  const arrowMat = new MeshBasicMaterial({
    color: 0xffcc00, // Vàng neon chỉ hướng xoay
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });

  const centerMat = new MeshBasicMaterial({
    color: 0x00f0ff, // Cyan neon đánh dấu tâm xoay
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });

  // 1. Cột trục chính (Cylinder) đâm xuyên qua tâm viên kim cương
  const rodLength = 2.35;
  const rodGeo = new CylinderGeometry(0.022, 0.022, rodLength, 16);
  const rodMesh = new Mesh(rodGeo, axisMat);
  rodMesh.renderOrder = 999;

  // 2. Mũi tên định hướng trục ở đầu dương
  const tipGeo = new ConeGeometry(0.075, 0.2, 16);
  const tipMesh = new Mesh(tipGeo, axisMat);
  tipMesh.position.y = rodLength / 2 + 0.1;
  tipMesh.renderOrder = 999;

  // Đuôi trục đối diện (đầu âm)
  const baseGeo = new SphereGeometry(0.045, 12, 12);
  const baseMesh = new Mesh(baseGeo, axisMat);
  baseMesh.position.y = -rodLength / 2;
  baseMesh.renderOrder = 999;

  // 3. Tâm xoay ở giữa khối
  const centerGeo = new SphereGeometry(0.06, 12, 12);
  const centerMesh = new Mesh(centerGeo, centerMat);
  centerMesh.renderOrder = 999;

  // 4. Vòng cung xoay quanh trục (Rotation Indicator)
  const arcRadius = 0.55;
  const arcGeo = new TorusGeometry(arcRadius, 0.02, 8, 32, Math.PI * 1.5);
  const arcMesh = new Mesh(arcGeo, arrowMat);
  arcMesh.rotation.x = Math.PI / 2;
  arcMesh.renderOrder = 999;

  // Mũi tên chỉ hướng quay trên vòng
  const rotTipGeo = new ConeGeometry(0.06, 0.15, 12);
  const rotTipMesh = new Mesh(rotTipGeo, arrowMat);
  rotTipMesh.position.set(arcRadius, 0, 0);
  rotTipMesh.rotation.z = speed >= 0 ? Math.PI : 0;
  rotTipMesh.renderOrder = 999;

  // Cột chỉ hướng trục quay (màu vàng) khi bị nghiêng lệch so với trục đỏ
  const rotAxisRodGeo = new CylinderGeometry(0.015, 0.015, 1.4, 12);
  const rotAxisMat = new MeshBasicMaterial({
    color: 0xffcc00,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  const rotAxisMesh = new Mesh(rotAxisRodGeo, rotAxisMat);
  rotAxisMesh.position.y = 0.7;
  rotAxisMesh.renderOrder = 998;

  const rotAxisTipGeo = new ConeGeometry(0.05, 0.16, 12);
  const rotAxisTip = new Mesh(rotAxisTipGeo, rotAxisMat);
  rotAxisTip.position.y = 1.48;
  rotAxisTip.renderOrder = 998;

  // Group riêng cho toàn bộ Vòng xoay Vàng và Trục quay Vàng để có thể nghiêng lệch so với trục đỏ
  const rotIndicatorGroup = new Group();
  rotIndicatorGroup.add(arcMesh);
  rotIndicatorGroup.add(rotTipMesh);
  rotIndicatorGroup.add(rotAxisMesh);
  rotIndicatorGroup.add(rotAxisTip);

  const axisSubGroup = new Group();
  axisSubGroup.add(rodMesh);
  axisSubGroup.add(tipMesh);
  axisSubGroup.add(baseMesh);
  axisSubGroup.add(centerMesh);
  axisSubGroup.add(rotIndicatorGroup);

  // Định hướng trục theo vector axis (mặc định Cylinder hướng theo trục Y)
  const defaultDir = new Vector3(0, 1, 0);
  axisSubGroup.quaternion.setFromUnitVectors(defaultDir, axis.clone().normalize());

  group.add(axisSubGroup);
  return {
    group,
    axisSubGroup,
    rotIndicatorGroup,
    defaultDir,
    rodGeo,
    tipGeo,
    baseGeo,
    centerGeo,
    arcGeo,
    rotTipGeo,
    rotTipMesh,
    rotAxisRodGeo,
    rotAxisTipGeo,
    axisMat,
    arrowMat,
    rotAxisMat,
    centerMat,
  };
}

/** Tạo lá cờ động 3D hiển thị toạ độ và tên điểm cắm */
function makeDynamicFlagSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mat = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(0.88, 0.26, 1);

  const updateText = (title, coordsText, color = "#10b981", bgColor = "rgba(6,78,59,0.92)") => {
    ctx.clearRect(0, 0, 320, 96);
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 312, 88, 14);
    } else {
      ctx.rect(4, 4, 312, 88);
    }
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 312, 88, 14);
    } else {
      ctx.rect(4, 4, 312, 88);
    }
    ctx.stroke();

    // Dòng 1: Tiêu đề (Điểm 1 / Điểm 2 / Cắm Điểm)
    ctx.fillStyle = color;
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 160, 30);

    // Dòng 2: Toạ độ 3D (X, Y, Z)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace, ui-monospace, sans-serif";
    ctx.fillText(coordsText, 160, 64);

    texture.needsUpdate = true;
  };

  return { sprite, texture, mat, updateText };
}

/** Tạo Cột cờ 3D (chân ghim + cột cờ + lá cờ) cắm trực tiếp trên bề mặt kim cương */
function create3DFlag(colorHex, titleText, coordsText, bgColor) {
  const group = new Group();
  const disposables = [];

  // 1. Chân ghim tiếp xúc bề mặt 3D
  const dotGeo = new SphereGeometry(0.045, 12, 12);
  const dotMat = new MeshBasicMaterial({
    color: colorHex,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const dotMesh = new Mesh(dotGeo, dotMat);
  dotMesh.renderOrder = 1002;
  group.add(dotMesh);
  disposables.push(dotGeo, dotMat);

  // Vòng tròn halo tiếp xúc mặt phẳng
  const ringGeo = new TorusGeometry(0.09, 0.012, 8, 24);
  const ringMesh = new Mesh(ringGeo, dotMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.renderOrder = 1002;
  group.add(ringMesh);
  disposables.push(ringGeo);

  // 2. Cột cờ mảnh
  const poleHeight = 0.42;
  const poleGeo = new CylinderGeometry(0.009, 0.009, poleHeight, 10);
  const poleMat = new MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const poleMesh = new Mesh(poleGeo, poleMat);
  poleMesh.position.y = poleHeight / 2;
  poleMesh.renderOrder = 1002;
  group.add(poleMesh);
  disposables.push(poleGeo, poleMat);

  // Đầu đỉnh cột cờ
  const tipGeo = new SphereGeometry(0.02, 8, 8);
  const tipMesh = new Mesh(tipGeo, dotMat);
  tipMesh.position.y = poleHeight + 0.01;
  tipMesh.renderOrder = 1003;
  group.add(tipMesh);
  disposables.push(tipGeo);

  // 3. Lá cờ billboard sprite
  const flagSprite = makeDynamicFlagSprite();
  flagSprite.updateText(titleText, coordsText, `#${colorHex.toString(16).padStart(6, "0")}`, bgColor);
  flagSprite.sprite.position.set(0.32, poleHeight + 0.04, 0);
  flagSprite.sprite.renderOrder = 1005;
  group.add(flagSprite.sprite);
  disposables.push(flagSprite.texture, flagSprite.mat);

  return {
    group,
    dotMesh,
    ringMesh,
    poleMesh,
    flagSprite,
    setColor: (hex, title, coords, bg) => {
      dotMat.color.setHex(hex);
      tipMesh.material.color.setHex(hex);
      flagSprite.updateText(title, coords, `#${hex.toString(16).padStart(6, "0")}`, bg);
    },
    disposables,
  };
}

/** Tạo các lá cờ đánh dấu 3D cho chế độ Chấm 2 Điểm tạo trục (Điểm 1 Xanh lá, Điểm 2 Đỏ hồng, và Cờ Hover theo chuột) */
function createPointsHelper() {
  const group = new Group();
  const disposables = [];

  // 1. Cờ cắm Điểm 1 (Xanh emerald neon)
  const flag1 = create3DFlag(0x10b981, "🚩 Điểm 1", "X:0 Y:0 Z:0", "rgba(6,78,59,0.92)");
  flag1.group.visible = false;
  group.add(flag1.group);
  disposables.push(...flag1.disposables);

  // 2. Cờ cắm Điểm 2 (Đỏ hồng rose neon)
  const flag2 = create3DFlag(0xf43f5e, "🚩 Điểm 2", "X:0 Y:0 Z:0", "rgba(136,19,55,0.92)");
  flag2.group.visible = false;
  group.add(flag2.group);
  disposables.push(...flag2.disposables);

  // 3. CỜ RÊ CHUỘT (Hover Flag - lướt trên bề mặt 3D theo con trỏ chuột)
  const hoverFlag = create3DFlag(0x00f0ff, "🚩 Chọn Điểm 1", "X:0 Y:0 Z:0", "rgba(0,35,60,0.92)");
  hoverFlag.group.visible = false;
  group.add(hoverFlag.group);
  disposables.push(...hoverFlag.disposables);

  // 4. Đường nối sáng giữa Điểm 1 và Điểm 2
  const lineMat = new LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  const lineGeo = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  ]);
  const lineMesh = new Line(lineGeo, lineMat);
  lineMesh.renderOrder = 1000;
  lineMesh.visible = false;
  group.add(lineMesh);
  disposables.push(lineGeo, lineMat);

  return {
    group,
    flag1,
    flag2,
    hoverFlag,
    lineMesh,
    lineGeo,
    disposables,
  };
}

/** Tạo Khung Cầu 3D Tham Chiếu (3D Reference Sphere) bao quanh Khối 1:
 * - Khối cầu 3D trong suốt nhẹ bao trọn viên kim cương
 * - Khung lưới kinh tuyến & vĩ tuyến 3D mảnh, tinh tế
 * - 3 vòng tròn chuẩn 3D (Xích đạo XY, Kinh tuyến XZ, Kinh tuyến YZ)
 * - 2 điểm cực (Cực Bắc & Cực Nam) đánh dấu vị trí trục đâm xuyên qua quả cầu
 * - Cột trục đỏ & Vòng xoay vàng
 */
function createReferenceGuides(pos, currentAxis, currentSpeed = 1) {
  const group = new Group();
  group.position.set(pos.x, pos.y, pos.z ?? 0);

  const disposables = [];
  const sphereRadius = 1.25;

  // 1. Quả cầu 3D trong suốt nhẹ (Translucent Sphere Shell)
  const sphereGeo = new SphereGeometry(sphereRadius, 36, 24);
  const sphereMat = new MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: DoubleSide,
  });
  const sphereMesh = new Mesh(sphereGeo, sphereMat);
  sphereMesh.renderOrder = 995;
  group.add(sphereMesh);
  disposables.push(sphereGeo, sphereMat);

  // 2. Lưới kinh tuyến & vĩ tuyến 3D (Wireframe Globe Grid)
  const gridGeo = new SphereGeometry(sphereRadius, 24, 14);
  const gridMat = new MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const gridMesh = new Mesh(gridGeo, gridMat);
  gridMesh.renderOrder = 996;
  group.add(gridMesh);
  disposables.push(gridGeo, gridMat);

  // 3. 3 Vành đai tròn 3D kinh tuyến & xích đạo (Equator XY, Meridian XZ, Meridian YZ)
  const ringGeo = new TorusGeometry(sphereRadius, 0.008, 8, 64);
  disposables.push(ringGeo);

  // Vành 1: Xích đạo XY (Cyan)
  const ringMatXY = new MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const ringMeshXY = new Mesh(ringGeo, ringMatXY);
  ringMeshXY.renderOrder = 997;
  group.add(ringMeshXY);
  disposables.push(ringMatXY);

  // Vành 2: Kinh tuyến XZ (Vàng)
  const ringMatXZ = new MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.40,
    depthWrite: false,
  });
  const ringMeshXZ = new Mesh(ringGeo, ringMatXZ);
  ringMeshXZ.rotation.x = Math.PI / 2;
  ringMeshXZ.renderOrder = 997;
  group.add(ringMeshXZ);
  disposables.push(ringMatXZ);

  // Vành 3: Kinh tuyến YZ (Hồng Rose)
  const ringMatYZ = new MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.40,
    depthWrite: false,
  });
  const ringMeshYZ = new Mesh(ringGeo, ringMatYZ);
  ringMeshYZ.rotation.y = Math.PI / 2;
  ringMeshYZ.renderOrder = 997;
  group.add(ringMeshYZ);
  disposables.push(ringMatYZ);

  // 4. Trục đỏ và mũi tên xoay hiện tại
  const axisHelper = createAxisHelper(
    new Vector3(0, 0, 0),
    currentAxis,
    currentSpeed
  );

  // Thêm 2 điểm cực (North & South Poles) ngay trên bề mặt hình cầu tại vị trí trục xuyên qua
  const poleGeo = new SphereGeometry(0.045, 12, 12);
  const northPoleMat = new MeshBasicMaterial({
    color: 0x00f0ff,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const southPoleMat = new MeshBasicMaterial({
    color: 0xff2d55,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const northPole = new Mesh(poleGeo, northPoleMat);
  northPole.position.y = sphereRadius;
  northPole.renderOrder = 1000;
  axisHelper.axisSubGroup.add(northPole);

  const southPole = new Mesh(poleGeo, southPoleMat);
  southPole.position.y = -sphereRadius;
  southPole.renderOrder = 1000;
  axisHelper.axisSubGroup.add(southPole);

  disposables.push(poleGeo, northPoleMat, southPoleMat);

  group.add(axisHelper.group);
  disposables.push(
    axisHelper.rodGeo,
    axisHelper.tipGeo,
    axisHelper.baseGeo,
    axisHelper.centerGeo,
    axisHelper.arcGeo,
    axisHelper.rotTipGeo,
    axisHelper.rotAxisRodGeo,
    axisHelper.rotAxisTipGeo,
    axisHelper.axisMat,
    axisHelper.arrowMat,
    axisHelper.rotAxisMat,
    axisHelper.centerMat
  );

  // 5. Điểm đánh dấu 3D cho chế độ Chấm 2 Điểm tạo trục
  const pointsHelper = createPointsHelper();
  group.add(pointsHelper.group);
  disposables.push(...pointsHelper.disposables);

  return {
    group,
    sphereMesh,
    sphereRadius,
    axisSubGroup: axisHelper.axisSubGroup,
    rotIndicatorGroup: axisHelper.rotIndicatorGroup,
    defaultDir: axisHelper.defaultDir,
    rotTipMesh: axisHelper.rotTipMesh,
    pointsHelper,
    disposables,
  };
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

/** Chuyển đổi toạ độ (X, Y) thành góc đồng hồ và góc độ */
function getClockInfo(x, y) {
  const angle = Math.atan2(y, x);
  const deg = (angle * 180) / Math.PI;
  let hourVal = (90 - deg) / 30;
  while (hourVal <= 0) hourVal += 12;
  while (hourVal > 12) hourVal -= 12;
  const h = Math.floor(hourVal) || 12;
  const m = Math.round((hourVal - Math.floor(hourVal)) * 60) % 60;
  const targetStr = `${h}h${m > 0 ? (m < 10 ? "0" + m : m) : ""}`;

  let oppHourVal = (hourVal + 6) % 12;
  if (oppHourVal <= 0) oppHourVal += 12;
  const oh = Math.floor(oppHourVal) || 12;
  const om = m;
  const sourceStr = `${oh}h${om > 0 ? (om < 10 ? "0" + om : om) : ""}`;

  return { targetStr, sourceStr, deg: deg.toFixed(1) };
}

const GlassCube = () => {
  const { currentYear } = useThemeStore();
  const is2026 = currentYear === "2026";
  const canvasRef = useRef(null);

  const [activeGemIndex, setActiveGemIndex] = useState(0);
  const activeGemIndexRef = useRef(0);
  const switchActiveGemRef = useRef(null);

  const initialCfg = initialGemstonesConfig[0];

  const [axisValues, setAxisValues] = useState({
    x: Number(initialCfg.axis.x.toFixed(3)),
    y: Number(initialCfg.axis.y.toFixed(3)),
    z: Number(initialCfg.axis.z.toFixed(3)),
  });
  const [angleOffsetDeg, setAngleOffsetDeg] = useState(0); // Góc xoay dáng viên đá quanh trục: 0 - 360 độ
  const [tiltDeg, setTiltDeg] = useState(0); // Góc nghiêng lệch của hướng xoay so với trục: -90 đến +90 độ (0 = quay chuẩn theo trục)
  const [tiltDirDeg, setTiltDirDeg] = useState(0); // Hướng ngả nghiêng của mặt phẳng xoay: 0 đến 360 độ (0 = Ngả về trước +Z)
  const [rotDirection, setRotDirection] = useState(1); // 1 = Thuận chiều, -1 = Ngược chiều
  const [rotSpeed, setRotSpeed] = useState(0.007);
  const [isPaused, setIsPaused] = useState(false); // Dừng xoay để giữ khối đứng yên khi căn chỉnh trục
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [centerPos, setCenterPos] = useState({ x: 230, y: 190 });
  const [panelPos, setPanelPos] = useState({ left: 370, top: 75 });
  const [showControls, setShowControls] = useState(false); // Ẩn các công cụ xoay trục theo yêu cầu người dùng

  const handleSelectGem = (idx) => {
    setActiveGemIndex(idx);
    activeGemIndexRef.current = idx;
    switchActiveGemRef.current?.(idx);
  };

  // Chế độ tương tác: "points" = Chấm 2 điểm tạo trục (mặc định), "drag" = Kéo xoay tự do
  const [interactMode, setInteractMode] = useState("points");
  const [pickStep, setPickStep] = useState(0); // 0: chưa chấm, 1: đã có Điểm 1, 2: đã có Điểm 1 & 2
  const [pickedP1, setPickedP1] = useState(null);
  const [pickedP2, setPickedP2] = useState(null);

  const showControlsRef = useRef(false);
  const referenceGuidesRef = useRef(null);
  const liveAxisRef = useRef(initialCfg.axis.clone());
  const angleOffsetRef = useRef(0);
  const tiltRef = useRef(0);
  const tiltDirRef = useRef(0);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pickedP1Ref = useRef(null);
  const pickedP2Ref = useRef(null);
  const pickStepRef = useRef(0);
  const raycastRef = useRef(null);
  const updatePointsVisualRef = useRef(null);
  const resetMesh1Ref = useRef(null);
  const updateAxisRef = useRef(null);
  const updateSpeedRef = useRef(null);
  const updateOffsetRef = useRef(null);
  const updateTiltRef = useRef(null);

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    isPausedRef.current = next;
    if (next) {
      resetMesh1Ref.current?.();
    }
  };

  const handleResetOrientation = () => {
    resetMesh1Ref.current?.();
  };

  const [pickTarget, setPickTarget] = useState("sphere"); // "sphere" (Hình cầu 3D) | "cube" (Thân đá)
  const pickTargetRef = useRef("sphere");

  const handlePickTargetChange = (target) => {
    setPickTarget(target);
    pickTargetRef.current = target;
  };

  const [pickSide, setPickSide] = useState("front"); // "front" (+Z mặt trước) | "back" (-Z mặt sau)
  const pickSideRef = useRef("front");
  const updateHoverFlagRef = useRef(null);

  const handlePickSideChange = (side) => {
    setPickSide(side);
    pickSideRef.current = side;
  };

  const handlePointerHover = (clientX, clientY) => {
    if (interactMode !== "points") return;
    if (!raycastRef.current) return;
    const hit = raycastRef.current(clientX, clientY, pickSideRef.current);
    if (!hit) return;
    updateHoverFlagRef.current?.(hit, pickStepRef.current);
  };

  const handlePointerLeave = () => {
    updateHoverFlagRef.current?.(null, pickStepRef.current);
  };

  const handleInteractionClick = (clientX, clientY) => {
    if (interactMode !== "points") return;
    if (!raycastRef.current) return;
    const hit = raycastRef.current(clientX, clientY, pickSideRef.current);
    if (!hit) return;

    if (pickStepRef.current === 0 || pickStepRef.current === 2) {
      // Bắt đầu chu kỳ mới: Cắm cờ Điểm 1
      const p1 = { x: hit.x, y: hit.y, z: hit.z };
      setPickedP1(p1);
      pickedP1Ref.current = p1;
      setPickedP2(null);
      pickedP2Ref.current = null;
      setPickStep(1);
      pickStepRef.current = 1;
      updatePointsVisualRef.current?.(p1, null);
      updateHoverFlagRef.current?.(hit, 1);
    } else if (pickStepRef.current === 1) {
      // Cắm cờ Điểm 2
      const p1 = pickedP1Ref.current;
      const p2 = { x: hit.x, y: hit.y, z: hit.z };
      setPickedP2(p2);
      pickedP2Ref.current = p2;
      setPickStep(2);
      pickStepRef.current = 2;
      updatePointsVisualRef.current?.(p1, p2);
      updateHoverFlagRef.current?.(null, 2);

      // Tạo trục từ Điểm 1 ➔ Điểm 2
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.05) {
        const newVec = new Vector3(dx, dy, dz).normalize();
        updateVector(newVec);
      }
    }
  };

  const handlePointZChange = (pointNum, newZ) => {
    const zVal = parseFloat(newZ);
    if (pointNum === 1 && pickedP1Ref.current) {
      const p1 = { ...pickedP1Ref.current, z: zVal };
      setPickedP1(p1);
      pickedP1Ref.current = p1;
      updatePointsVisualRef.current?.(p1, pickedP2Ref.current);
      if (pickedP2Ref.current) {
        const p2 = pickedP2Ref.current;
        const newVec = new Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
        updateVector(newVec);
      }
    } else if (pointNum === 2 && pickedP2Ref.current) {
      const p2 = { ...pickedP2Ref.current, z: zVal };
      setPickedP2(p2);
      pickedP2Ref.current = p2;
      updatePointsVisualRef.current?.(pickedP1Ref.current, p2);
      if (pickedP1Ref.current) {
        const p1 = pickedP1Ref.current;
        const newVec = new Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
        updateVector(newVec);
      }
    }
  };

  const handleSwapPoints = () => {
    if (!pickedP1Ref.current || !pickedP2Ref.current) {
      toggleDirection();
      return;
    }
    const p1 = pickedP1Ref.current;
    const p2 = pickedP2Ref.current;
    setPickedP1(p2);
    setPickedP2(p1);
    pickedP1Ref.current = p2;
    pickedP2Ref.current = p1;
    updatePointsVisualRef.current?.(p2, p1);
    const newVec = new Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z).normalize();
    updateVector(newVec);
  };

  const handleResetPoints = () => {
    setPickStep(0);
    pickStepRef.current = 0;
    setPickedP1(null);
    setPickedP2(null);
    pickedP1Ref.current = null;
    pickedP2Ref.current = null;
    updatePointsVisualRef.current?.(null, null);
  };

  const updateVector = useCallback((vec) => {
    const normalized = vec.clone().normalize();
    liveAxisRef.current.copy(normalized);
    updateAxisRef.current?.(normalized);
    setAxisValues({
      x: Number(normalized.x.toFixed(3)),
      y: Number(normalized.y.toFixed(3)),
      z: Number(normalized.z.toFixed(3)),
    });
  }, []);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    isDraggingRef.current = true;
    resetMesh1Ref.current?.();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDrag(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    handleDrag(e.clientX, e.clientY);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDrag = (clientX, clientY) => {
    const dx = clientX - centerPos.x;
    const dy = -(clientY - centerPos.y);
    const len = Math.hypot(dx, dy);
    if (len < 5) return;
    const currentZ = liveAxisRef.current.z;
    const xyScale = Math.sqrt(Math.max(0.01, 1 - currentZ * currentZ));
    const nx = (dx / len) * xyScale;
    const ny = (dy / len) * xyScale;
    updateVector(new Vector3(nx, ny, currentZ));
  };

  const handleXChange = (val) => {
    const newX = parseFloat(val);
    updateVector(new Vector3(newX, axisValues.y, axisValues.z));
  };

  const handleYChange = (val) => {
    const newY = parseFloat(val);
    updateVector(new Vector3(axisValues.x, newY, axisValues.z));
  };

  const handleZChange = (val) => {
    const newZ = parseFloat(val);
    updateVector(new Vector3(axisValues.x, axisValues.y, newZ));
  };

  const stepAxis = (axis, delta) => {
    const current = { ...axisValues };
    current[axis] = Math.max(-1, Math.min(1, Number((current[axis] + delta).toFixed(2))));
    updateVector(new Vector3(current.x, current.y, current.z));
  };

  const handleAngleSlider = (degVal) => {
    const deg = parseFloat(degVal);
    const rad = (deg * Math.PI) / 180;
    const currentZ = axisValues.z;
    const xyScale = Math.sqrt(Math.max(0.001, 1 - currentZ * currentZ));
    const nx = Math.cos(rad) * xyScale;
    const ny = Math.sin(rad) * xyScale;
    updateVector(new Vector3(nx, ny, currentZ));
  };

  const handleAngleOffsetChange = (val) => {
    const deg = parseFloat(val);
    setAngleOffsetDeg(deg);
    angleOffsetRef.current = deg;
    updateOffsetRef.current?.(deg);
  };

  const handleTiltChange = (val) => {
    const deg = parseFloat(val);
    setTiltDeg(deg);
    tiltRef.current = deg;
    updateTiltRef.current?.(deg, tiltDirRef.current);
  };

  const handleTiltDirChange = (val) => {
    const deg = parseFloat(val);
    setTiltDirDeg(deg);
    tiltDirRef.current = deg;
    updateTiltRef.current?.(tiltRef.current, deg);
  };

  const stepAngleOffset = (delta) => {
    let next = (angleOffsetDeg + delta) % 360;
    if (next < 0) next += 360;
    handleAngleOffsetChange(next);
  };

  const stepTilt = (delta) => {
    let next = Math.max(-90, Math.min(90, tiltDeg + delta));
    handleTiltChange(next);
  };

  const stepTiltDir = (delta) => {
    let next = (tiltDirDeg + delta) % 360;
    if (next < 0) next += 360;
    handleTiltDirChange(next);
  };

  const clockInfo = getClockInfo(axisValues.x, axisValues.y);

  // Tính góc độ hiện tại (0 -> 360) cho slider góc
  let currentAngleDeg = Math.round((Math.atan2(axisValues.y, axisValues.x) * 180) / Math.PI);
  if (currentAngleDeg < 0) currentAngleDeg += 360;

  const toggleDirection = () => {
    const nextDir = rotDirection === 1 ? -1 : 1;
    setRotDirection(nextDir);
    const finalSpeed = rotSpeed * nextDir;
    updateSpeedRef.current?.(finalSpeed);
  };

  const handleSpeedChange = (val) => {
    const mag = parseFloat(val);
    setRotSpeed(mag);
    const finalSpeed = mag * rotDirection;
    updateSpeedRef.current?.(finalSpeed);
  };

  const handleCopy = () => {
    const finalSpeed = Number((rotSpeed * rotDirection).toFixed(4));
    const dirText = rotDirection === 1 ? "Thuận (+)" : "Ngược (-)";
    let pointsStr = "";
    if (pickedP1 && pickedP2) {
      pointsStr = ` P1: [${pickedP1.x}, ${pickedP1.y}, ${pickedP1.z}], P2: [${pickedP2.x}, ${pickedP2.y}, ${pickedP2.z}],`;
    }
    const currentGem = initialGemstonesConfig[activeGemIndex];
    const snippet = `// Khối ${activeGemIndex + 1}: ${currentGem.name} (${currentGem.vietName})\naxis: new Vector3(${axisValues.x}, ${axisValues.y}, ${axisValues.z}).normalize(),${pointsStr} speed: ${finalSpeed}, rotTilt: ${tiltDeg}°, rotTiltDir: ${tiltDirDeg}°, bodyOffset: ${angleOffsetDeg}° // (${dirText})`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const applyPreset = (x, y, z) => {
    updateVector(new Vector3(x, y, z));
  };

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

    // Diamond gemstone front material
    const frontMat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: DoubleSide,
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
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // Tạo 12 khối đá quý giác cắt kim cương chuẩn mực độc lập
    const gemGeos = [];
    const gemHolders = [];
    const gemMeshes = [];

    for (let i = 0; i < initialGemstonesConfig.length; i++) {
      const cfg = initialGemstonesConfig[i];
      const cut = GEMSTONE_CUTS[i % GEMSTONE_CUTS.length];
      const geo = cut.create(cfg.scale || 1.0);
      ["uv", "color", "tangent"].forEach((a) => geo.deleteAttribute(a));
      gemGeos.push(geo);

      const holder = new Group();
      holder.position.set(cfg.x, cfg.y, 0);
      // Dựng trục đứng dậy: Table ở trên, Culet ở dưới, nghiêng nhẹ ~12 độ để thấy rõ toàn bộ mặt bên và chiều sâu 3D
      holder.rotation.x = -Math.PI / 2 + 0.22;
      rootGroup.add(holder);
      gemHolders.push(holder);

      const mesh = new Mesh(geo, frontMat);
      mesh.userData = {
        index: i,
        id: cfg.id,
        name: cfg.name,
        vietName: cfg.vietName,
        axis: cfg.axis.clone(),
        speed: cfg.speed,
        initialRot: cfg.initialRot || 0,
      };
      // Cho viên đá hướng thẳng về phía trước để trục đối xứng (trục Z) vuông góc màn hình
      mesh.rotation.set(0, 0, cfg.initialRot || 0);

      // Thêm đường gờ facet lines sắc gọn, tinh xảo chuẩn kim cương
      const edgeGeo = new EdgesGeometry(geo, 8);
      const edgeMat = new LineBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.32,
      });
      const edgeLines = new LineSegments(edgeGeo, edgeMat);
      mesh.add(edgeLines);

      holder.add(mesh);
      gemMeshes.push(mesh);
    }

    const resetActiveMesh = () => {
      const activeMesh = gemMeshes[activeGemIndexRef.current];
      if (activeMesh) {
        activeMesh.quaternion.identity();
        activeMesh.rotation.set(
          0,
          0,
          (activeMesh.userData.initialRot || 0) +
            (angleOffsetRef.current * Math.PI) / 180
        );
      }
    };
    resetMesh1Ref.current = resetActiveMesh;

    // Gắn khung toạ độ tham chiếu (Quả Cầu 3D + Trục đỏ) bao quanh khối đang được chọn
    const activeCfg = initialGemstonesConfig[activeGemIndexRef.current];
    const referenceGuides = createReferenceGuides(
      activeCfg,
      activeCfg.axis,
      activeCfg.speed
    );
    referenceGuides.group.visible = showControlsRef.current;
    referenceGuidesRef.current = referenceGuides;
    rootGroup.add(referenceGuides.group);

    // Tính toán vector trục quay thực tế đang kích hoạt
    const activeRotationAxis = new Vector3(0, 1, 0);

    const updateActiveRotationAxis = () => {
      const v = new Vector3(0, 1, 0);
      const radX = (tiltRef.current * Math.PI) / 180;
      const radY = (tiltDirRef.current * Math.PI) / 180;
      const qTilt = new Quaternion().setFromEuler(new Euler(radX, radY, 0, "YXZ"));
      v.applyQuaternion(qTilt);

      const qAxis = new Quaternion().setFromUnitVectors(
        referenceGuides.defaultDir,
        liveAxisRef.current.clone().normalize()
      );
      v.applyQuaternion(qAxis);
      activeRotationAxis.copy(v.normalize());
    };
    updateActiveRotationAxis();

    let currentSpeed = activeCfg.speed;

    updateAxisRef.current = (newVec) => {
      // Chỉ xoay cây trục và vòng xoay trong thước đo tham chiếu!
      referenceGuides.axisSubGroup.quaternion.setFromUnitVectors(
        referenceGuides.defaultDir,
        newVec
      );
      const activeMesh = gemMeshes[activeGemIndexRef.current];
      if (activeMesh) {
        activeMesh.userData.axis.copy(newVec);
      }
      updateActiveRotationAxis();
    };

    updateOffsetRef.current = (deg) => {
      // Chỉnh góc xoay dáng viên đá
      const activeMesh = gemMeshes[activeGemIndexRef.current];
      if (activeMesh) {
        activeMesh.quaternion.identity();
        activeMesh.rotation.set(
          0,
          0,
          (activeMesh.userData.initialRot || 0) + (deg * Math.PI) / 180
        );
      }
    };

    const applyTiltToGroups = (tilt, tiltDir) => {
      const radX = (tilt * Math.PI) / 180;
      const radY = (tiltDir * Math.PI) / 180;

      // Chỉ nghiêng vòng xoay vàng trong thước đo tham chiếu!
      if (referenceGuides.rotIndicatorGroup) {
        referenceGuides.rotIndicatorGroup.rotation.set(0, 0, 0);
        referenceGuides.rotIndicatorGroup.rotation.y = radY;
        referenceGuides.rotIndicatorGroup.rotation.x = radX;
      }
      updateActiveRotationAxis();
    };

    updateTiltRef.current = (tilt, tiltDir) => {
      applyTiltToGroups(tilt, tiltDir);
    };

    updateSpeedRef.current = (newSpeed) => {
      currentSpeed = newSpeed;
      const activeMesh = gemMeshes[activeGemIndexRef.current];
      if (activeMesh) {
        activeMesh.userData.speed = newSpeed;
      }
      if (referenceGuides.rotTipMesh) {
        referenceGuides.rotTipMesh.rotation.z = newSpeed >= 0 ? Math.PI : 0;
      }
    };

    const switchActiveGem = (idx) => {
      activeGemIndexRef.current = idx;
      const targetCfg = initialGemstonesConfig[idx];
      const targetMesh = gemMeshes[idx];
      if (!targetMesh) return;

      referenceGuides.group.position.set(targetCfg.x, targetCfg.y, 0);
      liveAxisRef.current.copy(targetMesh.userData.axis);
      referenceGuides.axisSubGroup.quaternion.setFromUnitVectors(
        referenceGuides.defaultDir,
        targetMesh.userData.axis
      );
      currentSpeed = targetMesh.userData.speed;
      if (referenceGuides.rotTipMesh) {
        referenceGuides.rotTipMesh.rotation.z = currentSpeed >= 0 ? Math.PI : 0;
      }
      updateActiveRotationAxis();

      // Tính lại toạ độ 2D của khối trên màn hình
      const p = new Vector3(targetCfg.x, targetCfg.y, 0).project(camera);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = (p.x * 0.5 + 0.5) * w;
      const cy = (-p.y * 0.5 + 0.5) * h;
      setCenterPos({ x: cx, y: cy });
      setPanelPos({
        left: Math.min(w - 330, Math.max(10, cx > w / 2 ? cx - 350 : cx + 150)),
        top: Math.max(50, Math.min(h - 480, cy > h / 2 ? cy - 350 : cy - 80)),
      });

      // Cập nhật React state
      setAxisValues({
        x: Number(targetMesh.userData.axis.x.toFixed(3)),
        y: Number(targetMesh.userData.axis.y.toFixed(3)),
        z: Number(targetMesh.userData.axis.z.toFixed(3)),
      });
      setRotSpeed(Math.abs(targetMesh.userData.speed));
      setRotDirection(targetMesh.userData.speed >= 0 ? 1 : -1);
      setTiltDeg(0);
      setTiltDirDeg(0);
      tiltRef.current = 0;
      tiltDirRef.current = 0;
      applyTiltToGroups(0, 0);
      setAngleOffsetDeg(0);
      angleOffsetRef.current = 0;
      setPickStep(0);
      pickStepRef.current = 0;
      setPickedP1(null);
      setPickedP2(null);
      pickedP1Ref.current = null;
      pickedP2Ref.current = null;
      updatePointsVisual(null, null);
    };
    switchActiveGemRef.current = switchActiveGem;

    const updatePointsVisual = (p1, p2) => {
      const ph = referenceGuides.pointsHelper;
      if (!ph) return;

      if (p1) {
        ph.flag1.group.position.set(p1.x, p1.y, p1.z);
        ph.flag1.flagSprite.updateText(
          "🚩 ĐIỂM 1 (Đầu trục)",
          `X:${p1.x}  Y:${p1.y}  Z:${p1.z}`,
          "#10b981",
          "rgba(6,78,59,0.95)"
        );
        ph.flag1.group.visible = true;
      } else {
        ph.flag1.group.visible = false;
      }

      if (p2) {
        ph.flag2.group.position.set(p2.x, p2.y, p2.z);
        ph.flag2.flagSprite.updateText(
          "🚩 ĐIỂM 2 (Đuôi trục)",
          `X:${p2.x}  Y:${p2.y}  Z:${p2.z}`,
          "#f43f5e",
          "rgba(136,19,55,0.95)"
        );
        ph.flag2.group.visible = true;
      } else {
        ph.flag2.group.visible = false;
      }

      if (p1 && p2) {
        ph.lineGeo.setFromPoints([
          new Vector3(p1.x, p1.y, p1.z),
          new Vector3(p2.x, p2.y, p2.z),
        ]);
        ph.lineMesh.visible = true;
      } else {
        ph.lineMesh.visible = false;
      }
    };
    updatePointsVisualRef.current = updatePointsVisual;

    const updateHoverFlag = (hit, step) => {
      const ph = referenceGuides.pointsHelper;
      if (!ph) return;

      if (!hit) {
        ph.hoverFlag.group.visible = false;
        return;
      }

      ph.hoverFlag.group.position.set(hit.x, hit.y, hit.z);
      const coordsText = `X:${hit.x}  Y:${hit.y}  Z:${hit.z}`;
      const targetLabel = pickTargetRef.current === "sphere" ? "Quả Cầu" : "Khối Đá";
      const surfaceTag = hit.isHitSurface
        ? pickSideRef.current === "back"
          ? ` (${targetLabel} Sau)`
          : ` (${targetLabel} Trước)`
        : " (Mặt phẳng Z=0)";

      if (step === 1) {
        ph.hoverFlag.setColor(
          0xf43f5e,
          `🚩 CẮM ĐIỂM 2${surfaceTag}`,
          coordsText,
          "rgba(136,19,55,0.95)"
        );
      } else {
        ph.hoverFlag.setColor(
          0x10b981,
          `🚩 CẮM ĐIỂM 1${surfaceTag}`,
          coordsText,
          "rgba(6,78,59,0.95)"
        );
      }
      ph.hoverFlag.group.visible = true;
    };
    updateHoverFlagRef.current = updateHoverFlag;

    if (pickedP1Ref.current && pickedP2Ref.current) {
      updatePointsVisual(pickedP1Ref.current, pickedP2Ref.current);
    }

    const raycaster = new Raycaster();
    const mouse = new Vector2();
    const planeZ = new Plane(new Vector3(0, 0, 1), 0);
    const planeHit = new Vector3();

    raycastRef.current = (clientX, clientY, side = "front") => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mouse.x = (clientX / w) * 2 - 1;
      mouse.y = -(clientY / h) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const activeIdx = activeGemIndexRef.current;
      const activeHolder = gemHolders[activeIdx];
      const activeMesh = gemMeshes[activeIdx];

      // Đối tượng cắm cờ: Quả Cầu 3D hoặc Thân đá kim cương đang chọn
      const targetObj =
        pickTargetRef.current === "sphere" && referenceGuides.sphereMesh
          ? referenceGuides.sphereMesh
          : activeMesh;

      if (!targetObj || !activeHolder) return null;

      // Cho phép raycast cả mặt trước lẫn mặt sau của khối đối tượng
      const oldSide = targetObj.material.side;
      targetObj.material.side = DoubleSide;
      const hits = raycaster.intersectObject(targetObj);
      targetObj.material.side = oldSide;

      let worldPoint;
      let isHitSurface = false;
      if (hits.length > 0) {
        isHitSurface = true;
        if (side === "back" && hits.length > 1) {
          worldPoint = hits[hits.length - 1].point;
        } else {
          worldPoint = hits[0].point;
        }
      } else {
        raycaster.ray.intersectPlane(planeZ, planeHit);
        worldPoint = planeHit;
      }

      const local = worldPoint.clone().sub(activeHolder.position);
      return {
        x: Number(local.x.toFixed(3)),
        y: Number(local.y.toFixed(3)),
        z: Number(local.z.toFixed(3)),
        isHitSurface,
      };
    };

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frontMat.uniforms.uResolution.value.set(w * dpr, h * dpr);

      // Tính toạ độ 2D của Khối đang chọn trên màn hình
      const activeCfg = initialGemstonesConfig[activeGemIndexRef.current];
      const p = new Vector3(activeCfg.x, activeCfg.y, 0).project(camera);
      const cx = (p.x * 0.5 + 0.5) * w;
      const cy = (-p.y * 0.5 + 0.5) * h;
      setCenterPos({ x: cx, y: cy });
      setPanelPos({
        left: Math.min(w - 330, Math.max(10, cx > w / 2 ? cx - 350 : cx + 150)),
        top: Math.max(50, Math.min(h - 480, cy > h / 2 ? cy - 350 : cy - 80)),
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    frontMat.uniforms.uTexture.value = bgTexture;

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);

      // Xoay 12 khối đá quý quanh trục đối xứng của chính nó, cùng chiều kim đồng hồ
      if (!isPausedRef.current) {
        for (let i = 0; i < gemMeshes.length; i++) {
          const mesh = gemMeshes[i];
          // Trục đối xứng của viên đá là trục Z local (nối từ Culet đáy lên Table mặt bàn).
          // rotateZ với tốc độ âm (-speed) xoay viên đá cùng chiều kim đồng hồ (Clockwise).
          mesh.rotateZ(-mesh.userData.speed);
        }
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
      ro.disconnect();
      gemGeos.forEach((g) => g.dispose());
      referenceGuides.disposables.forEach((d) => d.dispose());
      frontMat.dispose();
      bgTexture.dispose();
      pageTexture?.dispose();
      renderer.dispose();
    };
  }, [is2026]);

  if (!is2026) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        id="scene"
        aria-label="Water drops on glass"
        className="block w-full h-full pointer-events-none"
      />

      {/* Vùng tròn tương tác Khối 1: Hỗ trợ Chấm 2 điểm hoặc Kéo tự do (Ẩn khi tắt công cụ) */}
      {showControls && (
        <div
          className="absolute rounded-full cursor-crosshair pointer-events-auto flex items-center justify-center group"
          style={{
            left: centerPos.x - 175,
            top: centerPos.y - 175,
            width: 350,
            height: 350,
          }}
          onClick={(e) => {
            if (interactMode === "points") {
              handleInteractionClick(e.clientX, e.clientY);
            }
          }}
          onPointerDown={(e) => {
            if (interactMode === "drag") {
              handlePointerDown(e);
            }
          }}
          onPointerMove={(e) => {
            if (interactMode === "points") {
              handlePointerHover(e.clientX, e.clientY);
            } else if (interactMode === "drag") {
              handlePointerMove(e);
            }
          }}
          onPointerUp={(e) => {
            if (interactMode === "drag") {
              handlePointerUp(e);
            }
          }}
          onPointerLeave={handlePointerLeave}
          title={
            interactMode === "points"
              ? pickStep === 0
                ? "Rê chuột để lướt cờ 3D trên quả cầu & Click để cắm Điểm 1"
                : pickStep === 1
                ? "Rê chuột để lướt cờ 3D trên quả cầu & Click để cắm Điểm 2"
                : "Rê chuột để lướt cờ 3D & Click để cắm lại Điểm 1"
              : "Ấn giữ chuột và kéo để xoay hướng trục"
          }
        >
          {/* Banner hướng dẫn tương tác nổi bật */}
          <div
            className={`absolute -top-7 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium border shadow-xl flex items-center gap-1.5 transition-all pointer-events-none select-none bg-slate-900/95 ${
              interactMode === "points"
                ? pickStep === 1
                  ? "border-rose-500/50 text-rose-300 animate-pulse"
                  : "border-sky-500/50 text-sky-300"
                : "border-cyan-500/50 text-cyan-300"
            }`}
          >
            {interactMode === "points" ? (
              pickStep === 0 ? (
                <span>🌐 Khối #{activeGemIndex + 1} ({initialGemstonesConfig[activeGemIndex].name}): Rê chuột & Click cắm Điểm 1</span>
              ) : pickStep === 1 ? (
                <span>🚩 Cắm Điểm 2 trên {initialGemstonesConfig[activeGemIndex].name}</span>
              ) : (
                <span>✓ Đã tạo trục cho {initialGemstonesConfig[activeGemIndex].name} (Click để cắm lại)</span>
              )
            ) : isDragging ? (
              <span>🎯 Đang xoay trục theo chuột...</span>
            ) : (
              <span>🖐️ Ấn giữ & Kéo để đổi góc trục</span>
            )}
          </div>
        </div>
      )}

      {/* Bảng thông số góc toạ độ & Nút Copy bên cạnh Khối được chọn (Ẩn khi tắt công cụ) */}
      {showControls && (
        <div
          className="absolute z-30 pointer-events-auto select-none bg-slate-950/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-3.5 w-[330px] max-h-[88vh] overflow-y-auto text-white font-sans text-xs space-y-2.5"
          style={{ right: 110, top: 75 }}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Toạ độ: {initialGemstonesConfig[activeGemIndex].name}</span>
          </div>
          <span className="text-[10px] text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
            #{activeGemIndex + 1}/12
          </span>
        </div>

        {/* Bộ chọn 12 Khối Đá Quý */}
        <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-xl border border-white/10">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold text-cyan-300">💎 Chọn Khối Cần Gắn Trục:</span>
            <span className="font-mono text-slate-300 font-bold">
              {initialGemstonesConfig[activeGemIndex].vietName}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[9px]">
            {initialGemstonesConfig.map((gem, idx) => (
              <button
                key={gem.id}
                onClick={() => handleSelectGem(idx)}
                className={`py-1 px-1 rounded-lg border text-center truncate cursor-pointer transition-all ${
                  activeGemIndex === idx
                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-sm"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
                title={`${idx + 1}. ${gem.name} (${gem.vietName})`}
              >
                {idx + 1}. {gem.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab chọn chế độ căn chỉnh trục */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-[11px]">
          <button
            onClick={() => setInteractMode("points")}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
              interactMode === "points"
                ? "bg-emerald-500 text-white font-semibold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📍 Chấm 2 Điểm (Cờ 3D)</span>
          </button>
          <button
            onClick={() => setInteractMode("drag")}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
              interactMode === "drag"
                ? "bg-blue-600 text-white font-semibold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🖐️ Kéo Tự Do</span>
          </button>
        </div>

        {/* Khung điều khiển Chấm 2 Điểm Tạo Trục */}
        {interactMode === "points" && (
          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-sky-400/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-sky-300 font-bold flex items-center gap-1">
                <span>📍 Cắm cờ trên Quả Cầu 3D:</span>
              </span>
              <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium ${
                pickStep === 0
                  ? "bg-amber-500/20 text-amber-300"
                  : pickStep === 1
                  ? "bg-rose-500/20 text-rose-300 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {pickStep === 0 ? "Chưa cắm cờ" : pickStep === 1 ? "Đang chọn Điểm 2..." : "✓ Đã nối trục"}
              </span>
            </div>

            {/* Chọn mục tiêu cắm cờ: Quả cầu 3D vs Khối đá */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-1.5 border border-white/10 text-[10px]">
              <span className="text-slate-300 font-medium">Đối tượng:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePickTargetChange("sphere")}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-all ${
                    pickTarget === "sphere"
                      ? "bg-sky-500/40 border border-sky-400 text-sky-200 font-bold"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  }`}
                  title="Cờ sẽ lướt trên bề mặt Quả Cầu 3D bao quanh khối kim cương"
                >
                  🌐 Quả Cầu 3D
                </button>
                <button
                  onClick={() => handlePickTargetChange("cube")}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-all ${
                    pickTarget === "cube"
                      ? "bg-emerald-500/40 border border-emerald-400 text-emerald-200 font-bold"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  }`}
                  title="Cờ sẽ lướt trên các mặt cắt (facets) của khối kim cương"
                >
                  💎 Khối Đá
                </button>
              </div>
            </div>

            {/* Chọn bề mặt cắm cờ: Mặt trước (+Z) vs Mặt sau (-Z) */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-1.5 border border-white/10 text-[10px]">
              <span className="text-slate-300 font-medium">Bán cầu:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePickSideChange("front")}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-all ${
                    pickSide === "front"
                      ? "bg-cyan-500/40 border border-cyan-400 text-cyan-200 font-bold"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  }`}
                  title="Cờ sẽ bám vào nửa cầu mặt trước (+Z)"
                >
                  Mặt Trước (+Z)
                </button>
                <button
                  onClick={() => handlePickSideChange("back")}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-all ${
                    pickSide === "back"
                      ? "bg-purple-500/40 border border-purple-400 text-purple-200 font-bold"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  }`}
                  title="Cờ sẽ bám vào nửa cầu mặt sau (-Z)"
                >
                  Mặt Sau (-Z)
                </button>
              </div>
            </div>

            {/* Điểm 1 */}
            <div className="bg-black/40 rounded-lg p-2 border border-emerald-500/25 space-y-1">
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Điểm 1 (Đầu trục):</span>
                </span>
                <span className="font-mono text-slate-200 text-[10px]">
                  {pickedP1 ? `(${pickedP1.x}, ${pickedP1.y}, ${pickedP1.z})` : "Chưa chọn"}
                </span>
              </div>
              {pickedP1 && (
                <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5">
                  <span className="text-slate-400">Độ sâu Z1:</span>
                  <div className="flex gap-1 font-mono">
                    {[
                      { label: "Trước(+0.35)", val: 0.35 },
                      { label: "Tâm(0.0)", val: 0.0 },
                      { label: "Sau(-0.35)", val: -0.35 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        onClick={() => handlePointZChange(1, btn.val)}
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          Math.abs(pickedP1.z - btn.val) < 0.05
                            ? "bg-emerald-500/40 border-emerald-400 text-emerald-200 font-bold"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Điểm 2 */}
            <div className="bg-black/40 rounded-lg p-2 border border-rose-500/25 space-y-1">
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-rose-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  <span>Điểm 2 (Đuôi trục):</span>
                </span>
                <span className="font-mono text-slate-200 text-[10px]">
                  {pickedP2 ? `(${pickedP2.x}, ${pickedP2.y}, ${pickedP2.z})` : "Chưa chọn"}
                </span>
              </div>
              {pickedP2 && (
                <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5">
                  <span className="text-slate-400">Độ sâu Z2:</span>
                  <div className="flex gap-1 font-mono">
                    {[
                      { label: "Trước(+0.35)", val: 0.35 },
                      { label: "Tâm(0.0)", val: 0.0 },
                      { label: "Sau(-0.35)", val: -0.35 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        onClick={() => handlePointZChange(2, btn.val)}
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          Math.abs(pickedP2.z - btn.val) < 0.05
                            ? "bg-rose-500/40 border-rose-400 text-rose-200 font-bold"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Các nút thao tác nhanh cho 2 điểm */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={handleResetPoints}
                className="py-1 px-2 rounded-lg text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span>📍 Chấm lại 2 điểm</span>
              </button>
              <button
                onClick={handleSwapPoints}
                className="py-1 px-2 rounded-lg text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span>⇄ Đảo chiều trục</span>
              </button>
            </div>
          </div>
        )}

        {/* Readout Trục 3D & Góc */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-white/10 space-y-1">
          <div className="text-[11px] text-slate-400 flex justify-between items-center">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>TRỤC 3D:</span>
            </span>
            <span className="text-cyan-300 font-bold font-mono text-xs">
              [{axisValues.x}, {axisValues.y}, {axisValues.z}]
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-0.5 border-t border-white/5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>XOAY LỆCH TRỤC:</span>
            </span>
            <span className="text-amber-300 font-bold">
              {tiltDeg === 0 ? "0° (Thẳng trục)" : `${tiltDeg >= 0 ? `+${tiltDeg}°` : `${tiltDeg}°`} (ngả ${tiltDirDeg}°)`}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between items-center">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>DÁNG ĐÁ:</span>
            </span>
            <span className="text-emerald-300 font-medium">
              offset {angleOffsetDeg}°
            </span>
          </div>
        </div>

        {/* Mã code vector */}
        <div className="bg-black/60 rounded-lg p-2 font-mono text-[9.5px] text-emerald-400 border border-emerald-500/30 break-all select-all leading-relaxed">
          axis: new Vector3({axisValues.x}, {axisValues.y}, {axisValues.z}).normalize(), speed: {Number((rotSpeed * rotDirection).toFixed(4))}, rotTilt: {tiltDeg}°, rotTiltDir: {tiltDirDeg}°, bodyOffset: {angleOffsetDeg}°
        </div>

        {/* Nút COPY */}
        <button
          onClick={handleCopy}
          className={`w-full py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
            copied
              ? "bg-emerald-500 text-white font-semibold"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {copied ? "✓ Đã copy mã! Dán vào chat nhé" : "📋 Sao chép toạ độ & góc lệch"}
        </button>

        {/* Nút Dừng / Tiếp tục xoay & Đặt lại dáng khối để dễ quan sát trục */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={togglePause}
            className={`py-1.5 px-2 rounded-xl text-[10.5px] font-medium border flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
              isPaused
                ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold"
                : "bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30"
            }`}
            title="Dừng khối đứng yên hoàn toàn để bạn dễ quan sát trục xuyên qua khối"
          >
            <span>{isPaused ? "▶ Tiếp tục xoay" : "⏸ Giữ khối đứng yên"}</span>
          </button>

          <button
            onClick={handleResetOrientation}
            className="py-1.5 px-2 rounded-xl text-[10.5px] font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Đặt lại thế đứng tự nhiên ban đầu của khối kim cương"
          >
            <span>↺ Dáng ban đầu</span>
          </button>
        </div>

        {/* 🟡 1. GÓC XOAY LỆCH SO VỚI TRỤC (Vòng màu vàng) */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-amber-400/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
              <span>🟡 Góc Xoay Lệch so với Trục (Vòng Vàng):</span>
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 leading-tight">
            Nghiêng mặt phẳng và hướng quay (vòng vàng) lệch bao nhiêu độ so với cây trục đỏ:
          </p>

          {/* Độ nghiêng góc xoay (-90° đến +90°) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-200 font-medium">Độ lệch góc xoay:</span>
              <div className="flex items-center gap-1 font-mono text-amber-300 font-bold">
                <span>{tiltDeg >= 0 ? `+${tiltDeg}°` : `${tiltDeg}°`}</span>
                <button
                  onClick={() => stepTilt(-5)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
                >
                  -5°
                </button>
                <button
                  onClick={() => stepTilt(5)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
                >
                  +5°
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              step="1"
              value={tiltDeg}
              onChange={(e) => handleTiltChange(e.target.value)}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            {/* Quick buttons for tilt */}
            <div className="flex justify-between gap-1 text-[9px]">
              {[-60, -30, 0, 30, 60].map((deg) => (
                <button
                  key={deg}
                  onClick={() => handleTiltChange(deg)}
                  className={`flex-1 py-0.5 rounded border cursor-pointer ${
                    tiltDeg === deg
                      ? "bg-amber-500/40 border-amber-400 text-amber-200 font-bold"
                      : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                  }`}
                >
                  {deg === 0 ? "0°(Chuẩn)" : `${deg > 0 ? `+${deg}°` : `${deg}°`}`}
                </button>
              ))}
            </div>
          </div>

          {/* Hướng ngả nghiêng của góc xoay (0° - 360°) */}
          <div className="space-y-1 pt-1.5 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-300">Hướng ngả nghiêng:</span>
              <div className="flex items-center gap-1 font-mono text-cyan-300 font-bold">
                <span>{tiltDirDeg}°</span>
                <button
                  onClick={() => stepTiltDir(-15)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
                >
                  -15°
                </button>
                <button
                  onClick={() => stepTiltDir(15)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
                >
                  +15°
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={tiltDirDeg}
              onChange={(e) => handleTiltDirChange(e.target.value)}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            {/* Presets hướng ngả */}
            <div className="flex justify-between gap-1 text-[9px]">
              {[
                { label: "Trước(+Z)", val: 0 },
                { label: "Phải", val: 90 },
                { label: "Sau(-Z)", val: 180 },
                { label: "Trái", val: 270 },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => handleTiltDirChange(p.val)}
                  className={`flex-1 py-0.5 rounded border cursor-pointer ${
                    tiltDirDeg === p.val
                      ? "bg-cyan-500/40 border-cyan-400 text-cyan-200 font-bold"
                      : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 💎 2. DÁNG KIM CƯƠNG (Xoay thân đá quanh trục) */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-white/10 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-300 font-medium">💎 Xoay dáng đá quanh trục:</span>
            <div className="flex items-center gap-1 font-mono text-emerald-300 font-bold">
              <span>{angleOffsetDeg}°</span>
              <button
                onClick={() => stepAngleOffset(-15)}
                className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
              >
                -15°
              </button>
              <button
                onClick={() => stepAngleOffset(15)}
                className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none text-[10px]"
              >
                +15°
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={angleOffsetDeg}
            onChange={(e) => handleAngleOffsetChange(e.target.value)}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between gap-1 text-[9px]">
            {[0, 30, 45, 90, 180].map((deg) => (
              <button
                key={deg}
                onClick={() => handleAngleOffsetChange(deg)}
                className={`flex-1 py-0.5 rounded border cursor-pointer ${
                  angleOffsetDeg === deg
                    ? "bg-emerald-500/40 border-emerald-400 text-emerald-200"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Điều chỉnh Chiều & Tốc độ xoay */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
              <span>Chiều xoay:</span>
              <span className={rotDirection === 1 ? "text-amber-300 font-bold" : "text-purple-300 font-bold"}>
                {rotDirection === 1 ? "Thuận chiều ⟳" : "Ngược chiều ⟲"}
              </span>
            </span>
          </div>

          <button
            onClick={toggleDirection}
            className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all border active:scale-95 ${
              rotDirection === 1
                ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-200"
                : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/40 text-purple-200"
            }`}
          >
            <span>🔄</span>
            <span>Bấm đổi sang: {rotDirection === 1 ? "Ngược chiều kim đồng hồ ⟲" : "Thuận chiều kim đồng hồ ⟳"}</span>
          </button>

          {/* Thanh trượt tốc độ */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>Tốc độ xoay:</span>
              <span className="font-mono text-cyan-300">
                {rotSpeed === 0 ? "⏸ Đang dừng" : `${(rotSpeed * 1000).toFixed(1)}x`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.025"
              step="0.001"
              value={rotSpeed}
              onChange={(e) => handleSpeedChange(e.target.value)}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between gap-1 pt-0.5">
              <button
                onClick={() => handleSpeedChange(0)}
                className={`flex-1 py-0.5 rounded text-[9px] border cursor-pointer ${
                  rotSpeed === 0
                    ? "bg-rose-500/40 border-rose-400 text-rose-200"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
              >
                ⏸ Dừng
              </button>
              <button
                onClick={() => handleSpeedChange(0.003)}
                className={`flex-1 py-0.5 rounded text-[9px] border cursor-pointer ${
                  rotSpeed === 0.003
                    ? "bg-amber-500/40 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
              >
                Chậm
              </button>
              <button
                onClick={() => handleSpeedChange(0.007)}
                className={`flex-1 py-0.5 rounded text-[9px] border cursor-pointer ${
                  rotSpeed === 0.007
                    ? "bg-amber-500/40 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
              >
                Chuẩn
              </button>
              <button
                onClick={() => handleSpeedChange(0.015)}
                className={`flex-1 py-0.5 rounded text-[9px] border cursor-pointer ${
                  rotSpeed === 0.015
                    ? "bg-amber-500/40 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/10 hover:bg-white/15 text-slate-400"
                }`}
              >
                Nhanh
              </button>
            </div>
          </div>
        </div>

        {/* Bộ điều khiển 3 Trục X, Y, Z chi tiết */}
        <div className="space-y-2.5 pt-1 border-t border-white/10">
          {/* Trục X */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Trục X (Ngang):
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-red-300">
                <span>{axisValues.x >= 0 ? `+${axisValues.x}` : axisValues.x}</span>
                <button
                  onClick={() => stepAxis("x", -0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  -
                </button>
                <button
                  onClick={() => stepAxis("x", 0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1.00"
              max="1.00"
              step="0.02"
              value={axisValues.x}
              onChange={(e) => handleXChange(e.target.value)}
              className="w-full accent-red-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>-X (Trái)</span>
              <span>0</span>
              <span>+X (Phải)</span>
            </div>
          </div>

          {/* Trục Y */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Trục Y (Dọc):
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-300">
                <span>{axisValues.y >= 0 ? `+${axisValues.y}` : axisValues.y}</span>
                <button
                  onClick={() => stepAxis("y", -0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  -
                </button>
                <button
                  onClick={() => stepAxis("y", 0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1.00"
              max="1.00"
              step="0.02"
              value={axisValues.y}
              onChange={(e) => handleYChange(e.target.value)}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>-Y (Dưới)</span>
              <span>0</span>
              <span>+Y (Trên)</span>
            </div>
          </div>

          {/* Trục Z */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-sky-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                Trục Z (Chiều sâu):
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-sky-300">
                <span>{axisValues.z >= 0 ? `+${axisValues.z}` : axisValues.z}</span>
                <button
                  onClick={() => stepAxis("z", -0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  -
                </button>
                <button
                  onClick={() => stepAxis("z", 0.05)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer leading-none"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1.00"
              max="1.00"
              step="0.02"
              value={axisValues.z}
              onChange={(e) => handleZChange(e.target.value)}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>-Z (Sâu vào)</span>
              <span>0</span>
              <span>+Z (Ra ngoài)</span>
            </div>
          </div>

          {/* Vòng quay nhanh 360° theo mặt đồng hồ */}
          <div className="space-y-1 pt-1 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px] text-slate-300">
              <span>Xoay góc đồng hồ (2D):</span>
              <span className="font-mono text-cyan-300 font-bold">{currentAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={currentAngleDeg}
              onChange={(e) => handleAngleSlider(e.target.value)}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Presets nhanh */}
        <div className="pt-1 border-t border-white/10 space-y-1">
          <div className="text-[10px] text-slate-400">Chọn nhanh các góc chuẩn:</div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={() => applyPreset(-0.538, -0.843, 0)}
              className="py-1 px-1.5 bg-white/5 hover:bg-white/15 rounded text-slate-200 border border-white/10 cursor-pointer text-center"
            >
              1h10 ➔ 7h
            </button>
            <button
              onClick={() => applyPreset(1, 0, 0)}
              className="py-1 px-1.5 bg-white/5 hover:bg-white/15 rounded text-slate-200 border border-white/10 cursor-pointer text-center"
            >
              9h ➔ 3h (Ngang)
            </button>
            <button
              onClick={() => applyPreset(0, -1, 0)}
              className="py-1 px-1.5 bg-white/5 hover:bg-white/15 rounded text-slate-200 border border-white/10 cursor-pointer text-center"
            >
              12h ➔ 6h (Dọc)
            </button>
            <button
              onClick={() => applyPreset(0, 0, 1)}
              className="py-1 px-1.5 bg-white/5 hover:bg-white/15 rounded text-slate-200 border border-white/10 cursor-pointer text-center"
            >
              Trục Z (Trước mặt)
            </button>
          </div>
        </div>

        {/* Hướng dẫn kéo */}
        <div className="text-[10px] text-slate-400 bg-white/5 rounded-lg p-1.5 text-center">
          💡 <i>Ấn giữ chuột vào vòng tròn Khối 1 để kéo xoay trục tự do</i>
        </div>
      </div>
      )}

      {/* Nút nhỏ bật/tắt công cụ chỉnh trục (mặc định ẩn) */}
      <button
        onClick={() => {
          const next = !showControls;
          setShowControls(next);
          showControlsRef.current = next;
          if (referenceGuidesRef.current) {
            referenceGuidesRef.current.group.visible = next;
          }
        }}
        className="fixed bottom-3 right-3 z-40 px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-900/90 text-[10px] text-slate-400 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xl pointer-events-auto"
        title="Bật/Tắt công cụ căn chỉnh trục"
      >
        <span>💎</span>
        <span>{showControls ? "Ẩn công cụ trục" : "Công cụ trục"}</span>
      </button>
    </div>
  );
};

export default GlassCube;
