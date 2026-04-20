import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { findPanelByPath, getPresetById, THEME_PRESETS, PANELS, DEFAULT_THEME_ID } from '@/lib/themes';

const ALL_VAR_KEYS = Array.from(
  new Set(THEME_PRESETS.flatMap((preset) => Object.keys(preset.vars)))
);

import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';


export function useApplyTheme() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const { panelThemes, pageThemes, cardThemes, previewPanelKey, previewPageKey, previewCardKey } = useThemeStore();

  useEffect(() => {
    // 1. Resolve Panel Context
    let panel = findPanelByPath(pathname);
    
    // Fallback: If on a shared page (profile panel), adopt the theme of the user's primary workspace layout
    if (panel?.key === 'profile' && user) {
      const normalizedRole = getNormalizedRole(user.role || '');
      const roleToPanelMap: Record<string, string> = {
        'organization admin': 'org-admin',
        'ceo': 'ceo',
        'hr': 'hr',
        'finance': 'finance',
        'sales': 'sales',
        'operations': 'academic',
        'openschool': 'openschool',
        'online': 'online',
        'skill': 'skill',
        'bvoc': 'bvoc',
        'partner-center': 'partner-center',
        'student': 'student',
        'employee': 'employee',
      };
      const userPanelKey = roleToPanelMap[normalizedRole];
      if (userPanelKey) {
         const userHomePanel = PANELS.find(p => p.key === userPanelKey);
         if (userHomePanel) {
            panel = userHomePanel;
         }
      }
    }

    let panelThemeId = panel ? panelThemes[panel.key] : DEFAULT_THEME_ID;
    let pageThemeId = panel ? pageThemes[panel.key] : DEFAULT_THEME_ID;
    let cardThemeId = panel ? cardThemes[panel.key] : DEFAULT_THEME_ID;

    // 2. Handle Preview Overrides (from Theme Studio)
    if (previewPanelKey) {
      const p = PANELS.find(x => x.key === previewPanelKey);
      if (p) {
        panel = p;
        panelThemeId = panelThemes[p.key] || DEFAULT_THEME_ID;
      }
    }
    if (previewPageKey) {
       pageThemeId = pageThemes[previewPanelKey || 'profile'] || DEFAULT_THEME_ID;
    }
    if (previewCardKey) {
       cardThemeId = cardThemes[previewPanelKey || 'profile'] || DEFAULT_THEME_ID;
    }

    const panelPreset = getPresetById(panelThemeId || DEFAULT_THEME_ID);
    const pagePreset = getPresetById(pageThemeId || DEFAULT_THEME_ID);
    const cardPreset = getPresetById(cardThemeId || DEFAULT_THEME_ID);

    const root = document.documentElement;

    // Clear all existing vars to ensure a clean institutional state
    ALL_VAR_KEYS.forEach((key) => root.style.removeProperty(key));

    // 3. Apply Panel Vars (Everything EXCEPT --page-* and --card-*)
    Object.entries(panelPreset.vars).forEach(([key, value]) => {
      if (!key.startsWith('--page-') && !key.startsWith('--card-')) {
        root.style.setProperty(key, value);
      }
    });

    // 4. Apply Page Vars (ONLY --page-*)
    Object.entries(pagePreset.vars).forEach(([key, value]) => {
      if (key.startsWith('--page-')) {
        root.style.setProperty(key, value);
      }
    });

    // 5. Apply Card Vars (ONLY --card-*)
    Object.entries(cardPreset.vars).forEach(([key, value]) => {
      if (key.startsWith('--card-')) {
        root.style.setProperty(key, value);
      }
    });

    root.setAttribute('data-panel-theme', panelPreset.id);
    root.setAttribute('data-page-theme', pagePreset.id);
    root.setAttribute('data-card-theme', cardPreset.id);
    if (panel) root.setAttribute('data-panel', panel.key);
  }, [pathname, panelThemes, pageThemes, cardThemes, previewPanelKey, previewPageKey, previewCardKey]);
}
