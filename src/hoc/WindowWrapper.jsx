import useWindowStore from "#store/window";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useLayoutEffect, useRef, useEffect } from "react";

const WindowWrapper = (Component, windowkey) => {
  const Wrapped = (props) => {
    const focusWindow = useWindowStore((s) => s.focusWindow);
    const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
    const isOpen = useWindowStore((s) => s.windows[windowkey]?.isOpen ?? false);
    const isMinimized = useWindowStore((s) => s.windows[windowkey]?.isMinimized ?? false);
    const isMaximized = useWindowStore((s) => s.windows[windowkey]?.isMaximized ?? false);
    const zIndex = useWindowStore((s) => s.windows[windowkey]?.zIndex ?? 1000);
    const ref = useRef(null);
    const draggableInstanceRef = useRef(null);
    const prevOpenRef = useRef(false);
    const prevMinimizedRef = useRef(false);

    // GSAP Draggable Setup
    useGSAP(() => {
      const el = ref.current;
      if (!el) return;

      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        gsap.set(el, { x: 0 });
      }

      const [instance] = Draggable.create(el, {
        onPress: () => focusWindow(windowkey),
        edgeResistance: 0.7,
        type: "x,y",
        bounds: "main",
      });
      draggableInstanceRef.current = instance;

      return () => {
        if (instance) instance.kill();
      };
    }, []);

    // Disable dragging when maximized, re-enable when restored
    useEffect(() => {
      const instance = draggableInstanceRef.current;
      if (!instance) return;
      if (isMaximized) {
        instance.disable();
      } else {
        instance.enable();
      }
    }, [isMaximized]);

    // Handle Open Animation
    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      if (isOpen && !prevOpenRef.current && !isMinimized) {
        el.style.display = "flex";
        if (window.innerWidth < 640) {
          gsap.set(el, { x: 0 });
        }
        gsap.fromTo(
          el,
          { scale: 0.85, opacity: 0, y: 30 },
          { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
        );
      }
      prevOpenRef.current = isOpen;
    }, [isOpen, isMinimized]);

    // Handle Minimize / Restore Animation
    useEffect(() => {
      const el = ref.current;
      if (!el || !isOpen) return;

      if (isMinimized && !prevMinimizedRef.current) {
        // Minimizing window towards dock
        gsap.to(el, {
          scale: 0.2,
          y: 400,
          opacity: 0,
          duration: 0.28,
          ease: "power2.in",
          onComplete: () => {
            if (el) el.style.display = "none";
          },
        });
      } else if (!isMinimized && prevMinimizedRef.current) {
        // Restoring window from dock
        el.style.display = "flex";
        gsap.fromTo(
          el,
          { scale: 0.2, y: 400, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
        );
      }
      prevMinimizedRef.current = isMinimized;
    }, [isMinimized, isOpen]);

    // Initial / layout visibility
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (!isOpen || isMinimized) {
        el.style.display = "none";
      } else {
        el.style.display = "flex";
      }
    }, [isOpen, isMinimized]);

    // Double click header to toggle maximize (like real macOS)
    const handleDoubleClick = (e) => {
      if (e.target.closest("#window-controls") || e.target.closest("button") || e.target.closest("input")) {
        return;
      }
      if (e.target.closest("#window-header")) {
        toggleMaximize(windowkey);
      }
    };

    return (
      <section
        id={windowkey}
        ref={ref}
        style={{ zIndex }}
        onMouseDown={() => focusWindow(windowkey)}
        onDoubleClick={handleDoubleClick}
        className={`absolute flex flex-col transition-all duration-300 ease-out ${
          isMaximized ? "window-maximized" : ""
        }`}
      >
        <Component {...props} />
      </section>
    );
  };

  Wrapped.displayName = `WindowWrapper(${
    Component.displayName || Component.name || "Component"
  })`;

  return Wrapped;
};

export default WindowWrapper;
