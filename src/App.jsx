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
  Safari,
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
      <Safari />
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
