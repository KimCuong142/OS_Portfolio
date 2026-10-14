import { create } from "zustand";

const useThemeStore = create((set) => ({
  currentYear: "2026",
  setYear: (year) => set({ currentYear: year }),
  mode2026: localStorage.getItem("portfolio_mode_2026") || "light",
  setMode2026: (mode) => {
    localStorage.setItem("portfolio_mode_2026", mode);
    set({ mode2026: mode });
  },
  toggleMode2026: () =>
    set((state) => {
      const next = state.mode2026 === "light" ? "dark" : "light";
      localStorage.setItem("portfolio_mode_2026", next);
      return { mode2026: next };
    }),
}));

export default useThemeStore;

