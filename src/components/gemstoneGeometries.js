import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/**
 * Helper to build a non-indexed BufferGeometry from an array of triangles [v0, v1, v2, ...]
 * where each vertex is a Vector3 or [x, y, z].
 * This guarantees flat, crisp facet normals like genuine cut gemstones,
 * and automatically enforces outward-facing normal winding.
 */
function buildNonIndexedGeometry(triangles) {
  const positions = [];
  const cb = new Vector3();
  const ab = new Vector3();
  const centroid = new Vector3();

  for (const tri of triangles) {
    const v0 = tri[0] instanceof Vector3 ? tri[0] : new Vector3(...tri[0]);
    const v1 = tri[1] instanceof Vector3 ? tri[1] : new Vector3(...tri[1]);
    const v2 = tri[2] instanceof Vector3 ? tri[2] : new Vector3(...tri[2]);

    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    ab.subVectors(v1, v0);
    cb.subVectors(v2, v0);
    const normal = new Vector3().crossVectors(ab, cb);

    // If normal points towards origin/centroid (dot < 0), flip vertex winding
    if (normal.dot(centroid) < 0) {
      positions.push(v0.x, v0.y, v0.z);
      positions.push(v2.x, v2.y, v2.z);
      positions.push(v1.x, v1.y, v1.z);
    } else {
      positions.push(v0.x, v0.y, v0.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function V(x, y, z) {
  return new Vector3(x, y, z);
}

// ============================================================================
// 1. ROUND BRILLIANT (Tròn giác cúc kinh điển - 57/58 facets)
// ============================================================================
export function createRoundBrilliantGeometry(radius = 0.85, depth = 0.55) {
  const triangles = [];
  const crownH = depth * 0.36;
  const pavilionH = depth * 0.64;
  const tableR = radius * 0.54;
  const starR = radius * 0.78;
  const starH = crownH * 0.55;

  // 16 girdle points
  const girdle = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    girdle.push(V(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }

  // 8 table points
  const table = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    table.push(V(Math.cos(a) * tableR, Math.sin(a) * tableR, crownH));
  }

  // 8 star / bezel mid points
  const star = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    star.push(V(Math.cos(a) * starR, Math.sin(a) * starR, starH));
  }

  const culet = V(0, 0, -pavilionH);
  const tableCenter = V(0, 0, crownH);

  // Table facets (fan from center)
  for (let i = 0; i < 8; i++) {
    triangles.push([tableCenter, table[i], table[(i + 1) % 8]]);
  }

  // Crown facets
  for (let i = 0; i < 8; i++) {
    const s = star[i];
    const t1 = table[i];
    const t0 = table[(i + 7) % 8];
    // Star facet (triangle pointing to table edge)
    triangles.push([s, t0, t1]);

    // Upper girdle facets
    const g0 = girdle[(i * 2 + 15) % 16];
    const g1 = girdle[i * 2];
    const g2 = girdle[i * 2 + 1];
    triangles.push([s, g0, g1]);
    triangles.push([s, g1, g2]);

    // Kite facet connecting to next
    const nextS = star[(i + 1) % 8];
    triangles.push([t1, s, g2]);
    triangles.push([t1, g2, nextS]);
  }

  // Pavilion facets (8 main kite/triangles from culet to girdle)
  for (let i = 0; i < 16; i++) {
    triangles.push([culet, girdle[(i + 1) % 16], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 2. PRINCESS CUT (Vuông góc nhọn - Brilliant Faceted Square)
// ============================================================================
export function createPrincessGeometry(size = 0.82, depth = 0.58) {
  const triangles = [];
  const s = size * 0.95;
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;
  const ts = s * 0.52; // table half size
  const culet = V(0, 0, -pavH);

  // Table (Square)
  const t0 = V(-ts, -ts, crownH);
  const t1 = V(ts, -ts, crownH);
  const t2 = V(ts, ts, crownH);
  const t3 = V(-ts, ts, crownH);
  triangles.push([t0, t1, t2]);
  triangles.push([t0, t2, t3]);

  // Girdle (Square with 8 points: 4 corners + 4 edge centers)
  const c0 = V(-s, -s, 0);
  const m0 = V(0, -s, 0);
  const c1 = V(s, -s, 0);
  const m1 = V(s, 0, 0);
  const c2 = V(s, s, 0);
  const m2 = V(0, s, 0);
  const c3 = V(-s, s, 0);
  const m3 = V(-s, 0, 0);

  // Crown bevel facets
  const sides = [
    [t0, t1, c0, m0, c1],
    [t1, t2, c1, m1, c2],
    [t2, t3, c2, m2, c3],
    [t3, t0, c3, m3, c0],
  ];
  for (const [ta, tb, ca, ma, cb] of sides) {
    triangles.push([ta, ca, ma]);
    triangles.push([ta, ma, tb]);
    triangles.push([tb, ma, cb]);
  }

  // Pavilion (Chevrons to culet)
  const girdle = [c0, m0, c1, m1, c2, m2, c3, m3];
  for (let i = 0; i < 8; i++) {
    triangles.push([culet, girdle[(i + 1) % 8], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 3. CUSHION CUT (Gối - Vuông bo tròn mềm mại)
// ============================================================================
export function createCushionGeometry(size = 0.85, depth = 0.56) {
  const triangles = [];
  const N = 16;
  const crownH = depth * 0.36;
  const pavH = depth * 0.64;

  const girdle = [];
  for (let i = 0; i < N; i++) {
    const th = (i * 2 * Math.PI) / N;
    // Superellipse: rounded square
    const cosT = Math.cos(th);
    const sinT = Math.sin(th);
    const r = size * Math.pow(Math.abs(cosT) ** 4 + Math.abs(sinT) ** 4, -0.25) * 0.85;
    girdle.push(V(Math.cos(th) * r, Math.sin(th) * r, 0));
  }

  const tableRatio = 0.52;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  // Table fan
  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  // Crown facets
  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  // Pavilion facets
  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 4. OVAL CUT (Bầu dục thanh lịch)
// ============================================================================
export function createOvalGeometry(radiusX = 0.68, radiusY = 0.95, depth = 0.55) {
  const triangles = [];
  const N = 16;
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  const girdle = [];
  for (let i = 0; i < N; i++) {
    const th = (i * 2 * Math.PI) / N;
    girdle.push(V(Math.cos(th) * radiusX, Math.sin(th) * radiusY, 0));
  }

  const tableRatio = 0.52;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 5. PEAR CUT (Giọt nước / Quả lê giác cắt kim cương)
// ============================================================================
export function createPearGeometry(width = 0.78, length = 1.05, depth = 0.56) {
  const triangles = [];
  const N = 16;
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  // Teardrop outline
  const girdle = [];
  for (let i = 0; i < N; i++) {
    const t = (i * 2 * Math.PI) / N;
    // Egg/teardrop parametric curve
    const x = Math.sin(t) * width * 0.5 * (1 + 0.35 * Math.cos(t));
    const y = -Math.cos(t) * length * 0.55 + 0.1;
    girdle.push(V(x, y, 0));
  }

  const tableRatio = 0.52;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0, crownH);
  const culet = V(0, -0.05, -pavH);

  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 6. MARQUISE CUT (Hạt thóc / Mắt ngọc thon nhọn 2 đầu)
// ============================================================================
export function createMarquiseGeometry(width = 0.62, length = 1.15, depth = 0.55) {
  const triangles = [];
  const N = 16;
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  const girdle = [];
  for (let i = 0; i < N; i++) {
    const t = (i * 2 * Math.PI) / N;
    // Navette: sin curve for width, cos curve for pointed tips
    const y = Math.cos(t) * (length * 0.55);
    const x = Math.sin(t) * Math.sin(t * 0.5 >= 0 ? t : -t) * width * 0.7;
    const signX = Math.sin(t) >= 0 ? 1 : -1;
    const finalX = signX * Math.pow(Math.abs(Math.sin(t)), 1.3) * (width * 0.5);
    girdle.push(V(finalX, y, 0));
  }

  const tableRatio = 0.48;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 7. EMERALD CUT (Chữ nhật vát góc - Cắt bậc xếp tầng Step Cut)
// ============================================================================
export function createEmeraldGeometry(width = 0.72, height = 0.98, depth = 0.54) {
  const triangles = [];
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  // 8-corner octagon outline (Rectangle with 45-degree beveled corners)
  const makeOctagon = (w, h, c, z) => {
    const hw = w * 0.5;
    const hh = h * 0.5;
    return [
      V(-hw + c, -hh, z),
      V(hw - c, -hh, z),
      V(hw, -hh + c, z),
      V(hw, hh - c, z),
      V(hw - c, hh, z),
      V(-hw + c, hh, z),
      V(-hw, hh - c, z),
      V(-hw, -hh + c, z),
    ];
  };

  const girdle = makeOctagon(width, height, 0.16, 0);
  const crownMid = makeOctagon(width * 0.82, height * 0.82, 0.13, crownH * 0.55);
  const table = makeOctagon(width * 0.62, height * 0.62, 0.10, crownH);
  const tCenter = V(0, 0, crownH);

  // Table
  for (let i = 0; i < 8; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % 8]]);
  }

  // Tier 1 Crown: Table to CrownMid
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    triangles.push([table[i], crownMid[i], crownMid[next]]);
    triangles.push([table[i], crownMid[next], table[next]]);
  }

  // Tier 2 Crown: CrownMid to Girdle
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    triangles.push([crownMid[i], girdle[i], girdle[next]]);
    triangles.push([crownMid[i], girdle[next], crownMid[next]]);
  }

  // Pavilion with Keel Line (Thanh đáy Emerald Cut)
  const keelLen = (height - width) * 0.45;
  const k0 = V(0, -keelLen, -pavH);
  const k1 = V(0, keelLen, -pavH);

  // Connect 8 girdle vertices to keel line
  triangles.push([k0, girdle[1], girdle[0]]);
  triangles.push([k0, girdle[2], girdle[1]]);
  triangles.push([k0, girdle[3], girdle[2]]);
  triangles.push([k0, k1, girdle[3]]);
  triangles.push([k1, girdle[4], girdle[3]]);
  triangles.push([k1, girdle[5], girdle[4]]);
  triangles.push([k1, girdle[6], girdle[5]]);
  triangles.push([k1, girdle[7], girdle[6]]);
  triangles.push([k1, k0, girdle[7]]);
  triangles.push([k0, girdle[0], girdle[7]]);

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 8. ASSCHER CUT (Vuông vát góc - Cắt bậc xếp tầng Square Step Cut)
// ============================================================================
export function createAsscherGeometry(size = 0.84, depth = 0.58) {
  // Similar to Emerald cut with aspect ratio 1:1 and iconic central culet point
  const triangles = [];
  const crownH = depth * 0.38;
  const pavH = depth * 0.62;

  const makeOctagon = (s, c, z) => {
    const h = s * 0.5;
    return [
      V(-h + c, -h, z),
      V(h - c, -h, z),
      V(h, -h + c, z),
      V(h, h - c, z),
      V(h - c, h, z),
      V(-h + c, h, z),
      V(-h, h - c, z),
      V(-h, -h + c, z),
    ];
  };

  const girdle = makeOctagon(size, 0.22, 0);
  const crownMid = makeOctagon(size * 0.80, 0.17, crownH * 0.55);
  const table = makeOctagon(size * 0.58, 0.12, crownH);
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  for (let i = 0; i < 8; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % 8]]);
  }

  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    triangles.push([table[i], crownMid[i], crownMid[next]]);
    triangles.push([table[i], crownMid[next], table[next]]);
  }

  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    triangles.push([crownMid[i], girdle[i], girdle[next]]);
    triangles.push([crownMid[i], girdle[next], crownMid[next]]);
  }

  for (let i = 0; i < 8; i++) {
    triangles.push([culet, girdle[(i + 1) % 8], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 9. RADIANT CUT (Chữ nhật vát góc giác cắt lấp lánh Brilliant)
// ============================================================================
export function createRadiantGeometry(width = 0.72, height = 0.94, depth = 0.56) {
  const triangles = [];
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  const makeOctagon = (w, h, c, z) => {
    const hw = w * 0.5;
    const hh = h * 0.5;
    return [
      V(-hw + c, -hh, z),
      V(hw - c, -hh, z),
      V(hw, -hh + c, z),
      V(hw, hh - c, z),
      V(hw - c, hh, z),
      V(-hw + c, hh, z),
      V(-hw, hh - c, z),
      V(-hw, -hh + c, z),
    ];
  };

  const girdle = makeOctagon(width, height, 0.15, 0);
  const table = makeOctagon(width * 0.55, height * 0.55, 0.08, crownH);
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  for (let i = 0; i < 8; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % 8]]);
  }

  // Brilliant-style triangular star & kite facets for radiant sparkle
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < 8; i++) {
    triangles.push([culet, girdle[(i + 1) % 8], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 10. HEART CUT (Hình trái tim giác cắt kim cương)
// ============================================================================
export function createHeartGeometry(size = 0.86, depth = 0.56) {
  const triangles = [];
  const N = 18;
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  const girdle = [];
  for (let i = 0; i < N; i++) {
    const t = (i * 2 * Math.PI) / N;
    // Parametric heart formula
    const x = Math.pow(Math.sin(t), 3) * size * 0.95;
    const y =
      (0.8125 * Math.cos(t) -
        0.3125 * Math.cos(2 * t) -
        0.125 * Math.cos(3 * t) -
        0.0625 * Math.cos(4 * t)) *
      size *
      0.95;
    girdle.push(V(x, y, 0));
  }

  const tableRatio = 0.52;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0.05, crownH);
  const culet = V(0, -0.1, -pavH);

  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 11. TRILLIANT CUT (Tam giác đều giác cắt kim cương)
// ============================================================================
export function createTrilliantGeometry(radius = 0.88, depth = 0.54) {
  const triangles = [];
  const crownH = depth * 0.35;
  const pavH = depth * 0.65;

  // Triangle with convexly curved edges (3 sets of 3 vertices = 9 vertices)
  const girdle = [];
  for (let i = 0; i < 3; i++) {
    const a0 = (i * 2 * Math.PI) / 3 - Math.PI / 6;
    const a1 = ((i + 1) * 2 * Math.PI) / 3 - Math.PI / 6;
    const amid = (a0 + a1) * 0.5;

    // Vertex corner
    girdle.push(V(Math.cos(a0) * radius, Math.sin(a0) * radius, 0));
    // Mid edge (slightly bulged outward for classic trilliant)
    girdle.push(V(Math.cos(amid) * radius * 0.88, Math.sin(amid) * radius * 0.88, 0));
  }

  const N = girdle.length;
  const tableRatio = 0.52;
  const table = girdle.map((p) => V(p.x * tableRatio, p.y * tableRatio, crownH));
  const tCenter = V(0, 0, crownH);
  const culet = V(0, 0, -pavH);

  for (let i = 0; i < N; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % N]]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    triangles.push([table[i], girdle[i], girdle[next]]);
    triangles.push([table[i], girdle[next], table[next]]);
  }

  for (let i = 0; i < N; i++) {
    triangles.push([culet, girdle[(i + 1) % N], girdle[i]]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// 12. OLD EUROPEAN CUT (Tròn cổ điển - Vương miện cao, đáy phẳng Open Culet)
// ============================================================================
export function createOldEuropeanGeometry(radius = 0.84, depth = 0.62) {
  const triangles = [];
  const crownH = depth * 0.45; // Taller crown
  const pavH = depth * 0.55;
  const tableR = radius * 0.42; // Smaller table
  const culetR = radius * 0.14; // Open/faceted culet

  const N = 16;
  const girdle = [];
  for (let i = 0; i < N; i++) {
    const a = (i * 2 * Math.PI) / N;
    girdle.push(V(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }

  const table = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 2 * Math.PI) / 8 + Math.PI / 8;
    table.push(V(Math.cos(a) * tableR, Math.sin(a) * tableR, crownH));
  }
  const tCenter = V(0, 0, crownH);

  // Table fan
  for (let i = 0; i < 8; i++) {
    triangles.push([tCenter, table[i], table[(i + 1) % 8]]);
  }

  // Crown facets
  for (let i = 0; i < 8; i++) {
    const t0 = table[i];
    const t1 = table[(i + 1) % 8];
    const g0 = girdle[i * 2];
    const g1 = girdle[i * 2 + 1];
    const g2 = girdle[(i * 2 + 2) % N];
    triangles.push([t0, g0, g1]);
    triangles.push([t0, g1, t1]);
    triangles.push([t1, g1, g2]);
  }

  // Open Culet (flat 8-sided bottom facet)
  const culet = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 2 * Math.PI) / 8;
    culet.push(V(Math.cos(a) * culetR, Math.sin(a) * culetR, -pavH));
  }
  const cCenter = V(0, 0, -pavH);
  for (let i = 0; i < 8; i++) {
    triangles.push([cCenter, culet[(i + 1) % 8], culet[i]]);
  }

  // Pavilion facets connecting Girdle to Culet
  for (let i = 0; i < 8; i++) {
    const c0 = culet[i];
    const c1 = culet[(i + 1) % 8];
    const g0 = girdle[i * 2];
    const g1 = girdle[i * 2 + 1];
    const g2 = girdle[(i * 2 + 2) % N];
    triangles.push([g0, c0, g1]);
    triangles.push([g1, c0, c1]);
    triangles.push([g1, c1, g2]);
  }

  return buildNonIndexedGeometry(triangles);
}

// ============================================================================
// DICTIONARY OF 12 GEMSTONE CUTS
// ============================================================================
export const GEMSTONE_CUTS = [
  { id: "round", name: "Round Brilliant", vietName: "Tròn Giác Cúc", create: (scale = 1.0) => createRoundBrilliantGeometry(0.85 * scale, 0.55 * scale) },
  { id: "princess", name: "Princess", vietName: "Vuông Princess", create: (scale = 1.0) => createPrincessGeometry(0.82 * scale, 0.58 * scale) },
  { id: "cushion", name: "Cushion", vietName: "Gối Cushion", create: (scale = 1.0) => createCushionGeometry(0.85 * scale, 0.56 * scale) },
  { id: "oval", name: "Oval", vietName: "Bầu Dục Oval", create: (scale = 1.0) => createOvalGeometry(0.68 * scale, 0.95 * scale, 0.55 * scale) },
  { id: "pear", name: "Pear", vietName: "Giọt Nước Pear", create: (scale = 1.0) => createPearGeometry(0.78 * scale, 1.05 * scale, 0.56 * scale) },
  { id: "marquise", name: "Marquise", vietName: "Hạt Thóc Marquise", create: (scale = 1.0) => createMarquiseGeometry(0.62 * scale, 1.15 * scale, 0.55 * scale) },
  { id: "emerald", name: "Emerald", vietName: "Chữ Nhật Emerald", create: (scale = 1.0) => createEmeraldGeometry(0.72 * scale, 0.98 * scale, 0.54 * scale) },
  { id: "asscher", name: "Asscher", vietName: "Vuông Asscher", create: (scale = 1.0) => createAsscherGeometry(0.84 * scale, 0.58 * scale) },
  { id: "radiant", name: "Radiant", vietName: "Chữ Nhật Radiant", create: (scale = 1.0) => createRadiantGeometry(0.72 * scale, 0.94 * scale, 0.56 * scale) },
  { id: "heart", name: "Heart", vietName: "Trái Tim Heart", create: (scale = 1.0) => createHeartGeometry(0.86 * scale, 0.56 * scale) },
  { id: "trilliant", name: "Trilliant", vietName: "Tam Giác Trilliant", create: (scale = 1.0) => createTrilliantGeometry(0.88 * scale, 0.54 * scale) },
  { id: "old_european", name: "Old European", vietName: "Tròn Cổ Điển", create: (scale = 1.0) => createOldEuropeanGeometry(0.84 * scale, 0.62 * scale) },
];
