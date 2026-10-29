import { useEffect, useRef } from "react";
import CyberTunnel3D from "./cyber/CyberTunnel3D";
import CyberHUD from "./cyber/CyberHUD";
import XPPixelBackground from "./xp/XPPixelBackground";
import useThemeStore from "#store/theme";

const CyberBackground = () => {
  const canvasRef = useRef(null);
  const { currentYear, mode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";
  const is2026 = currentYear === "2026";
  const mode2026Ref = useRef(mode2026);
  const updateThemeRef = useRef(null);

  useEffect(() => {
    mode2026Ref.current = mode2026;
    if (updateThemeRef.current) {
      updateThemeRef.current();
    }
  }, [mode2026]);

  // 2026 WebGL Chromatic Aberration & Liquid Prism Distortion Engine
  useEffect(() => {
    if (!is2026) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true,
      }) ||
      canvas.getContext("experimental-webgl", {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true,
      });

    if (!gl) {
      console.warn("[CyberBackground] WebGL not supported");
      return;
    }

    const VS_SOURCE = `
      attribute vec2 a_position;
      varying vec2 vUv;
      void main() {
        vUv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const FS_SOURCE = `
      precision highp float;
      uniform sampler2D u_texture;
      uniform vec2 u_mouse;
      uniform float u_radius;
      uniform float u_strength;
      uniform vec2 u_resolution;
      uniform float u_is_dark;
      uniform float u_time;
      varying vec2 vUv;

      // Smooth HSV to RGB conversion
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        // Correct aspect ratio for circular interaction radius
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        vec2 diff = (vUv - u_mouse) * aspect;
        float dist = length(diff);

        // Aspect-corrected normalized direction
        vec2 normDir = vec2(0.0);
        if (dist > 0.0001) {
          normDir = diff / dist;
        }
        // Direction mapped back to UV space for uniform pixel offsets
        vec2 uvDir = normDir / aspect;

        // Sensitivity & reach for side facing towards mouse (hướng vô: reduced another 10%)
        float radiusB = u_radius * 1.4175;
        float proximityB = clamp(1.0 - dist / radiusB, 0.0, 1.0);
        float peakB = pow(proximityB, 1.8);
        float dispAmountB = (peakB * 0.038 + proximityB * 0.008) * u_strength * 2.106;

        // Enhanced sensitivity & reach for side facing away from mouse (hướng ra)
        float radiusR = u_radius * 1.925;
        float proximityR = clamp(1.0 - dist / radiusR, 0.0, 1.0);
        float peakR = pow(proximityR, 1.8);
        float dispAmountR = (peakR * 0.038 + proximityR * 0.008) * u_strength * 2.86;

        // Texture holds 1.0 for text and 0.0 for background
        float textMask = texture2D(u_texture, vUv).r;

        // Multi-tap soft sampling along uvDir for smooth feathered neon glow
        float sampleR = 0.0;
        float sampleB = 0.0;

        if (dispAmountR > 0.0004) {
          sampleR += texture2D(u_texture, clamp(vUv - uvDir * (dispAmountR * 0.20), 0.0, 1.0)).r * 0.35;
          sampleR += texture2D(u_texture, clamp(vUv - uvDir * (dispAmountR * 0.50), 0.0, 1.0)).r * 0.30;
          sampleR += texture2D(u_texture, clamp(vUv - uvDir * (dispAmountR * 0.80), 0.0, 1.0)).r * 0.20;
          sampleR += texture2D(u_texture, clamp(vUv - uvDir * (dispAmountR * 1.10), 0.0, 1.0)).r * 0.15;
        }

        if (dispAmountB > 0.0004) {
          sampleB += texture2D(u_texture, clamp(vUv + uvDir * (dispAmountB * 0.20), 0.0, 1.0)).r * 0.35;
          sampleB += texture2D(u_texture, clamp(vUv + uvDir * (dispAmountB * 0.50), 0.0, 1.0)).r * 0.30;
          sampleB += texture2D(u_texture, clamp(vUv + uvDir * (dispAmountB * 0.80), 0.0, 1.0)).r * 0.20;
          sampleB += texture2D(u_texture, clamp(vUv + uvDir * (dispAmountB * 1.10), 0.0, 1.0)).r * 0.15;
        }

        // ONLY keep aura OUTSIDE the letters (remove inside text)
        float auraOut = clamp(sampleR * 1.7875 * (1.0 - textMask), 0.0, 1.0);
        float auraIn = clamp(sampleB * 1.31625 * (1.0 - textMask), 0.0, 1.0);

        vec3 bgColor;
        vec3 textColor;

        if (u_is_dark > 0.5) {
          // Dark Mode: Nền đen tuyền, chữ màu xám hiện đại (#999ea8)
          bgColor = vec3(0.0, 0.0, 0.0);         // #000000 Nền đen
          textColor = vec3(0.60, 0.62, 0.66);    // #999ea8 Chữ xám
        } else {
          // Light Mode: Nền trắng tinh khiết, chữ màu xanh xám pastel (#b7c4d5) chuẩn theo ảnh mẫu
          bgColor = vec3(1.0, 1.0, 1.0);         // #ffffff Nền trắng
          textColor = vec3(0.718, 0.769, 0.835); // #b7c4d5 Chữ xanh xám pastel
        }

        // Dynamic continuous color spectrum cycling over time
        float baseHue = fract(u_time * 0.065);

        // 2 opposing (complementary) sides: exactly 180 degrees (0.50) apart on color wheel
        float hueIn = fract(baseHue + 0.22); // Hướng vô (towards mouse)
        float hueOut = fract(hueIn + 0.50);  // Hướng ra (away from mouse, 180 deg opposite)

        // Saturation and Value based on theme mode
        float sat = (u_is_dark > 0.5) ? 0.96 : 0.98;
        float val = (u_is_dark > 0.5) ? 1.00 : 0.88;

        // 2-stop gradient colors for Hướng Ra (away from mouse)
        vec3 colorOut1 = hsv2rgb(vec3(hueOut, sat, val));
        vec3 colorOut2 = hsv2rgb(vec3(fract(hueOut + 0.09), sat * 0.94, val));

        // 2-stop gradient colors for Hướng Vô (towards mouse)
        vec3 colorIn1 = hsv2rgb(vec3(hueIn, sat, val));
        vec3 colorIn2 = hsv2rgb(vec3(fract(hueIn + 0.09), sat * 0.94, val));

        // Gradient Hướng Ra: Lõi sóng colorOut1, tản dần sang colorOut2
        float t1 = clamp((1.0 - sampleR) * 0.60 + (dist / radiusR) * 0.40, 0.0, 1.0);
        vec3 gradOut = mix(colorOut1, colorOut2, t1);

        // Gradient Hướng Vô: Lõi sóng colorIn1, tản dần sang colorIn2
        float t2 = clamp((1.0 - sampleB) * 0.60 + (dist / radiusB) * 0.40, 0.0, 1.0);
        vec3 gradIn = mix(colorIn1, colorIn2, t2);

        // Blend the two opposing gradient halos smoothly without bias
        float totalAura = clamp(auraOut + auraIn, 0.0, 1.0);
        vec3 auraColor = vec3(0.0);
        if (totalAura > 0.0001) {
          auraColor = (gradOut * auraOut + gradIn * auraIn) / max(auraOut + auraIn, 0.0001);
        }

        vec3 finalColor = mix(bgColor, auraColor, totalAura);
        finalColor = mix(finalColor, textColor, textMask);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (glContext, type, source) => {
      const shader = glContext.createShader(type);
      glContext.shaderSource(shader, source);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        console.error("Shader error:", glContext.getShaderInfoLog(shader));
        glContext.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program error:", gl.getProgramInfoLog(program));
      return;
    }

    const posAttrib = gl.getAttribLocation(program, "a_position");
    const uTextureLoc = gl.getUniformLocation(program, "u_texture");
    const uMouseLoc = gl.getUniformLocation(program, "u_mouse");
    const uRadiusLoc = gl.getUniformLocation(program, "u_radius");
    const uStrengthLoc = gl.getUniformLocation(program, "u_strength");
    const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const uIsDarkLoc = gl.getUniformLocation(program, "u_is_dark");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");

    // Full-screen quad geometry
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );

    // Offscreen Canvas for typography texture
    const textCanvas = document.createElement("canvas");
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const DESKTOP_LINES_2026 = [
      { text: "HUYNHKIMCUONG" },
      { text: "WEB&MOBILE" },
      { text: "DEVELOPER" },
    ];

    const MOBILE_LINES_2026 = [
      { text: "HUYNH KIM" },
      { text: "KIM CUONG" },
      { text: "WEB&MOBILE" },
      { text: "DEVELOPER" },
    ];

    let activeLines = DESKTOP_LINES_2026;
    let expansionState = activeLines.map((l) => new Float32Array(l.text.length));
    let holdTimers = activeLines.map((l) => new Float32Array(l.text.length));

    const mousePixel = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
    };

    let hasMouseEntered = false;
    let targetStrength = 0.0;
    let currentStrength = 0.0;
    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };

    let cachedMetrics = null;
    let cachedRowHeight = 0;
    let cachedOffsetY = 0;
    let cachedWidth = 0;
    let cachedHeight = 0;
    let cachedDpr = 1;
    let cachedTargetFontSize = 0;
    let cachedHorizontalPad = 2;
    let cachedCharGap = 5;
    let cachedRowGap = 0;
    let needsTextureRedraw = true;

    const textCtx = textCanvas.getContext("2d");

    const computeMetrics = (targetFontSize, linesList = activeLines) => {
      if (!textCtx) return [];
      textCtx.font = `900 ${targetFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`;
      return linesList.map((lineItem) => {
        const chars = lineItem.text.split("");
        const metrics = chars.map((char) => {
          if (char === " ") {
            const spaceW = Math.max(targetFontSize * 0.2, 4);
            return { left: 0, right: spaceW, inkW: spaceW, isSpace: true };
          }
          const m = textCtx.measureText(char);
          const left = m.actualBoundingBoxLeft || 0;
          const right = m.actualBoundingBoxRight || m.width;
          const inkW = Math.max(left + right, 1);
          return { left, right, inkW, isSpace: false };
        });
        const totalBaseInkW = metrics.reduce((sum, m) => sum + m.inkW, 0);
        return { chars, metrics, totalBaseInkW };
      });
    };

    const hasExpandingChars = () => {
      for (let l = 0; l < expansionState.length; l++) {
        const row = expansionState[l];
        const timers = holdTimers[l];
        for (let c = 0; c < row.length; c++) {
          if (row[c] > 0.0008 || timers[c] > 0) return true;
        }
      }
      return false;
    };

    const renderTextTexture = (isFullUpload = false) => {
      if (!textCtx || !cachedMetrics) return;

      const width = cachedWidth;
      const height = cachedHeight;
      const dpr = cachedDpr;

      textCtx.setTransform(1, 0, 0, 1, 0, 0);
      textCtx.scale(dpr, dpr);

      // Pure black mask background
      textCtx.fillStyle = "#000000";
      textCtx.fillRect(0, 0, width, height);

      const rowHeight = cachedRowHeight;
      const rowGap = cachedRowGap;
      const offsetY = cachedOffsetY;
      const isMouseActive = mousePixel.targetX >= 0 && mousePixel.targetY >= 0;
      const startX = cachedHorizontalPad;
      const availableWidth = width - cachedHorizontalPad * 2;
      const charGap = cachedCharGap;

      textCtx.font = `900 ${cachedTargetFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`;
      textCtx.textBaseline = "middle";
      textCtx.textAlign = "left";
      textCtx.fillStyle = "#ffffff";

      const isPortrait = width < 640 || height > width * 0.95;
      let scaleY = 1.0;
      let inkOffsetY = 0.0;
      if (!isPortrait) {
        const capM = textCtx.measureText("H");
        const capAscent = capM.actualBoundingBoxAscent || cachedTargetFontSize * 0.355;
        const capDescent = capM.actualBoundingBoxDescent || cachedTargetFontSize * 0.355;
        const measuredCapH = Math.max(capAscent + capDescent, 1);
        scaleY = rowHeight / measuredCapH;
        inkOffsetY = (capAscent - capDescent) / 2;
      }

      cachedMetrics.forEach((lineData, lineIdx) => {
        const { chars, metrics, totalBaseInkW } = lineData;
        const numChars = chars.length;
        const rowCenterY = offsetY + lineIdx * (rowHeight + rowGap) + 0.5 * rowHeight;
        const distY = Math.abs(mousePixel.y - rowCenterY);

        // Continuous C1-smooth vertical influence factor (smooth transition between rows)
        let vertFactor = 0.0;
        const innerY = rowHeight * 0.22;
        const outerY = rowHeight * 0.78;
        if (isMouseActive) {
          if (distY <= innerY) {
            vertFactor = 1.0;
          } else if (distY < outerY) {
            const t = (distY - innerY) / (outerY - innerY);
            vertFactor = 0.5 * (1 + Math.cos(Math.PI * t));
          }
        }

        const totalGaps = (numChars - 1) * charGap;
        const lineAvailableWidth = Math.max(10, availableWidth - totalGaps);

        const baseWidths = metrics.map(
          (m) => (m.inkW / totalBaseInkW) * lineAvailableWidth
        );

        const baseCenters = new Float32Array(numChars);
        let accX = startX;
        for (let c = 0; c < numChars; c++) {
          baseCenters[c] = accX + baseWidths[c] / 2;
          accX += baseWidths[c] + charGap;
        }

        for (let cIdx = 0; cIdx < numChars; cIdx++) {
          let target = 0.0;
          if (vertFactor > 0.001 && !metrics[cIdx].isSpace) {
            const center = baseCenters[cIdx];
            const dist = Math.abs(mousePixel.x - center);
            const distLeft = cIdx > 0 ? center - baseCenters[cIdx - 1] : baseWidths[cIdx];
            const distRight = cIdx < numChars - 1 ? baseCenters[cIdx + 1] - center : baseWidths[cIdx];
            const radius = (mousePixel.x < center ? distLeft : distRight) * 1.25;

            if (dist < radius) {
              const horizFactor = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
              target = horizFactor * vertFactor;
            }
          }

          const current = expansionState[lineIdx][cIdx];
          if (target > current) {
            // Rapid bloom when mouse passes over
            expansionState[lineIdx][cIdx] += (target - current) * 0.28;
            // Delay buffer: 9 frames (~150ms) of hang-time at peak before contracting
            holdTimers[lineIdx][cIdx] = 9;
          } else {
            // When mouse sweeps past / moves away:
            if (holdTimers[lineIdx][cIdx] > 0) {
              // Delay phase: hold expansion briefly
              holdTimers[lineIdx][cIdx] -= 1;
            } else {
              // Slow contraction phase: gracefully and smoothly glide back to rest
              expansionState[lineIdx][cIdx] += (target - current) * 0.075;
              if (Math.abs(target - expansionState[lineIdx][cIdx]) < 0.0005) {
                expansionState[lineIdx][cIdx] = target;
              }
            }
          }
        }

        const currentExp = expansionState[lineIdx];

        const deltaDemanded = baseWidths.map((baseW, cIdx) => {
          const denom = Math.max(0.1, 1 - baseW / lineAvailableWidth);
          return (0.5 * baseW * currentExp[cIdx]) / denom;
        });

        const totalExtra = deltaDemanded.reduce((sum, d) => sum + d, 0);

        const finalWidths = baseWidths.map((baseW, cIdx) => {
          return baseW + deltaDemanded[cIdx] - (baseW / lineAvailableWidth) * totalExtra;
        });

        let currX = startX;
        for (let cIdx = 0; cIdx < numChars; cIdx++) {
          const char = chars[cIdx];
          const slotW = finalWidths[cIdx];
          const m = metrics[cIdx];

          if (!m.isSpace) {
            const scaleX = slotW / m.inkW;
            textCtx.save();
            textCtx.translate(currX, rowCenterY);
            textCtx.scale(scaleX, scaleY);
            textCtx.fillText(char, m.left, inkOffsetY);
            textCtx.restore();
          }

          currX += slotW + charGap;
        }
      });

      // Upload to WebGL texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (isFullUpload) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          textCanvas
        );
      } else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          textCanvas
        );
      }
    };

    updateThemeRef.current = () => {
      needsTextureRedraw = true;
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      cachedDpr = dpr;
      cachedWidth = width;
      cachedHeight = height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      textCanvas.width = canvas.width;
      textCanvas.height = canvas.height;

      const isPortrait = width < 640 || height > width * 0.95;
      const nextLines = isPortrait ? MOBILE_LINES_2026 : DESKTOP_LINES_2026;
      if (activeLines !== nextLines) {
        activeLines = nextLines;
        expansionState = activeLines.map((l) => new Float32Array(l.text.length));
        holdTimers = activeLines.map((l) => new Float32Array(l.text.length));
      }

      let rowHeight;
      let rowGap = 0;
      let targetFontSize;
      let offsetY;
      let horizontalPad;
      let charGap;

      if (isPortrait) {
        // Mobile vertical layout: 4 stacked rows positioned neatly between Timeline and 2x2 Folders
        const topBound = Math.max(96, height * 0.138);
        const bottomBound = Math.max(topBound + 200, height * 0.575);
        const blockHeight = bottomBound - topBound;
        rowHeight = blockHeight / activeLines.length;
        targetFontSize = rowHeight * 1.12;
        offsetY = topBound;
        horizontalPad = Math.max(12, Math.round(width * 0.036));
        charGap = 2;
        rowGap = 0;
      } else {
        // Desktop landscape layout: 3 rows stretching to fill background with 5px row gaps and 5px char gaps
        const navEl = document.querySelector("nav");
        const navHeight = navEl ? navEl.offsetHeight : 44;
        const topBound = navHeight;
        const bottomBound = height;
        const blockHeight = bottomBound - topBound;
        rowGap = 5;
        const totalRowGaps = (activeLines.length - 1) * rowGap;
        rowHeight = (blockHeight - totalRowGaps) / activeLines.length;
        targetFontSize = rowHeight / 0.70;
        offsetY = topBound;
        horizontalPad = 2;
        charGap = 5;
      }

      cachedRowHeight = rowHeight;
      cachedRowGap = rowGap;
      cachedOffsetY = offsetY;
      cachedTargetFontSize = targetFontSize;
      cachedHorizontalPad = horizontalPad;
      cachedCharGap = charGap;
      cachedMetrics = computeMetrics(targetFontSize, activeLines);

      renderTextTexture(true);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (!isRunning) return;
        resizeCanvas();
      });
    }

    const startTime = performance.now();
    let isRunning = true;
    let animId;

    const onMouseMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetMouse.x = e.clientX / w;
      targetMouse.y = 1.0 - e.clientY / h;
      targetStrength = 0.65;

      if (!hasMouseEntered) {
        hasMouseEntered = true;
        currentMouse.x = targetMouse.x;
        currentMouse.y = targetMouse.y;
      }

      if (mousePixel.targetX < 0) {
        mousePixel.x = e.clientX;
        mousePixel.y = e.clientY;
      }
      mousePixel.targetX = e.clientX;
      mousePixel.targetY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onMouseLeave = () => {
      targetStrength = 0.0;
      mousePixel.targetX = -9999;
      mousePixel.targetY = -9999;
    };
    window.addEventListener("mouseleave", onMouseLeave);

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        targetMouse.x = clientX / w;
        targetMouse.y = 1.0 - clientY / h;
        targetStrength = 0.65;
        if (!hasMouseEntered) {
          hasMouseEntered = true;
          currentMouse.x = targetMouse.x;
          currentMouse.y = targetMouse.y;
        }
        if (mousePixel.targetX < 0) {
          mousePixel.x = clientX;
          mousePixel.y = clientY;
        }
        mousePixel.targetX = clientX;
        mousePixel.targetY = clientY;
      }
    };
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const onTouchEnd = () => {
      targetStrength = 0.0;
      mousePixel.targetX = -9999;
      mousePixel.targetY = -9999;
    };
    window.addEventListener("touchend", onTouchEnd);

    const animate = () => {
      if (!isRunning) return;

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.22;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.22;
      currentStrength += (targetStrength - currentStrength) * 0.12;

      // Mouse tracking for kinetic typography
      if (mousePixel.targetX < 0) {
        mousePixel.x = -9999;
        mousePixel.y = -9999;
      } else {
        if (mousePixel.x < 0) {
          mousePixel.x = mousePixel.targetX;
          mousePixel.y = mousePixel.targetY;
        } else {
          mousePixel.x += (mousePixel.targetX - mousePixel.x) * 0.38;
          mousePixel.y += (mousePixel.targetY - mousePixel.y) * 0.38;
          if (Math.abs(mousePixel.targetX - mousePixel.x) < 0.2) mousePixel.x = mousePixel.targetX;
          if (Math.abs(mousePixel.targetY - mousePixel.y) < 0.2) mousePixel.y = mousePixel.targetY;
        }
      }

      const isMouseActive = mousePixel.targetX >= 0 && mousePixel.targetY >= 0;
      const isExpanding = hasExpandingChars();

      if (isMouseActive || isExpanding || needsTextureRedraw) {
        renderTextTexture(false);
        needsTextureRedraw = false;
      }

      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTextureLoc, 0);

      gl.uniform2f(uMouseLoc, currentMouse.x, currentMouse.y);
      gl.uniform1f(uRadiusLoc, 0.20);
      gl.uniform1f(uStrengthLoc, currentStrength);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(uIsDarkLoc, mode2026Ref.current === "dark" ? 1.0 : 0.0);
      gl.uniform1f(uTimeLoc, (performance.now() - startTime) * 0.001);

      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(posAttrib);
      gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      updateThemeRef.current = null;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);

      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(quadBuffer);
      gl.deleteTexture(texture);
    };
  }, [is2026]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
      {/* 2077: Persistent Three.js curved data tunnel + HUD (paused when inactive) */}
      <CyberTunnel3D active={is2077} />
      <CyberHUD active={is2077} />

      {/* 2004: Interactive 3D Pixel Dissolve Windows XP Background */}
      <XPPixelBackground active={is2004} />

      {/* 2026: Kinetic accordion typography canvas */}
      <canvas
        ref={canvasRef}
        id="cyber-2026-canvas"
        className={`absolute inset-0 w-full h-full z-0 block transition-opacity duration-300 ${
          is2026 ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      />
    </div>
  );
};

export default CyberBackground;
