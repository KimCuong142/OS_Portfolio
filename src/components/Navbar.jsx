import { useState, useEffect } from "react";
import { navIcons, navLinks } from "#constants";
import useThemeStore from "#store/theme";
import useWindowStore from "#store/window";
import clsx from "clsx";
import dayjs from "dayjs";

const Navbar = () => {
  const { openWindow } = useWindowStore();
  const { currentYear, mode2026, toggleMode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2026 = currentYear === "2026";
  const isDark2026 = is2026 && mode2026 === "dark";

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
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
      request?.call(elem)?.catch?.(() => {});
    } else {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      exit?.call(document)?.catch?.(() => {});
    }
  };

  // Windows XP does not have a top macOS menubar
  if (currentYear === "2004") return null;

  return (
    <nav
      className={clsx(
        "relative z-30 flex justify-between items-center p-2 px-5 select-none transition-all duration-300",
        is2077
          ? "bg-[#021020]/25 backdrop-blur-sm border-b border-[#00f0ff]/25 text-[#00f0ff]"
          : isDark2026
          ? "bg-black/25 backdrop-blur-md border-b border-white/10 text-white/90 shadow-sm"
          : "bg-white/10 backdrop-blur-sm border-b border-black/5 text-neutral-800 shadow-sm"
      )}
    >
      {/* Left: Brand / Logo & Nav items */}
      <div className="flex items-center gap-4">
        {/* Cyber Brand badge */}
        <div
          className={clsx(
            "size-7 flex items-center justify-center font-bold text-xs tracking-wider transition-all",
            is2077
              ? "border border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff] font-orbitron box-glow rounded-sm"
              : isDark2026
              ? "border border-white/20 bg-white/10 text-white rounded-lg shadow-sm backdrop-blur-xs"
              : "border border-neutral-300/40 bg-white/20 text-neutral-800 rounded-lg shadow-sm backdrop-blur-xs"
          )}
        >
          {is2077 ? "R" : "KC"}
        </div>

        {!is2077 && (
          <>
            <p
              className={clsx(
                "font-bold text-sm tracking-wide hidden sm:block font-sans transition-colors",
                isDark2026 ? "text-white" : "text-neutral-900"
              )}
            >
              Kim Cuong's Portfolio
            </p>

            <ul className="flex items-center gap-4 max-md:hidden ml-2">
              {navLinks.map(({ id, name, type }) => (
                <li key={id} onClick={() => openWindow(type)}>
                  <p
                    className={clsx(
                      "text-xs cursor-pointer tracking-wider transition-all font-medium font-sans",
                      isDark2026
                        ? "text-white/70 hover:text-white"
                        : "text-neutral-600 hover:text-neutral-950"
                    )}
                  >
                    {name}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Right: Status & Clock */}
      <div className="flex items-center gap-3">
        {is2077 && (
          <div className="hidden lg:flex items-center space-x-2 text-[10px] text-[#00f0ff]/80 font-mono mr-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
            <span className="font-semibold">HUD_STABLE</span>
          </div>
        )}

        {/* 2026 Light / Dark Mode Toggle Button */}
        {is2026 && (
          <button
            type="button"
            onClick={toggleMode2026}
            className={clsx(
              "cursor-pointer focus:outline-none flex items-center justify-center size-7 rounded-full transition-all duration-300",
              isDark2026
                ? "bg-white/15 hover:bg-white/25 text-amber-300 border border-white/20 shadow-sm active:scale-90"
                : "bg-black/5 hover:bg-black/10 text-neutral-700 hover:text-neutral-950 border border-black/10 shadow-sm active:scale-90"
            )}
            title={
              isDark2026
                ? "Chuyển sang chế độ Sáng (Light Mode)"
                : "Chuyển sang chế độ Tối (Dark Mode)"
            }
            aria-label="Toggle Light/Dark Mode"
          >
            {isDark2026 ? (
              /* Sun Icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 transition-transform hover:rotate-45"
              >
                <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              /* Moon Icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 transition-transform hover:-rotate-12"
              >
                <path
                  d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                  fill="currentColor"
                  fillOpacity="0.2"
                />
              </svg>
            )}
          </button>
        )}

        <ul className="flex items-center gap-2 max-sm:hidden">
          {navIcons.map(({ id, img }) => (
            <li key={id}>
              <button
                type="button"
                onClick={id === 4 ? toggleFullscreen : undefined}
                className={clsx(
                  "focus:outline-none flex items-center justify-center p-0.5 rounded transition-all",
                  id === 4
                    ? clsx(
                        "cursor-pointer active:scale-95",
                        isDark2026 ? "hover:bg-white/10" : "hover:bg-black/5"
                      )
                    : "cursor-default"
                )}
                title={id === 4 ? (isFullscreen ? "Exit Fullscreen" : "Fullscreen") : undefined}
              >
                <img
                  src={img}
                  className={clsx(
                    "icon-hover size-4 transition-all",
                    is2077 && "filter brightness-150 contrast-125",
                    isDark2026 && "filter invert brightness-200 opacity-80 hover:opacity-100",
                    id === 4 && isFullscreen && "opacity-90"
                  )}
                  alt={`icons-${id}`}
                />
              </button>
            </li>
          ))}
        </ul>

        <time
          className={clsx(
            "text-xs font-medium tracking-wider transition-colors",
            is2077
              ? "text-[#00f0ff] font-mono"
              : isDark2026
              ? "text-white/90 font-sans"
              : "text-neutral-800 font-sans"
          )}
        >
          {dayjs().format("MMM D h:mm A")}
        </time>
      </div>
    </nav>
  );
};

export default Navbar;
