import { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Search,
  X
} from 'lucide-react';

interface CEOPanelCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function CEOPanelCreate({ onClose, onSuccess, initialData }: CEOPanelCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    userId: initialData?.userId || '',
    visibilityScope: initialData?.visibilityScope || [] as string[],
    status: initialData?.status || 'Active'
  });

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([
    'Operations', 'Finance', 'Human Resources', 'Sales & CRM' // Default Fallback
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/departments')
        ]);
        
        if (usersRes.ok) {
          const data = await usersRes.json();
          // Filter for administrative/executive roles that could realistically have a CEO/Oversight panel
          setUsers(data.filter((u: any) => 
            ['ceo', 'org-admin', 'system-admin', 'dept-admin'].includes(u.role.toLowerCase())
          ));
        }

        if (deptsRes.ok) {
          const data = await deptsRes.json();
          const deptNames = data.map((d: any) => d.name);
          if (deptNames.length > 0) setDepartments(deptNames);
        }
      } catch (error) {
        console.error("Failed to fetch dependencies", error);
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
    <div className="bg-white overflow-hidden transition-all duration-300">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
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

      <form className="p-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">CEO Panel Label</label>
            <input 
              type="text" 
              placeholder="e.g., CEO - Academic Division"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 px-1">Internal label for this specific dashboard instance.</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Assign User Account</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold appearance-none text-slate-900"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              >
                <option value="">Search employee accounts...</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initial Visibility Scope</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, visibilityScope: departments })}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, visibilityScope: [] })}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-500"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => toggleScope(dept)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  formData.visibilityScope.includes(dept)
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md translate-y-[-1px]'
                  : 'border-slate-100 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  formData.visibilityScope.includes(dept) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                }`}>
                  {formData.visibilityScope.includes(dept) && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs font-bold">{dept}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-blue-800 leading-relaxed">
            Important: This user will only be able to see data (Reports, Dashboard Metrics, Employee Lists) 
            originating from the departments selected above. You can update this scope anytime via Visibility Config.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-6 mt-6 border-t border-slate-100">
          <button 
            type="submit"
            disabled={!formData.name || !formData.userId || loading}
            className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-2xl shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
            onClick={async (e) => {
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
                  window.alert(`Error: ${errData.error || 'Failed to provision'}`);
                }
              } catch (error) {
                console.error("Failed to save CEO panel", error);
                window.alert('Network error while provisioning panel.');
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {initialData ? 'Saving...' : 'Provisioning...'}
              </span>
            ) : initialData ? 'Save Changes' : 'Confirm and Provision Account'}
          </button>
          <button 
             type="button"
             onClick={onClose}
             className="px-10 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all font-display"
          >
            Cancel
          </button>
        </div>
      </form>

    </div>
  );
}
