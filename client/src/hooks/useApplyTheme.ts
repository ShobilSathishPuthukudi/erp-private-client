import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { findPanelByPath, getPresetById, THEME_PRESETS } from '@/lib/themes';

const ALL_VAR_KEYS = Array.from(
  new Set(THEME_PRESETS.flatMap((preset) => Object.keys(preset.vars)))
);

export function useApplyTheme() {
  const { pathname } = useLocation();
  const panelThemes = useThemeStore((state) => state.panelThemes);

  useEffect(() => {
    const panel = findPanelByPath(pathname);
    const themeId = panel ? panelThemes[panel.key] : undefined;
    const preset = getPresetById(themeId || 'default');
    const root = document.documentElement;

    ALL_VAR_KEYS.forEach((key) => root.style.removeProperty(key));
    Object.entries(preset.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute('data-panel-theme', preset.id);
    if (panel) root.setAttribute('data-panel', panel.key);
  }, [pathname, panelThemes]);
}
