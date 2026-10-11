import { useEffect, useRef } from "react";
import useWindowStore from "#store/window";
import useThemeStore from "#store/theme";

const XPStartMenu = ({ isOpen, onClose }) => {
  const menuRef = useRef(null);
  const { openWindow } = useWindowStore();
  const { setYear } = useThemeStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      // Don't close if clicked on the start button itself
      if (e.target.closest("#xp-start-button")) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (action) => {
    onClose();
    if (typeof action === "string") {
      openWindow(action);
    } else if (typeof action === "function") {
      action();
    }
  };

  return (
    <div
      ref={menuRef}
      id="xp-start-menu"
      className="fixed bottom-[30px] left-0 w-[min(380px,calc(100vw-8px))] max-w-[calc(100vw-8px)] rounded-t-[6px] overflow-hidden border border-[#002275] shadow-[4px_-4px_24px_rgba(0,0,0,0.55)] z-[10000] font-['Tahoma',sans-serif] text-[11px] select-none flex flex-col"
      style={{
        boxShadow: "3px -3px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* 1. Header Banner */}
      <div className="h-[54px] px-3 flex items-center gap-3 bg-gradient-to-b from-[#1852d6] via-[#2268f5] to-[#154fc9] border-b border-[#0038a8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <div className="relative w-10 h-10 rounded-[3px] border-2 border-white shadow-md overflow-hidden bg-white flex-shrink-0">
          <img
            src="/images/kcuong.JPG"
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold text-[14px] tracking-wide drop-shadow-[1px_1px_2px_rgba(0,0,0,0.9)]">
            Kim Cuong
          </span>
          <span className="text-[#a8cbff] text-[10px] -mt-0.5">
            Windows XP Professional
          </span>
        </div>
      </div>

      {/* 2. Two-Column Body */}
      <div className="flex bg-white w-full border-t border-[#407ee8]">
        {/* Left Column (White background, Programs) */}
        <div className="flex-1 min-w-[200px] p-1.5 flex flex-col justify-between bg-white border-r border-[#95bdee]">
          <div className="flex flex-col gap-0.5">
            {/* Pinned 1: Internet Explorer */}
            <button
              type="button"
              onClick={() => handleItemClick("safari")}
              className="group w-full flex items-center gap-2.5 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Internet Explorer.png"
                alt="Internet Explorer"
                className="w-8 h-8 object-contain flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[11px] text-[#000000] group-hover:text-white leading-tight truncate">
                  Internet
                </span>
                <span className="text-[10px] text-[#707070] group-hover:text-white/90 leading-tight truncate">
                  Internet Explorer
                </span>
              </div>
            </button>

            {/* Pinned 2: E-mail (Outlook Express) */}
            <button
              type="button"
              onClick={() => handleItemClick("contact")}
              className="group w-full flex items-center gap-2.5 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Email.png"
                alt="Outlook Express"
                className="w-8 h-8 object-contain flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[11px] text-[#000000] group-hover:text-white leading-tight truncate">
                  E-mail
                </span>
                <span className="text-[10px] text-[#707070] group-hover:text-white/90 leading-tight truncate">
                  Outlook Express
                </span>
              </div>
            </button>

            {/* Pinned Separator */}
            <div className="my-1 mx-1 h-[1px] bg-gradient-to-r from-transparent via-[#d0d0d0] to-transparent" />

            {/* Windows Media Player */}
            <button
              type="button"
              onClick={() => handleItemClick("photos")}
              className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Windows Media Player.png"
                alt="Windows Media Player"
                className="w-7 h-7 object-contain flex-shrink-0"
              />
              <span className="font-medium text-[11px] text-[#000000] group-hover:text-white truncate">
                Windows Media Player
              </span>
            </button>

            {/* MSN */}
            <button
              type="button"
              onClick={() => handleItemClick("safari")}
              className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Microsoft News.png"
                alt="MSN Explorer"
                className="w-7 h-7 object-contain flex-shrink-0"
              />
              <span className="font-medium text-[11px] text-[#000000] group-hover:text-white truncate">
                MSN Explorer
              </span>
            </button>

            {/* Windows Messenger */}
            <button
              type="button"
              onClick={() => handleItemClick("contact")}
              className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Messenger.png"
                alt="Windows Messenger"
                className="w-7 h-7 object-contain flex-shrink-0"
              />
              <span className="font-medium text-[11px] text-[#000000] group-hover:text-white truncate">
                Windows Messenger
              </span>
            </button>

            {/* Tour Windows XP */}
            <button
              type="button"
              onClick={() => handleItemClick("resume")}
              className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Windows Guided Tour.png"
                alt="Tour Windows XP"
                className="w-7 h-7 object-contain flex-shrink-0"
              />
              <span className="font-medium text-[11px] text-[#000000] group-hover:text-white truncate">
                Tour Windows XP
              </span>
            </button>

            {/* Files and Settings Transfer Wizard */}
            <button
              type="button"
              onClick={() => handleItemClick("finder")}
              className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
            >
              <img
                src="/xp/Icon/Transfert Wizzard.png"
                alt="Files and Settings Transfer Wizard"
                className="w-7 h-7 object-contain flex-shrink-0"
              />
              <span className="font-medium text-[11px] text-[#000000] group-hover:text-white truncate leading-tight">
                Files and Settings Transfer...
              </span>
            </button>
          </div>

          {/* All Programs Button */}
          <div className="pt-1.5 border-t border-neutral-200 mt-1.5">
            <button
              type="button"
              onClick={() => handleItemClick("finder")}
              className="group w-full flex items-center justify-between px-2 py-1.5 rounded-[2px] cursor-pointer hover:bg-[#316ac5] transition-colors focus:outline-none"
            >
              <span className="font-bold text-[11px] text-[#000000] group-hover:text-white">
                All Programs
              </span>
              <img
                src="/xp/Icon/All Programs Arrow.png"
                alt=""
                className="w-4 h-4 object-contain ml-2 flex-shrink-0"
              />
            </button>
          </div>
        </div>

        {/* Right Column (Light Blue background, System folders & settings) */}
        <div className="w-[176px] p-1.5 flex flex-col justify-start bg-[#d3e5fa] gap-0.5">
          {/* My Documents */}
          <button
            type="button"
            onClick={() => handleItemClick("finder")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/My Documents.png"
              alt="My Documents"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="font-bold text-[11px] text-[#00136b] group-hover:text-white truncate">
              My Documents
            </span>
          </button>

          {/* My Recent Documents */}
          <button
            type="button"
            onClick={() => handleItemClick("finder")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/File History.png"
              alt="My Recent Documents"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="font-bold text-[11px] text-[#00136b] group-hover:text-white truncate flex-1">
              My Recent Documents
            </span>
            <img
              src="/xp/Icon/Submenu Arrow.png"
              alt=""
              className="w-1.5 h-2 object-contain ml-auto opacity-70 group-hover:opacity-100 group-hover:brightness-200"
            />
          </button>

          {/* My Pictures */}
          <button
            type="button"
            onClick={() => handleItemClick("photos")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/My Pictures.png"
              alt="My Pictures"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="font-bold text-[11px] text-[#00136b] group-hover:text-white truncate">
              My Pictures
            </span>
          </button>

          {/* My Music */}
          <button
            type="button"
            onClick={() => handleItemClick("photos")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/My Music.png"
              alt="My Music"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="font-bold text-[11px] text-[#00136b] group-hover:text-white truncate">
              My Music
            </span>
          </button>

          {/* My Computer */}
          <button
            type="button"
            onClick={() => handleItemClick("finder")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/This Computer.png"
              alt="My Computer"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="font-bold text-[11px] text-[#00136b] group-hover:text-white truncate">
              My Computer
            </span>
          </button>

          {/* Divider */}
          <div className="my-1 mx-1 border-t border-[#a0c2ec] border-b border-white" />

          {/* Control Panel */}
          <button
            type="button"
            onClick={() => handleItemClick("finder")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Control Panel.png"
              alt="Control Panel"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate">
              Control Panel
            </span>
          </button>

          {/* Set Program Access and Defaults */}
          <button
            type="button"
            onClick={() => handleItemClick("terminal")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Default Program Settings.png"
              alt="Set Program Access"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate leading-tight">
              Set Program Access...
            </span>
          </button>

          {/* Printers and Faxes */}
          <button
            type="button"
            onClick={() => handleItemClick("resume")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Printer and Faxes.png"
              alt="Printers and Faxes"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate">
              Printers and Faxes
            </span>
          </button>

          {/* Divider */}
          <div className="my-1 mx-1 border-t border-[#a0c2ec] border-b border-white" />

          {/* Help and Support */}
          <button
            type="button"
            onClick={() => handleItemClick("safari")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Help.png"
              alt="Help and Support"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate">
              Help and Support
            </span>
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={() => handleItemClick("finder")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Search.png"
              alt="Search"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate">
              Search
            </span>
          </button>

          {/* Run... */}
          <button
            type="button"
            onClick={() => handleItemClick("terminal")}
            className="group w-full flex items-center gap-2 px-1.5 py-1 rounded-[2px] cursor-pointer hover:bg-[#316ac5] text-left transition-colors focus:outline-none"
          >
            <img
              src="/xp/Icon/Run.png"
              alt="Run"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span className="text-[11px] text-[#00136b] group-hover:text-white truncate">
              Run...
            </span>
          </button>
        </div>
      </div>

      {/* 3. Footer Bar (Log Off & Turn Off Computer) */}
      <div className="h-[40px] px-3 bg-gradient-to-b from-[#3d80ee] via-[#205de0] to-[#1746b5] border-t border-[#0038a8] flex items-center justify-end gap-3 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
        <button
          type="button"
          onClick={() => {
            onClose();
            setYear("2026");
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] hover:bg-[#1a4ab9] active:bg-[#0f3282] transition-all cursor-pointer focus:outline-none"
        >
          <img
            src="/xp/Icon/Log Off.png"
            alt="Log Off"
            className="w-5 h-5 object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          />
          <span className="font-medium text-white text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            Log Off
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            setYear("2077");
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] hover:bg-[#1a4ab9] active:bg-[#0f3282] transition-all cursor-pointer focus:outline-none"
        >
          <img
            src="/xp/Icon/Turn Off.png"
            alt="Turn Off Computer"
            className="w-5 h-5 object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          />
          <span className="font-medium text-white text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            Turn Off Computer
          </span>
        </button>
      </div>
    </div>
  );
};

export default XPStartMenu;
