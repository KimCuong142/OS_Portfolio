import { useState, useMemo } from "react";
import { locations } from "#constants";
import useLocationStore from "#store/location";
import useWindowStore from "#store/window";

const XPExplorer = () => {
  const { activeLocation, setActiveLocation } = useLocationStore();
  const { openWindow, closeWindow, toggleMinimize, toggleMaximize, windows } =
    useWindowStore();
  const isMaximized = windows.finder?.isMaximized;

  // Navigation History
  const [history, setHistory] = useState([locations.work]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI state
  const [showFolders, setShowFolders] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({
    desktop: true,
    my_computer: true,
    local_c: true,
    my_projects: true,
  });

  const toggleNode = (nodeId, e) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const navigateTo = (loc) => {
    if (!loc) return;
    setActiveLocation(loc);
    setSelectedItemId(null);
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(loc);
      return next;
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setActiveLocation(history[nextIndex]);
      setSelectedItemId(null);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setActiveLocation(history[nextIndex]);
      setSelectedItemId(null);
    }
  };

  const handleUp = () => {
    // If inside a project under work, go to work
    const isSubproject = locations.work.children?.some(
      (c) => c.id === activeLocation?.id
    );
    if (isSubproject) {
      navigateTo(locations.work);
    } else if (activeLocation?.id !== locations.work.id) {
      navigateTo(locations.work);
    }
  };

  const openItem = (item) => {
    if (item.kind === "folder") {
      navigateTo(item);
      return;
    }
    if (item.fileType === "pdf") {
      openWindow("resume");
      return;
    }
    if (["fig", "url"].includes(item.fileType) && item.href) {
      window.open(item.href, "_blank");
      return;
    }
    openWindow(`${item.fileType}${item.kind}`, item);
  };

  // Determine current window title and icon
  const { title, icon, addressPath } = useMemo(() => {
    if (!activeLocation) {
      return {
        title: "My Computer",
        icon: "/xp/Icon/This Computer.png",
        addressPath: "My Computer",
      };
    }
    if (activeLocation.id === locations.trash.id) {
      return {
        title: "Recycle Bin",
        icon: "/xp/Icon/Bin.png",
        addressPath: "Recycle Bin",
      };
    }
    if (activeLocation.id === locations.about.id) {
      return {
        title: "My Documents",
        icon: "/xp/Icon/My Documents.png",
        addressPath: "C:\\Documents and Settings\\Kim Cuong\\My Documents",
      };
    }
    if (activeLocation.id === locations.resume.id) {
      return {
        title: "Resume",
        icon: "/xp/Icon/FileWord.png",
        addressPath: "C:\\Documents and Settings\\Kim Cuong\\My Documents\\Resume",
      };
    }
    if (activeLocation.id === locations.work.id) {
      return {
        title: "My Projects",
        icon: "/xp/Icon/My Documents.png",
        addressPath: "C:\\Documents and Settings\\Kim Cuong\\My Projects",
      };
    }
    return {
      title: activeLocation.name || "Explorer",
      icon: "/xp/Icon/My Documents.png",
      addressPath: `C:\\Documents and Settings\\Kim Cuong\\My Projects\\${activeLocation.name}`,
    };
  }, [activeLocation]);

  const getFileIcon = (item) => {
    if (item.kind === "folder") {
      return "/xp/Icon/My Documents.png";
    }
    if (item.fileType === "pdf") {
      return "/xp/Icon/FileWord.png";
    }
    if (item.fileType === "txt") {
      return "/xp/Icon/File.png";
    }
    if (item.fileType === "url") {
      return "/xp/Icon/Internet Explorer.png";
    }
    if (item.fileType === "fig") {
      return "/xp/Icon/File.png";
    }
    if (item.fileType === "img") {
      return item.imageUrl || "/xp/Icon/My Pictures.png";
    }
    return "/xp/Icon/File.png";
  };

  const currentItems = activeLocation?.children || [];

  return (
    <div className="w-full h-full flex flex-col select-none font-['Tahoma',sans-serif] text-[11px] bg-[#ece9d8] overflow-hidden">
      {/* 1. Luna Blue Title Bar */}
      <div
        className="flex items-center justify-between w-full h-[28px] px-2.5 rounded-t-[5px] flex-shrink-0"
        style={{
          background:
            "linear-gradient(180deg, #0a246a 0%, #0058ee 8%, #0855ff 40%, #0045e0 80%, #0030a0 100%)",
          borderBottom: "1px solid #002275",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        {/* Left: Window Icon & Title */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <img
            src={icon}
            alt=""
            className="w-4 h-4 object-contain flex-shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
          />
          <span className="font-bold text-white text-[12px] truncate drop-shadow-[1px_1px_1px_rgba(0,0,0,0.9)] tracking-tight">
            {title}
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
              toggleMinimize("finder");
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
              toggleMaximize("finder");
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
              closeWindow("finder");
            }}
            className="w-[21px] h-[21px] rounded-[3px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.4)] bg-gradient-to-b from-[#ff6b52] via-[#e8321e] to-[#c71e0c] hover:from-[#ff8873] hover:to-[#fa432e] active:from-[#ba1908] active:to-[#911204] flex items-center justify-center cursor-pointer transition-all focus:outline-none"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white stroke-white stroke-[2] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
              <line x1="2" y1="2" x2="8" y2="8" />
              <line x1="8" y1="2" x2="2" y2="8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Menu Bar */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#ece9d8] border-b border-[#d8d2bd] text-[11px] text-[#000000] flex-shrink-0">
        <div className="flex items-center">
          {["File", "Edit", "View", "Favorites", "Tools", "Help"].map((m) => (
            <span
              key={m}
              className="px-1.5 py-0.5 hover:bg-[#316ac5] hover:text-white rounded-[2px] cursor-pointer"
            >
              {m}
            </span>
          ))}
        </div>

        {/* Windows Flag Sunken Emblem */}
        <div className="w-6 h-5 border border-[#9c9a91] bg-white shadow-[inset_1px_1px_2px_rgba(0,0,0,0.25)] flex items-center justify-center p-0.5">
          <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 transform -skew-x-12">
            <span className="w-1.5 h-1.5 bg-[#f25022] rounded-[0.5px]" />
            <span className="w-1.5 h-1.5 bg-[#7fba00] rounded-[0.5px]" />
            <span className="w-1.5 h-1.5 bg-[#00a4ef] rounded-[0.5px]" />
            <span className="w-1.5 h-1.5 bg-[#ffb900] rounded-[0.5px]" />
          </div>
        </div>
      </div>

      {/* 3. Standard Buttons Toolbar */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-[#ece9d8] border-b border-[#d8d2bd] text-[11px] text-[#000000] flex-shrink-0">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          disabled={historyIndex <= 0}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0] active:bg-[#dedac5] ${
            historyIndex <= 0 ? "opacity-40 cursor-default" : "cursor-pointer"
          }`}
          title="Back"
        >
          <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-b from-[#66cc66] via-[#388e3c] to-[#1e781e] border border-[#1b5e20] shadow-sm flex items-center justify-center text-white font-bold text-[10px]">
            ◀
          </div>
          <span className="font-medium text-[11px]">Back</span>
          <span className="text-[8px] text-gray-700 ml-0.5">▼</span>
        </button>

        {/* Forward Button */}
        <button
          type="button"
          onClick={handleForward}
          disabled={historyIndex >= history.length - 1}
          className={`flex items-center gap-1 p-1 rounded-[3px] border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0] active:bg-[#dedac5] ${
            historyIndex >= history.length - 1 ? "opacity-40 cursor-default" : "cursor-pointer"
          }`}
          title="Forward"
        >
          <div className="w-[20px] h-[20px] rounded-full bg-gradient-to-b from-[#66cc66] via-[#388e3c] to-[#1e781e] border border-[#1b5e20] shadow-sm flex items-center justify-center text-white font-bold text-[9px]">
            ▶
          </div>
          <span className="text-[8px] text-gray-700">▼</span>
        </button>

        {/* Up Button */}
        <button
          type="button"
          onClick={handleUp}
          className="flex items-center gap-1 p-1 rounded-[3px] border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0] active:bg-[#dedac5] cursor-pointer"
          title="Up"
        >
          <div className="w-[20px] h-[20px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#388e3c] fill-current">
              <path d="M12 4l-7 7h4v9h6v-9h4l-7-7z" />
            </svg>
          </div>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-5 bg-[#c8c4b7] border-r border-white mx-0.5" />

        {/* Search Button */}
        <button
          type="button"
          onClick={() => {}}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0] active:bg-[#dedac5] cursor-pointer"
        >
          <img
            src="/xp/Icon/Search.png"
            alt="Search"
            className="w-4 h-4 object-contain"
          />
          <span>Search</span>
        </button>

        {/* Folders Button (Pressed state toggle) */}
        <button
          type="button"
          onClick={() => setShowFolders(!showFolders)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-[2px] transition-all cursor-pointer ${
            showFolders
              ? "bg-[#dedac5] border border-[#7f9db9] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.25)] font-medium"
              : "border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0]"
          }`}
        >
          <img
            src="/xp/Icon/My Documents.png"
            alt="Folders"
            className="w-4 h-4 object-contain"
          />
          <span>Folders</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-5 bg-[#c8c4b7] border-r border-white mx-0.5" />

        {/* Views */}
        <button
          type="button"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border border-transparent hover:border-[#a09e96] hover:bg-[#faf8f0] active:bg-[#dedac5] cursor-pointer"
        >
          <div className="w-3.5 h-3.5 border border-gray-600 grid grid-cols-2 gap-[1px] p-[1px] bg-white">
            <span className="bg-blue-600" />
            <span className="bg-gray-400" />
            <span className="bg-gray-400" />
            <span className="bg-blue-600" />
          </div>
          <span className="text-[8px] text-gray-700">▼</span>
        </button>
      </div>

      {/* 4. Address Bar */}
      <div className="flex items-center gap-2 px-2 py-1 bg-[#ece9d8] border-b border-[#9c9a91] text-[11px] flex-shrink-0">
        <span className="text-[#555555] font-normal">Address</span>
        <div className="flex-1 flex items-center h-[22px] bg-white border border-[#7f9db9] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.15)] px-1.5">
          <img
            src={icon}
            alt=""
            className="w-3.5 h-3.5 object-contain mr-1.5 flex-shrink-0"
          />
          <span className="text-[#000000] truncate font-sans text-[11px] flex-1">
            {addressPath}
          </span>
          <span className="text-[8px] text-gray-700 ml-1">▼</span>
        </div>

        {/* Go Button */}
        <button
          type="button"
          className="h-[22px] px-2 flex items-center gap-1 bg-gradient-to-b from-[#5bb75b] via-[#388e3c] to-[#256628] hover:from-[#66cc66] hover:to-[#2e7d32] border border-[#1b5e20] text-white text-[11px] font-bold rounded-[2px] shadow-[0_1px_1px_rgba(0,0,0,0.3)] active:brightness-90 cursor-pointer"
        >
          <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-current">
            <path d="M4 2l8 6-8 6V2z" />
          </svg>
          <span>Go</span>
        </button>
      </div>

      {/* 5. Main Explorer Body (Split View) */}
      <div className="flex-1 flex overflow-hidden bg-white border border-[#7f9db9] m-0.5">
        {/* Left Pane: Folders Tree */}
        {showFolders && (
          <div className="w-[210px] flex-shrink-0 flex flex-col bg-white border-r border-[#7f9db9] overflow-hidden">
            {/* Folders Header with [X] */}
            <div className="h-[22px] px-2 bg-gradient-to-b from-[#f5f3ec] to-[#dedac5] border-b border-[#7f9db9] flex items-center justify-between text-[#000000] font-bold text-[11px]">
              <span>Folders</span>
              <button
                type="button"
                onClick={() => setShowFolders(false)}
                className="w-3.5 h-3.5 border border-[#808080] bg-white hover:bg-gray-200 active:bg-gray-300 rounded-[1px] flex items-center justify-center text-[9px] text-gray-700 cursor-pointer"
                title="Close Folders"
              >
                ✕
              </button>
            </div>

            {/* Tree View Structure */}
            <div className="flex-1 overflow-y-auto p-1.5 font-['Tahoma',sans-serif] text-[11px] select-none">
              {/* Level 0: Desktop */}
              <div className="flex flex-col">
                <div
                  onClick={() => navigateTo(locations.work)}
                  className="flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-[#316ac5]/10 rounded-[1px]"
                >
                  <button
                    type="button"
                    onClick={(e) => toggleNode("desktop", e)}
                    className="w-2.5 h-2.5 border border-gray-400 bg-white flex items-center justify-center text-[8px] font-mono leading-none mr-1"
                  >
                    {expandedNodes.desktop ? "−" : "+"}
                  </button>
                  <img
                    src="/xp/Icon/This Computer.png"
                    alt=""
                    className="w-4 h-4 object-contain"
                  />
                  <span className="font-normal text-[#000000]">Desktop</span>
                </div>

                {expandedNodes.desktop && (
                  <div className="pl-4 flex flex-col border-l border-dotted border-gray-300 ml-2 mt-0.5">
                    {/* My Documents */}
                    <div
                      onClick={() => navigateTo(locations.about)}
                      className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] ${
                        activeLocation?.id === locations.about.id
                          ? "bg-[#316ac5] text-white"
                          : "hover:bg-[#316ac5]/10 text-[#000000]"
                      }`}
                    >
                      <span className="w-2.5 mr-1" />
                      <img
                        src="/xp/Icon/My Documents.png"
                        alt=""
                        className="w-4 h-4 object-contain"
                      />
                      <span className="truncate">My Documents</span>
                    </div>

                    {/* My Computer */}
                    <div className="flex flex-col mt-0.5">
                      <div
                        onClick={() => navigateTo(locations.work)}
                        className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] ${
                          activeLocation?.id === locations.work.id
                            ? "bg-[#316ac5] text-white"
                            : "hover:bg-[#316ac5]/10 text-[#000000]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleNode("my_computer", e)}
                          className="w-2.5 h-2.5 border border-gray-400 bg-white flex items-center justify-center text-[8px] font-mono leading-none mr-1 text-black"
                        >
                          {expandedNodes.my_computer ? "−" : "+"}
                        </button>
                        <img
                          src="/xp/Icon/This Computer.png"
                          alt=""
                          className="w-4 h-4 object-contain"
                        />
                        <span className="truncate">My Computer</span>
                      </div>

                      {expandedNodes.my_computer && (
                        <div className="pl-4 flex flex-col border-l border-dotted border-gray-300 ml-2 mt-0.5">
                          {/* 3.5 Floppy */}
                          <div className="flex items-center gap-1 py-0.5 px-1 text-gray-500 opacity-70">
                            <span className="w-2.5 mr-1" />
                            <img
                              src="/xp/Icon/This Computer.png"
                              alt=""
                              className="w-3.5 h-3.5 object-contain"
                            />
                            <span>3½ Floppy (A:)</span>
                          </div>

                          {/* Local Disk (C:) */}
                          <div className="flex flex-col">
                            <div
                              onClick={() => navigateTo(locations.work)}
                              className="flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-[#316ac5]/10 rounded-[1px]"
                            >
                              <button
                                type="button"
                                onClick={(e) => toggleNode("local_c", e)}
                                className="w-2.5 h-2.5 border border-gray-400 bg-white flex items-center justify-center text-[8px] font-mono leading-none mr-1 text-black"
                              >
                                {expandedNodes.local_c ? "−" : "+"}
                              </button>
                              <img
                                src="/xp/Icon/This Computer.png"
                                alt=""
                                className="w-3.5 h-3.5 object-contain"
                              />
                              <span className="truncate">Local Disk (C:)</span>
                            </div>

                            {expandedNodes.local_c && (
                              <div className="pl-4 flex flex-col border-l border-dotted border-gray-300 ml-2 mt-0.5">
                                {/* My Projects */}
                                <div className="flex flex-col">
                                  <div
                                    onClick={() => navigateTo(locations.work)}
                                    className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] ${
                                      activeLocation?.id === locations.work.id
                                        ? "bg-[#316ac5] text-white"
                                        : "hover:bg-[#316ac5]/10 text-[#000000]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => toggleNode("my_projects", e)}
                                      className="w-2.5 h-2.5 border border-gray-400 bg-white flex items-center justify-center text-[8px] font-mono leading-none mr-1 text-black"
                                    >
                                      {expandedNodes.my_projects ? "−" : "+"}
                                    </button>
                                    <img
                                      src="/xp/Icon/My Documents.png"
                                      alt=""
                                      className="w-3.5 h-3.5 object-contain"
                                    />
                                    <span className="truncate font-medium">My Projects</span>
                                  </div>

                                  {expandedNodes.my_projects && (
                                    <div className="pl-4 flex flex-col border-l border-dotted border-gray-300 ml-2 mt-0.5">
                                      {locations.work.children?.map((proj) => (
                                        <div
                                          key={proj.id}
                                          onClick={() => navigateTo(proj)}
                                          className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] ${
                                            activeLocation?.id === proj.id
                                              ? "bg-[#316ac5] text-white"
                                              : "hover:bg-[#316ac5]/10 text-[#000000]"
                                          }`}
                                        >
                                          <span className="w-2 mr-1" />
                                          <img
                                            src="/xp/Icon/My Documents.png"
                                            alt=""
                                            className="w-3.5 h-3.5 object-contain"
                                          />
                                          <span className="truncate">{proj.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Resume (Word Document!) */}
                          <div
                            onClick={() => navigateTo(locations.resume)}
                            className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] ${
                              activeLocation?.id === locations.resume.id
                                ? "bg-[#316ac5] text-white"
                                : "hover:bg-[#316ac5]/10 text-[#000000]"
                            }`}
                          >
                            <span className="w-2.5 mr-1" />
                            <img
                              src="/xp/Icon/FileWord.png"
                              alt=""
                              className="w-3.5 h-3.5 object-contain"
                            />
                            <span className="truncate">Resume.doc</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recycle Bin (Bin.png!) */}
                    <div
                      onClick={() => navigateTo(locations.trash)}
                      className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer rounded-[1px] mt-0.5 ${
                        activeLocation?.id === locations.trash.id
                          ? "bg-[#316ac5] text-white"
                          : "hover:bg-[#316ac5]/10 text-[#000000]"
                      }`}
                    >
                      <span className="w-2.5 mr-1" />
                      <img
                        src="/xp/Icon/Bin.png"
                        alt=""
                        className="w-4 h-4 object-contain"
                      />
                      <span className="truncate">Recycle Bin</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Pane: File View Area */}
        <div
          onClick={() => setSelectedItemId(null)}
          className="flex-1 bg-white overflow-y-auto p-4 content-start"
        >
          {currentItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
              This folder is empty.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-3 gap-y-5 items-start">
              {currentItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                const itemIcon = getFileIcon(item);

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(item.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openItem(item);
                    }}
                    className={`flex flex-col items-center justify-start p-1.5 rounded-[2px] cursor-pointer text-center group transition-colors ${
                      isSelected
                        ? "bg-[#316ac5]/20 border border-[#316ac5]/40"
                        : "hover:bg-[#316ac5]/10 border border-transparent"
                    }`}
                  >
                    {/* Icon container */}
                    <div className="w-10 h-10 flex items-center justify-center mb-1 flex-shrink-0">
                      <img
                        src={itemIcon}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform"
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[11px] leading-tight px-1 py-0.5 rounded-[1px] break-words line-clamp-2 ${
                        isSelected
                          ? "bg-[#316ac5] text-white border border-dotted border-[#0a246a]"
                          : "text-[#000000]"
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Classic Windows XP 3D Status Bar */}
      <div className="h-[22px] px-1 bg-[#ece9d8] border-t border-[#d8d2bd] flex items-center gap-1 text-[11px] text-[#000000] flex-shrink-0 font-['Tahoma',sans-serif]">
        {/* Panel 1: Objects Count */}
        <div className="flex-1 h-[18px] px-2 flex items-center bg-[#ece9d8] shadow-[inset_1px_1px_1px_#808080,inset_-1px_-1px_1px_#ffffff] text-[#000000] truncate">
          <span>{currentItems.length} objects</span>
        </div>

        {/* Panel 2: Size / Status */}
        <div className="w-[120px] h-[18px] px-2 flex items-center bg-[#ece9d8] shadow-[inset_1px_1px_1px_#808080,inset_-1px_-1px_1px_#ffffff] text-[#000000] truncate">
          <span>6.53 MB</span>
        </div>

        {/* Panel 3: Location / Zone */}
        <div className="w-[130px] h-[18px] px-2 flex items-center gap-1.5 bg-[#ece9d8] shadow-[inset_1px_1px_1px_#808080,inset_-1px_-1px_1px_#ffffff] text-[#000000] truncate">
          <img
            src="/xp/Icon/This Computer.png"
            alt=""
            className="w-3.5 h-3.5 object-contain flex-shrink-0"
          />
          <span className="truncate">My Computer</span>
        </div>
      </div>
    </div>
  );
};

export default XPExplorer;
