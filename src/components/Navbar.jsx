import { useState, useEffect, useRef } from "react";
import { navIcons, navLinks } from "#constants";
import useThemeStore from "#store/theme";
import useWindowStore from "#store/window";
import clsx from "clsx";
import dayjs from "dayjs";
import gsap from "gsap";

const Navbar = () => {
  const { openWindow } = useWindowStore();
  const { currentYear, mode2026, toggleMode2026 } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2026 = currentYear === "2026";
  const isDark2026 = is2026 && mode2026 === "dark";

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cyberStats, setCyberStats] = useState({
    cpu: 57,
    mem: 69,
    net: 61,
    ping: 14,
  });
  const menuRef = useRef(null);
  const notchFillRef = useRef(null);
  const notchStrokeRef = useRef(null);

  // Morph the 2077 Notch downward out of the flat Navbar edge whenever entering 2077 mode
  useEffect(() => {
    const fillEl = notchFillRef.current;
    const strokeEl = notchStrokeRef.current;
    if (!fillEl || !strokeEl) return;

    const applyDepth = (d) => {
      fillEl.setAttribute(
        "d",
        `M 0,-3 L 460,-3 L 460,0.5 C 426,0.5 418,${d} 388,${d} L 72,${d} C 42,${d} 34,0.5 0,0.5 Z`
      );
      strokeEl.setAttribute(
        "d",
        `M -3000,0.5 L 0,0.5 C 34,0.5 42,${d} 72,${d} L 388,${d} C 418,${d} 426,0.5 460,0.5 L 3460,0.5`
      );
    };

    const proxy = { d: is2077 ? 0.5 : 44.5 };
    applyDepth(proxy.d);

    const tween = gsap.to(proxy, {
      d: is2077 ? 44.5 : 0.5,
      delay: is2077 ? 0.05 : 0,
      duration: is2077 ? 0.6 : 0.35,
      ease: is2077 ? "back.out(1.45)" : "power3.inOut",
      onUpdate: () => applyDepth(proxy.d),
    });

    return () => {
      tween.kill();
    };
  }, [is2077]);

  useEffect(() => {
    if (!is2077) return;
    const rand = (min, max) => Math.round(min + Math.random() * (max - min));
    const id = setInterval(() => {
      setCyberStats((s) => ({
        cpu: Math.min(99, Math.max(20, s.cpu + rand(-6, 6))),
        mem: Math.min(95, Math.max(40, s.mem + rand(-3, 3))),
        net: Math.min(99, Math.max(30, s.net + rand(-5, 5))),
        ping: Math.max(6, Math.min(40, s.ping + rand(-3, 3))),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, [is2077]);

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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [mobileMenuOpen]);

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
      ref={menuRef}
      className={clsx(
        "relative flex justify-between items-center h-11 px-4 sm:px-5 select-none transition-colors duration-300",
        mobileMenuOpen ? "z-50" : "z-40",
        is2077
          ? "!bg-[#081322] !backdrop-blur-none border-b-0 text-[#00f0ff]"
          : isDark2026
          ? "bg-black/40 sm:bg-black/25 backdrop-blur-xl sm:backdrop-blur-md border-b border-white/10 text-white/90 shadow-sm"
          : "bg-[#eef2f7]/90 sm:bg-white/10 backdrop-blur-xl sm:backdrop-blur-sm border-b border-black/5 text-neutral-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:shadow-sm"
      )}
    >
      {/* Left: Brand / Logo & 2026 Nav items / 2077 Streamlined Telemetry */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
        {/* Brand badge: circular pill on mobile, rounded badge on desktop */}
        <div
          className={clsx(
            "size-8 sm:size-7 flex-shrink-0 flex items-center justify-center font-extrabold sm:font-bold text-xs tracking-wider transition-all",
            is2077
              ? "border border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff] font-orbitron box-glow rounded-full sm:rounded-sm"
              : isDark2026
              ? "border border-white/20 bg-white/15 sm:bg-white/10 text-white rounded-full sm:rounded-lg shadow-sm backdrop-blur-xs"
              : "border border-black/5 sm:border-neutral-300/40 bg-white sm:bg-white/20 text-neutral-900 sm:text-neutral-800 rounded-full sm:rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:shadow-sm backdrop-blur-xs"
          )}
        >
          {is2077 ? "R" : "KC"}
        </div>

        {is2077 ? (
          /* Streamlined, unboxed telemetry stats without bulky card borders */
          <div className="hidden md:flex items-center gap-3 lg:gap-4 font-mono text-[10px] text-[#00f0ff] pl-2 border-l border-[#00f0ff]/25">
            {/* CPU */}
            <div className="flex items-center gap-1.5" title="CPU Usage">
              <svg className="w-3.5 h-3.5 -rotate-90 text-[#00f0ff] flex-shrink-0" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.2" />
                <circle
                  cx="9"
                  cy="9"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeDasharray={2 * Math.PI * 6.5}
                  strokeDashoffset={2 * Math.PI * 6.5 * (1 - cyberStats.cpu / 100)}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <span className="text-[#00f0ff]/70 text-[10px]">CPU</span>
              <b className="text-[#7df9ff] text-[11px] font-bold tabular-nums">{cyberStats.cpu}%</b>
            </div>

            <span className="w-[1px] h-3 bg-[#00f0ff]/20" />

            {/* MEM */}
            <div className="flex items-center gap-1.5" title="Memory Allocation">
              <svg className="w-3.5 h-3.5 -rotate-90 text-[#00f0ff] flex-shrink-0" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.2" />
                <circle
                  cx="9"
                  cy="9"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeDasharray={2 * Math.PI * 6.5}
                  strokeDashoffset={2 * Math.PI * 6.5 * (1 - cyberStats.mem / 100)}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <span className="text-[#00f0ff]/70 text-[10px]">MEM</span>
              <b className="text-[#7df9ff] text-[11px] font-bold tabular-nums">{cyberStats.mem}%</b>
            </div>

            <span className="hidden lg:block w-[1px] h-3 bg-[#00f0ff]/20" />

            {/* NET / Latency */}
            <div className="hidden lg:flex items-center gap-1.5" title="Network Uplink & Latency">
              <svg className="w-3.5 h-3.5 -rotate-90 text-[#00f0ff] flex-shrink-0" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.2" />
                <circle
                  cx="9"
                  cy="9"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeDasharray={2 * Math.PI * 6.5}
                  strokeDashoffset={2 * Math.PI * 6.5 * (1 - cyberStats.net / 100)}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <span className="text-[#00f0ff]/70 text-[10px]">NET</span>
              <b className="text-[#7df9ff] text-[11px] font-bold tabular-nums">{cyberStats.net}%</b>
              <span className="hidden xl:inline text-[#00f0ff]/60 text-[9.5px] tabular-nums pl-0.5">· {cyberStats.ping}ms</span>
            </div>
          </div>
        ) : (
          <>
            <p
              className={clsx(
                "font-bold text-sm tracking-wide hidden sm:block font-sans transition-colors",
                isDark2026 ? "text-white" : "text-neutral-900"
              )}
            >
              Kim Cuong's Portfolio
            </p>

            <ul className="hidden md:flex items-center gap-4 ml-2">
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

      {/* Right: Dark Mode Toggle, Hamburger Menu, Icons & Clock */}
      <div className="flex items-center gap-3 sm:gap-3.5 flex-shrink-0">

        {/* 2026 Light / Dark Mode Toggle Button */}
        {is2026 && (
          <button
            type="button"
            onClick={toggleMode2026}
            className={clsx(
              "cursor-pointer focus:outline-none flex items-center justify-center size-8 sm:size-7 rounded-full transition-all duration-300",
              isDark2026
                ? "bg-white/15 hover:bg-white/25 text-amber-300 border border-white/20 shadow-sm active:scale-90"
                : "bg-[#dce2ec]/90 sm:bg-black/5 hover:bg-black/10 text-neutral-800 hover:text-neutral-950 border border-black/5 sm:border-black/10 shadow-xs sm:shadow-sm active:scale-90"
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
              /* Moon Icon (solid crescent matching mobile reference) */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 transition-transform hover:-rotate-12"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        )}

        {/* Mobile Hamburger Menu Button (≡) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={clsx(
            "md:hidden cursor-pointer focus:outline-none flex items-center justify-center size-8 rounded-lg transition-all active:scale-90",
            is2077
              ? "text-[#00f0ff] hover:bg-[#00f0ff]/15"
              : isDark2026
              ? "text-white hover:bg-white/10"
              : "text-neutral-900 hover:bg-black/5"
          )}
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" />
              <line x1="3.5" y1="12" x2="20.5" y2="12" />
              <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" />
            </svg>
          )}
        </button>

        <ul className="hidden sm:flex items-center gap-2">
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
                    is2077 &&
                      "filter invert brightness-200 opacity-85 hover:opacity-100 drop-shadow-[0_0_4px_rgba(0,240,255,0.6)]",
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
            "hidden sm:inline-block text-xs font-medium tracking-wider transition-colors",
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

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className={clsx(
            "md:hidden absolute top-[calc(100%+6px)] right-3 z-50 w-48 rounded-2xl p-1.5 shadow-xl backdrop-blur-2xl transition-all",
            is2077
              ? "bg-[#021020]/95 border border-[#00f0ff]/40 text-[#00f0ff] font-mono"
              : isDark2026
              ? "bg-neutral-900/95 border border-white/15 text-white font-sans"
              : "bg-white/95 border border-black/10 text-neutral-800 font-sans"
          )}
        >
          <div className="flex flex-col space-y-0.5">
            {navLinks.map(({ id, name, type }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  openWindow(type);
                  setMobileMenuOpen(false);
                }}
                className={clsx(
                  "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-colors cursor-pointer",
                  is2077
                    ? "hover:bg-[#00f0ff]/15 active:bg-[#00f0ff]/25"
                    : isDark2026
                    ? "hover:bg-white/10 active:bg-white/15"
                    : "hover:bg-black/5 active:bg-black/10"
                )}
              >
                <span>{name}</span>
                <span className="opacity-40 text-[10px]">↗</span>
              </button>
            ))}

            <div
              className={clsx(
                "my-1 h-px",
                is2077
                  ? "bg-[#00f0ff]/20"
                  : isDark2026
                  ? "bg-white/10"
                  : "bg-black/5"
              )}
            />

            <button
              type="button"
              onClick={() => {
                toggleFullscreen();
                setMobileMenuOpen(false);
              }}
              className={clsx(
                "w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
                is2077
                  ? "hover:bg-[#00f0ff]/15 text-[#00f0ff]/80"
                  : isDark2026
                  ? "hover:bg-white/10 text-white/80"
                  : "hover:bg-black/5 text-neutral-600"
              )}
            >
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              <span className="text-[11px] opacity-60">⛶</span>
            </button>
          </div>
        </div>
      )}

      {/* 2077 Notch Extension — Grows downward from flat Navbar edge via GSAP SVG path morph */}
      <svg
        className={clsx(
          "absolute top-[calc(100%-1px)] left-1/2 -translate-x-1/2 w-[350px] sm:w-[460px] h-[43px] sm:h-[45px] pointer-events-none overflow-visible transition-opacity duration-300",
          is2077 ? "opacity-100" : "opacity-0"
        )}
        viewBox="0 0 460 46"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Solid fill matching 2077 Navbar (#081322) */}
        <path
          ref={notchFillRef}
          d="M 0,-3 L 460,-3 L 460,0.5 C 426,0.5 418,0.5 388,0.5 L 72,0.5 C 42,0.5 34,0.5 0,0.5 Z"
          fill="#081322"
        />
        {/* Single continuous vector path for left header border + smooth S-curve notch + right header border */}
        <path
          ref={notchStrokeRef}
          d="M -3000,0.5 L 0,0.5 C 34,0.5 42,0.5 72,0.5 L 388,0.5 C 418,0.5 426,0.5 460,0.5 L 3460,0.5"
          fill="none"
          stroke="rgba(0, 240, 255, 0.28)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </nav>
  );
};

export default Navbar;
