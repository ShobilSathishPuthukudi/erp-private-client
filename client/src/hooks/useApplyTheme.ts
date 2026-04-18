import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { findPanelByPath, getPresetById, THEME_PRESETS, PANELS, DEFAULT_THEME_ID } from '@/lib/themes';

const ALL_VAR_KEYS = Array.from(
  new Set(THEME_PRESETS.flatMap((preset) => Object.keys(preset.vars)))
);

export function useApplyTheme() {
  const { pathname } = useLocation();
  const { panelThemes, pageThemes, previewPanelKey, previewPageKey } = useThemeStore();

  useEffect(() => {
    // 1. Resolve Panel Context
    let panel = findPanelByPath(pathname);
    let panelThemeId = panel ? panelThemes[panel.key] : DEFAULT_THEME_ID;
    let pageThemeId = panel ? pageThemes[panel.key] : DEFAULT_THEME_ID;

    // 2. Handle Preview Overrides (from Theme Studio)
    if (previewPanelKey) {
      const p = PANELS.find(x => x.key === previewPanelKey);
      if (p) {
        panel = p;
        panelThemeId = panelThemes[p.key] || DEFAULT_THEME_ID;
      }
    }
    // Note: Page preview is linked to the panel being previewed
    if (previewPageKey) {
       pageThemeId = pageThemes[previewPanelKey || 'profile'] || DEFAULT_THEME_ID;
    }

    const panelPreset = getPresetById(panelThemeId || DEFAULT_THEME_ID);
    const pagePreset = getPresetById(pageThemeId || DEFAULT_THEME_ID);
    
    const root = document.documentElement;

    // Clear all existing vars to ensure a clean institutional state
    ALL_VAR_KEYS.forEach((key) => root.style.removeProperty(key));

    // 3. Apply Panel Vars (Everything EXCEPT --page-*)
    Object.entries(panelPreset.vars).forEach(([key, value]) => {
      if (!key.startsWith('--page-')) {
        root.style.setProperty(key, value);
      }
    });

    // 4. Apply Page Vars (ONLY --page-*)
    Object.entries(pagePreset.vars).forEach(([key, value]) => {
      if (key.startsWith('--page-')) {
        root.style.setProperty(key, value);
      }
    });

    root.setAttribute('data-panel-theme', panelPreset.id);
    root.setAttribute('data-page-theme', pagePreset.id);
    if (panel) root.setAttribute('data-panel', panel.key);
  }, [pathname, panelThemes, pageThemes, previewPanelKey, previewPageKey]);
}
