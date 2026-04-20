import { useState } from 'react';
import { 
  ArrowLeft,
  ChevronRight,
  Layout,
  Database,
  CheckCircle2,
  AlertCircle,
  Settings,
  Filter
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function CEOPanelVisibility() {
  const navigate = useNavigate();
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [scope, setScope] = useState<string[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [panelsRes, deptsRes] = await Promise.all([
        api.get('/org-admin/ceo-panels'),
        api.get('/departments')
      ]);
      
      setPanels(panelsRes.data);
      setDepartments(deptsRes.data.map((d: any) => d.name));
      
      if (panelsRes.data.length > 0) {
        setSelectedPanel(panelsRes.data[0].id.toString());
        setScope(panelsRes.data[0].visibilityScope || []);
      }
    } catch (error) {
      toast.error('Failed to synchronize executive registry');
    } finally {
      setLoading(false);
    }
  };

  const handlePanelChange = (id: string) => {
    setSelectedPanel(id);
    const panel = panels.find(p => p.id.toString() === id);
    if (panel) setScope(panel.visibilityScope || []);
  };

  const toggleScope = (dept: string) => {
    setScope(prev => prev.includes(dept) 
      ? prev.filter(d => d !== dept) 
      : [...prev, dept]
    );
  };

  const handleSave = async () => {
    if (!selectedPanel) return;
    try {
      setSaving(true);
      await api.put(`/org-admin/ceo-panels/${selectedPanel}/visibility`, {
        visibilityScope: scope
      });
      // Update local state to reflect change
      setPanels(prev => prev.map(p => 
        p.id.toString() === selectedPanel ? { ...p, visibilityScope: scope } : p
      ));
      toast.success('Visibility boundaries persisted successfully');
    } catch (error) {
      toast.error('Failed to enforce visibility changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Visibility scope configuration</h1>
            <p className="text-slate-500 mt-1">Directly modify the data access boundaries for CEO accounts.</p>
          </div>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center shadow-lg">
          <Settings className="w-4 h-4 mr-2" />
          Real-time Sync
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Panel Selector */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 px-1">Select CEO Panel</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="py-8 text-center text-[10px] font-black text-slate-400 animate-pulse uppercase tracking-[0.2em]">Resolving Executive Roster...</div>
              ) : panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => handlePanelChange(panel.id.toString())}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                    selectedPanel === panel.id.toString() 
                    ? 'border-blue-600 bg-blue-50 text-blue-900 border-opacity-100 shadow-md scale-[1.02]' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-sm font-bold">{panel.name}</span>
                  {selectedPanel === panel.id.toString() && <ChevronRight className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            <Database className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm mb-2 relative z-10">Advanced Scoping</h4>
            <p className="text-[10px] text-indigo-100 leading-relaxed relative z-10 font-medium">
              Changes made here take effect immediately. The CEO dashboard will dynamically re-calculate all numbers based on the new scope on their next page load.
            </p>
          </div>
        </div>

        {/* Right: Scope Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <Filter className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-display">Departmental Access Matrix</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full mt-1 w-fit">
                    Editing: {panels.find(p => p.id.toString() === selectedPanel)?.name || 'Resolving...'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setScope(departments)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">All</button>
                <button onClick={() => setScope([])} className="text-[10px] font-bold text-slate-400 hover:text-slate-50">None</button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleScope(dept)}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                      scope.includes(dept)
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md scale-[1.02]'
                      : 'border-slate-50 hover:border-slate-100 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        scope.includes(dept) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Layout className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{dept}</span>
                    </div>
                    {scope.includes(dept) && (
                      <div className="bg-green-500 rounded-full p-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900 tracking-tight underline mb-1">Advanced Filtering Enabled</p>
                  <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                    By default, selecting a department includes all its sub-departments and centers. 
                    You can restrict this further by clicking on the department name (Future Feature).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-50">
                <button 
                  className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block"></span>
                  ) : 'Save Configuration'}
                </button>
                <button 
                   onClick={() => navigate(-1)}
                   className="px-10 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
