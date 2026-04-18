import { useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palette, Check, RotateCcw, Sparkles, Layout, Monitor, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { getNormalizedRole } from '@/lib/roles';
import { PANELS, THEME_PRESETS, DEFAULT_THEME_ID, getPresetById } from '@/lib/themes';

type TabType = 'panel' | 'page';

export default function ThemeSelector() {
  const [searchParams] = useSearchParams();
  const panelParam = searchParams.get('panel');
  const user = useAuthStore((state) => state.user);
  const role = getNormalizedRole(user?.role || '');
  const [activeTab, setActiveTab] = useState<TabType>('panel');
  
  const { 
    panelThemes, 
    pageThemes, 
    setPanelTheme, 
    setPageTheme, 
    resetPanelTheme, 
    resetPageTheme, 
    resetAll, 
    setPreviewPanel, 
    setPreviewPage 
  } = useThemeStore();

  const visiblePanels = useMemo(
    () => PANELS.filter((panel) => panel.availableFor(role)),
    [role]
  );

  const activePanelKey = useMemo(() => {
    if (panelParam && visiblePanels.some(p => p.key === panelParam)) return panelParam;
    return visiblePanels[0]?.key || 'profile';
  }, [panelParam, visiblePanels]);

  useEffect(() => {
    setPreviewPanel(activePanelKey);
    setPreviewPage(activePanelKey);
    return () => {
      setPreviewPanel(null);
      setPreviewPage(null);
    };
  }, [activePanelKey, setPreviewPanel, setPreviewPage]);

  const activePanel = visiblePanels.find((p) => p.key === activePanelKey) || visiblePanels[0];
  const currentPanelId = activePanel ? panelThemes[activePanel.key] || DEFAULT_THEME_ID : DEFAULT_THEME_ID;
  const currentPageId = activePanel ? pageThemes[activePanel.key] || DEFAULT_THEME_ID : DEFAULT_THEME_ID;

  const handleSelectPanel = async (themeId: string) => {
    if (!activePanel) return;
    setPanelTheme(activePanel.key, themeId);
    
    // Server-side persistence
    try {
      const nextPanelThemes = { ...panelThemes, [activePanel.key]: themeId };
      await api.put('/auth/theme-preferences', { 
        themePreferences: { panelThemes: nextPanelThemes, pageThemes } 
      });
      toast.success(`${activePanel.label} Shell set to ${getPresetById(themeId).name}`);
    } catch (error) {
      console.error('Failed to persist panel theme:', error);
      toast.error('Local change applied, but failed to sync with server');
    }
  };

  const handleSelectPage = async (themeId: string) => {
    if (!activePanel) return;
    setPageTheme(activePanel.key, themeId);

    // Server-side persistence
    try {
      const nextPageThemes = { ...pageThemes, [activePanel.key]: themeId };
      await api.put('/auth/theme-preferences', { 
        themePreferences: { panelThemes, pageThemes: nextPageThemes } 
      });
      toast.success(`${activePanel.label} Workspace set to ${getPresetById(themeId).name}`);
    } catch (error) {
      console.error('Failed to persist page theme:', error);
      toast.error('Local change applied, but failed to sync with server');
    }
  };

  const handleResetPanel = async () => {
    if (!activePanel) return;
    resetPanelTheme(activePanel.key);
    try {
      const nextPanelThemes = { ...panelThemes };
      delete nextPanelThemes[activePanel.key];
      await api.put('/auth/theme-preferences', { 
        themePreferences: { panelThemes: nextPanelThemes, pageThemes } 
      });
      toast.success(`${activePanel.label} Shell reset to default`);
    } catch (error) {
      console.error('Failed to persist panel reset:', error);
    }
  };

  const handleResetPage = async () => {
    if (!activePanel) return;
    resetPageTheme(activePanel.key);
    try {
      const nextPageThemes = { ...pageThemes };
      delete nextPageThemes[activePanel.key];
      await api.put('/auth/theme-preferences', { 
        themePreferences: { panelThemes, pageThemes: nextPageThemes } 
      });
      toast.success(`${activePanel.label} Workspace reset to default`);
    } catch (error) {
      console.error('Failed to persist page reset:', error);
    }
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
      {/* Header Area */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Palette className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Theme Studio</h1>
              <div className="flex items-center gap-2 mt-1">
                 <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contextual Branding Active</span>
                 <span className="text-slate-300">/</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 font-mono">{activePanel.label}</span>
              </div>
           </div>
        </div>
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Environment
        </button>
      </div>

      <div className="flex gap-8 items-start">
        {/* INTERNAL SIDEBAR TABS */}
        <nav className="w-64 shrink-0 space-y-2 sticky top-6">
          <button
            onClick={() => setActiveTab('panel')}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-left group",
              activeTab === 'panel' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              activeTab === 'panel' ? "bg-white/20" : "bg-slate-100 group-hover:bg-indigo-50"
            )}>
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Panel Branding</p>
              <p className={clsx(
                "text-[10px] font-medium opacity-70",
                activeTab === 'panel' ? "text-white" : "text-slate-400"
              )}>Shell & Navigation</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('page')}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-left group",
              activeTab === 'page' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              activeTab === 'page' ? "bg-white/20" : "bg-slate-100 group-hover:bg-emerald-50"
            )}>
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Page Surface</p>
              <p className={clsx(
                "text-[10px] font-medium opacity-70",
                activeTab === 'page' ? "text-white" : "text-slate-400"
              )}>Workspace & Content</p>
            </div>
          </button>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mt-8">
             <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Quick Recap</p>
             </div>
             <p className="text-[10px] leading-relaxed text-slate-500">
                You are skinning the <span className="font-bold text-slate-900">{activePanel.label}</span>. 
                Shell themes affect boundaries, while Workspace themes affect the internal logic area.
             </p>
          </div>
        </nav>

        {/* MAIN CONFIGURATION AREA */}
        <div className="flex-1 space-y-8 min-w-0">
          {activeTab === 'panel' ? (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-slate-900">1. Select Shell Branding</h2>
                 {currentPanelId !== DEFAULT_THEME_ID && (
                    <button onClick={() => resetPanelTheme(activePanel.key)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700">Reset Shell</button>
                 )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPanel(preset.id)}
                    className={clsx(
                      "group relative text-left rounded-3xl border-2 overflow-hidden transition-all bg-white",
                      preset.id === currentPanelId ? "border-indigo-600 shadow-xl" : "border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className="h-24 relative" style={{ background: preset.swatch }}>
                       {preset.id === currentPanelId && (
                          <div className="absolute top-3 right-3 bg-white text-indigo-600 p-1 rounded-lg shadow-lg">
                             <Check className="w-3 h-3" />
                          </div>
                       )}
                    </div>
                    <div className="p-4">
                       <h3 className="font-bold text-slate-900">{preset.name}</h3>
                       <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{preset.description}</p>
                       <div className="flex gap-1.5 mt-3">
                          {['--theme-accent', '--layout-chrome-bg', '--shell-surface'].map(v => (
                             <div key={v} className="w-5 h-5 rounded-md border border-slate-100" style={{ background: preset.vars[v] }} />
                          ))}
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-slate-900">2. Select Workspace Surface</h2>
                 {currentPageId !== DEFAULT_THEME_ID && (
                    <button onClick={() => resetPageTheme(activePanel.key)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700">Reset Workspace</button>
                 )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPage(preset.id)}
                    className={clsx(
                      "group relative text-left rounded-3xl border-2 overflow-hidden transition-all bg-white",
                      preset.id === currentPageId ? "border-emerald-600 shadow-xl" : "border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className="h-24 relative" style={{ background: preset.vars['--page-bg'] }}>
                       <div className="absolute inset-0 opacity-10" style={{ background: preset.swatch }} />
                       {preset.id === currentPageId && (
                          <div className="absolute top-3 right-3 bg-white text-emerald-600 p-1 rounded-lg shadow-lg">
                             <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-1">
                                <Check className="w-3 h-3" /> Active
                             </span>
                          </div>
                       )}
                    </div>
                    <div className="p-4">
                       <h3 className="font-bold text-slate-900">{preset.name}</h3>
                       <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Workspace Workspace</p>
                       <div className="flex gap-1.5 mt-3">
                          {['--page-bg', '--page-surface', '--page-accent'].map(v => (
                             <div key={v} className="w-5 h-5 rounded-md border border-slate-100" style={{ background: preset.vars[v] }} />
                          ))}
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
