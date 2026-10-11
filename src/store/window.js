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
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...current,
            isOpen: true,
            isMinimized: false,
            zIndex: state.nextZIndex,
            data: data ?? current.data,
          },
        },
        nextZIndex: state.nextZIndex + 1,
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
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: true,
            isMinimized: false,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  toggleMinimize: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      const willMinimize = !win.isMinimized;
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isMinimized: willMinimize,
            ...(willMinimize ? {} : { isOpen: true, zIndex: state.nextZIndex }),
          },
        },
        ...(!willMinimize ? { nextZIndex: state.nextZIndex + 1 } : {}),
      };
    }),

  toggleMaximize: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win) return state;
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isMaximized: !win.isMaximized,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  focusWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];
      if (!win || win.zIndex === state.nextZIndex - 1) return state;
      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),
}));

export default useWindowStore;
