import { locations } from "#constants";
import useLocationStore from "#store/location";
import useWindowStore from "#store/window";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

import useThemeStore from "#store/theme";

const projects = locations.work.children ?? [];

const Home = () => {
  const { setActiveLocation } = useLocationStore();
  const { openWindow } = useWindowStore();
  const { currentYear, mode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";
  const isDark2026 = currentYear === "2026" && mode2026 === "dark";

  const handleOpenProjectFinder = (project) => {
    setActiveLocation(project);
    openWindow("finder");
  };

  useGSAP(() => {
    if (is2077) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 640px)", () => {
      const instances = Draggable.create(".folder, .xp-desktop-item");
      return () => {
        instances.forEach((inst) => inst.kill());
      };
    });
    return () => mm.revert();
  }, [is2077, is2004]);

  if (is2077) return null;

  if (is2004) {
    const bidKoiProject =
      projects.find((p) => p.name === "BidKoi" || p.name.includes("BidKoi")) ||
      projects[3];
    const happyPawProject = projects.find((p) => p.name === "Happy Paw Website") || projects[1];
    const hiVisionProject = projects.find((p) => p.name === "Hi-Vision Website") || projects[0];
    const resqProject = projects.find((p) => p.name === "ResQ Mien Trung") || projects[2];

    // Arranged in exact order: Column 1, Column 2, Column 3 with grid-flow-col grid-rows-3
    const xpDesktopItems = [
      // Column 1: System
      {
        id: "xp-comp",
        name: "My Computer",
        icon: "/xp/Icon/This Computer.png",
        action: () => {
          setActiveLocation(locations.work);
          openWindow("finder");
        },
      },
      {
        id: "xp-docs",
        name: "My Documents",
        icon: "/xp/Icon/My Documents.png",
        action: () => {
          setActiveLocation(locations.about);
          openWindow("finder");
        },
      },
      {
        id: "xp-trash",
        name: "Recycle Bin",
        icon: "/xp/Icon/Bin.png",
        action: () => {
          setActiveLocation(locations.trash);
          openWindow("finder");
        },
      },

      // Column 2: Media & Projects
      {
        id: "xp-pics",
        name: "My Pictures",
        icon: "/xp/Icon/My Pictures.png",
        action: () => openWindow("photos"),
      },
      {
        id: "xp-bidkoi",
        name: "BidKoi",
        icon: "/xp/Icon/My Documents.png",
        action: () => bidKoiProject && handleOpenProjectFinder(bidKoiProject),
      },
      {
        id: "xp-happypaw",
        name: "Happy Paw Website",
        icon: "/xp/Icon/My Documents.png",
        action: () => happyPawProject && handleOpenProjectFinder(happyPawProject),
      },

      // Column 3: Projects
      {
        id: "xp-hivision",
        name: "Hi-Vision Website",
        icon: "/xp/Icon/My Documents.png",
        action: () => hiVisionProject && handleOpenProjectFinder(hiVisionProject),
      },
      {
        id: "xp-resq",
        name: "ResQ Mien Trung",
        icon: "/xp/Icon/My Documents.png",
        action: () => resqProject && handleOpenProjectFinder(resqProject),
      },
    ];

    return (
      <section
        id="xp-home"
        className="absolute inset-0 p-3 sm:p-6 pt-24 sm:pt-7 pointer-events-none select-none z-10 font-['Tahoma',sans-serif] overflow-y-auto sm:overflow-visible pb-14 sm:pb-0"
      >
        <div className="grid grid-cols-3 sm:grid-flow-col sm:grid-rows-3 gap-y-4 sm:gap-y-7 gap-x-2 sm:gap-x-6 w-full sm:w-fit max-w-[380px] sm:max-w-none mx-auto sm:mx-0 pointer-events-auto">
          {xpDesktopItems.map((item) => (
            <div
              key={item.id}
              onClick={item.action}
              className="xp-desktop-item group flex flex-col items-center justify-start w-full sm:w-[76px] p-1 rounded-sm cursor-pointer hover:bg-[#0b61ff]/30 active:bg-[#0b61ff]/50 border border-transparent hover:border-[#ffffff]/40 transition-colors"
            >
              <img
                src={item.icon}
                alt={item.name}
                className="w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform pointer-events-none"
              />
              <span className="text-[10px] sm:text-[11px] text-white text-center mt-1 px-1 py-0.5 rounded leading-tight drop-shadow-[1px_1px_1px_rgba(0,0,0,0.95)] line-clamp-2 select-none">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="home"
      className="pointer-events-none max-sm:fixed max-sm:inset-x-0 max-sm:top-[57dvh] max-sm:bottom-[82px] max-sm:flex max-sm:items-center max-sm:justify-center max-sm:px-6 max-sm:z-20"
    >
      <ul className="max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-10 max-sm:gap-y-4 max-sm:w-full max-sm:max-w-[320px] max-sm:place-items-center">
        {projects.map((project) => {
          const hasWebsiteSuffix = project.name.endsWith(" Website");

          return (
            <li
              key={project.id}
              className={clsx(
                "group folder cursor-pointer max-sm:w-full sm:w-28 flex flex-col items-center justify-start pointer-events-auto max-sm:active:scale-95 transition-transform",
                project.windowPosition
              )}
              onClick={() => handleOpenProjectFinder(project)}
            >
              <img
                src="/images/folder.png"
                alt={project.name}
                className={clsx(
                  "w-14 sm:w-16 h-auto transition-transform group-hover:scale-105 max-sm:drop-shadow-[0_3px_6px_rgba(0,0,0,0.12)]",
                  is2077 && "drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                )}
              />
              <p
                className={clsx(
                  "text-xs text-center px-1.5 py-0.5 mt-1 max-sm:leading-snug sm:max-w-36 transition-all select-none",
                  hasWebsiteSuffix ? "max-sm:max-w-[100px]" : "max-sm:whitespace-nowrap",
                  is2077
                    ? "text-[#00f0ff] font-mono bg-[#021020]/80 border border-[#00f0ff]/30 group-hover:bg-[#00f0ff] group-hover:text-black group-hover:border-[#00f0ff]"
                    : isDark2026
                    ? "text-white font-sans font-medium [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] group-hover:text-white"
                    : "text-neutral-800 font-sans font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.15)] group-hover:text-neutral-950"
                )}
              >
                {project.name}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Home;
