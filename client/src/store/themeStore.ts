import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME_ID } from '@/lib/themes';

interface ThemeState {
  panelThemes: Record<string, string>;
  pageThemes: Record<string, string>;
  cardThemes: Record<string, string>;
  previewPanelKey: string | null;
  previewPageKey: string | null;
  previewCardKey: string | null;
  setPanelTheme: (panelKey: string, themeId: string) => void;
  resetPanelTheme: (panelKey: string) => void;
  setPageTheme: (panelKey: string, themeId: string) => void;
  resetPageTheme: (panelKey: string) => void;
  setCardTheme: (panelKey: string, themeId: string) => void;
  resetCardTheme: (panelKey: string) => void;
  resetAll: () => void;
  getPanelTheme: (panelKey: string) => string;
  getPageTheme: (panelKey: string) => string;
  getCardTheme: (panelKey: string) => string;
  setPreviewPanel: (key: string | null) => void;
  setPreviewPage: (key: string | null) => void;
  setPreviewCard: (key: string | null) => void;
  hydrateThemes: (prefs: { panelThemes?: Record<string, string>; pageThemes?: Record<string, string>; cardThemes?: Record<string, string> }) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      panelThemes: {},
      pageThemes: {},
      cardThemes: {},
      previewPanelKey: null,
      previewPageKey: null,
      previewCardKey: null,
      setPanelTheme: (panelKey, themeId) =>
        set((state) => ({ panelThemes: { ...state.panelThemes, [panelKey]: themeId } })),
      resetPanelTheme: (panelKey) =>
        set((state) => {
          const next = { ...state.panelThemes };
          delete next[panelKey];
          return { panelThemes: next };
        }),
      setPageTheme: (panelKey, themeId) =>
        set((state) => ({ pageThemes: { ...state.pageThemes, [panelKey]: themeId } })),
      resetPageTheme: (panelKey) =>
        set((state) => {
          const next = { ...state.pageThemes };
          delete next[panelKey];
          return { pageThemes: next };
        }),
      setCardTheme: (panelKey, themeId) =>
        set((state) => ({ cardThemes: { ...state.cardThemes, [panelKey]: themeId } })),
      resetCardTheme: (panelKey) =>
        set((state) => {
          const next = { ...state.cardThemes };
          delete next[panelKey];
          return { cardThemes: next };
        }),
      resetAll: () => set({ panelThemes: {}, pageThemes: {}, cardThemes: {} }),
      getPanelTheme: (panelKey) => get().panelThemes[panelKey] || DEFAULT_THEME_ID,
      getPageTheme: (panelKey) => get().pageThemes[panelKey] || DEFAULT_THEME_ID,
      getCardTheme: (panelKey) => get().cardThemes[panelKey] || DEFAULT_THEME_ID,
      setPreviewPanel: (key) => set({ previewPanelKey: key }),
      setPreviewPage: (key) => set({ previewPageKey: key }),
      setPreviewCard: (key) => set({ previewCardKey: key }),
      hydrateThemes: (prefs) => set({
        panelThemes: prefs.panelThemes || {},
        pageThemes: prefs.pageThemes || {},
        cardThemes: prefs.cardThemes || {},
      }),
    }),
    {
      name: 'panel-theme-storage',
      partialize: (state) => ({
        panelThemes: state.panelThemes,
        pageThemes: state.pageThemes,
        cardThemes: state.cardThemes,
      }),
    }
  )
);
