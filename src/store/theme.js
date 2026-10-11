import { create } from "zustand";

const useThemeStore = create((set) => ({
  currentYear: "2077",
  setYear: (year) => set({ currentYear: year }),
}));

export default useThemeStore;
