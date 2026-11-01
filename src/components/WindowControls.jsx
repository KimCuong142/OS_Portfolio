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
    <div
      id="window-controls"
      className="group flex items-center gap-2 max-sm:gap-2.5 select-none touch-manipulation py-1"
    >
      {/* Close - Red */}
      <button
        type="button"
        className="close relative flex items-center justify-center size-3.5 rounded-full bg-[#ff5f56] hover:bg-[#e0443e] active:bg-[#c9322c] border border-black/15 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.35)] transition-all cursor-pointer touch-manipulation active:scale-90 before:content-[''] before:absolute before:-inset-y-3 before:-inset-x-1.5 sm:before:hidden before:z-10"
        title="Close"
        aria-label="Close window"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          closeWindow(target);
        }}
      >
        <svg
          viewBox="0 0 12 12"
          className="size-3 text-[#4d0000] opacity-85 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        >
          <path
            d="M2.7 2.7l6.6 6.6M9.3 2.7l-6.6 6.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Minimize - Yellow */}
      <button
        type="button"
        className="minimize relative flex items-center justify-center size-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#dea123] active:bg-[#c48d1b] border border-black/15 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.35)] transition-all cursor-pointer touch-manipulation active:scale-90 before:content-[''] before:absolute before:-inset-y-3 before:-inset-x-1.5 sm:before:hidden before:z-10"
        title="Minimize"
        aria-label="Minimize window"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleMinimize(target);
        }}
      >
        <svg
          viewBox="0 0 12 12"
          className="size-3 text-[#5d3200] opacity-85 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        >
          <rect
            x="2.2"
            y="5.1"
            width="7.6"
            height="1.8"
            rx="0.9"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Maximize / Zoom - Green */}
      <button
        type="button"
        className="maximize relative flex items-center justify-center size-3.5 rounded-full bg-[#27c93f] hover:bg-[#1aab29] active:bg-[#159423] border border-black/15 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.35)] transition-all cursor-pointer touch-manipulation active:scale-90 before:content-[''] before:absolute before:-inset-y-3 before:-inset-x-1.5 sm:before:hidden before:z-10"
        title={isMaximized ? "Restore" : "Zoom"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleMaximize(target);
        }}
      >
        {isMaximized ? (
          <svg
            viewBox="0 0 12 12"
            className="size-3 text-[#004d00] opacity-85 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          >
            {/* 2 tam giác vuông đối xứng qua đường chéo cho Restore */}
            <path
              d="M9.8 2.2H4L9.8 8ZM2.2 9.8h5.8L2.2 4Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 12 12"
            className="size-3 text-[#004d00] opacity-85 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          >
            {/* 2 tam giác vuông chuẩn macOS đối xứng chéo qua rãnh 45 độ cho Zoom */}
            <path
              d="M2.2 2.2h5.8L2.2 8ZM9.8 9.8H4l5.8-5.8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default WindowControls;
