import useWindowStore from "#store/window";
import useThemeStore from "#store/theme";
import XPWindowControls from "./xp/XPWindowControls";

const WindowControls = ({ target }) => {
  const { currentYear } = useThemeStore();
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const isMaximized = useWindowStore((s) => s.windows[target]?.isMaximized);

  if (currentYear === "2004") {
    return <XPWindowControls target={target} />;
  }

  return (
    <div id="window-controls" className="group flex items-center gap-2">
      {/* Close - Red */}
      <button
        type="button"
        className="close relative flex items-center justify-center size-3.5 rounded-full bg-[#ff5f56] hover:bg-[#e0443e] active:bg-[#c9322c] border border-black/10 transition-colors cursor-pointer"
        title="Close"
        aria-label="Close window"
        onClick={(e) => {
          e.stopPropagation();
          closeWindow(target);
        }}
      >
        <svg
          viewBox="0 0 10 10"
          className="size-2 text-[#4d0000] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        >
          <path
            d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Minimize - Yellow */}
      <button
        type="button"
        className="minimize relative flex items-center justify-center size-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#dea123] active:bg-[#c48d1b] border border-black/10 transition-colors cursor-pointer"
        title="Minimize"
        aria-label="Minimize window"
        onClick={(e) => {
          e.stopPropagation();
          toggleMinimize(target);
        }}
      >
        <svg
          viewBox="0 0 10 10"
          className="size-2 text-[#5d3200] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        >
          <path
            d="M2 5H8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Maximize / Zoom - Green */}
      <button
        type="button"
        className="maximize relative flex items-center justify-center size-3.5 rounded-full bg-[#27c93f] hover:bg-[#1aab29] active:bg-[#159423] border border-black/10 transition-colors cursor-pointer"
        title={isMaximized ? "Restore" : "Zoom"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        onClick={(e) => {
          e.stopPropagation();
          toggleMaximize(target);
        }}
      >
        {isMaximized ? (
          <svg
            viewBox="0 0 10 10"
            className="size-2 text-[#004d00] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          >
            {/* Inward arrows for restore */}
            <path
              d="M4 1.5v2.5H1.5M6 8.5V6h2.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 10 10"
            className="size-2 text-[#004d00] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          >
            {/* Outward diagonal arrows for maximize */}
            <path
              d="M2 3.5L5 2L3.5 5M8 6.5L5 8L6.5 5"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default WindowControls;
