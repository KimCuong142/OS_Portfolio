import useThemeStore from "#store/theme";
import clsx from "clsx";

const YEARS = ["2004", "2026", "2077"];

const TimelineSelector = () => {
  const { currentYear, setYear } = useThemeStore();
  const is2077 = currentYear === "2077";
  const is2004 = currentYear === "2004";

  return (
    <div
      aria-label="Temporal Timeline Selector"
      className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 flex justify-center pointer-events-auto select-none transition-all duration-300"
    >
      <div className="relative">
        {/* Cyber HUD Bracket in 2077 mode */}
        {is2077 && (
          <div className="cyber-bracket-top absolute -inset-y-2.5 sm:-inset-y-3 -inset-x-8 sm:-inset-x-10 bg-[#00f0ff]/15 border-t border-[#00f0ff]/30 border-b border-[#00f0ff]/40 -z-10 pointer-events-none transition-all duration-500" />
        )}

        <div
          className={clsx(
            "flex items-center space-x-2 sm:space-x-4 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full backdrop-blur-md transition-all duration-300",
            is2077
              ? "border border-[#00f0ff]/30 bg-[#021020]/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] font-mono"
              : is2004
              ? "border-2 border-[#0055ea]/60 bg-gradient-to-b from-[#ffffff]/90 to-[#ece9d8]/90 shadow-md shadow-blue-900/20 font-sans"
              : "border border-white/40 bg-white/15 shadow-md shadow-black/5 text-neutral-800"
          )}
        >
          {YEARS.map((year, idx) => {
            const isActive = currentYear === year;
            return (
              <div key={year} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setYear(year)}
                  className="group flex items-center space-x-1.5 cursor-pointer focus:outline-none py-0.5"
                  title={`Switch to ${year} mode`}
                >
                  <span
                    className={clsx(
                      "inline-block transition-all",
                      is2077
                        ? clsx(
                            "w-2.5 h-2.5 rotate-45",
                            isActive
                              ? "bg-[#00f0ff] diamond-glow"
                              : "border border-[#00f0ff]/60 group-hover:bg-[#00f0ff]"
                          )
                        : is2004
                        ? clsx(
                            "w-2.5 h-2.5 rounded-full border transition-all",
                            isActive
                              ? "bg-[#28ad36] border-[#156e1f] shadow-sm shadow-green-700/50"
                              : "border-[#0055ea]/60 bg-white group-hover:bg-[#0055ea]/30"
                          )
                        : clsx(
                            "w-2.5 h-2.5 rounded-full",
                            isActive
                              ? "bg-neutral-900"
                              : "border-2 border-neutral-300 bg-transparent group-hover:border-neutral-500"
                          )
                    )}
                  />
                  <span
                    className={clsx(
                      "text-xs sm:text-sm tracking-wider transition-colors",
                      is2077
                        ? isActive
                          ? "text-[#00f0ff] cyan-glow font-orbitron font-bold"
                          : "text-[#00f0ff]/70 group-hover:text-[#00f0ff] font-semibold"
                        : is2004
                        ? isActive
                          ? "text-[#0039a6] font-bold font-sans drop-shadow-xs"
                          : "text-neutral-600 group-hover:text-[#0039a6] font-medium font-sans"
                        : isActive
                        ? "text-neutral-900 font-bold font-sans"
                        : "text-neutral-400 group-hover:text-neutral-700 font-medium font-sans"
                    )}
                  >
                    {year}
                  </span>
                </button>

                {idx < YEARS.length - 1 && (
                  <span
                    className={clsx(
                      "w-3 sm:w-6 h-[1px] ml-2 sm:ml-4 transition-colors",
                      is2077
                        ? "bg-[#00f0ff]/30"
                        : is2004
                        ? "bg-[#0055ea]/30"
                        : "bg-neutral-300"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineSelector;
