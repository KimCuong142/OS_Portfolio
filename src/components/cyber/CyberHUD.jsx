import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const bar = (pct, cells = 10) => {
  const filled = Math.round((pct / 100) * cells);
  return "■".repeat(filled) + "·".repeat(Math.max(cells - filled, 0));
};

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

const Pie = ({ pct }) => {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg className="w-4 h-4 -rotate-90" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
};

const Spark = ({ values }) => (
  <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
    {values.map((v, i) => (
      <span
        key={i}
        className="w-[3px] bg-[#00f0ff] shadow-[0_0_4px_#00f0ff]"
        style={{ height: `${v}%`, transition: "height 0.6s ease" }}
      />
    ))}
  </span>
);

const Heading = ({ children, align = "left" }) => (
  <div className={`hud-heading ${align === "right" ? "hud-heading--right" : ""}`}>
    {align === "left" && <span className="opacity-70">›</span>}
    <span>{children}</span>
    {align === "right" && <span className="opacity-70">‹</span>}
  </div>
);

const CyberHUD = ({ active = true }) => {
  const rootRef = useRef(null);
  const [stats, setStats] = useState({
    cpu: 57,
    mem: 69,
    net: 61,
    signal: 52,
    ping: 14,
    nodes: 12902,
    bw: 2.8,
    load: [40, 80, 30, 95, 60, 75, 45, 85],
    scan: [30, 70, 55, 90, 40, 65, 80, 35],
  });
  const [clock, setClock] = useState("");

  // Live telemetry jitter
  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      setStats((s) => ({
        cpu: Math.min(99, Math.max(20, s.cpu + rand(-6, 6))),
        mem: Math.min(95, Math.max(40, s.mem + rand(-3, 3))),
        net: Math.min(99, Math.max(30, s.net + rand(-5, 5))),
        signal: Math.min(99, Math.max(25, s.signal + rand(-4, 4))),
        ping: Math.max(6, Math.min(40, s.ping + rand(-3, 3))),
        nodes: s.nodes + rand(-12, 18),
        bw: Math.max(1.2, Math.min(6.4, +(s.bw + (Math.random() - 0.5) * 0.6).toFixed(1))),
        load: s.load.map(() => rand(15, 100)),
        scan: s.scan.map(() => rand(15, 100)),
      }));
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

  // Boot sequence: panels flicker in from the edges
  useGSAP(
    () => {
      if (!active) return;

      const tl = gsap.timeline({ delay: 0.2 });
      tl.from(".hud-panel", {
        opacity: 0,
        x: (i, el) => (el.dataset.side === "right" ? 40 : -40),
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.1,
      })
        .from(
          ".hud-panel .hud-line",
          { opacity: 0, x: -8, duration: 0.25, stagger: 0.03, ease: "steps(3)" },
          "-=0.3"
        )
        .from(".hud-frame", { opacity: 0, scale: 1.04, duration: 0.7, ease: "power2.out" }, 0);

      // idle flicker on one random line every few seconds
      const flick = () => {
        const lines = gsap.utils.toArray(".hud-panel .hud-line", rootRef.current);
        if (!lines.length) return;
        const el = gsap.utils.random(lines);
        gsap.fromTo(el, { opacity: 0.2 }, { opacity: 1, duration: 0.35, ease: "steps(4)" });
      };
      const loop = gsap.to({}, { duration: 3, repeat: -1, onRepeat: flick });
      return () => loop.kill();
    },
    { dependencies: [active], scope: rootRef }
  );

  if (!active) return null;

  return (
    <div ref={rootRef} className="hud-root absolute inset-0 z-10 pointer-events-none font-mono text-[#00f0ff]">
      {/* Corner frame brackets */}
      <div className="hud-frame absolute inset-x-3 sm:inset-x-4 top-14 sm:top-16 bottom-3 sm:bottom-4 pointer-events-none">
        <span className="hud-corner top-0 left-0 border-t border-l" />
        <span className="hud-corner top-0 right-0 border-t border-r" />
        <span className="hud-corner bottom-0 left-0 border-b border-l" />
        <span className="hud-corner bottom-0 right-0 border-b border-r" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-between px-3 sm:px-6 pt-14 sm:pt-20 pb-4 sm:pb-6 pointer-events-none">
        {/* Mobile-only compact telemetry strip */}
        <div className="flex md:hidden justify-between items-center text-[9px] tracking-wider opacity-85 px-1 pt-1">
          <span className="font-bold flex items-center gap-1.5 text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            SYS::ONLINE
          </span>
          <span className="text-[#00f0ff]/80">PING: {stats.ping}MS</span>
          <span className="text-[#00f0ff]/60">{clock}</span>
        </div>

        {/* Top row (Desktop / Tablet) */}
        <div className="hidden md:flex justify-between">
          <section className="hud-panel" data-side="left">
            <Heading>SYS_MONITOR</Heading>
            <div className="hud-line flex items-center gap-2 pt-1">
              <Pie pct={stats.cpu} />
              <span className="text-[10px] tracking-widest">CPU</span>
            </div>
            <div className="hud-line text-[10px] opacity-80">{bar(stats.cpu, 8)} <b className="opacity-100">{stats.cpu}%</b></div>
            <div className="hud-line text-[10px] opacity-70 tracking-widest pt-1">MEM</div>
            <div className="hud-line text-[10px] opacity-80">{bar(stats.mem, 8)} <b>{stats.mem}%</b></div>
            <div className="hud-line text-[10px] tracking-widest pt-1 font-bold">NEURAL_LINK::ACTIVE</div>
            <div className="hud-line flex items-center gap-2 text-[9px] opacity-80">
              LOAD <Spark values={stats.load} />
            </div>
          </section>

          <section className="hud-panel text-right mr-2 sm:mr-4" data-side="right">
            <Heading align="right">NET_STATUS</Heading>
            <div className="hud-line text-[10px] pt-1"><b>{stats.net}%</b></div>
            <div className="hud-line text-[10px] opacity-80">{bar(stats.net, 8)}</div>
            <div className="hud-line flex items-center justify-end gap-2 text-[10px] tracking-widest">
              UPLINK <Pie pct={stats.net} />
            </div>
            <div className="hud-line text-[10px] opacity-80">PING: {stats.ping}MS</div>
            <div className="hud-line text-[9px] opacity-60">UTC: {clock}</div>
            <div className="hud-line text-[9px] opacity-60">LAT: 10.8231°N / 106.6297°E</div>
          </section>
        </div>

        {/* Bottom row (Desktop / Tablet) */}
        <div className="hidden md:flex justify-between items-end pb-16">
          <section className="hud-panel" data-side="left">
            <Heading>SEC_SCAN</Heading>
            <div className="hud-line text-[10px] opacity-80 pt-1">THREAT::NONE</div>
            <div className="hud-line text-[10px] opacity-80">FIREWALL::ENABLED</div>
            <div className="hud-line text-[10px] opacity-70 pt-1">SIGNAL</div>
            <div className="hud-line text-[10px] opacity-80">{bar(stats.signal, 8)} <b>{stats.signal}%</b></div>
            <div className="hud-line flex items-center gap-2 text-[9px] opacity-80">
              NET_SCAN <Spark values={stats.scan} />
            </div>
          </section>

          <div className="flex items-end gap-5 mr-2 sm:mr-4">
            {/* Radar */}
            <div className="hud-panel hud-radar hidden md:block" data-side="right">
              <svg viewBox="-30 -30 60 60" className="w-14 h-14" aria-hidden="true">
                <circle r="27" fill="none" stroke="currentColor" strokeOpacity="0.45" />
                <circle r="17" fill="none" stroke="currentColor" strokeOpacity="0.25" />
                <circle r="7" fill="none" stroke="currentColor" strokeOpacity="0.25" />
                <line x1="-27" x2="27" stroke="currentColor" strokeOpacity="0.2" />
                <line y1="-27" x2="27" stroke="currentColor" strokeOpacity="0.2" />
                <g className="hud-radar-sweep">
                  <path d="M0 0 L27 0 A27 27 0 0 0 19 -19 Z" fill="url(#radarGrad)" />
                  <line x1="0" y1="0" x2="27" y2="0" stroke="currentColor" />
                </g>
                <circle cx="9" cy="-12" r="1.4" fill="#ff2a6d" className="animate-pulse" />
                <circle cx="-14" cy="8" r="1.2" fill="currentColor" className="animate-pulse" />
                <defs>
                  <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="-1">
                    <stop offset="0" stopColor="#00f0ff" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#00f0ff" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <section className="hud-panel text-right" data-side="right">
              <Heading align="right">NODE_MAP</Heading>
              <div className="hud-line text-[10px] opacity-80 pt-1">NODES::{stats.nodes.toLocaleString("en-US")} ACTIVE</div>
              <div className="hud-line text-[10px] opacity-80">BW::{bar(stats.bw * 15, 7)}</div>
              <div className="hud-line text-[10px] font-bold">{stats.bw}PB/S</div>
              <div className="hud-line text-[9px] opacity-60">UPTIME::18249D 07H 23M</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberHUD;
