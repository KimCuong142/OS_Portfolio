import useWindowStore from "#store/window";

const WINDOW_META = {
  finder: { title: "My Computer", icon: "/xp/Icon/This Computer.png", showMenu: true },
  photos: { title: "My Pictures", icon: "/xp/Icon/My Pictures.png", showMenu: true },
  contact: { title: "Outlook Express - Contact", icon: "/xp/Icon/Email.png", showMenu: true },
  terminal: { title: "Command Prompt - cmd.exe", icon: "/xp/Icon/Run.png", showMenu: false },
  resume: { title: "Microsoft Word - Resume.doc", icon: "/xp/Icon/FileWord.png", showMenu: true },
  txtfile: { title: "Notepad", icon: "/xp/Icon/File.png", showMenu: true },
  imgfile: { title: "Windows Picture and Fax Viewer", icon: "/xp/Icon/My Pictures.png", showMenu: true },
};

const XPWindowControls = ({ target }) => {
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const isMaximized = useWindowStore((s) => s.windows[target]?.isMaximized);
  const meta = WINDOW_META[target] || {
    title: target,
    icon: "/xp/Icon/My Documents.png",
    showMenu: true,
  };

  return (
    <div id="xp-window-controls" className="w-full flex flex-col select-none font-['Tahoma',sans-serif]">
      {/* 1. Luna Blue Title Bar */}
      <div
        className="flex items-center justify-between w-full h-[28px] px-2.5 rounded-t-[5px]"
        style={{
          background: "linear-gradient(180deg, #0a246a 0%, #0058ee 8%, #0855ff 40%, #0045e0 80%, #0030a0 100%)",
          borderBottom: "1px solid #002275",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        {/* Left: Application Icon & Title */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <img
            src={meta.icon}
            alt=""
            className="w-4 h-4 object-contain flex-shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
          />
          <span className="font-bold text-white text-[12px] truncate drop-shadow-[1px_1px_1px_rgba(0,0,0,0.9)] tracking-tight">
            {meta.title}
          </span>
        </div>

        {/* Right: Window Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Minimize */}
          <button
            type="button"
            title="Minimize"
            aria-label="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(target);
            }}
            className="w-[21px] h-[21px] rounded-[3px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.4)] bg-gradient-to-b from-[#428eff] via-[#0055ea] to-[#0038b0] hover:from-[#66a3ff] hover:to-[#1a66ff] active:from-[#0038b0] active:to-[#002275] flex items-center justify-center cursor-pointer transition-all focus:outline-none"
          >
            <span className="w-2.5 h-[2.5px] bg-white rounded-[0.5px] shadow-[0_1px_1px_rgba(0,0,0,0.6)] translate-y-[2px]" />
          </button>

          {/* Maximize / Restore */}
          <button
            type="button"
            title={isMaximized ? "Restore" : "Maximize"}
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(target);
            }}
            className="w-[21px] h-[21px] rounded-[3px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.4)] bg-gradient-to-b from-[#428eff] via-[#0055ea] to-[#0038b0] hover:from-[#66a3ff] hover:to-[#1a66ff] active:from-[#0038b0] active:to-[#002275] flex items-center justify-center cursor-pointer transition-all focus:outline-none"
          >
            {isMaximized ? (
              <div className="relative w-2.5 h-2.5">
                <span className="absolute top-0 right-0 w-2 h-2 border-[1.5px] border-white rounded-[0.5px] shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
                <span className="absolute bottom-0 left-0 w-2 h-2 border-[1.5px] border-white bg-[#0055ea] rounded-[0.5px] shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
              </div>
            ) : (
              <span className="w-2.5 h-2.5 border-[1.8px] border-white rounded-[0.5px] shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
            )}
          </button>

          {/* Close (Red) */}
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(target);
            }}
            className="w-[21px] h-[21px] rounded-[3px] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.5)] bg-gradient-to-b from-[#e5603b] via-[#cf3312] to-[#b01c00] hover:from-[#ff7952] hover:to-[#e62a05] active:from-[#9c1200] active:to-[#780800] flex items-center justify-center cursor-pointer transition-all focus:outline-none ml-0.5"
          >
            <svg
              viewBox="0 0 10 10"
              className="w-2.5 h-2.5 text-white stroke-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none"
            >
              <path
                d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Classic Windows Menubar */}
      {meta.showMenu && (
        <div className="flex items-center gap-2 px-2 py-0.5 bg-[#ece9d8] border-b border-[#dcdad1] text-[11px] text-neutral-800 font-['Tahoma',sans-serif]">
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            File
          </span>
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            Edit
          </span>
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            View
          </span>
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            Favorites
          </span>
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            Tools
          </span>
          <span className="hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer transition-colors">
            Help
          </span>
        </div>
      )}
    </div>
  );
};

export default XPWindowControls;
