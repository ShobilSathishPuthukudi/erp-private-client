import { useState, useEffect } from 'react';
import { 
  Database,
  Building2,
  AlertCircle,
  CheckCircle2,
  Search,
  X
} from 'lucide-react';

interface DepartmentCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function DepartmentCreate({ onClose, onSuccess, initialData }: DepartmentCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || '',
    adminId: initialData?.adminId || '',
    activateNow: initialData ? initialData.status === 'active' : true
  });

  const [validation, setValidation] = useState({
    nameAvailable: true,
    singletonError: ''
  });

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

  const handleTypeChange = (type: string) => {
    let name = '';
    let singletonError = '';
    
    if (type === 'Finance') name = 'Finance';
    else if (type === 'HR') name = 'Human Resources';
    else if (type === 'Operations') name = 'Operations';
    else if (type === 'Sales') name = 'Sales & CRM';

    // Singleton check logic
    if (['Finance', 'HR'].includes(type)) {
      // Mock existing dept check
      // singletonError = `A ${type} department already exists in this organization. Only one is allowed.`;
    }

    setFormData({ ...formData, type, name });
    setValidation({ ...validation, singletonError });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className="bg-white overflow-hidden transition-all duration-300">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative border-b border-slate-800">
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
        <Database className="w-8 h-8 opacity-20" />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form className="p-8 space-y-8" onSubmit={handleSubmit}>
        {/* Department Type */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-widest">Select Function Type</label>
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
                  : 'border-slate-100 hover:border-slate-300 text-slate-500'
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
              placeholder="e.g., Global Finance"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:opacity-50 disabled:bg-slate-100"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={['HR', 'Finance', 'Operations', 'Sales'].includes(formData.type)}
            />
            <p className="text-[10px] text-slate-400">For pre-defined types, the name is system-managed.</p>
          </div>

          {/* Admin Assignment */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign Department Admin</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                  value={formData.adminId}
                  onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                >
                  <option value="">Search employee accounts...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                  ))}
                </select>
            </div>
            <p className="text-[10px] text-slate-400">Optional at creation, required for activation.</p>
          </div>
        </div>

        {/* Activation Toggle */}
        <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-between border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${formData.activateNow ? 'bg-green-100' : 'bg-slate-200'}`}>
              <CheckCircle2 className={`w-5 h-5 ${formData.activateNow ? 'text-green-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Activate Immediately</h4>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Enables dashboard access for the assigned admin upon submission.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, activateNow: !formData.activateNow })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ${
              formData.activateNow ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.activateNow ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <button 
            type="button"
            className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
            onClick={onClose}
          >
            Discard
          </button>
          <button 
            type="submit"
            disabled={!formData.type || !formData.name || !!validation.singletonError}
            className="px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {initialData ? 'Save Changes' : 'Complete Registration'}
          </button>
        </div>
      </form>

      <div className="bg-blue-50 border-t border-blue-100 p-4 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-blue-700 leading-relaxed">
          Tip: Pre-defined department types (Finance, HR, etc.) come with industry-standard default permissions. 
          Custom departments allow you to select individual features and build a tailored permissions matrix later.
        </p>
      </div>
    </div>
  );
}
