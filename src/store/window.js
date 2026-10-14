import { create } from "zustand";
import { INITIAL_Z_INDEX, WINDOW_CONFIG } from "#constants";

const useWindowStore = create((set) => ({
  windows: WINDOW_CONFIG,
  nextZIndex: INITIAL_Z_INDEX + 1,

  openWindow: (windowKey, data = null) =>
    set((state) => {
      const current = state.windows[windowKey] || {
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        zIndex: INITIAL_Z_INDEX,
        data: null,
      };
      let maxZ = state.nextZIndex - 1;
      for (const k in state.windows) {
        if (state.windows[k]?.isOpen && state.windows[k].zIndex > maxZ) {
          maxZ = state.windows[k].zIndex;
        }
      }
      const newZ = Math.max(state.nextZIndex + 2, maxZ + 2);
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...current,
            isOpen: true,
            isMinimized: false,
            zIndex: newZ,
            data: data ?? current.data,
          },
        },
        nextZIndex: newZ + 1,
      };
    }),

  closeWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: INITIAL_Z_INDEX,
            data: null,
          },
        },
      };
    }),

  minimizeWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isMinimized: true,
          },
        },
      };
    }),

  restoreWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      let maxZ = state.nextZIndex - 1;
      for (const k in state.windows) {
        if (state.windows[k]?.isOpen && state.windows[k].zIndex > maxZ) {
          maxZ = state.windows[k].zIndex;
        }
      }
      const newZ = Math.max(state.nextZIndex, maxZ + 1);
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: true,
            isMinimized: false,
            zIndex: newZ,
          },
        },
        nextZIndex: newZ + 1,
      };
    }),

  toggleMinimize: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      const willMinimize = !win.isMinimized;
      let maxZ = state.nextZIndex - 1;
      for (const k in state.windows) {
        if (state.windows[k]?.isOpen && state.windows[k].zIndex > maxZ) {
          maxZ = state.windows[k].zIndex;
        }
      }
      const newZ = Math.max(state.nextZIndex, maxZ + 1);
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isMinimized: willMinimize,
            ...(willMinimize ? {} : { isOpen: true, zIndex: newZ }),
          },
        },
        ...(!willMinimize ? { nextZIndex: newZ + 1 } : {}),
      };
    }),

  toggleMaximize: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      let maxZ = state.nextZIndex - 1;
      for (const k in state.windows) {
        if (state.windows[k]?.isOpen && state.windows[k].zIndex > maxZ) {
          maxZ = state.windows[k].zIndex;
        }
      }
      const newZ = Math.max(state.nextZIndex, maxZ + 1);
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isMaximized: !win.isMaximized,
            zIndex: newZ,
          },
        },
        nextZIndex: newZ + 1,
      };
    }),

  focusWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;

      let maxOther = 0;
      let otherOpenCount = 0;
      for (const k in state.windows) {
        if (k !== windowKey && state.windows[k]?.isOpen) {
          otherOpenCount++;
          if (state.windows[k].zIndex > maxOther) {
            maxOther = state.windows[k].zIndex;
          }
        }
      }

      // If already strictly higher than all other open windows, skip update
      if (otherOpenCount > 0 && win.zIndex > maxOther) {
        return state;
      }
      if (otherOpenCount === 0 && win.zIndex >= state.nextZIndex - 1) {
        return state;
      }

      const newZ = Math.max(state.nextZIndex, maxOther + 1);
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            zIndex: newZ,
          },
        },
        nextZIndex: newZ + 1,
      };
    }),
}));

export default useWindowStore;
