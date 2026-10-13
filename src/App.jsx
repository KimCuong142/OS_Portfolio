import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import {
  CyberBackground,
  Dock,
  Home,
  Navbar,
  TimelineSelector,
  Welcome,
  XPTaskbar,
} from "#components";
import {
  Finder,
  Resume,
  Terminal,
  Text,
  Image,
  Contact,
  Photos,
} from "#windows";

import { useEffect } from "react";
import useThemeStore from "#store/theme";
import clsx from "clsx";

gsap.registerPlugin(Draggable);

const App = () => {
  const { currentYear } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";

  useEffect(() => {
    document.body.classList.remove("theme-2077", "theme-2026", "theme-2004");
    if (is2077) {
      document.body.classList.add("theme-2077");
    } else if (is2004) {
      document.body.classList.add("theme-2004");
    } else {
      document.body.classList.add("theme-2026");
    }
  }, [is2077, is2004]);

  // Auto-request Fullscreen on the very first direct user gesture (click / tap)
  useEffect(() => {
    let triggered = false;

    const requestFullscreenOnGesture = () => {
      if (triggered) return;
      triggered = true;

      const isFs = Boolean(
        document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
      );

      if (!isFs) {
        const elem = document.documentElement;
        const request =
          elem.requestFullscreen ||
          elem.webkitRequestFullscreen ||
          elem.mozRequestFullScreen ||
          elem.msRequestFullscreen;

        if (request) {
          try {
            const promise = request.call(elem);
            if (promise && typeof promise.catch === "function") {
              promise.catch(() => {});
            }
          } catch {
            // Silently ignore if blocked by browser policy
          }
        }
      }

      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("click", requestFullscreenOnGesture, true);
      window.removeEventListener("touchend", requestFullscreenOnGesture, true);
    };

    window.addEventListener("click", requestFullscreenOnGesture, true);
    window.addEventListener("touchend", requestFullscreenOnGesture, true);

    return cleanup;
  }, []);

  return (
    <main
      className={clsx(
        "relative w-dvw h-dvh overflow-hidden select-none",
        is2077 ? "font-mono" : is2004 ? "font-['Tahoma',sans-serif]" : "font-sans"
      )}
    >
      <CyberBackground />
      <Navbar />
      <TimelineSelector />
      <Welcome />
      <Dock />
      {is2004 && <XPTaskbar />}

      <Terminal />
      <Resume />
      <Finder />
      <Text />
      <Image />
      <Contact />
      <Photos />

      <Home />
    </main>
  );
};

export default App;
