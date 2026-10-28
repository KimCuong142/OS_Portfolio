import { useRef, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { dockApps } from "#constants";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useWindowStore from "#store/window";
import useThemeStore from "#store/theme";
import { LiquidGlass } from "@ybouane/liquidglass";
import CyberDockWidgetBar from "./cyber/CyberDockWidgetBar";
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
    if (!is2026 && !is2077) return;

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
            blurAmount: is2077 ? 0.15 : 0,
            refraction: 1.5,
            chromAberration: 0.3,
            edgeHighlight: is2077 ? 0.3 : 0,
            specular: is2077 ? 0.55 : 0,
            fresnel: 1,
            distortion: is2077 ? 1 : 0.15,
            cornerRadius: is2077 ? 0 : 40,
            zRadius: is2077 ? 100 : 30,
            opacity: 1,
            saturation: is2077 ? 0.05 : 0.08,
            brightness: is2077 ? 0.15 : 0,
            shadowOpacity: is2077 ? 0 : 0.35,
            shadowSpread: 12,
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

    // Throttle mirror redraw (~30fps), cache layout rect and cap DPR: the glass only needs a soft backdrop
    let lastMirrorAt = 0;
    let cachedRect = null;
    let rectAt = 0;
    const refreshRect = () => {
      cachedRect = null;
    };
    window.addEventListener("resize", refreshRect);
    window.addEventListener("scroll", refreshRect, true);

    const updateMirror = (ts = 0) => {
      if (isDestroyed) return;
      if (ts - lastMirrorAt < 33) {
        rafId = requestAnimationFrame(updateMirror);
        return;
      }
      lastMirrorAt = ts;

      const mirror = bgMirrorRef.current;
      const root = dockRootRef.current;

      if (mirror && root) {
        if (!cachedRect || ts - rectAt > 500) {
          cachedRect = root.getBoundingClientRect();
          rectAt = ts;
        }
        const rootRect = cachedRect;
        const dpr = 1;
        const targetW = Math.round((rootRect.width + SHADOW_PAD * 2) * dpr);
        const targetH = Math.round((rootRect.height + SHADOW_PAD * 2) * dpr);

        if (mirror.width !== targetW || mirror.height !== targetH) {
          mirror.width = targetW;
          mirror.height = targetH;
        }

        const ctx = mirror.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.fillStyle = is2077
            ? "#01040a"
            : mode2026 === "dark"
            ? "#000000"
            : "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);

          const mirrorViewportX = rootRect.left - SHADOW_PAD;
          const mirrorViewportY = rootRect.top - SHADOW_PAD;
          const mirrorViewportW = rootRect.width + SHADOW_PAD * 2;
          const mirrorViewportH = rootRect.height + SHADOW_PAD * 2;

          // 1. Draw cyber canvas background slice (2077 3D tunnel or 2026 canvas)
          const cyberCanvas = is2077
            ? document.getElementById("cyber-2077-canvas")
            : document.getElementById("cyber-2026-canvas");

          if (cyberCanvas && cyberCanvas.width > 0 && cyberCanvas.height > 0) {
            const scaleX = cyberCanvas.width / window.innerWidth;
            const scaleY = cyberCanvas.height / window.innerHeight;

            const rawX = mirrorViewportX * scaleX;
            const rawY = mirrorViewportY * scaleY;
            const rawW = mirrorViewportW * scaleX;
            const rawH = mirrorViewportH * scaleY;

            // Clamped coordinates to strictly prevent IndexSizeError on boundary overflow
            const sx = Math.max(0, Math.min(cyberCanvas.width, rawX));
            const sy = Math.max(0, Math.min(cyberCanvas.height, rawY));
            const sRight = Math.max(0, Math.min(cyberCanvas.width, rawX + rawW));
            const sBottom = Math.max(0, Math.min(cyberCanvas.height, rawY + rawH));
            const sw = sRight - sx;
            const sh = sBottom - sy;

            if (sw > 0 && sh > 0) {
              const dx = (sx - rawX) * (targetW / rawW);
              const dy = (sy - rawY) * (targetH / rawH);
              const dw = sw * (targetW / rawW);
              const dh = sh * (targetH / rawH);
              try {
                ctx.drawImage(cyberCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
              } catch {
                // Ignore canvas read issues
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(updateMirror);
    };

    rafId = requestAnimationFrame(updateMirror);

    return () => {
      isDestroyed = true;
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect, true);
      if (rafId) cancelAnimationFrame(rafId);
      if (liquidInstance) {
        liquidInstance.destroy();
      }
    };
  }, [is2026, is2077, mode2026]);

  // GSAP Smooth Icon Magnification on Hover (Desktop pointer devices only)
  useGSAP(
    () => {
      const dock = dockRef.current;
      if (!dock || is2077) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 640px) and (hover: hover) and (pointer: fine)", () => {
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
              scale: 1 + 0.32 * intensity,
              y: -18 * intensity,
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
      });

      return () => mm.revert();
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
    <section
      id="dock"
      className={clsx(
        "select-none overflow-visible",
        is2077 &&
          "max-md:!bottom-auto max-md:!top-[56dvh] max-md:!-translate-y-1/2 max-md:!w-[calc(100vw-28px)] max-md:!max-w-[368px]"
      )}
    >
      <div
        ref={dockRootRef}
        className="relative group overflow-visible w-full"
      >
        {/* LiquidGlass Mirror Canvas for 2026 & 2077 (direct child before glass element) */}
        {(is2026 || is2077) && (
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

        {/* Authentic Liquid Glass Dock Capsule via @ybouane/liquidglass */}
        {(is2026 || is2077) && (
          <div
            ref={glassBoxRef}
            className={clsx(
              "dock-liquid-glass absolute inset-0 pointer-events-none",
              is2077
                ? "rounded-none"
                : "rounded-[26px] sm:rounded-[36px]"
            )}
            style={{ overflow: "visible" }}
          />
        )}

        {/* 2077 Liquid Glass Dynamic Island / Widget Dock */}
        {is2077 ? (
          <div
            ref={dockRef}
            className="cyber-liquid-dock relative z-10 transition-all duration-300 rounded-none overflow-visible"
          >
            <CyberDockWidgetBar />
          </div>
        ) : (
          <div
            ref={dockRef}
            className={clsx(
              "dock-container relative z-10 transition-all duration-300 overflow-visible",
              is2026
                ? "!border-none !bg-transparent !shadow-none !rounded-[26px] sm:!rounded-[40px]"
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
                    className="dock-icon transition-filter duration-200"
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
                        canOpen ? "" : "max-sm:opacity-95 sm:opacity-50"
                      )}
                    />
                  </button>

                  {/* Open window indicator */}
                  {isOpen && (
                    <span
                      className={clsx(
                        "size-1.5 absolute -bottom-1 pointer-events-none transition-all",
                        isDark2026
                          ? "rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                          : "rounded-full bg-neutral-800"
                      )}
                    />
                  )}
                </div>
              );
            })}

            <Tooltip id="dock-tooltip" place="top" className="tooltip" />
          </div>
        )}
      </div>
    </section>
  );
};

export default Dock;
