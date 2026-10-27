import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import TunnelEngine from "./TunnelEngine";

gsap.registerPlugin(useGSAP);

// Elements over which the HUD reticle hides and the system cursor returns.
const UI_SELECTOR =
  "nav, #dock, [data-cyber-ui], section[id]:not(#welcome):not(#home), #home li, button, a, input";

const isOverUI = (target) =>
  target instanceof Element && Boolean(target.closest(UI_SELECTOR));

const CyberTunnel3D = ({ active = true }) => {
  const rootRef = useRef(null);
  const canvasHostRef = useRef(null);
  const reticleRef = useRef(null);
  const engineRef = useRef(null);

  // Initialize WebGL engine once
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let engine;
    try {
      engine = new TunnelEngine(host);
      engineRef.current = engine;
    } catch (err) {
      console.error("[CyberTunnel3D] WebGL unavailable:", err);
      return;
    }

    // If initial active is false, pause immediately
    if (!active) {
      engine.pause();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // Handle active state changes: pause/resume and event listeners
  useEffect(() => {
    const engine = engineRef.current;
    const reticle = reticleRef.current;
    if (!engine || !reticle) return;

    if (!active) {
      engine.pause();
      document.body.classList.remove("cyber-hide-cursor");
      gsap.to(reticle, { opacity: 0, scale: 0.6, duration: 0.2, overwrite: "auto" });
      return;
    }

    // Resume rendering immediately
    engine.resume();

    const u = engine.uniforms;
    const fx = engine.fxUniforms;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Intro timeline on activation
    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    intro
      .fromTo(
        engine,
        { speed: reduceMotion ? 3 : 20 },
        { speed: reduceMotion ? 2 : 5.0, duration: 1.8, ease: "expo.out" },
        0
      )
      .fromTo(u.uBendAmp, { value: 0.2 }, { value: 1.0, duration: 2.0, ease: "sine.inOut" }, 0)
      .fromTo(fx.uGlitch, { value: 0.35 }, { value: 0.0, duration: 0.8, ease: "power2.out" }, 0);

    gsap.set(reticle, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.68,
      opacity: 0,
      scale: 0.8,
    });

    const setX = gsap.quickSetter(reticle, "x", "px");
    const setY = gsap.quickSetter(reticle, "y", "px");

    const chevrons = reticle.querySelector(".reticle-chevrons");
    gsap.to(chevrons, {
      rotation: 360,
      duration: 12,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%",
    });

    intro
      .to(reticle, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }, 0.2)
      .to(u.uRepel, { value: 1.0, duration: 0.8, ease: "power2.out" }, 0.2);

    let reticleVisible = true;
    const showReticle = (show) => {
      if (show === reticleVisible) return;
      reticleVisible = show;
      gsap.to(reticle, {
        opacity: show ? 1 : 0,
        scale: show ? 1 : 0.6,
        duration: 0.15,
        overwrite: "auto",
      });
      if (show) {
        document.body.classList.add("cyber-hide-cursor");
      } else {
        document.body.classList.remove("cyber-hide-cursor");
      }
    };

    // Coalesce pointer events: apply at most once per frame (mice report up to 1000Hz)
    let pendingX = 0;
    let pendingY = 0;
    let rafPending = false;
    let lastTarget = null;
    let lastOverUI = false;
    let repelActive = false;

    const applyPointer = () => {
      rafPending = false;
      const nx = (pendingX / window.innerWidth) * 2 - 1;
      const ny = -((pendingY / window.innerHeight) * 2 - 1);
      engine.setMouse(nx, ny);
      setX(pendingX);
      setY(pendingY);
    };

    const onPointerMove = (e) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyPointer);
      }

      // Cache UI hit-test per target element (closest() with a long selector is costly)
      if (e.target !== lastTarget) {
        lastTarget = e.target;
        lastOverUI = isOverUI(e.target);
      }
      showReticle(!lastOverUI);

      if (!repelActive) {
        repelActive = true;
        gsap.to(u.uRepel, { value: 1.0, duration: 0.4, ease: "power2.out", overwrite: "auto" });
      }
    };

    const onPointerLeave = (e) => {
      if (e.relatedTarget) return;
      showReticle(false);
      repelActive = false;
      gsap.to(u.uRepel, { value: 0.4, duration: 0.8, ease: "power2.inOut", overwrite: "auto" });
    };

    const onPointerDown = (e) => {
      if (isOverUI(e.target)) return;
      gsap
        .timeline()
        .to(u.uRepel, { value: 1.8, duration: 0.1, ease: "power2.out", overwrite: true })
        .to(u.uRepel, { value: 1.0, duration: 1.0, ease: "elastic.out(1, 0.4)" });

      gsap.fromTo(fx.uGlitch, { value: 0.4 }, { value: 0.0, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(
        chevrons,
        { scale: 1.4 },
        { scale: 1.0, duration: 0.45, ease: "back.out(2.2)", transformOrigin: "50% 50%" }
      );
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("mouseout", onPointerLeave);

    let pulseCall;
    const schedulePulse = () => {
      pulseCall = gsap.delayedCall(gsap.utils.random(5, 10), () => {
        if (Math.random() < 0.35) {
          gsap
            .timeline()
            .to(engine, { speed: 13.0, duration: 0.5, ease: "power2.in" })
            .to(engine, { speed: 5.0, duration: 1.6, ease: "power3.out" });
        }
        schedulePulse();
      });
    };
    if (!reduceMotion) schedulePulse();

    return () => {
      pulseCall?.kill();
      document.body.classList.remove("cyber-hide-cursor");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mouseout", onPointerLeave);
      gsap.killTweensOf([engine, u.uRepel, u.uBendAmp, fx.uGlitch, fx.uAberration]);
    };
  }, [active]);

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 ${
        active ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      }`}
    >
      <div ref={canvasHostRef} className="absolute inset-0" aria-hidden="true" />

      {/* HUD Target Cursor (portaled to body) */}
      {active &&
        createPortal(
          <div
            ref={reticleRef}
            className="cyber-reticle fixed top-0 left-0 z-[9999] pointer-events-none"
            aria-hidden="true"
          >
            <svg width="68" height="68" viewBox="-34 -34 68 68" fill="none">
              <g
                className="reticle-chevrons"
                stroke="#00f0ff"
                strokeWidth="1.8"
                strokeLinecap="square"
              >
                <path d="M-6 -20 L0 -26 L6 -20" />
                <path d="M-6 20 L0 26 L6 20" />
                <path d="M-20 -6 L-26 0 L-20 6" />
                <path d="M20 -6 L26 0 L20 6" />
              </g>
              <rect
                x="-8"
                y="-8"
                width="16"
                height="16"
                transform="rotate(45)"
                stroke="#00f0ff"
                strokeWidth="1.5"
                fill="rgba(0,240,255,0.15)"
              />
              <rect
                x="-3.5"
                y="-3.5"
                width="7"
                height="7"
                transform="rotate(45)"
                fill="#00f0ff"
              />
            </svg>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CyberTunnel3D;
