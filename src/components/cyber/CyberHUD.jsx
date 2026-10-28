import { useEffect, useState } from "react";

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

const CyberHUD = ({ active = true }) => {
  const [ping, setPing] = useState(14);
  const [clock, setClock] = useState("");

  // Live telemetry jitter
  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      setPing((p) => Math.max(6, Math.min(40, p + rand(-3, 3))));
    }, 1800);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      setClock(`2077.${p(d.getMonth() + 1)}.${p(d.getDate())}_${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="hud-root absolute inset-0 z-10 pointer-events-none font-mono text-[#00f0ff]">
      <div className="absolute inset-0 flex flex-col justify-between px-3 sm:px-6 pt-14 sm:pt-20 pb-4 sm:pb-6 pointer-events-none">
        {/* Mobile-only compact telemetry strip at bottom of HUD frame */}
        <div className="flex md:hidden justify-between items-center text-[9px] tracking-wider opacity-85 px-2 mt-auto pb-1">
          <span className="font-bold flex items-center gap-1.5 text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            SYS::ONLINE
          </span>
          <span className="text-[#00f0ff]/80">PING: {ping}MS</span>
          <span className="text-[#00f0ff]/60">{clock}</span>
        </div>
      </div>
    </div>
  );
};

export default CyberHUD;
