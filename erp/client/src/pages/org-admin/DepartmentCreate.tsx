import { useState, useEffect } from 'react';
import { 
  Building2,
  AlertCircle,
  X,
  Layout,
  CheckSquare,
  BarChart3,
  Bell,
  Calendar,
  Users,
  Eye,
  Edit3,
  ShieldCheck,
  ChevronDown,
  TrendingUp,
  Award,
  FileText,
  Box,
  UserPlus
} from 'lucide-react';

interface DepartmentCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function DepartmentCreate({ onClose, onSuccess, initialData }: DepartmentCreateProps) {
  const [isNewAdmin, setIsNewAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || '',
    adminId: initialData?.adminId || '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    activateNow: initialData ? initialData.status === 'active' : true,
    features: (initialData?.metadata?.features || []).map((f: any) => 
      typeof f === 'string' ? { id: f, permissions: ['read'] } : f
    ) as { id: string, permissions: string[] }[]
  });

  const [loading, setLoading] = useState(false);

  const [validation, setValidation] = useState({
    nameAvailable: true,
    singletonError: ''
  });

  const [users, setUsers] = useState<any[]>([]);

  const availableFeatures = [
    { id: 'dashboards', name: 'Dashboards', icon: Layout, desc: 'Real-time metrics and analytics' },
    { id: 'performance', name: 'Employee Performance', icon: TrendingUp, desc: 'Track KPIs, appraisals and productivity' },
    { id: 'tasks', name: 'Task Management', icon: CheckSquare, desc: 'Assign and track employee tasks' },
    { id: 'reports', name: 'Reports', icon: BarChart3, desc: 'Generate system-wide data exports' },
    { id: 'announcements', name: 'Announcements', icon: Bell, desc: 'Blast messages and news' },
    { id: 'leave', name: 'Leave Management', icon: Calendar, desc: 'Approve and track employee leaves' },
    { id: 'directory', name: 'Employee Directory', icon: Users, desc: 'List and search department staff' },
    { id: 'marks', name: 'Internal Marks', icon: Award, desc: 'Academic assessments and grade management' },
    { id: 'audit', name: 'Financial Audit', icon: FileText, desc: 'Revenue reconciliation and fee tracking' },
    { id: 'inventory', name: 'Inventory Mgmt', icon: Box, desc: 'Manage institutional assets and stock' },
  ];

  const DEFAULT_FEATURES_MAP: Record<string, string[]> = {
    'Operations': ['dashboards', 'tasks', 'reports', 'marks'],
    'HR': ['leave', 'directory', 'announcements', 'performance'],
    'Finance': ['dashboards', 'reports', 'audit'],
    'Sales': ['dashboards', 'tasks', 'announcements', 'inventory'],
    'Custom': []
  };

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

  const handleTypeChange = (type: string) => {
    let name = '';
    let singletonError = '';
    
    if (type === 'Finance') name = 'Finance';
    else if (type === 'HR') name = 'Human Resources';
    else if (type === 'Operations') name = 'Operations';
    else if (type === 'Sales') name = 'Sales & CRM';

    const defaultFeatures = DEFAULT_FEATURES_MAP[type] || [];
    const mappedFeatures = defaultFeatures.map(id => ({ id, permissions: ['read'] }));

    setFormData({ ...formData, type, name, features: mappedFeatures });
    setValidation({ ...validation, singletonError });
  };

  const toggleFeature = (id: string) => {
    setFormData(prev => {
      const exists = prev.features.find(f => f.id === id);
      if (exists) {
        return { ...prev, features: prev.features.filter(f => f.id !== id) };
      } else {
        return { ...prev, features: [...prev.features, { id, permissions: ['read'] }] };
      }
    });
  };

  const togglePermission = (featureId: string, permission: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          const has = f.permissions.includes(permission);
          let newPerms = has 
            ? f.permissions.filter(p => p !== permission) 
            : [...f.permissions, permission];
          
          if ((permission === 'write' || permission === 'approve') && !has) {
            if (!newPerms.includes('read')) newPerms.push('read');
          }
          if (permission === 'read' && has) newPerms = [];
          return { ...f, permissions: newPerms };
        }
        return f;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = initialData ? `/api/departments/${initialData.id}` : '/api/departments';
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${initialData ? 'update' : 'register'} department`);
      
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
    <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
              {initialData ? 'Edit Configuration' : 'Departmental Config'}
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? `Modify ${initialData.name}` : 'Registration Form'}
            </h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form className="flex flex-col flex-1 overflow-hidden" onSubmit={handleSubmit}>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0 custom-scrollbar">
          {/* Department Type */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Function Type</label>
            {formData.type && (
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">STEP 1 COMPLETE</span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {['Operations', 'HR', 'Finance', 'Sales', 'Custom'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${
                  formData.type === type 
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' 
                  : 'border-slate-100 hover:border-slate-300 text-slate-500 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {validation.singletonError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {validation.singletonError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dept Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department Name</label>
            <input 
              type="text" 
              placeholder="Global Finance"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:opacity-50 disabled:bg-slate-100"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={['HR', 'Finance', 'Operations', 'Sales'].includes(formData.type)}
            />
            <p className="text-[10px] text-slate-400">For pre-defined types, the name is system-managed.</p>
          </div>

          {/* Admin Assignment */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign admin</label>
              
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setIsNewAdmin(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !isNewAdmin 
                      ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Existing Admin
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewAdmin(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isNewAdmin 
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create New
                </button>
              </div>
            </div>

            {!isNewAdmin ? (
              <div className="space-y-2">
                <div className="relative group">
                    <select 
                      className="w-full px-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none cursor-pointer hover:bg-white hover:border-slate-300"
                      value={formData.adminId}
                      onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                    >
                      <option value="">Select verified admin</option>
                      {users.filter(u => u.RoleDetails?.isAdminEligible).map((u) => (
                        <option key={u.uid} value={u.uid}>{u.name} — Verified Eligible ({u.role})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-[10px] text-slate-400">Select an existing user to manage this department</p>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <input 
                    type="text" 
                    placeholder="Admin Full Name"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div>
                  <input 
                    type="email" 
                    placeholder="Login Email / ID"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    placeholder="Set Password"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature & Permission Assignment (Flowchart Step 5) */}
        {formData.type && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Feature & Access Config</h3>
               {formData.features.length > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                  {formData.features.length} Components Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {availableFeatures.map((feature) => (
                  <FeatureConfigCard 
                    key={feature.id}
                    feature={feature}
                    config={formData.features.find(f => f.id === feature.id)}
                    onToggle={() => toggleFeature(feature.id)}
                    onPermissionToggle={(permId: string) => togglePermission(feature.id, permId)}
                  />
               ))}
            </div>

          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 mx-2">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-blue-800 leading-relaxed">
              <span className="block text-blue-900 font-bold uppercase tracking-tight mb-1">Governance Tip</span>
              Pre-defined department types (Finance, HR, etc.) come with industry-standard default permissions. 
              Custom departments allow you to select individual features and build a tailored permissions matrix later.
            </p>
          </div>
        </div>
        )}

        </div>

        <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
          <button 
            type="button"
            className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            onClick={onClose}
          >
            Discard
          </button>
          <button 
            type="submit"
            disabled={!formData.type || !formData.name || !!validation.singletonError || loading || (isNewAdmin && (!formData.adminEmail || !formData.adminPassword || !formData.adminName))}
            className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {initialData ? 'Save Changes' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FeatureConfigCard({ feature, config, onToggle, onPermissionToggle }: any) {
  const [showDetails, setShowDetails] = useState(false);
  const isEnabled = !!config;

  return (
    <div className={`group rounded-2xl border-2 transition-all duration-300 flex flex-col ${
      isEnabled ? 'border-blue-600 bg-white ring-4 ring-blue-50/50' : 'border-slate-100 bg-slate-50/30 hover:border-slate-300'
    }`}>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            title="Click for full module brief"
            className={`p-2 rounded-xl border transition-all hover:scale-110 active:scale-95 shrink-0 ${
              isEnabled ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 shadow-sm'
            }`}
          >
            <feature.icon className="w-4 h-4" />
          </button>
          <div className="min-w-0 cursor-default" onClick={() => setShowDetails(!showDetails)}>
            <h4 className={`text-xs font-bold truncate ${isEnabled ? 'text-blue-900' : 'text-slate-800'}`}>
              {feature.name}
            </h4>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shrink-0 ${
            isEnabled 
            ? 'bg-blue-100 text-blue-700 hover:bg-rose-100 hover:text-rose-700' 
            : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`p-3 rounded-xl text-[10px] leading-relaxed font-medium border ${
            isEnabled ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-white border-slate-100 text-slate-500 italic'
          }`}>
            {feature.desc}
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="px-4 pb-4 pt-0 flex flex-col gap-3 mt-auto">
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center gap-2">
             {[
               { id: 'read', label: 'View', icon: Eye },
               { id: 'write', label: 'Manage', icon: Edit3 },
               { id: 'approve', label: 'Audit', icon: ShieldCheck }
             ].map((perm) => {
               const isPermActive = config.permissions.includes(perm.id);
               return (
                 <button
                   key={perm.id}
                   type="button"
                   onClick={() => onPermissionToggle(perm.id)}
                   className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-black transition-all hover:scale-105 active:scale-95 ${
                     isPermActive
                     ? 'bg-blue-600 border-blue-600 text-white'
                     : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                   }`}
                 >
                   <perm.icon className="w-3 h-3" />
                   {perm.label}
                 </button>
               );
             })}
          </div>
        </div>
      )}
    </div>
  );
}
