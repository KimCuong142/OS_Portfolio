import * as THREE from "three";

function makeRandom(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural studio "HDRI" (equirect-style canvas): Bliss sky/hill gradient plus
 * bright softboxes. Sampled in the sequin shader and rotated slowly via a uniform.
 */
export function createEnvTexture() {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, "#1a2c5e");
    grad.addColorStop(0.3, "#5da9ff");
    grad.addColorStop(0.47, "#e6f4ff");
    grad.addColorStop(0.52, "#fff3d6");
    grad.addColorStop(0.6, "#8fcf62");
    grad.addColorStop(1.0, "#27501c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const rnd = makeRandom(7);
    ctx.shadowBlur = 28;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = H * (0.12 + rnd() * 0.7);
      const w = 12 + rnd() * 34;
      const h = 36 + rnd() * 120;
      const warm = i % 4 === 0;
      const cool = i % 5 === 0;
      const color = warm ? "#f8deb0" : cool ? "#b0dcfa" : "rgba(240, 245, 255, 0.85)";
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    ctx.shadowBlur = 10;
    for (let i = 0; i < 40; i++) {
      ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 2 + rnd() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Tiling tangent-space normal map: horizontal brushed-metal streaks plus
 * soft hammered dimples. Generated once, no external assets.
 */
export function createBrushedNormalTexture(size = 256) {
  const rnd = makeRandom(99);
  const h = new Float32Array(size * size);

  const rows = new Float32Array(size);
  for (let y = 0; y < size; y++) rows[y] = rnd() - 0.5;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < size; y++) {
      rows[y] = (rows[(y + size - 1) % size] + rows[y] * 2 + rows[(y + 1) % size]) * 0.25;
    }
  }

  const noise = new Float32Array(size * size);
  for (let i = 0; i < noise.length; i++) noise[i] = rnd() - 0.5;
  const radius = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        acc += noise[y * size + ((x + k + size) % size)];
      }
      h[y * size + x] = rows[y] * 1.6 + (acc / (radius * 2 + 1)) * 2.2;
    }
  }

  for (let k = 0; k < 34; k++) {
    const cx = rnd() * size;
    const cy = rnd() * size;
    const r = 7 + rnd() * 9;
    const depth = 0.35 + rnd() * 0.45;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = (dx * dx + dy * dy) / (r * r);
        if (d2 >= 1) continue;
        const px = (Math.floor(cx + dx) + size) % size;
        const py = (Math.floor(cy + dy) + size) % size;
        const f = 1 - d2;
        h[py * size + px] -= depth * f * f;
      }
    }
  }

  const data = new Uint8Array(size * size * 4);
  const strength = 2.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = h[y * size + ((x + size - 1) % size)];
      const xr = h[y * size + ((x + 1) % size)];
      const yd = h[((y + size - 1) % size) * size + x];
      const yu = h[((y + 1) % size) * size + x];
      let nx = -(xr - xl) * strength;
      let ny = -(yu - yd) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * size + x) * 4;
      data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
