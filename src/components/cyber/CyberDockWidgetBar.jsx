import { useState, useEffect, useMemo } from "react";
import useWindowStore from "#store/window";
import clsx from "clsx";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Circle,
} from "lucide-react";

// Web Audio API Ambient Synthwave Engine
class SynthwaveEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.timer = null;
    this.gainNode = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    // Master bus
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);

    // Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.setValueAtTime(750, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(4, this.ctx.currentTime);

    // Delay
    this.delay = this.ctx.createDelay();
    this.delay.delayTime.setValueAtTime(0.24, this.ctx.currentTime);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.delay.connect(this.delayGain);
    this.delayGain.connect(this.delay);
    this.delay.connect(this.gainNode);

    this.filter.connect(this.gainNode);
    this.filter.connect(this.delay);
    this.gainNode.connect(this.ctx.destination);
  }

  play() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.isPlaying = true;
    this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.4);

    const chords = [
      [261.63, 311.13, 392.0, 523.25], // C minor
      [207.65, 261.63, 311.13, 415.3], // Ab major
      [155.56, 233.08, 311.13, 466.16], // Eb major
      [233.08, 293.66, 349.23, 466.16], // Bb major
    ];

    const noteDuration = 0.22;
    this.step = 0;

    const tick = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chordIndex = Math.floor(this.step / 8) % chords.length;
      const chord = chords[chordIndex];
      const noteFreq = chord[this.step % chord.length];

      if (this.step % 8 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(chord[0] / 2, now);
        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 6);
        bassOsc.connect(this.filter);
        bassOsc.start(now);
        bassOsc.stop(now + noteDuration * 6);
      }

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(noteFreq, now);

      noteGain.gain.setValueAtTime(0.15, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 1.5);

      osc.connect(noteGain);
      noteGain.connect(this.filter);

      osc.start(now);
      osc.stop(now + noteDuration * 1.6);

      this.step = (this.step + 1) % (chords.length * 8);
      this.timer = setTimeout(tick, noteDuration * 1000);
    };

    tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
    }
  }

  destroy() {
    this.pause();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }
}

const synthEngine = new SynthwaveEngine();

const CyberDockWidgetBar = () => {
  const { openWindow, focusWindow, windows } = useWindowStore();

  // 1. Music Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(38);

  useEffect(() => {
    if (!isPlaying) return;
    // 250ms tick (same 9%/s speed as the old per-frame 0.15 step) instead of re-rendering at 60Hz
    const id = setInterval(() => {
      setTrackProgress((p) => (p >= 100 ? 0 : p + 2.25));
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      synthEngine.pause();
      setIsPlaying(false);
    } else {
      synthEngine.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      synthEngine.pause();
    };
  }, []);

  // 2. Quest / Task Checklist state
  const [tasks, setTasks] = useState([
    { id: 1, text: "Ship the landing page", done: false, targetWin: "finder" },
    { id: 2, text: "Book the flights", done: false, targetWin: "contact" },
  ]);

  const activeTaskCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);

  const toggleTask = (id, e) => {
    e?.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Window launcher helper
  const handleAppClick = (appId) => {
    const win = windows[appId];
    if (!win) {
      openWindow(appId);
      return;
    }
    if (win.isOpen) {
      if (win.isMinimized) openWindow(appId);
      else focusWindow(appId);
    } else {
      openWindow(appId);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center md:gap-1.5 lg:gap-2 xl:gap-2.5 px-1 py-1 md:py-0.5 text-white max-w-full select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. FINDER (Projects & Storage: SSD 142/256 GB · RAM 12/16 GB)
          ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => handleAppClick("finder")}
        className="cyber-app-glass-card md:order-1 group flex items-center gap-2 md:gap-2 xl:gap-2.5 px-2 md:px-2.5 xl:px-3 py-2 md:py-1.5 active:scale-[0.98] cursor-pointer min-w-0 md:flex-shrink-0"
        title="Finder / Projects Vault"
      >
        <img
          src="/images/finder.png"
          alt="Finder"
          className="w-9 h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] transition-transform group-hover:scale-105 flex-shrink-0"
        />

        <div className="flex flex-col justify-center min-w-0 flex-1 md:min-w-[95px] lg:min-w-[115px] xl:min-w-[136px]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs xl:text-[13px] font-semibold text-white tracking-tight group-hover:text-[#00f0ff] transition-colors leading-snug truncate">
              Finder
            </span>
            <span className="text-[9px] md:hidden font-mono text-cyan-300/90 flex-shrink-0">
              4 Proj
            </span>
            <div className="hidden md:flex items-center gap-1 text-[9px] xl:text-[9.5px] font-mono text-cyan-300">
              <span>142/256 GB</span>
              <div className="hidden lg:block w-7 xl:w-9 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                  style={{ width: "55%" }}
                />
              </div>
            </div>
          </div>

          {/* Mobile compact storage bar */}
          <div className="flex md:hidden items-center justify-between gap-1.5 pt-0.5">
            <span className="text-[9px] text-white/70 font-mono truncate">
              142/256GB
            </span>
            <div className="w-8 h-1 bg-white/15 rounded-full overflow-hidden flex-shrink-0">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                style={{ width: "55%" }}
              />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between text-[9.5px] xl:text-[10px] text-white/65 font-mono pt-0.5 leading-snug">
            <span>RAM 12/16 GB</span>
            <span className="hidden lg:inline text-white/55">· 4 Projects</span>
          </div>
        </div>

        {/* Window open indicator */}
        {windows.finder?.isOpen && (
          <span className="size-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff] absolute -bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none" />
        )}
      </div>

      {/* Glass Divider */}
      <div className="hidden md:block md:order-2 w-[1px] h-7 xl:h-8 bg-white/10 flex-shrink-0" />

      {/* ─────────────────────────────────────────────────────────────
          2. TERMINAL (Skills & Stacks: zsh · 6/6 Stacks 100%)
          ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => handleAppClick("terminal")}
        className="cyber-app-glass-card md:order-3 group flex items-center gap-2 md:gap-2 xl:gap-2.5 px-2 md:px-2.5 xl:px-3 py-2 md:py-1.5 active:scale-[0.98] cursor-pointer min-w-0 md:flex-shrink-0"
        title="Terminal / Tech Stack Engine"
      >
        <img
          src="/images/terminal.png"
          alt="Terminal"
          className="w-9 h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(0,255,160,0.4)] transition-transform group-hover:scale-105 flex-shrink-0"
        />

        <div className="flex flex-col justify-center min-w-0 flex-1 md:min-w-[90px] lg:min-w-[110px] xl:min-w-[136px]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs xl:text-[13px] font-semibold text-white tracking-tight group-hover:text-cyan-200 transition-colors leading-snug truncate">
              Terminal
            </span>
            <span className="text-[9px] xl:text-[9.5px] text-white/65 font-mono flex-shrink-0">
              zsh
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[9px] xl:text-[10px] pt-0.5 leading-snug">
            <span className="text-emerald-300 font-mono font-medium truncate">
              6/6 Stacks
            </span>
            <div className="flex items-center gap-1 font-mono text-[9px] xl:text-[9.5px] text-white/75 flex-shrink-0">
              <span className="hidden xl:inline">100%</span>
              <div className="w-5 lg:w-7 xl:w-8 h-1 xl:h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Window open indicator */}
        {windows.terminal?.isOpen && (
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] absolute -bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none" />
        )}
      </div>

      {/* Glass Divider */}
      <div className="hidden md:block md:order-4 w-[1px] h-7 xl:h-8 bg-white/10 flex-shrink-0" />

      {/* ─────────────────────────────────────────────────────────────
          3. CONTACT (Uplink / Status: Online · Available for Hire)
          ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => handleAppClick("contact")}
        className="cyber-app-glass-card md:order-5 group flex items-center gap-2 md:gap-2 xl:gap-2.5 px-2 md:px-2.5 xl:px-3 py-2 md:py-1.5 active:scale-[0.98] cursor-pointer min-w-0 md:flex-shrink-0"
        title="Contact / Messages"
      >
        <img
          src="/images/contact.png"
          alt="Contact"
          className="w-9 h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(0,180,255,0.4)] transition-transform group-hover:scale-105 flex-shrink-0"
        />

        <div className="flex flex-col justify-center min-w-0 flex-1 md:min-w-[85px] lg:min-w-[105px] xl:min-w-[120px]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs xl:text-[13px] font-semibold text-white tracking-tight group-hover:text-cyan-200 transition-colors leading-snug truncate">
              Contact
            </span>
            <span className="flex items-center gap-1 text-[9px] text-emerald-300 font-mono flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden lg:inline">Online</span>
            </span>
          </div>

          <span className="text-[9px] xl:text-[10px] text-white/70 tracking-tight pt-0.5 leading-snug truncate">
            Available for Hire
          </span>
        </div>

        {/* Window open indicator */}
        {windows.contact?.isOpen && (
          <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa] absolute -bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none" />
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. QUEST / TASK CHECKLIST (Cell 4 on mobile, hidden on tablet/iPad md-lg, visible on xl)
          ───────────────────────────────────────────────────────────── */}
      <div className="cyber-app-glass-card cyber-checklist-card flex md:hidden xl:flex md:order-9 group items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-2 md:py-1.5 min-w-0 md:flex-shrink-0">
        {/* Circular Progress Ring with remaining task count */}
        <div className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2.2"
            />
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2.2"
              strokeDasharray={2 * Math.PI * 9}
              strokeDashoffset={
                2 * Math.PI * 9 * (activeTaskCount / Math.max(tasks.length, 1))
              }
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <span className="absolute text-[10px] md:text-[11px] font-bold text-white">
            {activeTaskCount}
          </span>
        </div>

        {/* Task Items */}
        <div className="flex flex-col gap-1 min-w-0 flex-1 md:min-w-[130px]">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={(e) => toggleTask(task.id, e)}
              className="flex items-center gap-1.5 cursor-pointer group/task min-w-0"
              title={`Click to mark ${task.done ? "undone" : "done"}`}
            >
              {task.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-white/55 group-hover/task:text-[#00f0ff] transition-colors flex-shrink-0" />
              )}
              <span
                className={clsx(
                  "text-[10px] md:text-[11px] tracking-tight transition-all truncate",
                  task.done
                    ? "line-through text-white/45"
                    : "text-white/90 group-hover/task:text-white"
                )}
              >
                {task.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Glass Divider (only on md between Contact and Photos) */}
      <div className="hidden md:block md:order-6 w-[1px] h-7 xl:h-8 bg-white/10 flex-shrink-0" />

      {/* ─────────────────────────────────────────────────────────────
          5. PHOTOS & MUSIC PLAYER (Full-width bottom row on mobile, inline on desktop)
          ───────────────────────────────────────────────────────────── */}
      <div className="cyber-app-glass-card col-span-2 md:order-7 group flex items-center justify-between md:justify-start gap-2 md:gap-2 xl:gap-2.5 px-2.5 md:px-2.5 xl:px-3 py-2 md:py-1.5 min-w-0 md:flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-2 xl:gap-2.5 min-w-0 flex-1">
          {/* Photos 2026 Icon */}
          <div
            onClick={() => handleAppClick("photos")}
            className="cursor-pointer transition-transform group-hover:scale-105 flex-shrink-0"
            title="Open Gallery (Photos)"
          >
            <img
              src="/images/photos.png"
              alt="Photos"
              className="w-9 h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(255,160,0,0.4)]"
            />
          </div>

          {/* Track Info & Progress */}
          <div className="flex flex-col justify-center min-w-0 flex-1 md:min-w-[80px] md:max-w-[100px] lg:min-w-[105px] lg:max-w-[125px] xl:min-w-[115px] xl:max-w-[135px]">
            <span className="text-xs xl:text-[12.5px] font-semibold text-white truncate leading-snug">
              Golden Hour Drive
            </span>
            <span className="text-[9px] xl:text-[10px] text-white/50 truncate leading-snug">
              Neva Lane · OST
            </span>
            {/* Mini progress bar along bottom */}
            <div className="w-full h-1 xl:h-1.5 bg-white/10 rounded-full mt-0.5 xl:mt-1 overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-[width] duration-300 ease-linear"
                style={{ width: `${trackProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-1 xl:gap-1.5 pl-0.5 xl:pl-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTrackProgress(0);
            }}
            className="p-0.5 xl:p-1 text-white/50 hover:text-white transition active:scale-90 cursor-pointer"
            title="Restart Track"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Circular Bright Blue Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className={clsx(
              "w-7 h-7 xl:w-8 xl:h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md cursor-pointer",
              isPlaying
                ? "bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.7)]"
                : "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-[0_0_10px_rgba(0,112,243,0.5)]"
            )}
            title={isPlaying ? "Pause Ambient Music" : "Play Ambient Synthwave"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 xl:w-4 xl:h-4 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 xl:w-4 xl:h-4 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTrackProgress((p) => (p + 25) % 100);
            }}
            className="p-0.5 xl:p-1 text-white/50 hover:text-white transition active:scale-90 cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Window open indicator */}
        {windows.photos?.isOpen && (
          <span className="size-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc] absolute -bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none" />
        )}
      </div>

      {/* Glass Divider (only on xl before Checklist) */}
      <div className="cyber-checklist-card hidden xl:block md:order-8 w-[1px] h-7 xl:h-8 bg-white/10 flex-shrink-0" />
    </div>
  );
};

export default CyberDockWidgetBar;
