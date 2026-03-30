import { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface CEOPanelCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function CEOPanelCreate({ onClose, onSuccess, initialData }: CEOPanelCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.ceoUser?.email || '',
    password: initialData?.devCredential || '',
    visibilityScope: initialData?.visibilityScope || [] as string[],
    status: initialData?.status || 'Active'
  });

  const [departments, setDepartments] = useState<string[]>([
    'Operations', 'Finance', 'Human Resources', 'Sales & CRM' // Default Fallback
  ]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptsRes = await fetch('/api/departments');
        if (deptsRes.ok) {
          const data = await deptsRes.json();
          const deptNames = data.map((d: any) => d.name);
          if (deptNames.length > 0) setDepartments(deptNames);
        }
      } catch (error) {
        console.error("Failed to fetch departments", error);
      }
    };
    fetchData();
  }, []);

  const toggleScope = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      visibilityScope: prev.visibilityScope.includes(dept) 
        ? prev.visibilityScope.filter((d: string) => d !== dept) 
        : [...prev.visibilityScope, dept]
    }));
  };

  return (
    <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-100px)] lg:max-h-[85vh]">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
              {initialData ? 'Panel Editor' : 'Infrastructure Service'}
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? `Edit ${initialData.name}` : 'CEO Instance Provisioner'}
            </h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form className="flex-1 flex flex-col overflow-hidden" 
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const url = initialData ? `/api/org-admin/ceo-panels/${initialData.id}` : '/api/org-admin/ceo-panels';
            const method = initialData ? 'PUT' : 'POST';
            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });
            if (response.ok) {
              onSuccess();
              onClose();
            } else {
              const errData = await response.json();
              window.alert(`Error: ${errData.details || errData.error || 'Failed to provision'}`);
            }
          } catch (error) {
            console.error("Failed to save CEO panel", error);
            window.alert('Network error while provisioning panel.');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="flex-1 overflow-y-auto p-10 min-h-0 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Identity & Access */}
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">CEO Panel Label</label>
                <input 
                  type="text" 
                  placeholder="CEO - Academic Division"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 px-1">Unique label for this executive oversight instance.</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Login ID (Institutional Email)</label>
                <input 
                  type="email" 
                  name="ceo-email"
                  placeholder="ceo@institution.edu"
                  autoComplete="off"
                  disabled={!!initialData}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 disabled:opacity-60"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Access Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="ceo-password"
                      placeholder="Institutional credential..."
                      autoComplete="new-password"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 pr-14"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 mx-1">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
                <span className="block font-black uppercase tracking-wider text-[9px] mb-1">Administrative Alert</span>
                The provisioned executive identity will only be authorized to access telemetry from the specific visibility scope selected on the right. Scoped data includes Finance, HR, and Operational logs.
              </p>
            </div>
          </div>

          {/* Right Column: Visibility Scope */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initial Visibility Scope</label>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, visibilityScope: departments })}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-colors"
                >
                  Select All
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, visibilityScope: [] })}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleScope(dept)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.visibilityScope.includes(dept)
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md translate-y-[-1px]'
                    : 'border-slate-100 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    formData.visibilityScope.includes(dept) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                  }`}>
                    {formData.visibilityScope.includes(dept) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-bold truncate">{dept}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all border border-slate-200 shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!formData.name || !formData.email || (!initialData && !formData.password) || formData.visibilityScope.length === 0 || loading}
            className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {initialData ? 'Synchronizing...' : 'Provisioning...'}
              </span>
            ) : (
              <span>
                {initialData ? 'Save Changes' : 'CONFIRM AND PROVISION CEO'}
              </span>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}
