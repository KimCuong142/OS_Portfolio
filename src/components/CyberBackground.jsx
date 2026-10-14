import { useEffect, useRef } from "react";
import CyberTunnel3D from "./cyber/CyberTunnel3D";
import CyberHUD from "./cyber/CyberHUD";
import useThemeStore from "#store/theme";

const CyberBackground = () => {
  const canvasRef = useRef(null);
  const { currentYear, mode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";
  const is2026 = currentYear === "2026";
  const mode2026Ref = useRef(mode2026);

  useEffect(() => {
    mode2026Ref.current = mode2026;
  }, [mode2026]);

  // 2026 Kinetic Accordion Typography Engine (Cached & Optimized)
  useEffect(() => {
    if (!is2026) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let isRunning = true;
    let mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
    };

    const linesData2026 = [
      { text: "HUYNHKIMCUONG" },
      { text: "WEB&MOBILE" },
      { text: "DEVELOPER" },
    ];

    const expansionState = [
      new Float32Array(linesData2026[0].text.length),
      new Float32Array(linesData2026[1].text.length),
      new Float32Array(linesData2026[2].text.length),
    ];

    let cachedMetrics = null;
    let cachedFontSize = 0;

    const computeMetrics = (targetFontSize) => {
      ctx.font = `900 ${targetFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`;
      cachedFontSize = targetFontSize;
      return linesData2026.map((lineItem) => {
        const chars = lineItem.text.split("");
        const metrics = chars.map((char) => {
          const m = ctx.measureText(char);
          const left = m.actualBoundingBoxLeft || 0;
          const right = m.actualBoundingBoxRight || m.width;
          const inkW = Math.max(left + right, 1);
          return { left, right, inkW };
        });
        const totalBaseInkW = metrics.reduce((sum, m) => sum + m.inkW, 0);
        return { chars, metrics, totalBaseInkW };
      });
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      const height = window.innerHeight;
      const width = window.innerWidth;
      const isPortrait = height > width * 0.95;

      let rowHeight = height / 3;
      let targetFontSize = (rowHeight / 0.7) * 0.95;

      if (isPortrait) {
        const maxFontSizeByWidth = (width / 14) * 2.2;
        targetFontSize = Math.min(targetFontSize, maxFontSizeByWidth);
      }

      cachedMetrics = computeMetrics(targetFontSize);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const onMouseMove = (e) => {
      if (mouse.targetX < 0) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        if (mouse.targetX < 0) {
          mouse.x = e.touches[0].clientX;
          mouse.y = e.touches[0].clientY;
        }
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const onMouseLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };
    window.addEventListener("mouseleave", onMouseLeave);

    const drawKineticTypographyMode = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.65;
      mouse.y += (mouse.targetY - mouse.y) * 0.65;
      if (Math.abs(mouse.targetX - mouse.x) < 0.2) mouse.x = mouse.targetX;
      if (Math.abs(mouse.targetY - mouse.y) < 0.2) mouse.y = mouse.targetY;

      ctx.clearRect(0, 0, width, height);

      const isDark = mode2026Ref.current === "dark";
      ctx.fillStyle = isDark ? "#090d16" : "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const isPortrait = height > width * 0.95;
      let rowHeight = height / 3;
      let targetFontSize = (rowHeight / 0.7) * 0.95;
      let offsetY = 0;

      if (isPortrait) {
        const maxFontSizeByWidth = (width / 14) * 2.2;
        targetFontSize = Math.min(targetFontSize, maxFontSizeByWidth);
        rowHeight = targetFontSize * 1.18;
        offsetY = (height - rowHeight * 3) / 2;
      }

      if (!cachedMetrics || Math.abs(cachedFontSize - targetFontSize) > 1) {
        cachedMetrics = computeMetrics(targetFontSize);
      } else {
        ctx.font = `900 ${cachedFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`;
      }

      const mouseRow = Math.floor((mouse.y - offsetY) / rowHeight);
      const isMouseActive = mouse.targetX >= 0 && mouse.targetY >= 0;
      const charGap = 1;
      const availableWidth = width - 4;
      const startX = 2;

      cachedMetrics.forEach((lineData, lineIdx) => {
        const { chars, metrics, totalBaseInkW } = lineData;
        const numChars = chars.length;
        const rowCenterY = offsetY + (lineIdx + 0.5) * rowHeight;

        const totalGaps = (numChars - 1) * charGap;
        const lineAvailableWidth = Math.max(10, availableWidth - totalGaps);

        // Base widths calculated using precomputed ink metrics
        const baseWidths = metrics.map(
          (m) => (m.inkW / totalBaseInkW) * lineAvailableWidth
        );

        const baseCenters = new Float32Array(numChars);
        let accX = startX;
        for (let c = 0; c < numChars; c++) {
          baseCenters[c] = accX + baseWidths[c] / 2;
          accX += baseWidths[c] + charGap;
        }

        const isCurrentRow = isMouseActive && lineIdx === mouseRow;

        for (let cIdx = 0; cIdx < numChars; cIdx++) {
          let target = 0.0;
          if (isCurrentRow) {
            const center = baseCenters[cIdx];
            const dist = Math.abs(mouse.x - center);
            const distLeft =
              cIdx > 0 ? center - baseCenters[cIdx - 1] : baseWidths[cIdx];
            const distRight =
              cIdx < numChars - 1
                ? baseCenters[cIdx + 1] - center
                : baseWidths[cIdx];
            const radius = (mouse.x < center ? distLeft : distRight) * 1.15;

            if (dist < radius) {
              target = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
            }
          }

          expansionState[lineIdx][cIdx] +=
            (target - expansionState[lineIdx][cIdx]) * 0.32;
          if (Math.abs(target - expansionState[lineIdx][cIdx]) < 0.0005) {
            expansionState[lineIdx][cIdx] = target;
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
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        for (let cIdx = 0; cIdx < numChars; cIdx++) {
          const char = chars[cIdx];
          const slotW = finalWidths[cIdx];
          const m = metrics[cIdx];
          const scaleX = slotW / m.inkW;
          const expVal = currentExp[cIdx];

          ctx.save();
          ctx.translate(currX, rowCenterY);
          ctx.scale(scaleX, 1);

          if (isDark) {
            // Dark mode: soft watermark -> glowing crisp white on hover
            const r = Math.round(30 + expVal * (255 - 30));
            const g = Math.round(41 + expVal * (255 - 41));
            const b = Math.round(59 + expVal * (255 - 59));
            const alpha = 0.25 + expVal * 0.75;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            if (expVal > 0.05) {
              ctx.shadowColor = `rgba(0, 240, 255, ${expVal * 0.4})`;
              ctx.shadowBlur = expVal * 12;
            }
          } else {
            // Light mode: soft slate watermark -> deep obsidian bold on hover (original "như cũ")
            const rCol = Math.round(200 - expVal * (200 - 15));
            const gCol = Math.round(212 - expVal * (212 - 23));
            const bCol = Math.round(228 - expVal * (228 - 42));
            ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
            if (expVal > 0.05) {
              ctx.shadowColor = `rgba(15, 23, 42, ${expVal * 0.15})`;
              ctx.shadowBlur = expVal * 10;
            }
          }

          ctx.fillText(char, m.left, 0);
          ctx.restore();

          currX += slotW + charGap;
        }
      });
    };

    const animate = () => {
      if (!isRunning) return;
      drawKineticTypographyMode();
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [is2026]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
      {/* 2077: Persistent Three.js curved data tunnel + HUD (paused when inactive) */}
      <CyberTunnel3D active={is2077} />
      <CyberHUD active={is2077} />

      {/* 2004: Windows XP Bliss Wallpaper */}
      <div
        className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-300 ${
          is2004 ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        style={{ backgroundImage: "url('/images/windowsXPwallpaper.jpg')" }}
      />

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
