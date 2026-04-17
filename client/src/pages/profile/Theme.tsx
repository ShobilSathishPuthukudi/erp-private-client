import { useMemo, useState } from 'react';
import { Palette, Check, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { getNormalizedRole } from '@/App';
import { PANELS, THEME_PRESETS, DEFAULT_THEME_ID, getPresetById } from '@/lib/themes';

export default function ThemeSelector() {
  const user = useAuthStore((state) => state.user);
  const role = getNormalizedRole(user?.role || '');
  const panelThemes = useThemeStore((state) => state.panelThemes);
  const setPanelTheme = useThemeStore((state) => state.setPanelTheme);
  const resetPanelTheme = useThemeStore((state) => state.resetPanelTheme);
  const resetAll = useThemeStore((state) => state.resetAll);

  const visiblePanels = useMemo(
    () => PANELS.filter((panel) => panel.availableFor(role)),
    [role]
  );

  const [activePanelKey, setActivePanelKey] = useState<string>(
    visiblePanels[0]?.key || 'profile'
  );

  const activePanel = visiblePanels.find((p) => p.key === activePanelKey) || visiblePanels[0];
  const currentThemeId = activePanel ? panelThemes[activePanel.key] || DEFAULT_THEME_ID : DEFAULT_THEME_ID;

  const handleSelect = (themeId: string) => {
    if (!activePanel) return;
    setPanelTheme(activePanel.key, themeId);
    const preset = getPresetById(themeId);
    toast.success(`${activePanel.label} theme set to ${preset.name}`);
  };

  const handleReset = () => {
    if (!activePanel) return;
    resetPanelTheme(activePanel.key);
    toast.success(`${activePanel.label} reset to default`);
  };

  const handleResetAll = () => {
    resetAll();
    toast.success('All panel themes reset to default');
  };

  if (!activePanel) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        No panels available for your role.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Theme Studio</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Customise the colour theme for each panel you have access to. Changes apply instantly.
          </p>
        </div>
        <button
          onClick={handleResetAll}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="bg-white border border-slate-200 rounded-2xl p-4 h-fit lg:sticky lg:top-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-2 mb-3">
            Your Panels
          </h3>
          <nav className="space-y-1">
            {visiblePanels.map((panel) => {
              const themeId = panelThemes[panel.key] || DEFAULT_THEME_ID;
              const preset = getPresetById(themeId);
              const isActive = panel.key === activePanelKey;
              return (
                <button
                  key={panel.key}
                  onClick={() => setActivePanelKey(panel.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                    isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md border border-slate-300 shrink-0"
                    style={{ background: preset.swatch }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{panel.label}</p>
                    <p
                      className={`text-[10px] uppercase tracking-widest truncate ${
                        isActive ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      {preset.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{activePanel.label}</h2>
                <p className="text-xs text-slate-500">
                  Currently using <span className="font-bold text-slate-700">{getPresetById(currentThemeId).name}</span>
                </p>
              </div>
              {currentThemeId !== DEFAULT_THEME_ID && (
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Panel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {THEME_PRESETS.map((preset) => {
                const selected = preset.id === currentThemeId;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.id)}
                    className={`relative text-left rounded-2xl border-2 overflow-hidden transition-all ${
                      selected
                        ? 'border-slate-900 shadow-lg scale-[1.01]'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="h-24" style={{ background: preset.swatch }} />
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">{preset.name}</h4>
                        {selected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {Object.entries(preset.vars)
                          .filter(([key]) => ['--theme-accent', '--layout-chrome-bg', '--shell-surface'].includes(key))
                          .map(([key, value]) => (
                            <span
                              key={key}
                              className="w-5 h-5 rounded-md border border-slate-200"
                              style={{ background: value }}
                              title={`${key}: ${value}`}
                            />
                          ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-6 text-white flex items-start gap-4">
            <Sparkles className="w-8 h-8 text-amber-300 shrink-0" />
            <div>
              <h3 className="font-bold">Per-panel theming</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Themes apply to the active panel you are on. Switch panels in the navigation and the chrome
                will re-skin based on your choice here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
