import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import useThemeStore from "#store/theme";
import clsx from "clsx";

gsap.registerPlugin(useGSAP);

const renderText = (text, className) => {
  return [...text].map((char, i) => (
    <span
      key={i}
      className={clsx(className, "inline-block will-change-transform select-none")}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
};

// High-performance GSAP hover effect using GPU transforms (scale & y)
// Avoids fontVariationSettings layout thrashing and continuous text-shadow re-rasterization
const setupTextHover = (container, type) => {
  if (!container) return () => {};

  const letters = container.querySelectorAll("span");
  let cachedBounds = null;

  const updateBounds = () => {
    const rect = container.getBoundingClientRect();
    cachedBounds = {
      left: rect.left,
      items: Array.from(letters).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          center: r.left - rect.left + r.width / 2,
        };
      }),
    };
  };

  const handleMouseMove = (e) => {
    if (!cachedBounds) updateBounds();
    const mouseX = e.clientX - cachedBounds.left;

    cachedBounds.items.forEach(({ el, center }) => {
      const distance = Math.abs(mouseX - center);
      const intensity = Math.exp(-(distance ** 2) / (type === "title" ? 5400 : 2800));

      gsap.to(el, {
        y: (type === "title" ? -14 : -6) * intensity,
        scale: 1 + (type === "title" ? 0.16 : 0.08) * intensity,
        duration: 0.22,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  };

  const handleMouseLeave = () => {
    if (!cachedBounds) return;
    cachedBounds.items.forEach(({ el }) => {
      gsap.to(el, {
        y: 0,
        scale: 1,
        duration: 0.32,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
    cachedBounds = null;
  };

  container.addEventListener("mouseenter", updateBounds);
  container.addEventListener("mousemove", handleMouseMove);
  container.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    container.removeEventListener("mouseenter", updateBounds);
    container.removeEventListener("mousemove", handleMouseMove);
    container.removeEventListener("mouseleave", handleMouseLeave);
  };
};

const Welcome = () => {
  const rootRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const { currentYear } = useThemeStore();
  const is2077 = currentYear === "2077";

  useGSAP(
    () => {
      if (!is2077) return;
      const titleCleanup = setupTextHover(titleRef.current, "title");
      const subtitleCleanup = setupTextHover(subtitleRef.current, "subtitle");
      return () => {
        titleCleanup();
        subtitleCleanup();
      };
    },
    { dependencies: [is2077], scope: rootRef }
  );

  // Show welcome hero ONLY in 2077, hidden in 2026 and other years
  if (!is2077) return null;

  return (
    <section
      ref={rootRef}
      id="welcome"
      className="select-none pointer-events-none z-10 flex flex-col items-center justify-center text-center"
    >
      <p ref={subtitleRef} className="pointer-events-auto cursor-default">
        {renderText(
          "Hey, I'm Kim Cuong! Welcome to my",
          "text-xs sm:text-2xl md:text-3xl font-orbitron tracking-wider sm:tracking-widest text-[#00f0ff]/90 drop-shadow-[0_0_10px_rgba(0,240,255,0.6)] px-2"
        )}
      </p>
      <h1 ref={titleRef} className="mt-1 sm:mt-4 pointer-events-auto cursor-default">
        {renderText(
          "portfolio",
          "text-5xl sm:text-7xl md:text-9xl italic font-georama text-[#00f0ff] cyan-glow drop-shadow-[0_0_24px_rgba(0,240,255,0.8)]"
        )}
      </h1>
    </section>
  );
};

export default Welcome;
