import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME_ID } from '@/lib/themes';

interface ThemeState {
  panelThemes: Record<string, string>;
  pageThemes: Record<string, string>;
  previewPanelKey: string | null;
  previewPageKey: string | null;
  setPanelTheme: (panelKey: string, themeId: string) => void;
  resetPanelTheme: (panelKey: string) => void;
  setPageTheme: (panelKey: string, themeId: string) => void;
  resetPageTheme: (panelKey: string) => void;
  resetAll: () => void;
  getPanelTheme: (panelKey: string) => string;
  getPageTheme: (panelKey: string) => string;
  setPreviewPanel: (key: string | null) => void;
  setPreviewPage: (key: string | null) => void;
  hydrateThemes: (prefs: { panelThemes?: Record<string, string>; pageThemes?: Record<string, string> }) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      panelThemes: {},
      pageThemes: {},
      previewPanelKey: null,
      previewPageKey: null,
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
      resetAll: () => set({ panelThemes: {}, pageThemes: {} }),
      getPanelTheme: (panelKey) => get().panelThemes[panelKey] || DEFAULT_THEME_ID,
      getPageTheme: (panelKey) => get().pageThemes[panelKey] || DEFAULT_THEME_ID,
      setPreviewPanel: (key) => set({ previewPanelKey: key }),
      setPreviewPage: (key) => set({ previewPageKey: key }),
      hydrateThemes: (prefs) => set({ 
        panelThemes: prefs.panelThemes || {}, 
        pageThemes: prefs.pageThemes || {} 
      }),
    }),
    { 
      name: 'panel-theme-storage',
      partialize: (state) => ({ 
        panelThemes: state.panelThemes,
        pageThemes: state.pageThemes 
      }),
    }
  )
);
