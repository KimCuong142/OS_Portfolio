import { useRef, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { dockApps } from "#constants";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useWindowStore from "#store/window";
import useThemeStore from "#store/theme";
import clsx from "clsx";
import { LiquidGlass } from "@ybouane/liquidglass";

gsap.registerPlugin(useGSAP);

const Dock = () => {
  const { openWindow, focusWindow, windows } = useWindowStore();
  const { currentYear } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2026 = currentYear === "2026";
  const dockRef = useRef(null);
  const dockRootRef = useRef(null);
  const glassBoxRef = useRef(null);
  const bgMirrorRef = useRef(null);

  // Background sampler: Continuously copy the slice of background canvas behind the dock
  // into the mirror canvas so LiquidGlass WebGL shader refracts the live background!
  useEffect(() => {
    if (!is2026) return;
    let animId;
    let isRunning = true;

    const updateMirror = () => {
      if (!isRunning) return;
      const bgCanvas = document.getElementById("cyber-2026-canvas");
      const mirrorCanvas = bgMirrorRef.current;
      const dockRoot = dockRootRef.current;

      if (bgCanvas && mirrorCanvas && dockRoot) {
        const dockRect = dockRoot.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pad = 20;

        const targetW = Math.round((dockRect.width + pad * 2) * dpr);
        const targetH = Math.round((dockRect.height + pad * 2) * dpr);

        if (mirrorCanvas.width !== targetW || mirrorCanvas.height !== targetH) {
          mirrorCanvas.width = targetW;
          mirrorCanvas.height = targetH;
        }

        const ctx = mirrorCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);

          const sx = Math.round((dockRect.left - pad) * dpr);
          const sy = Math.round((dockRect.top - pad) * dpr);
          const sw = targetW;
          const sh = targetH;

          const clampSx = Math.max(0, sx);
          const clampSy = Math.max(0, sy);
          const clampSw = Math.min(sw, bgCanvas.width - clampSx);
          const clampSh = Math.min(sh, bgCanvas.height - clampSy);
          const dx = clampSx - sx;
          const dy = clampSy - sy;

          if (clampSw > 0 && clampSh > 0 && bgCanvas.width > 0 && bgCanvas.height > 0) {
            ctx.drawImage(bgCanvas, clampSx, clampSy, clampSw, clampSh, dx, dy, clampSw, clampSh);
          }
        }
      }

      animId = requestAnimationFrame(updateMirror);
    };

    animId = requestAnimationFrame(updateMirror);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [is2026]);

  // Initialize WebGL LiquidGlass shader effect for 2026 Dock box
  useEffect(() => {
    if (!is2026) return;
    let instance = null;
    let isCancelled = false;

    const initGlass = async () => {
      // Let mirror canvas capture its first frame before compiling shaders
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (isCancelled || !dockRootRef.current || !glassBoxRef.current) return;

      try {
        instance = await LiquidGlass.init({
          root: dockRootRef.current,
          glassElements: [glassBoxRef.current],
          defaults: {
            blurAmount: 0,
            refraction: 0.75,
            chromAberration: 0.225,
            edgeHighlight: 0,
            specular: 0,
            fresnel: 2,
            distortion: 0,
            cornerRadius: 40,
            zRadius: 40,
            opacity: 1,
            saturation: 0,
            brightness: 0,
            shadowOpacity: 0.3,
            shadowSpread: 10,
            bevelMode: 0,
          },
        });

        if (isCancelled && instance) {
          instance.destroy();
        }
      } catch (err) {
        console.error("Failed to init LiquidGlass on dock:", err);
      }
    };

    initGlass();

    return () => {
      isCancelled = true;
      if (instance) {
        instance.destroy();
        instance = null;
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
      <div ref={dockRootRef} className="relative group overflow-visible">
        {/* Futuristic Cockpit bracket backdrop in 2077 mode */}
        {is2077 && (
          <div className="cyber-bracket-bottom absolute -inset-x-10 -top-3.5 -bottom-1 bg-[#00f0ff]/10 border-t border-[#00f0ff]/40 transition-all duration-300 pointer-events-none" />
        )}

        {/* Cockpit dock trapezoid backdrop in 2077 mode (separated so magnified icons are not clipped) */}
        {is2077 && (
          <div className="cyber-dock-bg absolute inset-0 transition-all duration-300 pointer-events-none" />
        )}

        {/* 2026 Dynamic Background Mirror Canvas captured for LiquidGlass */}
        {is2026 && (
          <canvas
            ref={bgMirrorRef}
            data-dynamic
            className="absolute pointer-events-none opacity-0 -z-20"
            style={{
              left: -20,
              top: -20,
              width: "calc(100% + 40px)",
              height: "calc(100% + 40px)",
            }}
          />
        )}

        {/* 2026 Liquid Glass Shader Box Element */}
        {is2026 && (
          <div
            ref={glassBoxRef}
            data-dynamic
            className="dock-liquid-glass absolute inset-0 rounded-[24px] sm:rounded-[40px] pointer-events-none"
            data-config={JSON.stringify({
              blurAmount: 0,
              refraction: 0.75,
              chromAberration: 0.225,
              edgeHighlight: 0,
              specular: 0,
              fresnel: 2,
              distortion: 0,
              cornerRadius: 40,
              zRadius: 40,
              opacity: 1,
              saturation: 0,
              brightness: 0,
              shadowOpacity: 0.3,
              shadowSpread: 10,
              bevelMode: 0,
            })}
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
