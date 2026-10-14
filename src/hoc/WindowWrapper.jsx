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

    // Synchronously elevate window to top on any touch/click/drag
    const handleFocus = () => {
      focusWindow(windowkey);
      if (ref.current) {
        const nextZ = useWindowStore.getState().nextZIndex;
        ref.current.style.zIndex = String(nextZ + 1);
      }
    };

    // Keep DOM element zIndex synced with store zIndex
    useEffect(() => {
      if (ref.current) {
        ref.current.style.zIndex = String(zIndex);
      }
    }, [zIndex]);

    // Center window in viewport
    const centerWindow = () => {
      const el = ref.current;
      if (!el) return;

      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        el.style.left = "8px";
        el.style.top = "44px";
        gsap.set(el, { x: 0, y: 0 });
        if (draggableInstanceRef.current) {
          draggableInstanceRef.current.update();
        }
        return;
      }

      const elWidth = el.offsetWidth || 620;
      const elHeight = el.offsetHeight || 420;

      const centerX = Math.max(16, Math.round((window.innerWidth - elWidth) / 2));
      const availableHeight = window.innerHeight - 36 - 72;
      const centerY = Math.max(
        44,
        Math.round(36 + Math.max(0, (availableHeight - elHeight) / 2))
      );

      el.style.left = `${centerX}px`;
      el.style.top = `${centerY}px`;
      gsap.set(el, { x: 0, y: 0 });

      if (draggableInstanceRef.current) {
        draggableInstanceRef.current.update();
      }
    };

    // Capture-phase listener: bring window to front even if child stops event propagation
    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      const onPointerDownCapture = () => {
        handleFocus();
      };

      el.addEventListener("pointerdown", onPointerDownCapture, true);
      el.addEventListener("touchstart", onPointerDownCapture, true);
      el.addEventListener("mousedown", onPointerDownCapture, true);

      return () => {
        el.removeEventListener("pointerdown", onPointerDownCapture, true);
        el.removeEventListener("touchstart", onPointerDownCapture, true);
        el.removeEventListener("mousedown", onPointerDownCapture, true);
      };
    }, [windowkey]);

    // GSAP Draggable Setup
    useGSAP(() => {
      const el = ref.current;
      if (!el) return;

      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        gsap.set(el, { x: 0 });
      }

      const [instance] = Draggable.create(el, {
        zIndexBoost: false, // Prevents GSAP from reverting zIndex to old value after dragging
        onPress: handleFocus,
        onDragStart: () => {
          handleFocus();
          el.style.transition = "none";
        },
        onDrag: handleFocus,
        onDragEnd: () => {
          el.style.transition = "";
        },
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

    // Handle Open Animation & Centering
    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      if (isOpen && !prevOpenRef.current && !isMinimized) {
        el.style.display = "flex";
        handleFocus();
        centerWindow();

        gsap.fromTo(
          el,
          { scale: 0.85, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
        );

        // Re-check after browser paints content
        requestAnimationFrame(() => {
          if (
            draggableInstanceRef.current &&
            draggableInstanceRef.current.x === 0 &&
            draggableInstanceRef.current.y === 0
          ) {
            centerWindow();
          }
        });
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
        handleFocus();
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
      if (
        e.target.closest("#window-controls") ||
        e.target.closest("button") ||
        e.target.closest("input")
      ) {
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
        onPointerDown={handleFocus}
        onMouseDown={handleFocus}
        onTouchStart={handleFocus}
        onDoubleClick={handleDoubleClick}
        className={`absolute flex flex-col transition-[width,height,top,left,right,bottom,border-radius,box-shadow] duration-300 ease-out ${
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
