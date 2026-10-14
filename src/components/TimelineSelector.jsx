import { useRef, useEffect } from "react";
import { LiquidGlass } from "@ybouane/liquidglass";
import useThemeStore from "#store/theme";
import clsx from "clsx";

const YEARS = ["2004", "2026", "2077"];
const SHADOW_PAD = 20;

const TimelineSelector = () => {
  const { currentYear, setYear, mode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";
  const is2026 = currentYear === "2026";
  const isDark2026 = is2026 && mode2026 === "dark";

  const timelineRootRef = useRef(null);
  const glassBoxRef = useRef(null);
  const bgMirrorRef = useRef(null);

  useEffect(() => {
    if (!is2026) return;

    let liquidInstance = null;
    let isDestroyed = false;
    let rafId = null;
    let attempts = 0;

    const initLG = async () => {
      if (
        !timelineRootRef.current ||
        !glassBoxRef.current ||
        glassBoxRef.current.offsetWidth === 0
      ) {
        if (attempts < 20 && !isDestroyed) {
          attempts++;
          rafId = requestAnimationFrame(initLG);
        }
        return;
      }

      try {
        liquidInstance = await LiquidGlass.init({
          root: timelineRootRef.current,
          glassElements: [glassBoxRef.current],
          defaults: {
            blurAmount: 0,
            refraction: 1.5,
            chromAberration: 0.3,
            edgeHighlight: 0,
            specular: 0,
            fresnel: 1,
            distortion: 0.15,
            cornerRadius: 40,
            zRadius: 30,
            opacity: 1,
            saturation: 0.05,
            brightness: 0,
            shadowOpacity: 0.3,
            shadowSpread: 10,
            bevelMode: 0,
          },
        });
        if (isDestroyed && liquidInstance) {
          liquidInstance.destroy();
        }
      } catch (err) {
        console.error("LiquidGlass init error (TimelineSelector):", err);
      }
    };

    rafId = requestAnimationFrame(initLG);

    const updateMirror = () => {
      if (isDestroyed) return;
      const mirror = bgMirrorRef.current;
      const root = timelineRootRef.current;

      if (mirror && root) {
        const rootRect = root.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetW = Math.round((rootRect.width + SHADOW_PAD * 2) * dpr);
        const targetH = Math.round((rootRect.height + SHADOW_PAD * 2) * dpr);

        if (mirror.width !== targetW || mirror.height !== targetH) {
          mirror.width = targetW;
          mirror.height = targetH;
        }

        const ctx = mirror.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, targetW, targetH);

          const mirrorViewportX = rootRect.left - SHADOW_PAD;
          const mirrorViewportY = rootRect.top - SHADOW_PAD;
          const mirrorViewportW = rootRect.width + SHADOW_PAD * 2;
          const mirrorViewportH = rootRect.height + SHADOW_PAD * 2;

          // 1. Draw cyber canvas background slice
          const cyberCanvas = document.getElementById("cyber-2026-canvas");
          if (cyberCanvas && cyberCanvas.width > 0 && cyberCanvas.height > 0) {
            const scaleX = cyberCanvas.width / window.innerWidth;
            const scaleY = cyberCanvas.height / window.innerHeight;
            const sx = mirrorViewportX * scaleX;
            const sy = mirrorViewportY * scaleY;
            const sw = mirrorViewportW * scaleX;
            const sh = mirrorViewportH * scaleY;
            ctx.drawImage(cyberCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
          }
        }
      }

      rafId = requestAnimationFrame(updateMirror);
    };

    rafId = requestAnimationFrame(updateMirror);

    return () => {
      isDestroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (liquidInstance) {
        liquidInstance.destroy();
      }
    };
  }, [is2026]);

  return (
    <div
      aria-label="Temporal Timeline Selector"
      className="absolute top-10 sm:top-14 left-1/2 -translate-x-1/2 z-40 flex justify-center pointer-events-auto select-none transition-all duration-300"
    >
      <div
        ref={timelineRootRef}
        className="relative flex items-center justify-center overflow-visible"
      >
        {/* Cyber HUD Bracket in 2077 mode */}
        {is2077 && (
          <div className="cyber-bracket-top absolute -inset-y-2 sm:-inset-y-3 -inset-x-5 sm:-inset-x-10 bg-[#00f0ff]/15 border-t border-[#00f0ff]/30 border-b border-[#00f0ff]/40 -z-10 pointer-events-none transition-all duration-500" />
        )}

        {/* 2026 LiquidGlass Mirror Canvas (direct child before glass element) */}
        {is2026 && (
          <canvas
            ref={bgMirrorRef}
            data-dynamic
            className="absolute pointer-events-none opacity-0"
            style={{
              left: -SHADOW_PAD,
              top: -SHADOW_PAD,
              width: `calc(100% + ${SHADOW_PAD * 2}px)`,
              height: `calc(100% + ${SHADOW_PAD * 2}px)`,
              zIndex: -10,
              opacity: 0,
            }}
          />
        )}

        {/* 2026 Authentic Liquid Glass Lens via @ybouane/liquidglass */}
        {is2026 && (
          <div
            ref={glassBoxRef}
            className="timeline-liquid-glass absolute inset-0 rounded-full pointer-events-none"
            style={{ overflow: "visible" }}
          />
        )}

        <div
          className={clsx(
            "relative z-10 flex items-center space-x-1.5 sm:space-x-4 px-2.5 sm:px-6 py-1 sm:py-2 rounded-full transition-all duration-300",
            is2077
              ? "border border-[#00f0ff]/30 bg-[#021020]/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] font-mono"
              : is2004
              ? "border-2 border-[#0055ea]/60 bg-gradient-to-b from-[#ffffff]/90 to-[#ece9d8]/90 shadow-md shadow-blue-900/20 font-sans"
              : is2026
              ? clsx(
                  "!border-none !bg-transparent !shadow-none font-sans transition-colors",
                  isDark2026 ? "text-white" : "text-neutral-800"
                )
              : "border border-white/40 bg-white/15 shadow-md shadow-black/5 text-neutral-800 font-sans"
          )}
        >
          {YEARS.map((year, idx) => {
            const isActive = currentYear === year;
            return (
              <div key={year} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setYear(year)}
                  className="group flex items-center space-x-1 sm:space-x-1.5 cursor-pointer focus:outline-none py-0.5"
                  title={`Switch to ${year} mode`}
                >
                  <span
                    className={clsx(
                      "inline-block transition-all",
                      is2077
                        ? clsx(
                            "w-2 sm:w-2.5 h-2 sm:h-2.5 rotate-45",
                            isActive
                              ? "bg-[#00f0ff] diamond-glow"
                              : "border border-[#00f0ff]/60 group-hover:bg-[#00f0ff]"
                          )
                        : is2004
                        ? clsx(
                            "w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border transition-all",
                            isActive
                              ? "bg-[#28ad36] border-[#156e1f] shadow-sm shadow-green-700/50"
                              : "border-[#0055ea]/60 bg-white group-hover:bg-[#0055ea]/30"
                          )
                        : clsx(
                            "w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full transition-all",
                            isActive
                              ? isDark2026
                                ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                                : "bg-neutral-950 shadow-xs"
                              : isDark2026
                              ? "border-2 border-white/50 bg-transparent group-hover:border-white"
                              : "border-2 border-neutral-500 bg-transparent group-hover:border-neutral-800"
                          )
                    )}
                  />
                  <span
                    className={clsx(
                      "text-[11px] sm:text-sm tracking-wider transition-colors",
                      is2077
                        ? isActive
                          ? "text-[#00f0ff] cyan-glow font-orbitron font-bold"
                          : "text-[#00f0ff]/70 group-hover:text-[#00f0ff] font-semibold"
                        : is2004
                        ? isActive
                          ? "text-[#0039a6] font-bold font-sans drop-shadow-xs"
                          : "text-neutral-600 group-hover:text-[#0039a6] font-medium font-sans"
                        : isActive
                        ? isDark2026
                          ? "text-white font-bold font-sans drop-shadow-sm"
                          : "text-neutral-950 font-bold font-sans"
                        : isDark2026
                        ? "text-white/70 group-hover:text-white font-semibold font-sans"
                        : "text-neutral-600 group-hover:text-neutral-900 font-semibold font-sans"
                    )}
                  >
                    {year}
                  </span>
                </button>

                {idx < YEARS.length - 1 && (
                  <span
                    className={clsx(
                      "w-2 sm:w-6 h-[1px] ml-1.5 sm:ml-4 transition-colors",
                      is2077
                        ? "bg-[#00f0ff]/30"
                        : is2004
                        ? "bg-[#0055ea]/30"
                        : isDark2026
                        ? "bg-white/30"
                        : "bg-neutral-400/60"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineSelector;
