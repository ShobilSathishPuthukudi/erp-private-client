import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME_ID } from '@/lib/themes';

interface ThemeState {
  panelThemes: Record<string, string>;
  setPanelTheme: (panelKey: string, themeId: string) => void;
  resetPanelTheme: (panelKey: string) => void;
  resetAll: () => void;
  getPanelTheme: (panelKey: string) => string;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      panelThemes: {},
      setPanelTheme: (panelKey, themeId) =>
        set((state) => ({ panelThemes: { ...state.panelThemes, [panelKey]: themeId } })),
      resetPanelTheme: (panelKey) =>
        set((state) => {
          const next = { ...state.panelThemes };
          delete next[panelKey];
          return { panelThemes: next };
        }),
      resetAll: () => set({ panelThemes: {} }),
      getPanelTheme: (panelKey) => get().panelThemes[panelKey] || DEFAULT_THEME_ID,
    }),
    { name: 'panel-theme-storage' }
  )
);
