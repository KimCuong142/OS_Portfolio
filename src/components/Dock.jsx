import { useRef, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { dockApps } from "#constants";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useWindowStore from "#store/window";
import useThemeStore from "#store/theme";
import { LiquidGlass } from "@ybouane/liquidglass";
import clsx from "clsx";

gsap.registerPlugin(useGSAP);

const SHADOW_PAD = 20;

const Dock = () => {
  const { openWindow, focusWindow, windows } = useWindowStore();
  const { currentYear, mode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2026 = currentYear === "2026";
  const isDark2026 = is2026 && mode2026 === "dark";
  const dockRef = useRef(null);
  const dockRootRef = useRef(null);
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
        !dockRootRef.current ||
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
          root: dockRootRef.current,
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
        console.error("LiquidGlass init error (Dock):", err);
      }
    };

    rafId = requestAnimationFrame(initLG);

    const updateMirror = () => {
      if (isDestroyed) return;
      const mirror = bgMirrorRef.current;
      const root = dockRootRef.current;

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
            ctx.fillStyle = mode2026 === "dark" ? "#000000" : "#ffffff";
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

  // GSAP Smooth Icon Magnification on Hover (Zero layout thrashing with cached rects)
  useGSAP(
    () => {
      const dock = dockRef.current;
      if (!dock) return;

      const icons = dock.querySelectorAll(".dock-icon");
      let cachedDockLeft = 0;
      let cachedIconCenters = [];

      const updateBounds = () => {
        const dockRect = dock.getBoundingClientRect();
        cachedDockLeft = dockRect.left;
        cachedIconCenters = Array.from(icons).map((icon) => {
          const r = icon.getBoundingClientRect();
          return {
            icon,
            center: r.left - dockRect.left + r.width / 2,
          };
        });
      };

      const animateIcons = (mouseX) => {
        if (!cachedIconCenters.length) updateBounds();

        cachedIconCenters.forEach(({ icon, center }) => {
          const distance = Math.abs(mouseX - center);
          const intensity = Math.exp(-(distance ** 2.4) / 18000);

          gsap.to(icon, {
            scale: 1 + (is2077 ? 0.32 : 0.32) * intensity,
            y: (is2077 ? -18 : -18) * intensity,
            duration: 0.12,
            ease: "back.out(1.5)",
            overwrite: "auto",
          });
        });
      };

      const handleMouseMove = (e) => {
        if (!cachedDockLeft) updateBounds();
        animateIcons(e.clientX - cachedDockLeft);
      };

      const resetIcons = () => {
        cachedIconCenters = [];
        cachedDockLeft = 0;
        icons.forEach((icon) =>
          gsap.to(icon, {
            scale: 1,
            y: 0,
            duration: 0.15,
            ease: "power2.out",
            overwrite: "auto",
          })
        );
      };

      dock.addEventListener("mouseenter", updateBounds);
      dock.addEventListener("mousemove", handleMouseMove);
      dock.addEventListener("mouseleave", resetIcons);

      return () => {
        dock.removeEventListener("mouseenter", updateBounds);
        dock.removeEventListener("mousemove", handleMouseMove);
        dock.removeEventListener("mouseleave", resetIcons);
      };
    },
    { dependencies: [is2077], revertOnUpdate: true }
  );

  const toggleApp = (app) => {
    if (!app.canOpen) return;

    const win = windows[app.id];
    if (!win) {
      console.error(`Window not found for app: ${app.id}`);
      return;
    }

    if (win.isOpen) {
      if (win.isMinimized) {
        openWindow(app.id);
      } else {
        focusWindow(app.id);
      }
    } else {
      openWindow(app.id);
    }
  };

  if (currentYear === "2004") return null;

  return (
    <section id="dock" className="select-none overflow-visible">
      <div
        ref={dockRootRef}
        className="relative group overflow-visible"
      >
        {/* Futuristic Cockpit bracket backdrop in 2077 mode */}
        {is2077 && (
          <div className="cyber-bracket-bottom absolute -inset-x-10 -top-3.5 -bottom-1 bg-[#00f0ff]/10 border-t border-[#00f0ff]/40 transition-all duration-300 pointer-events-none" />
        )}

        {/* Cockpit dock trapezoid backdrop in 2077 mode (separated so magnified icons are not clipped) */}
        {is2077 && (
          <div className="cyber-dock-bg absolute inset-0 transition-all duration-300 pointer-events-none" />
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

        {/* 2026 Authentic Liquid Glass Dock Capsule via @ybouane/liquidglass */}
        {is2026 && (
          <div
            ref={glassBoxRef}
            className="dock-liquid-glass absolute inset-0 rounded-[24px] sm:rounded-[36px] pointer-events-none"
            style={{ overflow: "visible" }}
          />
        )}

        <div
          ref={dockRef}
          className={clsx(
            "dock-container relative z-10 transition-all duration-300 overflow-visible",
            is2077
              ? "cyber-dock-container"
              : is2026
              ? "!border-none !bg-transparent !shadow-none !rounded-[24px] sm:!rounded-[40px]"
              : "!bg-white/10 !backdrop-blur-sm !border !border-white/40 shadow-lg shadow-black/5"
          )}
        >
          {dockApps.map(({ id, name, icon, canOpen }) => {
            const isOpen = windows[id]?.isOpen;
            return (
              <div
                key={id}
                className="relative flex flex-col items-center justify-center px-0.5 sm:px-1 overflow-visible"
              >
                <button
                  type="button"
                  className={clsx(
                    "dock-icon transition-filter duration-200",
                    is2077 && "hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                  )}
                  aria-label={name}
                  data-tooltip-id="dock-tooltip"
                  data-tooltip-content={name}
                  data-tooltip-delay-show={100}
                  disabled={!canOpen}
                  onClick={() => toggleApp({ id, canOpen })}
                >
                  <img
                    src={`images/${icon}`}
                    alt={name}
                    loading="lazy"
                    className={clsx(
                      "transition-opacity duration-150",
                      canOpen ? "" : "opacity-50",
                      is2077 && "filter brightness-110"
                    )}
                  />
                </button>

                {/* Open window indicator */}
                {isOpen && (
                  <span
                    className={clsx(
                      "size-1.5 absolute -bottom-1 pointer-events-none transition-all",
                      is2077
                        ? "rotate-45 bg-[#00f0ff] diamond-glow"
                        : isDark2026
                        ? "rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        : "rounded-full bg-neutral-800"
                    )}
                  />
                )}
              </div>
            );
          })}

          <Tooltip
            id="dock-tooltip"
            place="top"
            className={clsx(
              "tooltip",
              is2077 &&
                "!bg-[#021020] !border !border-[#00f0ff]/70 !text-[#00f0ff] cyan-glow font-mono text-[11px] tracking-wider"
            )}
          />
        </div>
      </div>
    </section>
  );
};

export default Dock;
