import { navIcons, navLinks } from "#constants";
import useThemeStore from "#store/theme";
import useWindowStore from "#store/window";
import clsx from "clsx";
import dayjs from "dayjs";

const Navbar = () => {
  const { openWindow } = useWindowStore();
  const { currentYear } = useThemeStore();
  const is2077 = currentYear === "2077";

  // Windows XP does not have a top macOS menubar
  if (currentYear === "2004") return null;

  return (
    <nav
      className={clsx(
        "relative z-30 flex justify-between items-center p-2 px-5 select-none transition-all duration-300",
        is2077
          ? "bg-[#021020]/25 backdrop-blur-sm border-b border-[#00f0ff]/25 text-[#00f0ff]"
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
              : "border border-neutral-300/40 bg-white/20 text-neutral-800 rounded-lg shadow-sm backdrop-blur-xs"
          )}
        >
          {is2077 ? "R" : "KC"}
        </div>

        {!is2077 && (
          <>
            <p className="font-bold text-sm tracking-wide hidden sm:block text-neutral-900 font-sans">
              Kim Cuong's Portfolio
            </p>

            <ul className="flex items-center gap-4 max-md:hidden ml-2">
              {navLinks.map(({ id, name, type }) => (
                <li key={id} onClick={() => openWindow(type)}>
                  <p className="text-xs cursor-pointer tracking-wider transition-all text-neutral-600 hover:text-neutral-950 font-medium font-sans">
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

        <ul className="flex items-center gap-2 max-sm:hidden">
          {navIcons.map(({ id, img }) => (
            <li key={id}>
              <img
                src={img}
                className={clsx(
                  "icon-hover size-4 transition-all",
                  is2077 && "filter brightness-150 contrast-125"
                )}
                alt={`icons-${id}`}
              />
            </li>
          ))}
        </ul>

        <time
          className={clsx(
            "text-xs font-medium tracking-wider",
            is2077 ? "text-[#00f0ff] font-mono" : "text-neutral-800 font-sans"
          )}
        >
          {dayjs().format("MMM D h:mm A")}
        </time>
      </div>
    </nav>
  );
};

export default Navbar;
