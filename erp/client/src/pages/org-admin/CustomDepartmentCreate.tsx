import { useState, useEffect } from 'react';
import { 
  LayoutGrid,
  ShieldCheck,
  Layout,
  CheckSquare,
  BarChart3,
  Bell,
  Calendar,
  Users,
  X,
} from 'lucide-react';

interface CustomDepartmentCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function CustomDepartmentCreate({ onClose, onSuccess, initialData }: CustomDepartmentCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    adminId: initialData?.adminId || '',
    status: initialData?.status || 'Active',
    features: initialData?.features || [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const availableFeatures = [
    { id: 'dashboards', name: 'Dashboards', icon: Layout, desc: 'Real-time metrics and analytics' },
    { id: 'tasks', name: 'Task Management', icon: CheckSquare, desc: 'Assign and track employee tasks' },
    { id: 'reports', name: 'Reports', icon: BarChart3, desc: 'Generate system-wide data exports' },
    { id: 'announcements', name: 'Announcements', icon: Bell, desc: 'Blast messages and news' },
    { id: 'leave', name: 'Leave Management', icon: Calendar, desc: 'Approve and track employee leaves' },
    { id: 'directory', name: 'Employee Directory', icon: Users, desc: 'List and search department staff' },
  ];

  const toggleFeature = (id: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(id) 
        ? prev.features.filter((f: string) => f !== id) 
        : [...prev.features, id]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = initialData ? `/api/departments/${initialData.id}` : '/api/departments';
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: 'Custom'
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${initialData ? 'update' : 'create'} custom department`);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submission error:', error);
      window.alert(`Failed to ${initialData ? 'save' : 'register'} department`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden transition-all duration-300">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
              {initialData ? 'Module Editor' : 'Module Builder'}
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? `Edit ${initialData.name}` : 'Custom Configuration'}
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

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Custom Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Creative Studio"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 px-1">Must be unique within your organization.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Initial Admin</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold appearance-none"
                  value={formData.adminId}
                  onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                >
                  <option value="">Select account...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
               <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Feature Multi-select</h3>
               {formData.features.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {formData.features.length} ENABLED
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableFeatures.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => toggleFeature(feature.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.features.includes(feature.id)
                    ? 'border-blue-600 bg-blue-50 shadow-md scale-[1.02]'
                    : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-xl border ${
                    formData.features.includes(feature.id) 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${formData.features.includes(feature.id) ? 'text-blue-900' : 'text-slate-800'}`}>
                      {feature.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{feature.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sticky top-24">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 px-1">Module Summary</h3>
            
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 px-1">Permission Hierarchy</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-semibold">Dept Admin</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase">Full Control</span>
                  </div>
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-xs text-slate-600 font-semibold">Supervisors</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">Moderate</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
                  disabled={!formData.name || formData.features.length === 0 || loading}
                  onClick={handleSubmit}
                >
                  {loading ? (initialData ? 'Saving...' : 'Activating...') : (initialData ? 'Save Changes' : 'Save and Activate')}
                </button>
                <button 
                   onClick={onClose}
                   className="w-full py-3 text-slate-500 text-sm font-bold hover:text-slate-900 transition-colors"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <ShieldCheck className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 text-white/10 rotate-12" />
            <h4 className="font-bold text-sm mb-2 relative z-10">Governance Tip</h4>
            <p className="text-[10px] text-blue-100 leading-relaxed relative z-10">
              Custom modules allow for granular permission overrides. You can set specific access levels for every enabled feature in the global matrix later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
