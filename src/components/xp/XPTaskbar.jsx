import { useState, useEffect } from "react";
import useWindowStore from "#store/window";
import XPStartMenu from "./XPStartMenu";
import dayjs from "dayjs";

const WINDOW_META = {
  finder: { title: "My Computer", icon: "/xp/Icon/This Computer.png" },
  photos: { title: "My Pictures", icon: "/xp/Icon/My Pictures.png" },
  contact: { title: "Outlook Express", icon: "/xp/Icon/Email.png" },
  terminal: { title: "Command Prompt", icon: "/xp/Icon/Run.png" },
  resume: { title: "Resume.doc - Word", icon: "/xp/Icon/FileWord.png" },
  txtfile: { title: "Notepad", icon: "/xp/Icon/File.png" },
  imgfile: { title: "Windows Picture Viewer", icon: "/xp/Icon/My Pictures.png" },
};

const XPTaskbar = () => {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs().format("h:mm A"));
  const { windows, openWindow, focusWindow, minimizeWindow, restoreWindow, nextZIndex } =
    useWindowStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format("h:mm A"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter open windows
  const openWindowsList = Object.entries(windows).filter(
    ([_, winState]) => winState && winState.isOpen
  );

  // Check if a window is currently the active (focused) window
  const isWindowActive = (winState) => {
    if (!winState.isOpen || winState.isMinimized) return false;
    // Check if it has highest zIndex among open non-minimized windows
    const highestZ = Math.max(
      ...openWindowsList
        .filter(([_, w]) => !w.isMinimized)
        .map(([_, w]) => w.zIndex || 0),
      0
    );
    return winState.zIndex === highestZ;
  };

  const handleTaskbarItemClick = (key, winState) => {
    if (winState.isMinimized) {
      restoreWindow(key);
      focusWindow(key);
    } else if (isWindowActive(winState)) {
      minimizeWindow(key);
    } else {
      focusWindow(key);
    }
  };

  const handleShowDesktop = () => {
    const anyNonMinimized = openWindowsList.some(([_, w]) => !w.isMinimized);
    openWindowsList.forEach(([key, w]) => {
      if (anyNonMinimized) {
        minimizeWindow(key);
      } else {
        restoreWindow(key);
      }
    });
  };

  return (
    <>
      {/* Start Menu Popup */}
      <XPStartMenu isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} />

      {/* Main Taskbar */}
      <div
        id="xp-taskbar"
        className="fixed bottom-0 left-0 right-0 h-[30px] z-[9999] flex items-center justify-between select-none font-['Tahoma',sans-serif] text-[11px] text-white"
        style={{
          background: "linear-gradient(180deg, #3168d5 0%, #2557c6 8%, #1f4cb8 25%, #225ad9 70%, #1a42a8 100%)",
          borderTop: "1px solid #4a82ee",
          boxShadow: "0 -2px 5px rgba(0,0,0,0.3)",
        }}
      >
        {/* Left Side: Start Button + Quick Launch */}
        <div className="flex items-center h-full">
          {/* Green "start" button */}
          <button
            id="xp-start-button"
            type="button"
            onClick={() => setIsStartOpen(!isStartOpen)}
            className={`h-full px-3.5 flex items-center gap-1.5 rounded-r-[16px] cursor-pointer transition-all focus:outline-none ${
              isStartOpen
                ? "bg-gradient-to-b from-[#1b5e20] via-[#24702b] to-[#174e1c] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]"
                : "bg-gradient-to-b from-[#4caf50] via-[#388e3c] to-[#256628] hover:from-[#5bc260] hover:to-[#2e7d32] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),2px_0_4px_rgba(0,0,0,0.35)]"
            }`}
            style={{
              clipPath: "ellipse(95% 100% at 5% 50%)",
            }}
          >
            {/* Windows 4-color flag */}
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4 transform -skew-x-12">
              <span className="w-1.5 h-1.5 bg-[#f25022] rounded-[1px] shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
              <span className="w-1.5 h-1.5 bg-[#7fba00] rounded-[1px] shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
              <span className="w-1.5 h-1.5 bg-[#00a4ef] rounded-[1px] shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
              <span className="w-1.5 h-1.5 bg-[#ffb900] rounded-[1px] shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
            </div>

            <span className="font-bold italic text-white text-[14px] tracking-wide drop-shadow-[1px_1px_1px_rgba(0,0,0,0.9)] ml-0.5">
              start
            </span>
          </button>

          {/* Quick Launch separator & Icons (desktop only) */}
          <div className="hidden sm:flex items-center">
            <div className="w-[3px] h-4 border-l border-white/30 border-r border-black/30 mx-1.5" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Show Desktop"
                onClick={handleShowDesktop}
                className="p-1 hover:bg-[#1a44a6] rounded-sm cursor-pointer transition-colors"
              >
                <div className="w-3.5 h-3.5 border border-white/80 bg-[#1e52cf]/60 rounded-[1px] flex items-end justify-center pb-0.5">
                  <span className="w-2 h-1 bg-white/70" />
                </div>
              </button>
              <button
                type="button"
                title="Windows Media Player"
                onClick={() => openWindow("photos")}
                className="p-1 hover:bg-[#1a44a6] rounded-sm cursor-pointer transition-colors"
              >
                <img
                  src="/xp/Icon/Windows Media Player.png"
                  alt="WMP"
                  className="w-3.5 h-3.5 object-contain"
                />
              </button>
            </div>
            <div className="w-[3px] h-5 border-l border-white/30 border-r border-black/30 mx-1.5" />
          </div>
        </div>

        {/* Center: Open Window Items */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto px-1 h-full scrollbar-none">
          {openWindowsList.map(([key, winState]) => {
            const meta = WINDOW_META[key] || {
              title: key,
              icon: "/xp/Icon/My Documents.png",
            };
            const active = isWindowActive(winState);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTaskbarItemClick(key, winState)}
                className={`h-[24px] max-w-[170px] min-w-[70px] sm:min-w-[110px] px-1.5 sm:px-2 flex items-center gap-1 sm:gap-1.5 rounded-[3px] cursor-pointer text-left transition-all ${
                  active
                    ? "bg-[#1e4db9] border border-[#0d2a70] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.6)] font-bold text-white"
                    : "bg-gradient-to-b from-[#3c80f4] via-[#2056cd] to-[#1a44a6] border border-[#00287a] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:brightness-110 text-white/95"
                }`}
              >
                <img src={meta.icon} alt="" className="w-3.5 sm:w-4 h-3.5 sm:h-4 object-contain flex-shrink-0" />
                <span className="truncate leading-none text-[10px] sm:text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                  {meta.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: System Tray (Notification Area) */}
        <div
          className="h-full px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2.5 border-l border-[#082260] shadow-[inset_1px_0_0_rgba(255,255,255,0.2)] flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, #0e3599 0%, #1642b3 100%)",
          }}
        >
          {/* Status Icons (hidden on very small mobile) */}
          <div className="hidden sm:flex items-center gap-1.5 opacity-90">
            {/* Sound Icon */}
            <svg
              viewBox="0 0 16 16"
              className="w-3.5 h-3.5 fill-current text-white/80"
            >
              <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z" />
              <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z" />
              <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z" />
            </svg>

            {/* Network Icon */}
            <div className="flex items-end gap-[1px] h-3">
              <span className="w-[2px] h-1 bg-white/70" />
              <span className="w-[2px] h-1.5 bg-white/70" />
              <span className="w-[2px] h-2 bg-white/70" />
              <span className="w-[2px] h-2.5 bg-[#4caf50]" />
            </div>
          </div>

          {/* Clock */}
          <time className="text-[11px] font-medium text-white tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            {currentTime}
          </time>
        </div>
      </div>
    </>
  );
};

export default XPTaskbar;
